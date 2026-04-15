-- Add orchestrator notification fields to existing notifications table
-- These fields support agent-generated notifications with urgency levels

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS urgency text CHECK (urgency IN ('urgent', 'opportunity', 'insight')),
  ADD COLUMN IF NOT EXISTS source_agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- Index for fast queries on team unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_team_unread
  ON notifications (team_id, is_read, created_at DESC);

-- Allow service role full access for agent-generated notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON notifications FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END$$;
