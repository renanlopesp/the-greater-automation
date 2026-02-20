const FLY_API_BASE = 'https://api.machines.dev/v1'

function getAppName(): string {
  return process.env.FLY_APP_NAME ?? 'snew-pro-agent'
}

function getToken(): string {
  const token = process.env.FLY_API_TOKEN
  if (!token) throw new Error('Missing FLY_API_TOKEN environment variable')
  return token
}

async function flyFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${FLY_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  return res
}

async function flyJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await flyFetch(path, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Fly API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// --- Volumes ---

export async function createVolume(
  name: string,
  region: string,
  sizeGb: number
): Promise<{ id: string; name: string }> {
  return flyJson(`/apps/${getAppName()}/volumes`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      region,
      size_gb: sizeGb,
      encrypted: true,
    }),
  })
}

export async function deleteVolume(volumeId: string): Promise<void> {
  const res = await flyFetch(`/apps/${getAppName()}/volumes/${volumeId}`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 404) {
    const text = await res.text()
    throw new Error(`Failed to delete volume: ${text}`)
  }
}

// --- Machines ---

interface MachineConfig {
  image: string
  env: Record<string, string>
  guest: { cpu_kind: string; cpus: number; memory_mb: number }
  mounts: Array<{ volume: string; path: string }>
  init: Record<string, unknown>
  auto_destroy: boolean
  restart: { policy: string; max_retries: number }
}

interface Machine {
  id: string
  name: string
  state: string
  region: string
  config: MachineConfig
}

export function buildMachineConfig({
  image,
  env,
  volumeId,
}: {
  image: string
  env: Record<string, string>
  volumeId: string
}): { config: MachineConfig } {
  return {
    config: {
      image,
      env: {
        ...env,
        OPENCLAW_STATE_DIR: '/data',
        NODE_OPTIONS: '--max-old-space-size=1536',
        NODE_ENV: 'production',
      },
      guest: { cpu_kind: 'shared', cpus: 2, memory_mb: 4096 },
      mounts: [{ volume: volumeId, path: '/data' }],
      // Gateway binds to loopback (127.0.0.1:18789, container-internal only).
      // No Fly services array → port is NOT routable externally.
      // NOTE: The gateway takes ~30-40s to fully initialize and bind the port.
      // Use waitForGateway() before any command that talks to the gateway
      // (plugins enable, channels add, etc.).
      init: {
        cmd: [
          'node',
          '/app/openclaw.mjs',
          'gateway',
          '--allow-unconfigured',
          '--port',
          '18789',
          '--bind',
          'loopback',
        ],
      },
      auto_destroy: false,
      restart: { policy: 'always', max_retries: 0 },
    },
  }
}

export async function createMachine(
  name: string,
  region: string,
  config: { config: MachineConfig }
): Promise<Machine> {
  return flyJson(`/apps/${getAppName()}/machines`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      region,
      ...config,
    }),
  })
}

export async function getMachine(machineId: string): Promise<Machine> {
  return flyJson(`/apps/${getAppName()}/machines/${machineId}`)
}

export async function destroyMachine(machineId: string): Promise<void> {
  const res = await flyFetch(`/apps/${getAppName()}/machines/${machineId}?force=true`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 404) {
    const text = await res.text()
    throw new Error(`Failed to destroy machine: ${text}`)
  }
}

export async function waitForState(
  machineId: string,
  state: string,
  timeoutSeconds: number = 60
): Promise<void> {
  const deadline = Date.now() + timeoutSeconds * 1000
  // Fly API max wait is 60s — poll in chunks
  while (Date.now() < deadline) {
    const chunk = Math.min(60, Math.ceil((deadline - Date.now()) / 1000))
    if (chunk <= 0) break
    const res = await flyFetch(
      `/apps/${getAppName()}/machines/${machineId}/wait?state=${state}&timeout=${chunk}`,
      { method: 'GET' }
    )
    if (res.ok) return
    // If the error is a timeout, keep polling; otherwise throw
    const text = await res.text()
    if (res.status === 408 || text.includes('timeout')) continue
    throw new Error(`Machine did not reach state '${state}': ${text}`)
  }
  throw new Error(`Machine did not reach state '${state}' within ${timeoutSeconds}s`)
}

// --- Exec ---

interface ExecResult {
  stdout: string
  stderr: string
  exit_code: number
  exit_signal?: number
}

/**
 * Execute a command inside a Fly machine.
 * Wraps all commands with `timeout --kill-after=5` to prevent zombie processes.
 * Fly exec API does NOT kill child processes on timeout — the wrapper ensures cleanup.
 */
export async function execCommand(
  machineId: string,
  command: string[],
  timeoutSeconds: number = 60
): Promise<ExecResult> {
  const wrappedCommand = ['timeout', '--kill-after=5', String(timeoutSeconds), ...command]
  return flyJson(`/apps/${getAppName()}/machines/${machineId}/exec`, {
    method: 'POST',
    body: JSON.stringify({ command: wrappedCommand, timeout: timeoutSeconds + 10 }),
  })
}

// --- High-level operations ---

/**
 * Wait for the OpenClaw gateway to bind to port 18789 inside the container.
 * The gateway takes ~30-40s to fully initialize after the Fly machine starts.
 * Polls by attempting `curl 127.0.0.1:18789` via exec — any HTTP response
 * (even 401/403) means the gateway is ready. curl exit_code 7 = not yet.
 */
export async function waitForGateway(
  machineId: string,
  timeoutSeconds: number = 90
): Promise<void> {
  const deadline = Date.now() + timeoutSeconds * 1000
  const interval = 5_000 // poll every 5s

  while (Date.now() < deadline) {
    try {
      const result = await execCommand(
        machineId,
        ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', 'http://127.0.0.1:18789/'],
        10
      )
      // Any HTTP response means gateway is listening (even 401/403)
      if (result.exit_code === 0) return
      // curl exit 7 = connection refused (gateway not ready yet)
    } catch {
      // exec itself may fail if machine is still booting — keep polling
    }
    await new Promise((r) => setTimeout(r, interval))
  }
  throw new Error(`Gateway did not become ready within ${timeoutSeconds}s`)
}

/**
 * Configure instance after machine is started.
 * Sets the default model and fixes file permissions.
 * `models set` writes directly to config (no gateway needed).
 * Retries exec since the exec channel may not be ready immediately.
 */
export async function setupInstance(
  machineId: string,
  provider: string,
  model: string
): Promise<void> {
  // Wait for exec channel — newly created machines need a few seconds
  await new Promise((r) => setTimeout(r, 5_000))

  const maxRetries = 6
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await execCommand(
        machineId,
        ['node', '/app/openclaw.mjs', 'models', 'set', `${provider}/${model}`],
        30
      )
      break
    } catch (err) {
      if (attempt === maxRetries - 1) throw err
      await new Promise((r) => setTimeout(r, (3 + attempt * 3) * 1000))
    }
  }
  // Fix permissions — exec runs as root, agent reads config as node:1000
  await execCommand(machineId, ['chown', '-R', '1000:1000', '/data'], 15)
}

// --- Machine env update ---

/**
 * Update environment variables on a running Fly machine.
 * Fetches the current config, merges new env vars, and updates via Fly API.
 * The machine must be restarted for new env vars to take effect.
 */
export async function updateMachineEnv(
  machineId: string,
  envVars: Record<string, string>
): Promise<void> {
  const machine = await getMachine(machineId)
  const currentEnv = machine.config?.env ?? {}
  const mergedEnv = { ...currentEnv, ...envVars }

  const res = await flyFetch(`/apps/${getAppName()}/machines/${machineId}`, {
    method: 'POST',
    body: JSON.stringify({
      config: {
        ...machine.config,
        env: mergedEnv,
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to update machine env: ${text}`)
  }
}

/**
 * Remove specific env var keys from a running Fly machine.
 * Fetches the current config, removes the keys, and updates.
 */
export async function removeMachineEnvKeys(machineId: string, keys: string[]): Promise<void> {
  const machine = await getMachine(machineId)
  const currentEnv = { ...(machine.config?.env ?? {}) }
  for (const key of keys) {
    delete currentEnv[key]
  }

  const res = await flyFetch(`/apps/${getAppName()}/machines/${machineId}`, {
    method: 'POST',
    body: JSON.stringify({
      config: { ...machine.config, env: currentEnv },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to remove machine env keys: ${text}`)
  }
}

// --- Machine restart ---

/**
 * Restart a Fly machine and wait for it to fully come back.
 * Handles the race condition where the Fly restart API returns before the
 * machine actually stops — waits for 'stopped' then 'started' to avoid
 * catching the OLD 'started' state.
 */
export async function restartMachine(
  machineId: string,
  timeoutSeconds: number = 30
): Promise<void> {
  const res = await flyFetch(
    `/apps/${getAppName()}/machines/${machineId}/restart?timeout=${timeoutSeconds}`,
    { method: 'POST' }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to restart machine: ${text}`)
  }
  // The restart API may return before the machine stops. Wait for the
  // machine to actually go through the stop→start cycle.
  await waitForState(machineId, 'stopped', 30).catch(() => {
    // Machine may have already passed through stopped — ignore timeout
  })
  await waitForState(machineId, 'started', 60)
}

// --- Channel management ---

export type ChannelType = 'telegram' | 'discord' | 'whatsapp' | 'signal'

/**
 * Write plugin entries directly to the OpenClaw config file.
 * This is a file-level operation (no gateway needed) — use this BEFORE
 * restarting the gateway so it boots with plugins already enabled.
 * Much more reliable than `plugins enable` which requires a running gateway.
 */
export async function enableChannelPlugins(
  machineId: string,
  channels: ChannelType[]
): Promise<void> {
  if (channels.length === 0) return
  // Build the plugins.entries object
  const entries = channels.reduce(
    (acc, ch) => ({ ...acc, [ch]: { enabled: true } }),
    {} as Record<string, { enabled: boolean }>
  )
  const script = `
    const fs = require('fs');
    const p = '/data/openclaw.json';
    const c = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
    c.plugins = c.plugins || {};
    c.plugins.entries = { ...c.plugins.entries, ...${JSON.stringify(entries)} };
    fs.writeFileSync(p, JSON.stringify(c, null, 2));
    console.log('ok');
  `.trim()
  const result = await execCommand(machineId, ['node', '-e', script], 15)
  if (result.exit_code !== 0) {
    throw new Error(`Failed to enable plugins: ${result.stderr || result.stdout}`)
  }
}

/**
 * Write channel configuration directly to the OpenClaw config file.
 * This is a file-level operation (no gateway needed) — the gateway picks
 * up the channel config on boot. Avoids all gateway WebSocket auth issues.
 */
export async function writeChannelConfig(
  machineId: string,
  channels: Array<{ channel: ChannelType; token: string }>
): Promise<void> {
  if (channels.length === 0) return
  const channelConfig = channels.reduce(
    (acc, { channel, token }) => ({
      ...acc,
      [channel]: {
        enabled: true,
        dmPolicy: 'pairing',
        botToken: token,
        groupPolicy: 'allowlist',
        streamMode: 'partial',
      },
    }),
    {} as Record<string, unknown>
  )
  const script = `
    const fs = require('fs');
    const p = '/data/openclaw.json';
    const c = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
    c.channels = { ...c.channels, ...${JSON.stringify(channelConfig)} };
    fs.writeFileSync(p, JSON.stringify(c, null, 2));
    console.log('ok');
  `.trim()
  const result = await execCommand(machineId, ['node', '-e', script], 15)
  if (result.exit_code !== 0) {
    throw new Error(`Failed to write channel config: ${result.stderr || result.stdout}`)
  }
}

/**
 * Add or update a channel on the OpenClaw instance via gateway CLI.
 * Requires the gateway to be running and accessible via WebSocket.
 * Prefer writeChannelConfig() during provisioning to avoid auth issues.
 */
export async function addChannel(
  machineId: string,
  channel: ChannelType,
  token: string
): Promise<void> {
  const maxRetries = 3
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await execCommand(
      machineId,
      ['node', '/app/openclaw.mjs', 'channels', 'add', '--channel', channel, '--token', token],
      30
    )
    if (result.exit_code === 0) return
    if (attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, 5_000 * (attempt + 1)))
      continue
    }
    throw new Error(`Failed to add channel ${channel}: ${result.stderr || result.stdout}`)
  }
}

/**
 * Remove a channel from the OpenClaw instance.
 */
export async function removeChannel(machineId: string, channel: ChannelType): Promise<void> {
  const result = await execCommand(
    machineId,
    ['node', '/app/openclaw.mjs', 'channels', 'remove', '--channel', channel],
    30
  )
  if (result.exit_code !== 0) {
    throw new Error(`Failed to remove channel ${channel}: ${result.stderr || result.stdout}`)
  }
}

/**
 * List configured channels on the OpenClaw instance.
 */
export async function listChannels(machineId: string): Promise<string> {
  const result = await execCommand(machineId, ['node', '/app/openclaw.mjs', 'channels', 'list'], 15)
  return result.stdout
}

// --- Pairing ---

/**
 * List pending pairing requests for a channel.
 */
export async function listPairingRequests(
  machineId: string,
  channel: ChannelType
): Promise<string> {
  const result = await execCommand(
    machineId,
    ['node', '/app/openclaw.mjs', 'pairing', 'list', '--channel', channel],
    15
  )
  return result.stdout
}

/**
 * Approve a pairing code for a channel.
 */
export async function approvePairing(
  machineId: string,
  channel: ChannelType,
  code: string
): Promise<string> {
  const result = await execCommand(
    machineId,
    ['node', '/app/openclaw.mjs', 'pairing', 'approve', channel, code],
    15
  )
  if (result.exit_code !== 0) {
    throw new Error(`Failed to approve pairing: ${result.stderr || result.stdout}`)
  }
  return result.stdout
}

interface ChatResult {
  payloads: Array<{ text?: string; mediaUrl?: string }>
  meta: {
    durationMs: number
    agentMeta: {
      sessionId: string
      provider: string
      model: string
      usage: { input: number; output: number; total: number }
    }
  }
}

/** OpenClaw CLI wraps the result in an envelope with runId/status/summary. */
interface ChatEnvelope {
  runId: string
  status: string
  summary: string
  result: ChatResult
}

export type ChatResponse = ChatResult

/**
 * Send a chat message via the gateway.
 * The CLI authenticates using the gateway.auth.token from /data/openclaw.json.
 * This gives the agent full access to gateway features (memory, tools, channels).
 */
export async function sendChatMessage(
  machineId: string,
  message: string,
  sessionId: string,
  timeoutSeconds: number = 60
): Promise<ChatResponse> {
  const result = await execCommand(
    machineId,
    [
      'node',
      '/app/openclaw.mjs',
      'agent',
      '--agent',
      'main',
      '-m',
      message,
      '--json',
      '--timeout',
      String(timeoutSeconds),
      '--session-id',
      sessionId,
    ],
    timeoutSeconds + 5
  )

  // Exit code 124 = timeout wrapper killed the process, but OpenClaw may
  // have already written the full JSON response to stdout before cleanup.
  // Try to parse stdout first; only throw if there's no valid response.
  if (result.exit_code !== 0 && result.exit_code !== 124) {
    throw new Error(
      `Chat command failed (exit ${result.exit_code}): ${result.stderr || result.stdout}`
    )
  }

  try {
    const parsed = JSON.parse(result.stdout) as ChatEnvelope | ChatResult
    // OpenClaw wraps the response in { runId, status, result: { payloads, meta } }
    if ('result' in parsed && 'runId' in parsed) {
      return (parsed as ChatEnvelope).result
    }
    return parsed as ChatResult
  } catch {
    if (result.exit_code === 124) {
      throw new Error('Agent response timed out — try a shorter message or increase timeout')
    }
    throw new Error(`Failed to parse chat response: ${result.stdout.slice(0, 500)}`)
  }
}
