-- SnewClaw integration: 5 new tables + plan/agent alterations
-- Supports per-user containerized agent instances via Fly.io Machines

------------------------------------------------------------
-- 1. snewclaw_instances (one per user)
------------------------------------------------------------
CREATE TABLE snewclaw_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  fly_machine_id TEXT,
  fly_volume_id TEXT,
  status TEXT NOT NULL DEFAULT 'not_provisioned'
    CHECK (status IN (
      'not_provisioned', 'provisioning', 'stopped', 'starting',
      'running', 'stopping', 'error', 'destroying'
    )),
  region TEXT NOT NULL DEFAULT 'gru',
  config JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  last_activity_at TIMESTAMPTZ,
  last_health_check_at TIMESTAMPTZ,
  consecutive_failures INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_snewclaw_instances_user_id ON snewclaw_instances(user_id);
CREATE INDEX idx_snewclaw_instances_team_id ON snewclaw_instances(team_id);
CREATE INDEX idx_snewclaw_instances_status ON snewclaw_instances(status);

CREATE TRIGGER set_snewclaw_instances_updated_at
  BEFORE UPDATE ON snewclaw_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE snewclaw_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own instances"
  ON snewclaw_instances FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own instances"
  ON snewclaw_instances FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own instances"
  ON snewclaw_instances FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own instances"
  ON snewclaw_instances FOR DELETE
  USING (user_id = auth.uid());

------------------------------------------------------------
-- 2. snewclaw_secrets (encrypted API keys, bot tokens)
------------------------------------------------------------
CREATE TABLE snewclaw_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

CREATE INDEX idx_snewclaw_secrets_user_id ON snewclaw_secrets(user_id);

CREATE TRIGGER set_snewclaw_secrets_updated_at
  BEFORE UPDATE ON snewclaw_secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE snewclaw_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own secrets"
  ON snewclaw_secrets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own secrets"
  ON snewclaw_secrets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own secrets"
  ON snewclaw_secrets FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own secrets"
  ON snewclaw_secrets FOR DELETE
  USING (user_id = auth.uid());

------------------------------------------------------------
-- 3. snewclaw_commands (command queue: Snew -> Container)
------------------------------------------------------------
CREATE TABLE snewclaw_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  instance_id UUID NOT NULL REFERENCES snewclaw_instances(id) ON DELETE CASCADE,
  command TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_snewclaw_commands_instance_id ON snewclaw_commands(instance_id);
CREATE INDEX idx_snewclaw_commands_status ON snewclaw_commands(status);

ALTER TABLE snewclaw_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own commands"
  ON snewclaw_commands FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own commands"
  ON snewclaw_commands FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own commands"
  ON snewclaw_commands FOR UPDATE
  USING (user_id = auth.uid());

------------------------------------------------------------
-- 4. snewclaw_messages (chat with SnewClaw)
------------------------------------------------------------
CREATE TABLE snewclaw_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  instance_id UUID NOT NULL REFERENCES snewclaw_instances(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_snewclaw_messages_instance_id ON snewclaw_messages(instance_id);
CREATE INDEX idx_snewclaw_messages_created_at ON snewclaw_messages(created_at);

ALTER TABLE snewclaw_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages"
  ON snewclaw_messages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own messages"
  ON snewclaw_messages FOR INSERT
  WITH CHECK (user_id = auth.uid());

------------------------------------------------------------
-- 5. snewclaw_events (audit log)
------------------------------------------------------------
CREATE TABLE snewclaw_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES snewclaw_instances(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_snewclaw_events_instance_id ON snewclaw_events(instance_id);
CREATE INDEX idx_snewclaw_events_created_at ON snewclaw_events(created_at);

ALTER TABLE snewclaw_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read events for own instances"
  ON snewclaw_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM snewclaw_instances si
      WHERE si.id = snewclaw_events.instance_id
        AND si.user_id = auth.uid()
    )
  );

------------------------------------------------------------
-- 6. Extend plans table for SnewClaw limits
------------------------------------------------------------
ALTER TABLE plans ADD COLUMN max_snewclaw_instances INT NOT NULL DEFAULT 0;
ALTER TABLE plans ADD COLUMN snewclaw_idle_timeout_minutes INT NOT NULL DEFAULT 30;

UPDATE plans SET max_snewclaw_instances = 0, snewclaw_idle_timeout_minutes = 0
  WHERE id = 'free';
UPDATE plans SET max_snewclaw_instances = 1, snewclaw_idle_timeout_minutes = 60
  WHERE id = 'pro';
UPDATE plans SET max_snewclaw_instances = 5, snewclaw_idle_timeout_minutes = 120
  WHERE id = 'enterprise';

------------------------------------------------------------
-- 7. Extend agents table for parent-child relationship
------------------------------------------------------------
ALTER TABLE agents ADD COLUMN snewclaw_instance_id UUID
  REFERENCES snewclaw_instances(id) ON DELETE SET NULL;

------------------------------------------------------------
-- 8. Publish to Supabase Realtime
------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE snewclaw_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE snewclaw_commands;
ALTER PUBLICATION supabase_realtime ADD TABLE snewclaw_messages;
