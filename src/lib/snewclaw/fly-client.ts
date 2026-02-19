const FLY_API_BASE = 'https://api.machines.dev/v1'

function getAppName(): string {
  return process.env.FLY_APP_NAME ?? 'snew-snewclaw'
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
  init: { entrypoint: string[]; cmd: string[] }
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
      init: {
        entrypoint: ['/bin/sh', '-c'],
        cmd: ['exec node /app/openclaw.mjs gateway --port 18789 --bind lan --allow-unconfigured'],
      },
      auto_destroy: false,
      restart: { policy: 'on-failure', max_retries: 5 },
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
 * Configure instance after machine is started.
 * Sets the default model and fixes file permissions (exec runs as root,
 * gateway runs as node:1000).
 * Retries exec commands since the gateway may not be ready immediately after start.
 */
export async function setupInstance(
  machineId: string,
  provider: string,
  model: string
): Promise<void> {
  // Wait for exec channel to become available — newly created machines
  // need time after reaching 'started' before exec works (EOF errors otherwise)
  await new Promise((r) => setTimeout(r, 10_000))

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
      // Wait before retry: 5s, 10s, 15s, 20s, 25s
      await new Promise((r) => setTimeout(r, (5 + attempt * 5) * 1000))
    }
  }
  // Fix permissions — exec runs as root but gateway runs as node:1000
  await execCommand(machineId, ['chown', '-R', '1000:1000', '/data'], 15)
}

interface ChatResponse {
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

/**
 * Send a chat message via exec --local (bypasses gateway WebSocket auth,
 * calls LLM API directly from env vars).
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
      '--local',
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

  if (result.exit_code !== 0) {
    throw new Error(
      `Chat command failed (exit ${result.exit_code}): ${result.stderr || result.stdout}`
    )
  }

  try {
    return JSON.parse(result.stdout) as ChatResponse
  } catch {
    throw new Error(`Failed to parse chat response: ${result.stdout.slice(0, 500)}`)
  }
}
