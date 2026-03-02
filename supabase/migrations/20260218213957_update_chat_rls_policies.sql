-- Drop old per-user policies on agent_conversations
DROP POLICY IF EXISTS "Users can create own conversations" ON agent_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON agent_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON agent_conversations;

-- Drop old per-user policies on agent_messages
DROP POLICY IF EXISTS "Users can insert messages in own conversations" ON agent_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON agent_messages;

-- Team-scoped policies for agent_conversations
CREATE POLICY "Team members can create conversations" ON agent_conversations
  FOR INSERT WITH CHECK (
    agent_id IN (
      SELECT a.id FROM agents a
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update conversations" ON agent_conversations
  FOR UPDATE USING (
    agent_id IN (
      SELECT a.id FROM agents a
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can delete conversations" ON agent_conversations
  FOR DELETE USING (
    agent_id IN (
      SELECT a.id FROM agents a
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );

-- Team-scoped policies for agent_messages
CREATE POLICY "Team members can send messages" ON agent_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT ac.id FROM agent_conversations ac
      JOIN agents a ON a.id = ac.agent_id
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can delete messages" ON agent_messages
  FOR DELETE USING (
    conversation_id IN (
      SELECT ac.id FROM agent_conversations ac
      JOIN agents a ON a.id = ac.agent_id
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );
