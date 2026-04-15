-- Add agent_messages and agent_conversations to Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agent_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE agent_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agent_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE agent_conversations;
  END IF;
END $$;
