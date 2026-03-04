import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
  type ConnectionState,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import * as fs from 'fs'
import * as path from 'path'
import QRCode from 'qrcode'
import type { Logger } from 'pino'

export interface ConnectionStatus {
  status: 'disconnected' | 'qr_pending' | 'connecting' | 'connected'
  qrCode?: string
  phoneNumber?: string
  lastConnected?: string
}

interface ConnectionManagerOptions {
  sessionDir: string
  webhookUrl: string
  webhookSecret: string
  logger: Logger
}

interface TeamConnection {
  socket: WASocket | null
  status: ConnectionStatus
  reconnectAttempts: number
  maxReconnectAttempts: number
}

export class ConnectionManager {
  private connections = new Map<string, TeamConnection>()
  private options: ConnectionManagerOptions

  constructor(options: ConnectionManagerOptions) {
    this.options = options
    // Ensure session directory exists
    fs.mkdirSync(options.sessionDir, { recursive: true })
  }

  getActiveCount(): number {
    let count = 0
    for (const conn of this.connections.values()) {
      if (conn.status.status === 'connected') count++
    }
    return count
  }

  async connect(teamId: string): Promise<ConnectionStatus> {
    const existing = this.connections.get(teamId)
    if (existing?.status.status === 'connected') {
      return existing.status
    }

    const sessionPath = path.join(this.options.sessionDir, teamId)
    fs.mkdirSync(sessionPath, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version } = await fetchLatestBaileysVersion()

    const conn: TeamConnection = {
      socket: null,
      status: { status: 'connecting' },
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
    }
    this.connections.set(teamId, conn)

    const socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.options.logger),
      },
      printQRInTerminal: false,
      logger: this.options.logger.child({ teamId }),
    })

    conn.socket = socket

    // Handle connection updates
    socket.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        // Generate QR code as base64 data URL
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { width: 256 })
          conn.status = { status: 'qr_pending', qrCode: qrDataUrl }
        } catch {
          conn.status = { status: 'qr_pending' }
        }
      }

      if (connection === 'close') {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode
        const shouldReconnect = reason !== DisconnectReason.loggedOut

        if (shouldReconnect && conn.reconnectAttempts < conn.maxReconnectAttempts) {
          conn.reconnectAttempts++
          const delay = Math.min(1000 * Math.pow(2, conn.reconnectAttempts), 30000)
          this.options.logger.info(
            { teamId, attempt: conn.reconnectAttempts, delay },
            'Reconnecting...'
          )
          setTimeout(() => this.connect(teamId), delay)
        } else {
          conn.status = { status: 'disconnected' }
          this.options.logger.info({ teamId, reason }, 'Connection closed permanently')
        }
      }

      if (connection === 'open') {
        conn.status = {
          status: 'connected',
          phoneNumber: socket.user?.id?.split(':')[0] || undefined,
          lastConnected: new Date().toISOString(),
        }
        conn.reconnectAttempts = 0
        this.options.logger.info({ teamId, phone: conn.status.phoneNumber }, 'Connected')
      }
    })

    // Save credentials on update
    socket.ev.on('creds.update', saveCreds)

    // Handle incoming messages
    socket.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        // Skip own messages and non-text messages
        if (msg.key.fromMe) continue
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text
        if (!text) continue

        // Forward to webhook
        await this.forwardToWebhook(teamId, {
          teamId,
          from: msg.key.remoteJid || '',
          senderName: msg.pushName || '',
          text,
          messageId: msg.key.id || '',
          timestamp:
            typeof msg.messageTimestamp === 'number'
              ? msg.messageTimestamp
              : Number(msg.messageTimestamp),
        })
      }
    })

    return conn.status
  }

  async disconnect(teamId: string): Promise<void> {
    const conn = this.connections.get(teamId)
    if (conn?.socket) {
      await conn.socket.logout().catch(() => {})
      conn.socket = null
      conn.status = { status: 'disconnected' }
    }
    this.connections.delete(teamId)
  }

  getStatus(teamId: string): ConnectionStatus {
    return this.connections.get(teamId)?.status || { status: 'disconnected' }
  }

  async sendMessage(teamId: string, to: string, text: string): Promise<string | undefined> {
    const conn = this.connections.get(teamId)
    if (!conn?.socket || conn.status.status !== 'connected') {
      throw new Error(`WhatsApp not connected for team ${teamId}`)
    }

    // Ensure JID format
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
    const result = await conn.socket.sendMessage(jid, { text })
    return result?.key?.id ?? undefined
  }

  private async forwardToWebhook(
    teamId: string,
    payload: {
      teamId: string
      from: string
      senderName: string
      text: string
      messageId: string
      timestamp: number
    }
  ): Promise<void> {
    if (!this.options.webhookUrl) {
      this.options.logger.warn('No webhook URL configured, skipping message forward')
      return
    }

    try {
      const res = await fetch(this.options.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WhatsApp-Gateway-Secret': this.options.webhookSecret,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        this.options.logger.error({ status: res.status, teamId }, 'Webhook forward failed')
      }
    } catch (error) {
      this.options.logger.error({ error, teamId }, 'Webhook forward error')
    }
  }
}
