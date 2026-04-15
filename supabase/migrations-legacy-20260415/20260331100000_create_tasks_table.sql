-- Create tasks table for task-based architecture
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID,
  title TEXT NOT NULL DEFAULT 'New task',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  active_skill TEXT,
  skill_status TEXT DEFAULT 'idle' CHECK (skill_status IN ('idle', 'running', 'completed', 'failed')),
  artifact_type TEXT,
  artifact_data JSONB DEFAULT '{}',
  initial_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_team_user ON tasks(team_id, user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- RLS: users can only see tasks from their team
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own team tasks"
  ON tasks FOR SELECT
  USING (team_id IN (
    SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (user_id = auth.uid() AND team_id IN (
    SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own team tasks"
  ON tasks FOR UPDATE
  USING (team_id IN (
    SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()
  ));

-- Service role bypass for API routes
CREATE POLICY "Service role full access"
  ON tasks FOR ALL
  USING (auth.role() = 'service_role');
