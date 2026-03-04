import express from 'express'
import { ConnectionManager } from './baileys.js'
import { authMiddleware } from './auth.js'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })
const app = express()
const port = parseInt(process.env.PORT || '3001', 10)

app.use(express.json())

const manager = new ConnectionManager({
  sessionDir: process.env.SESSION_DIR || '/data/sessions',
  webhookUrl: process.env.WEBHOOK_URL || '',
  webhookSecret: process.env.WHATSAPP_GATEWAY_SECRET || '',
  logger,
})

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ ok: true, connections: manager.getActiveCount() })
})

// All other routes require auth
app.use(authMiddleware)

// Send a message
app.post('/send', async (req, res) => {
  try {
    const { teamId, to, text } = req.body as { teamId: string; to: string; text: string }
    if (!teamId || !to || !text) {
      res.status(400).json({ ok: false, error: 'Missing teamId, to, or text' })
      return
    }
    const messageId = await manager.sendMessage(teamId, to, text)
    res.json({ ok: true, messageId })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    logger.error({ error: msg }, 'Failed to send message')
    res.status(500).json({ ok: false, error: msg })
  }
})

// Initiate connection (triggers QR code generation)
app.post('/connect/:teamId', async (req, res) => {
  try {
    const status = await manager.connect(req.params.teamId)
    res.json(status)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    logger.error({ error: msg, teamId: req.params.teamId }, 'Failed to connect')
    res.status(500).json({ ok: false, error: msg })
  }
})

// Get QR code
app.get('/qr/:teamId', async (req, res) => {
  try {
    const status = manager.getStatus(req.params.teamId)
    res.json(status)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ ok: false, error: msg })
  }
})

// Get connection status
app.get('/status/:teamId', (req, res) => {
  const status = manager.getStatus(req.params.teamId)
  res.json(status)
})

// Disconnect
app.post('/disconnect/:teamId', async (req, res) => {
  try {
    await manager.disconnect(req.params.teamId)
    res.json({ ok: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ ok: false, error: msg })
  }
})

app.listen(port, '0.0.0.0', () => {
  logger.info(`WhatsApp gateway listening on port ${port}`)
})
