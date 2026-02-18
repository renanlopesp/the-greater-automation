-- Add plan_id column to teams table
ALTER TABLE teams ADD COLUMN plan_id TEXT NOT NULL DEFAULT 'free' REFERENCES plans(id);

-- Backfill: create free subscriptions for existing teams that don't have one
INSERT INTO subscriptions (team_id, plan_id, status)
SELECT id, 'free', 'active' FROM teams
WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE subscriptions.team_id = teams.id);
