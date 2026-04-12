-- Recreate messaging_links with the schema the code expects.
-- Previous (drifted) schema used `platform`/`chat_id`/`is_active`; code expects
-- `user_id`/`channel_type`/`external_chat_id`/`is_verified`/`verification_code`.

DROP TABLE IF EXISTS messaging_links CASCADE;

CREATE TABLE messaging_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL DEFAULT 'telegram',
  external_chat_id TEXT NOT NULL DEFAULT '',
  external_username TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_code TEXT,
  verification_expires_at TIMESTAMPTZ,
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (channel_type, external_chat_id),
  UNIQUE (user_id, channel_type)
);

CREATE INDEX idx_messaging_links_lookup ON messaging_links (channel_type, external_chat_id) WHERE is_verified = true;
CREATE INDEX idx_messaging_links_user ON messaging_links (user_id);
CREATE INDEX idx_messaging_links_verification ON messaging_links (verification_code) WHERE verification_code IS NOT NULL;
CREATE INDEX idx_messaging_links_team_id ON messaging_links (team_id);

ALTER TABLE messaging_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messaging links"
  ON messaging_links FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own messaging links"
  ON messaging_links FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own messaging links"
  ON messaging_links FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own messaging links"
  ON messaging_links FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access on messaging links"
  ON messaging_links FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Team members can view team messaging links"
  ON messaging_links
  FOR SELECT
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()
    )
  );
