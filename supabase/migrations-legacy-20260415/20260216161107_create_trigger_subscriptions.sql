-- Create trigger_subscriptions table
CREATE TABLE trigger_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_workflow_id uuid NOT NULL REFERENCES agent_workflows(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  composio_trigger_id text NOT NULL,
  trigger_slug text NOT NULL,
  app_id text NOT NULL,
  trigger_config jsonb DEFAULT '{}'::jsonb,
  filters jsonb DEFAULT '[]'::jsonb,
  field_mappings jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  last_event_at timestamptz,
  event_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE trigger_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Service role full access to trigger subscriptions"
  ON trigger_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own trigger subscriptions"
  ON trigger_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create trigger subscriptions"
  ON trigger_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trigger subscriptions"
  ON trigger_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trigger subscriptions"
  ON trigger_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Index for webhook lookups
CREATE INDEX idx_trigger_subscriptions_slug_enabled
  ON trigger_subscriptions(trigger_slug, is_enabled);
