# 030 - WhatsApp Baileys Integration — Technical Plan

## Architecture Overview

The integration follows a **gateway pattern** where a lightweight Baileys service on Fly.io handles the persistent WhatsApp WebSocket connection, and the Next.js app communicates with it via REST API — mirroring the Telegram Bot API pattern exactly.

---

## Phase 1: Baileys Gateway Service

### 1.1 Gateway Application (`infra/whatsapp-gateway/`)

A standalone Node.js application deployed to Fly.io:

```
infra/whatsapp-gateway/
├── package.json
├── tsconfig.json
├── Dockerfile
├── fly.toml
└── src/
    ├── index.ts          # Express server + Baileys setup
    ├── baileys.ts         # Connection manager (per-team sessions)
    ├── webhook.ts         # Forward incoming messages to Next.js
    ├── routes/
    │   ├── send.ts        # POST /send — send message
    │   ├── qr.ts          # GET /qr/:teamId — get QR code
    │   ├── status.ts      # GET /status/:teamId — connection status
    │   └── disconnect.ts  # POST /disconnect/:teamId
    └── auth.ts            # Shared secret middleware
```

**Dependencies:**

- `@whiskeysockets/baileys` — WhatsApp Web protocol
- `express` — HTTP server
- `qrcode` — QR code generation (PNG/base64)
- `pino` — Logging (Baileys uses pino internally)

**Key design decisions:**

- One Baileys connection per team (multi-tenant)
- Sessions stored in Fly.io volume at `/data/sessions/{teamId}/`
- Auto-reconnect on disconnection with exponential backoff
- Health endpoint at `GET /health` for Fly.io monitoring
- All endpoints authenticated via `Authorization: Bearer <WHATSAPP_GATEWAY_SECRET>`

### 1.2 Baileys Connection Manager

```typescript
// Simplified interface
interface WhatsAppConnection {
  teamId: string
  status: 'disconnected' | 'qr_pending' | 'connecting' | 'connected'
  qrCode?: string // base64 QR image when status=qr_pending
  phoneNumber?: string // e.g., "5511999999999"
  lastConnected?: Date
}

class ConnectionManager {
  connect(teamId: string): Promise<WhatsAppConnection>
  disconnect(teamId: string): Promise<void>
  sendMessage(teamId: string, to: string, text: string): Promise<void>
  getStatus(teamId: string): WhatsAppConnection
  getQR(teamId: string): Promise<string | null> // base64 QR or null
}
```

**Session lifecycle:**

1. `connect(teamId)` — Loads session from disk or creates new one
2. If no saved session → Baileys emits QR code → stored in memory
3. User scans QR → Baileys authenticates → session saved to disk
4. On reconnect, session is loaded from disk (no new QR needed)
5. `disconnect(teamId)` — Closes connection, keeps session for re-auth

### 1.3 Webhook Forwarding

When a message arrives via Baileys:

```typescript
sock.ev.on('messages.upsert', async ({ messages }) => {
  for (const msg of messages) {
    if (!msg.message || msg.key.fromMe) continue

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text
    if (!text) continue // Skip non-text messages for V1

    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WhatsApp-Gateway-Secret': GATEWAY_SECRET,
      },
      body: JSON.stringify({
        teamId,
        from: msg.key.remoteJid, // "5511999999999@s.whatsapp.net"
        senderName: msg.pushName,
        text,
        messageId: msg.key.id,
        timestamp: msg.messageTimestamp,
      }),
    })
  }
})
```

### 1.4 Deployment (Fly.io)

```toml
# fly.toml
app = "snew-whatsapp-gateway"
primary_region = "gru"  # Sao Paulo (closest to Brazilian users)

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3001
  force_https = true

[mounts]
  source = "whatsapp_sessions"
  destination = "/data"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

---

## Phase 2: Next.js WhatsApp Client Library

### 2.1 `src/lib/messaging/whatsapp.ts`

Mirror of `telegram.ts`, calling the gateway REST API:

```typescript
const GATEWAY_URL = process.env.WHATSAPP_GATEWAY_URL
const GATEWAY_SECRET = process.env.WHATSAPP_GATEWAY_SECRET

export async function sendMessage(phoneNumber: string, text: string): Promise<void> {
  const chunks = splitText(text, 4096)
  for (const chunk of chunks) {
    await gatewayAPI('/send', { to: phoneNumber, text: chunk })
  }
}

export async function getQRCode(teamId: string): Promise<string | null> {
  const result = await gatewayAPI(`/qr/${teamId}`)
  return result.qrCode ?? null
}

export async function getStatus(teamId: string): Promise<ConnectionStatus> {
  return gatewayAPI(`/status/${teamId}`)
}

export async function initiateConnection(teamId: string): Promise<void> {
  await gatewayAPI(`/connect/${teamId}`, {}, 'POST')
}

export async function disconnect(teamId: string): Promise<void> {
  await gatewayAPI(`/disconnect/${teamId}`, {}, 'POST')
}
```

### 2.2 `src/lib/messaging/whatsapp-processor.ts`

Exact mirror of `telegram-processor.ts`:

- Same `processMessage()` signature
- Same conversation creation logic
- Same AI agent invocation
- Same credit tracking
- Metadata: `{ channel: 'whatsapp', phoneNumber, senderName }`
- Conversation title: `WhatsApp – {senderName}`

### 2.3 `src/lib/messaging/channel.ts`

Channel abstraction for notification code:

```typescript
import { sendMessage as sendTelegram } from './telegram'
import { sendMessage as sendWhatsApp } from './whatsapp'

export type ChannelType = 'telegram' | 'whatsapp'

export interface VerifiedLink {
  channel_type: ChannelType
  external_chat_id: string
}

export async function getVerifiedLinks(teamId: string): Promise<VerifiedLink[]> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('messaging_links')
    .select('channel_type, external_chat_id')
    .eq('team_id', teamId)
    .eq('is_verified', true)
  return data ?? []
}

export async function sendToAllChannels(
  teamId: string,
  text: string,
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'
): Promise<void> {
  const links = await getVerifiedLinks(teamId)
  await Promise.allSettled(
    links.map((link) => {
      switch (link.channel_type) {
        case 'telegram':
          return sendTelegram(link.external_chat_id, text, parseMode)
        case 'whatsapp':
          return sendWhatsApp(link.external_chat_id, text)
        default:
          return Promise.resolve()
      }
    })
  )
}
```

---

## Phase 3: API Routes

### 3.1 Webhook Handler (`/api/messaging/whatsapp/webhook/route.ts`)

Same pattern as Telegram webhook:

1. Verify `X-WhatsApp-Gateway-Secret` header
2. Parse incoming message
3. Handle first-time users (link lookup)
4. Queue to `whatsapp_message_queue` for async processing
5. No `/start` or `/link` commands needed — QR code handles auth

### 3.2 Queue Processor (`/api/messaging/whatsapp/process/route.ts`)

Mirror of Telegram processor:

1. Verify `CRON_SECRET` header
2. Claim pending message atomically
3. Call `processMessage()` from whatsapp-processor
4. Mark as completed/failed
5. Send error message on failure

### 3.3 QR Code Endpoint (`/api/messaging/whatsapp/qr/route.ts`)

New endpoint (replaces verification code flow):

- `POST` — Initiate WhatsApp connection (requests QR from gateway)
- `GET` — Poll for QR code / connection status
- `DELETE` — Disconnect WhatsApp

### 3.4 Link Route Updates (`/api/messaging/link/route.ts`)

Modify to accept `channel_type` parameter:

- `POST /api/messaging/link?channel=telegram` — Existing code flow
- `POST /api/messaging/link?channel=whatsapp` — Triggers QR flow
- `GET /api/messaging/link?channel=whatsapp` — Check WhatsApp link status
- `DELETE /api/messaging/link?channel=whatsapp` — Unlink WhatsApp

---

## Phase 4: Database Migration

### `whatsapp_message_queue` table

```sql
CREATE TABLE whatsapp_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  message_text TEXT NOT NULL,
  sender_name TEXT,
  link_id UUID REFERENCES messaging_links(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_whatsapp_queue_status ON whatsapp_message_queue(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_whatsapp_queue_link ON whatsapp_message_queue(link_id);

-- RLS
ALTER TABLE whatsapp_message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to whatsapp queue"
  ON whatsapp_message_queue FOR ALL TO service_role USING (true);

-- pg_net trigger to auto-process (same pattern as telegram_message_queue)
CREATE OR REPLACE FUNCTION notify_whatsapp_message_queue()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.site_url') || '/api/messaging/whatsapp/process',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')),
    body := jsonb_build_object('message_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_whatsapp_message_inserted
  AFTER INSERT ON whatsapp_message_queue
  FOR EACH ROW
  EXECUTE FUNCTION notify_whatsapp_message_queue();
```

---

## Phase 5: Workflow Integration

### 5.1 Step Type Definition

In `step-defaults.ts`, add to `UtilityStepConfig`:

```typescript
utility_type: ... | 'send_telegram' | 'send_whatsapp'
whatsapp_template?: string
```

### 5.2 Execution

In both `execute-visual-steps.ts` and `webhook-executor.ts`, add `send_whatsapp` case:

- Same template resolution logic as `send_telegram`
- Query `messaging_links` with `channel_type = 'whatsapp'`
- Call `sendMessage()` from `@/lib/messaging/whatsapp`

### 5.3 UI

In `utility-step-config.tsx`, add:

- SelectItem: `<SelectItem value="send_whatsapp">Enviar WhatsApp</SelectItem>`
- Conditional render for WhatsApp config fields (same as Telegram: template + parse mode)

### 5.4 AI Workflow Builder

In `skill-builder-tools.ts`:

- Add `'whatsapp'` to channel enum
- Add condition for `action.channel === 'whatsapp'` to generate `send_whatsapp` step
- Update `agent-chat.ts` prompts to mention WhatsApp as preferred channel

---

## Phase 6: Notification Refactoring

Replace direct Telegram calls in notification files with `sendToAllChannels`:

### Files to Refactor

1. **`order-notifications.ts`** — Replace `sendMessage(link.external_chat_id, ...)` with `sendToAllChannels(store.team_id, ...)`
2. **`stock-alerts.ts`** — Same pattern
3. **`sales-summary.ts`** — Same pattern
4. **`abandoned-cart.ts`** — Same pattern (2 call sites)
5. **`nuvemshop/sync.ts`** — Same pattern
6. **`agents/cron/reports/route.ts`** — Same pattern

Each refactor:

- Remove manual `messaging_links` query (moved to `sendToAllChannels`)
- Remove channel_type filter (sends to all)
- Keep message formatting unchanged

---

## Phase 7: Provisioning & Templates

### Store Provisioning Updates

In `provision-store.ts`, add WhatsApp versions of template workflows:

- "Stock Alert Notification (WhatsApp)"
- "Daily Sales Summary (WhatsApp)"
- "New Order Notification (WhatsApp)"

OR: Better approach — make existing templates channel-agnostic by using `sendToAllChannels` in the execution layer. The template stays as `send_telegram`, and a new `send_all_channels` utility type sends to every linked channel.

**Decision: Use dual approach**

- Keep `send_telegram` and `send_whatsapp` as distinct step types (user controls which channel)
- Add `send_all_channels` as a third utility type for "send everywhere"
- Templates use `send_all_channels` by default

---

## Contracts

### Gateway API

```typescript
// POST /send
interface SendRequest {
  teamId: string
  to: string // WhatsApp JID: "5511999999999@s.whatsapp.net"
  text: string
}
interface SendResponse {
  ok: boolean
  messageId?: string
  error?: string
}

// GET /qr/:teamId
interface QRResponse {
  status: 'disconnected' | 'qr_pending' | 'connecting' | 'connected'
  qrCode?: string // base64 PNG data URL
  phoneNumber?: string
}

// GET /status/:teamId
interface StatusResponse {
  status: 'disconnected' | 'qr_pending' | 'connecting' | 'connected'
  phoneNumber?: string
  lastConnected?: string // ISO 8601
  uptime?: number // seconds
}

// Webhook payload (gateway → Next.js)
interface WhatsAppWebhookPayload {
  teamId: string
  from: string // JID
  senderName: string
  text: string
  messageId: string
  timestamp: number
}
```

### Environment Variables

| Variable                  | Where            | Description                    |
| ------------------------- | ---------------- | ------------------------------ |
| `WHATSAPP_GATEWAY_URL`    | Next.js (Vercel) | Gateway base URL               |
| `WHATSAPP_GATEWAY_SECRET` | Both             | Shared auth secret             |
| `WEBHOOK_URL`             | Gateway (Fly.io) | Next.js app URL for forwarding |
| `SESSION_DIR`             | Gateway (Fly.io) | `/data/sessions`               |

---

## Testing Strategy

1. **Unit tests**: Mock gateway API calls in whatsapp.ts
2. **Integration tests**: Test webhook handler with mock payloads
3. **E2E tests**: Test QR code flow with Playwright (mock gateway)
4. **Gateway tests**: Test Baileys connection manager with mock socket
5. **Regression**: Verify all Telegram flows still work unchanged
