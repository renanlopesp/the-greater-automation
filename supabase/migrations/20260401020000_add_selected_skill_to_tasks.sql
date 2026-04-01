-- Add selected_skill column to tasks table
-- Stores the skill selected by the user at task creation time
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS selected_skill TEXT;
