-- Add skill_slug to conversation_messages to track which skill generated each message
alter table public.conversation_messages
  add column if not exists skill_slug text;
