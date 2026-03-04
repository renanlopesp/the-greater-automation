-- WhatsApp message queue (mirrors telegram_message_queue)
CREATE TABLE IF NOT EXISTS whatsapp_message_queue (
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

-- Indexes
CREATE INDEX idx_whatsapp_queue_status ON whatsapp_message_queue(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_whatsapp_queue_link ON whatsapp_message_queue(link_id);

-- RLS
ALTER TABLE whatsapp_message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to whatsapp queue"
  ON whatsapp_message_queue FOR ALL TO service_role USING (true);
