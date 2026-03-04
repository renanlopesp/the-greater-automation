# 030 - WhatsApp Baileys Integration — Tasks

## Phase 1: Database & Foundation

### Task 1.1: Create WhatsApp message queue migration

**Status:** pending
**Dependencies:** none
**Files:**

- `supabase/migrations/XXXXXX_create_whatsapp_message_queue.sql` (new)

**Details:**

- Create `whatsapp_message_queue` table mirroring `telegram_message_queue`
- Columns: id, phone_number, message_text, sender_name, link_id (FK to messaging_links), status, attempts, error, created_at, processed_at
- Status CHECK constraint: pending, processing, completed, failed
- Indexes: status (partial, pending/failed), link_id
- RLS: service_role full access
- pg_net trigger to auto-call `/api/messaging/whatsapp/process` on INSERT
- Apply via Supabase MCP `apply_migration`

### Task 1.2: Create channel abstraction library

**Status:** pending
**Dependencies:** none
**Files:**

- `src/lib/messaging/channel.ts` (new)

**Details:**

- Export `ChannelType = 'telegram' | 'whatsapp'`
- Export `getVerifiedLinks(teamId)` — queries all verified messaging_links for a team
- Export `sendToAllChannels(teamId, text, parseMode?)` — sends to all linked channels
- Import sendMessage from both `./telegram` and `./whatsapp`
- Use `Promise.allSettled` so one channel failure doesn't block others
- Handle case where whatsapp module isn't configured (gateway URL missing) gracefully

---

## Phase 2: WhatsApp Client Library (Next.js side)

### Task 2.1: Create WhatsApp messaging client

**Status:** pending
**Dependencies:** none
**Files:**

- `src/lib/messaging/whatsapp.ts` (new)

**Details:**

- Mirror structure of `telegram.ts`
- `getGatewayUrl()` + `getGatewaySecret()` from env
- `gatewayAPI<T>(path, body?, method?)` — generic REST wrapper with auth header
- `sendMessage(phoneNumber, text)` — POST /send to gateway, split long messages
- `getQRCode(teamId)` — GET /qr/:teamId, returns base64 QR or null
- `getStatus(teamId)` — GET /status/:teamId, returns connection status
- `initiateConnection(teamId)` — POST /connect/:teamId
- `disconnect(teamId)` — POST /disconnect/:teamId
- `splitText()` — reuse from telegram.ts or extract to shared util
- Graceful error handling when gateway is unreachable

### Task 2.2: Create WhatsApp message processor

**Status:** pending
**Dependencies:** 2.1
**Files:**

- `src/lib/messaging/whatsapp-processor.ts` (new)

**Details:**

- Mirror structure of `telegram-processor.ts`
- Export `processMessage(supabase, link, phoneNumber, text, senderName)`
- Same flow: get team → get store → find/create conversation → persist user msg → load history → build tools → run AI → persist response → track credits → send response
- Conversation title: `WhatsApp – {senderName}`
- Message metadata: `{ channel: 'whatsapp', phoneNumber, senderName }`
- Use `sendMessage` from `./whatsapp` instead of `./telegram`
- `onIntermediateMessage` callback sends via WhatsApp

---

## Phase 3: API Routes

### Task 3.1: Create WhatsApp webhook handler

**Status:** pending
**Dependencies:** 2.1
**Files:**

- `src/app/api/messaging/whatsapp/webhook/route.ts` (new)

**Details:**

- POST handler for incoming messages from Baileys gateway
- Verify `X-WhatsApp-Gateway-Secret` header
- Parse `WhatsAppWebhookPayload` body (teamId, from, senderName, text, messageId, timestamp)
- Extract phone number from JID (strip `@s.whatsapp.net`)
- Look up verified link by `channel_type='whatsapp'` + `external_chat_id`
- If no link: gateway should not forward (but handle gracefully)
- Queue message to `whatsapp_message_queue` for async processing
- Return 200 OK immediately (async processing)

### Task 3.2: Create WhatsApp queue processor

**Status:** pending
**Dependencies:** 2.2
**Files:**

- `src/app/api/messaging/whatsapp/process/route.ts` (new)

**Details:**

- Mirror of `telegram/process/route.ts`
- Verify CRON_SECRET header
- Handle retry mode (oldest failed, attempts < 3)
- Atomically claim message: pending/failed → processing
- Fetch messaging link by link_id
- Call `processMessage()` from whatsapp-processor
- Mark as completed/failed with timestamps
- On error: send error message to user via WhatsApp
- maxDuration: 120s (same as Telegram)

### Task 3.3: Create WhatsApp QR code endpoint

**Status:** pending
**Dependencies:** 2.1
**Files:**

- `src/app/api/messaging/whatsapp/qr/route.ts` (new)

**Details:**

- POST — Initiate connection: call gateway /connect/:teamId, return status
- GET — Poll status: call gateway /status/:teamId
  - If `qr_pending`: return QR code (base64 PNG)
  - If `connected`: create/update messaging_link with verified=true, phone number
  - If `disconnected`: return status
- DELETE — Disconnect: call gateway /disconnect/:teamId, delete messaging_link
- All endpoints require auth (user must be logged in)
- Create messaging_link row with channel_type='whatsapp' on successful connection

### Task 3.4: Update messaging link route

**Status:** pending
**Dependencies:** 3.3
**Files:**

- `src/app/api/messaging/link/route.ts` (modify)

**Details:**

- Add `channel` query parameter support (default: 'telegram' for backward compat)
- POST: Use `channel` param to determine channel_type in upsert
- GET: Use `channel` param in query filter
- DELETE: Use `channel` param in delete filter
- For whatsapp: return different instructions (QR code flow instead of verification code)
- Keep all existing Telegram logic unchanged

---

## Phase 4: Workflow Integration

### Task 4.1: Add send_whatsapp step type definition

**Status:** pending
**Dependencies:** none
**Files:**

- `src/lib/workflow-editor/step-defaults.ts` (modify)

**Details:**

- Add `'send_whatsapp'` to `UtilityStepConfig.utility_type` union
- Add `whatsapp_template?: string` field to interface
- Add validation in `isStepComplete()`: `if (uc.utility_type === 'send_whatsapp') return !!uc.whatsapp_template`
- Add default config for `send_whatsapp` in step defaults

### Task 4.2: Add send_whatsapp UI component

**Status:** pending
**Dependencies:** 4.1
**Files:**

- `src/components/workflow-editor/step-config/utility-step-config.tsx` (modify)

**Details:**

- Add SelectItem: `<SelectItem value="send_whatsapp">Enviar WhatsApp</SelectItem>`
- Add conditional render block for `send_whatsapp` config:
  - `whatsapp-template` textarea (same as telegram-template)
  - Template variables help text
- Keep all existing Telegram UI unchanged

### Task 4.3: Add send_whatsapp execution in visual steps

**Status:** pending
**Dependencies:** 2.1, 4.1
**Files:**

- `src/lib/workflows/execute-visual-steps.ts` (modify)

**Details:**

- In the `case 'utility':` block, add `else if (utilConfig.utility_type === 'send_whatsapp')`
- Same template resolution logic as send_telegram
- Query `messaging_links` with `channel_type = 'whatsapp'`
- Call `sendMessage()` from `@/lib/messaging/whatsapp`
- Return `{ sent: true, phone_number, message }` output

### Task 4.4: Add send_whatsapp execution in webhook executor

**Status:** pending
**Dependencies:** 2.1, 4.1
**Files:**

- `src/lib/workflow-editor/webhook-executor.ts` (modify)

**Details:**

- Mirror the same changes as Task 4.3 in the webhook executor
- Add `send_whatsapp` handling in utility step case
- Same pattern: resolve template → find link → send message

### Task 4.5: Add send_all_channels utility type

**Status:** pending
**Dependencies:** 1.2, 4.1
**Files:**

- `src/lib/workflow-editor/step-defaults.ts` (modify)
- `src/components/workflow-editor/step-config/utility-step-config.tsx` (modify)
- `src/lib/workflows/execute-visual-steps.ts` (modify)
- `src/lib/workflow-editor/webhook-executor.ts` (modify)

**Details:**

- Add `'send_all_channels'` utility type
- Add `message_template?: string` field
- UI: SelectItem "Enviar para Todos os Canais"
- Execution: use `sendToAllChannels()` from channel.ts
- This is the recommended type for new templates

---

## Phase 5: Notification Refactoring

### Task 5.1: Refactor order-notifications.ts

**Status:** pending
**Dependencies:** 1.2
**Files:**

- `src/lib/retail/order-notifications.ts` (modify)

**Details:**

- Import `sendToAllChannels` from `@/lib/messaging/channel`
- Replace manual `messaging_links` query + `sendMessage` call with `sendToAllChannels(store.team_id, message, 'Markdown')`
- Remove direct import of telegram `sendMessage`
- Keep `formatOrderNotification()` unchanged

### Task 5.2: Refactor stock-alerts.ts

**Status:** pending
**Dependencies:** 1.2
**Files:**

- `src/lib/retail/stock-alerts.ts` (modify)

**Details:**

- Same pattern as 5.1
- Replace manual link query + sendMessage with sendToAllChannels
- Remove supabase param from `sendStockAlerts` if no longer needed for link query (or keep for other queries)

### Task 5.3: Refactor sales-summary.ts

**Status:** pending
**Dependencies:** 1.2
**Files:**

- `src/lib/retail/sales-summary.ts` (modify)

**Details:**

- Same pattern as 5.1
- Replace link query + sendMessage with sendToAllChannels

### Task 5.4: Refactor abandoned-cart.ts

**Status:** pending
**Dependencies:** 1.2
**Files:**

- `src/lib/retail/abandoned-cart.ts` (modify)

**Details:**

- Same pattern as 5.1
- Two call sites to update (lines 32 and 139)
- Both should use sendToAllChannels

### Task 5.5: Refactor nuvemshop/sync.ts

**Status:** pending
**Dependencies:** 1.2
**Files:**

- `src/lib/nuvemshop/sync.ts` (modify)

**Details:**

- Replace telegram-specific messaging_links query with sendToAllChannels

### Task 5.6: Refactor agents/cron/reports/route.ts

**Status:** pending
**Dependencies:** 1.2
**Files:**

- `src/app/api/agents/cron/reports/route.ts` (modify)

**Details:**

- Replace per-agent telegram link query with sendToAllChannels
- Keep agent-level `notification_settings` check (telegram_enabled still valid)
- Consider adding `whatsapp_enabled` to notification_settings (future enhancement)

---

## Phase 6: AI Workflow Builder Updates

### Task 6.1: Update workflow types

**Status:** pending
**Dependencies:** none
**Files:**

- `src/lib/workflows/types.ts` (modify)

**Details:**

- Add `'whatsapp'` to the channel union type: `channel: 'internal' | 'slack' | 'email' | 'telegram' | 'whatsapp'`

### Task 6.2: Update skill-builder-tools.ts

**Status:** pending
**Dependencies:** 6.1, 4.1
**Files:**

- `src/lib/ai/skill-builder-tools.ts` (modify)

**Details:**

- Add `'whatsapp'` to channel enum in notify action schema (line 162)
- Add `'whatsapp'` to TypeScript channel type (line 202, 260)
- Add `else if (action.channel === 'whatsapp')` block (after line 715, ~1044):
  ```typescript
  stepName = 'Send WhatsApp Alert'
  stepConfig = {
    utility_type: 'send_whatsapp',
    whatsapp_template: action.message || '{{prev.output}}',
  }
  ```
- Update the Telegram link check (line 1257) to also check for WhatsApp

### Task 6.3: Update agent-chat.ts prompts

**Status:** pending
**Dependencies:** 6.1
**Files:**

- `src/lib/ai/agent-chat.ts` (modify)

**Details:**

- Update channel documentation in system prompts (lines 158, 173, 211, 274)
- Change `"telegram" (preferred)` to `"whatsapp" (preferred) or "telegram"`
- Update examples to show WhatsApp as the primary notification channel
- Keep telegram as valid option

---

## Phase 7: Baileys Gateway Service

### Task 7.1: Create gateway project structure

**Status:** pending
**Dependencies:** none
**Files:**

- `infra/whatsapp-gateway/package.json` (new)
- `infra/whatsapp-gateway/tsconfig.json` (new)
- `infra/whatsapp-gateway/Dockerfile` (new)
- `infra/whatsapp-gateway/fly.toml` (new)
- `infra/whatsapp-gateway/.gitignore` (new)

**Details:**

- Initialize Node.js project with TypeScript
- Dependencies: `@whiskeysockets/baileys`, `express`, `qrcode`, `pino`
- Dockerfile: Node 22 alpine, build TS, expose port 3001
- fly.toml: app name, region gru, volume mount, shared-cpu-1x

### Task 7.2: Implement Baileys connection manager

**Status:** pending
**Dependencies:** 7.1
**Files:**

- `infra/whatsapp-gateway/src/baileys.ts` (new)

**Details:**

- `ConnectionManager` class
- Per-team Baileys socket management
- Session storage in `/data/sessions/{teamId}/`
- Auto-reconnect with exponential backoff (max 5 retries)
- QR code event handling (store latest QR in memory)
- Message event handling (forward to webhook)
- Connection state tracking
- Graceful cleanup on disconnect
- Logging via pino

### Task 7.3: Implement gateway REST API

**Status:** pending
**Dependencies:** 7.2
**Files:**

- `infra/whatsapp-gateway/src/index.ts` (new)
- `infra/whatsapp-gateway/src/auth.ts` (new)
- `infra/whatsapp-gateway/src/routes/send.ts` (new)
- `infra/whatsapp-gateway/src/routes/qr.ts` (new)
- `infra/whatsapp-gateway/src/routes/status.ts` (new)
- `infra/whatsapp-gateway/src/routes/connect.ts` (new)
- `infra/whatsapp-gateway/src/routes/disconnect.ts` (new)
- `infra/whatsapp-gateway/src/webhook.ts` (new)

**Details:**

- Express server on port 3001
- Auth middleware: verify Bearer token = WHATSAPP_GATEWAY_SECRET
- Routes:
  - `POST /send` — Send message via Baileys
  - `GET /qr/:teamId` — Get current QR code
  - `GET /status/:teamId` — Connection status
  - `POST /connect/:teamId` — Initiate connection
  - `POST /disconnect/:teamId` — Close connection
  - `GET /health` — Health check
- Webhook forwarder: POST to WEBHOOK_URL with message payload
- Error handling and logging

### Task 7.4: Deploy gateway to Fly.io

**Status:** pending
**Dependencies:** 7.3
**Files:** none (CLI operations)

**Details:**

- `fly apps create snew-whatsapp-gateway`
- `fly volumes create whatsapp_sessions --region gru --size 1`
- `fly secrets set WHATSAPP_GATEWAY_SECRET=<secret> WEBHOOK_URL=<app-url>/api/messaging/whatsapp/webhook`
- `fly deploy`
- Verify health endpoint
- Test QR code generation

---

## Phase 8: Testing & Verification

### Task 8.1: Unit tests for WhatsApp client

**Status:** pending
**Dependencies:** 2.1, 2.2
**Files:**

- `src/lib/messaging/__tests__/whatsapp.test.ts` (new)
- `src/lib/messaging/__tests__/whatsapp-processor.test.ts` (new)
- `src/lib/messaging/__tests__/channel.test.ts` (new)

**Details:**

- Test sendMessage with mocked gateway
- Test splitText for long messages
- Test processMessage with mocked supabase + AI
- Test sendToAllChannels with both channels
- Test graceful handling when gateway is down

### Task 8.2: Integration tests for API routes

**Status:** pending
**Dependencies:** 3.1, 3.2, 3.3
**Files:**

- `src/app/api/messaging/whatsapp/__tests__/webhook.test.ts` (new)
- `src/app/api/messaging/whatsapp/__tests__/process.test.ts` (new)

**Details:**

- Test webhook auth verification
- Test message queuing
- Test queue processing flow
- Test error handling and retries

### Task 8.3: Verify Telegram regression

**Status:** pending
**Dependencies:** 5.1-5.6
**Files:** none (test execution)

**Details:**

- Run existing Telegram tests
- Verify all Telegram flows still work after notification refactoring
- Check that `send_telegram` workflow step still functions
- Verify linking/unlinking flow unchanged
- Build succeeds with no TypeScript errors

---

## Execution Order (Critical Path)

```
Phase 1 (DB + Foundation):     1.1 ──┬── 1.2
                                      │
Phase 2 (Client Library):      2.1 ──┴── 2.2
                                │
Phase 3 (API Routes):    3.1 + 3.2 + 3.3 + 3.4
                                │
Phase 4 (Workflows):     4.1 → 4.2 + 4.3 + 4.4 + 4.5
                                │
Phase 5 (Notifications): 5.1 + 5.2 + 5.3 + 5.4 + 5.5 + 5.6 (all parallel)
                                │
Phase 6 (AI Builder):    6.1 → 6.2 + 6.3
                                │
Phase 7 (Gateway):       7.1 → 7.2 → 7.3 → 7.4
                                │
Phase 8 (Testing):       8.1 + 8.2 + 8.3
```

**Note:** Phases 1-6 (Next.js side) and Phase 7 (Gateway) can be developed in parallel. The Next.js code can be tested with a mock gateway until the real one is deployed.

**Total: 28 tasks across 8 phases**
