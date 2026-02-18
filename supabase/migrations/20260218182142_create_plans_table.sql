-- Create plans table with 3-tier plan system (Free / Pro / Enterprise)
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stripe_product_id TEXT,
  steps_limit INTEGER NOT NULL DEFAULT 1000,
  ai_credits_limit NUMERIC NOT NULL DEFAULT 100,
  max_team_members INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: publicly readable (no sensitive data)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plans" ON plans FOR SELECT USING (true);

-- Seed plan data
INSERT INTO plans (id, name, description, stripe_product_id, steps_limit, ai_credits_limit, max_team_members, features, sort_order) VALUES
  ('free', 'Free', 'For individuals getting started', NULL, 300, 100, 1,
   '{"invite_members": false, "workspace_connections": false}', 0),
  ('pro', 'Pro', 'For teams that need collaboration', NULL, 10000, 1000, 10,
   '{"invite_members": true, "workspace_connections": true}', 1),
  ('enterprise', 'Enterprise', 'For organizations at scale', NULL, 100000, 10000, 50,
   '{"invite_members": true, "workspace_connections": true, "priority_support": true}', 2);
