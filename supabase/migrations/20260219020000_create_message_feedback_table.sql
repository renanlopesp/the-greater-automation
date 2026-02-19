-- Message feedback (like/dislike) for agent messages
CREATE TABLE message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES agent_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback TEXT NOT NULL CHECK (feedback IN ('like', 'dislike')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

-- Index for fast lookups by message
CREATE INDEX idx_message_feedback_message_id ON message_feedback(message_id);

-- Auto-update updated_at
CREATE TRIGGER set_message_feedback_updated_at
  BEFORE UPDATE ON message_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;

-- Users can read feedback on messages in conversations they have access to
CREATE POLICY "Users can read feedback on accessible messages"
  ON message_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_messages am
      JOIN agent_conversations ac ON ac.id = am.conversation_id
      JOIN agents a ON a.id = ac.agent_id
      WHERE am.id = message_feedback.message_id
        AND a.team_id IN (SELECT get_user_team_ids(auth.uid()))
    )
  );

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON message_feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own feedback
CREATE POLICY "Users can update own feedback"
  ON message_feedback FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own feedback
CREATE POLICY "Users can delete own feedback"
  ON message_feedback FOR DELETE
  USING (user_id = auth.uid());
