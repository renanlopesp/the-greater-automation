const TELEGRAM_API = 'https://api.telegram.org/bot'

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable')
  return token
}

async function api<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${TELEGRAM_API}${getToken()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = (await res.json()) as { ok: boolean; result: T; description?: string }
  if (!data.ok) {
    throw new Error(`Telegram API error (${method}): ${data.description ?? 'unknown'}`)
  }
  return data.result
}

// --- Bot info ---

export async function getMe(): Promise<{ id: number; username: string; first_name: string }> {
  return api('getMe')
}

// --- Messages ---

/** Telegram message limit is 4096 chars. Split long messages if needed. */
export async function sendMessage(
  chatId: string,
  text: string,
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'
): Promise<void> {
  const MAX_LENGTH = 4096
  const chunks = splitText(text, MAX_LENGTH)

  for (const chunk of chunks) {
    await api('sendMessage', {
      chat_id: chatId,
      text: chunk,
      ...(parseMode ? { parse_mode: parseMode } : {}),
    })
  }
}

export async function sendChatAction(chatId: string, action: 'typing' = 'typing'): Promise<void> {
  await api('sendChatAction', { chat_id: chatId, action })
}

// --- Webhook ---

export async function setWebhook(url: string, secret: string): Promise<void> {
  await api('setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ['message'],
    max_connections: 40,
  })
}

export async function deleteWebhook(): Promise<void> {
  await api('deleteWebhook')
}

// --- Telegram Update types ---

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
}

export interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: { id: number; type: string }
  date: number
  text?: string
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
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
