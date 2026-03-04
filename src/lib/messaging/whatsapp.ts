const MAX_MESSAGE_LENGTH = 4096

function getGatewayUrl(): string {
  const url = process.env.WHATSAPP_GATEWAY_URL
  if (!url) throw new Error('Missing WHATSAPP_GATEWAY_URL environment variable')
  return url.replace(/\/$/, '') // strip trailing slash
}

function getGatewaySecret(): string {
  const secret = process.env.WHATSAPP_GATEWAY_SECRET
  if (!secret) throw new Error('Missing WHATSAPP_GATEWAY_SECRET environment variable')
  return secret
}

async function gatewayAPI<T>(
  path: string,
  body?: Record<string, unknown>,
  method: 'GET' | 'POST' | 'DELETE' = body ? 'POST' : 'GET'
): Promise<T> {
  const res = await fetch(`${getGatewayUrl()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getGatewaySecret()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error')
    throw new Error(`WhatsApp Gateway error (${path}): ${res.status} ${text}`)
  }

  return res.json() as Promise<T>
}

// --- Messages ---

/** Send a WhatsApp message. Split long messages if needed. */
export async function sendMessage(
  teamId: string,
  phoneNumber: string,
  text: string
): Promise<void> {
  const chunks = splitText(text, MAX_MESSAGE_LENGTH)
  for (const chunk of chunks) {
    await gatewayAPI('/send', { teamId, to: phoneNumber, text: chunk })
  }
}

/** Send a typing/composing indicator. */
export async function sendPresence(phoneNumber: string): Promise<void> {
  await gatewayAPI('/presence', { to: phoneNumber, type: 'composing' }).catch(() => {})
}

// --- Connection management ---

export interface ConnectionStatus {
  status: 'disconnected' | 'qr_pending' | 'connecting' | 'connected'
  qrCode?: string // base64 data URL
  phoneNumber?: string
  lastConnected?: string
}

/** Get QR code for a team's WhatsApp connection. */
export async function getQRCode(teamId: string): Promise<string | null> {
  const result = await gatewayAPI<ConnectionStatus>(`/qr/${teamId}`)
  return result.qrCode ?? null
}

/** Get connection status for a team. */
export async function getStatus(teamId: string): Promise<ConnectionStatus> {
  return gatewayAPI<ConnectionStatus>(`/status/${teamId}`)
}

/** Initiate a WhatsApp connection for a team. */
export async function initiateConnection(teamId: string): Promise<ConnectionStatus> {
  return gatewayAPI<ConnectionStatus>(`/connect/${teamId}`, {})
}

/** Disconnect a team's WhatsApp session. */
export async function disconnect(teamId: string): Promise<void> {
  await gatewayAPI(`/disconnect/${teamId}`, {}, 'POST')
}

// --- Helpers ---

function splitText(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text]

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining)
      break
    }

    // Try to split at a newline
    let splitAt = remaining.lastIndexOf('\n', maxLength)
    if (splitAt === -1 || splitAt < maxLength / 2) {
      // Try to split at a space
      splitAt = remaining.lastIndexOf(' ', maxLength)
    }
    if (splitAt === -1 || splitAt < maxLength / 2) {
      // Hard split
      splitAt = maxLength
    }

    chunks.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt).trimStart()
  }

  return chunks
}
