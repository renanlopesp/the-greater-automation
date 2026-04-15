-- Extend agents table with AI chat configuration
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS temperature REAL DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 4096,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS conversation_starters JSONB DEFAULT '[]'::jsonb;

-- Agent conversations table
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New conversation',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- Agent messages table
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_conversations
CREATE POLICY "Team members can view conversations for their agents"
  ON agent_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE a.id = agent_conversations.agent_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own conversations"
  ON agent_conversations FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM agents a
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE a.id = agent_conversations.agent_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own conversations"
  ON agent_conversations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own conversations"
  ON agent_conversations FOR DELETE
  USING (user_id = auth.uid());

-- RLS policies for agent_messages
CREATE POLICY "Team members can view messages in their conversations"
  ON agent_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_conversations ac
      JOIN agents a ON a.id = ac.agent_id
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE ac.id = agent_messages.conversation_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON agent_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_conversations ac
      WHERE ac.id = agent_messages.conversation_id
        AND ac.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their conversations"
  ON agent_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agent_conversations ac
      WHERE ac.id = agent_messages.conversation_id
        AND ac.user_id = auth.uid()
    )
  );
