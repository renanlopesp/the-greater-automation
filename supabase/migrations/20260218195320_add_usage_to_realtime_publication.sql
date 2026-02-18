-- Add usage table to Supabase Realtime publication
-- Enables real-time billing updates in the settings dialog
ALTER PUBLICATION supabase_realtime ADD TABLE usage;
