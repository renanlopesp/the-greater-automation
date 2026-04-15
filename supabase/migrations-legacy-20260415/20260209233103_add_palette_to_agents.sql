-- Add palette column to agents for card color theming
ALTER TABLE agents ADD COLUMN palette TEXT NOT NULL DEFAULT 'blue';
