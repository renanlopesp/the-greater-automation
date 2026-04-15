-- Queue table for Telegram messages; referenced by database.types.ts but never applied.
-- Supports the webhook inline processor (no pg_net trigger required).

CREATE TABLE telegram_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  username TEXT,
  link_id UUID REFERENCES messaging_links(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_tmq_status ON telegram_message_queue (status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_tmq_link_id ON telegram_message_queue (link_id);
CREATE INDEX idx_tmq_created_at ON telegram_message_queue (created_at DESC);

ALTER TABLE telegram_message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on telegram_message_queue"
  ON telegram_message_queue FOR ALL
  USING (auth.role() = 'service_role');
