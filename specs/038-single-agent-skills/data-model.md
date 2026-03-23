# Data Model: Single Agent + Skills Migration

## Entity Relationship

```
teams (1) ──── (N) skills
teams (1) ──── (N) skill_executions
teams (1) ──── (1) agents [Snew only]

skills (1) ──── (N) skill_executions
skills (N) ──── (N) skills [dependencies: skill A depends on skill B]

conversations (1) ──── (N) conversation_messages
conversations (N) ──── (1) teams
skill_executions (N) ──── (1) conversations

-- LEGACY (read-only, no new writes)
agents (1) ──── (N) agent_conversations
agent_conversations (1) ──── (N) agent_messages
agents (1) ──── (N) agent_skills
agents (1) ──── (N) agent_workflows
```

## New Entities

### skills

Represents a capability that Snew can activate. Combines static definition (from code registry) with per-team state (from DB).

| Field                | Type        | Constraints                   | Description                                                                                 |
| -------------------- | ----------- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| id                   | uuid        | PK, auto                      |                                                                                             |
| team_id              | uuid        | FK → teams, NOT NULL          | Team that owns this skill instance                                                          |
| slug                 | text        | NOT NULL                      | Unique identifier (e.g. 'copywriter', 'seasonal-calendar')                                  |
| name                 | text        | NOT NULL                      | Display name                                                                                |
| description          | text        |                               | What the skill does                                                                         |
| category             | text        | NOT NULL                      | 'foundation', 'campaign', 'content', 'retention', 'analytics', 'ads', 'operations', 'scale' |
| phase                | int         | NOT NULL, default 1           | Roadmap phase (1-4)                                                                         |
| system_prompt        | text        |                               | Prompt template injected when skill activates                                               |
| tools                | jsonb       | default '[]'                  | Tools available to this skill                                                               |
| knowledge            | jsonb       | default '[]'                  | Documents/context loaded when skill activates                                               |
| input_schema         | jsonb       |                               | JSON Schema for expected input                                                              |
| output_schema        | jsonb       |                               | JSON Schema for structured output                                                           |
| dependencies         | text[]      | default '{}'                  | Slugs of skills that must be active first                                                   |
| status               | text        | NOT NULL, default 'available' | 'available', 'active', 'deprecated'                                                         |
| is_native            | boolean     | default false                 | True = native orchestrator capability                                                       |
| requires_connections | text[]      | default '{}'                  | Required app connections (e.g. 'nuvemshop')                                                 |
| icon                 | text        |                               | Lucide icon name                                                                            |
| color                | text        |                               | Card color                                                                                  |
| created_at           | timestamptz | default now()                 |                                                                                             |
| updated_at           | timestamptz | default now()                 |                                                                                             |

**Unique constraint**: (team_id, slug)

**State transitions**:

```
available → active    (user activates skill)
active → available    (user deactivates skill)
active → deprecated   (skill removed from registry)
available → deprecated (skill removed from registry)
```

**Validation rules**:

- slug must match pattern `[a-z0-9-]+`
- category must be one of the 8 valid categories
- status must be one of: 'available', 'active', 'deprecated'
- phase must be 1-4
- dependencies must reference existing skill slugs

### skill_executions

Tracks every time a skill is invoked during a conversation.

| Field               | Type        | Constraints                 | Description                        |
| ------------------- | ----------- | --------------------------- | ---------------------------------- |
| id                  | uuid        | PK, auto                    |                                    |
| skill_id            | uuid        | FK → skills, NOT NULL       | Which skill was executed           |
| team_id             | uuid        | FK → teams, NOT NULL        | Team context                       |
| conversation_id     | uuid        | FK → conversations          | Which conversation triggered this  |
| input               | jsonb       |                             | Data passed to the skill           |
| output              | jsonb       |                             | Structured result from the skill   |
| status              | text        | NOT NULL, default 'running' | 'running', 'completed', 'failed'   |
| error_message       | text        |                             | Error details if status = 'failed' |
| duration_ms         | int         |                             | Execution time                     |
| triggered_by        | text        | default 'user'              | 'user', 'auto', 'skill' (chain)    |
| parent_execution_id | uuid        | FK → skill_executions       | If triggered by another skill      |
| created_at          | timestamptz | default now()               |                                    |
| completed_at        | timestamptz |                             |                                    |

**State transitions**:

```
running → completed   (skill finishes successfully)
running → failed      (skill errors)
```

## Modified Entities

### agents (simplified)

The `agents` table remains but is reduced to a single row per team (Snew). No schema change needed — the existing columns are sufficient. The key behavioral change is:

- `is_orchestrator = true` is the only row that matters
- Other rows (legacy installed agents) are kept but no longer referenced by the chat system
- No new agents are created

### conversations + conversation_messages (unified)

These tables already exist for the orchestrator. No schema change needed. The behavioral change is:

- ALL new conversations go here (previously some went to `agent_conversations`)
- The `conversation_messages` table gets a new optional column:

| Field      | Type | Constraints | Description                                            |
| ---------- | ---- | ----------- | ------------------------------------------------------ |
| skill_slug | text | nullable    | Which skill was active when this message was generated |

## Legacy Entities (read-only)

These tables are NOT modified or deleted. They remain for historical data access.

- `agent_conversations` — previous per-agent conversations
- `agent_messages` — previous per-agent messages
- `agent_skills` — previous per-agent knowledge/procedure skills
- `agent_workflows` — previous per-agent workflow links

New code MUST NOT insert into these tables. Read access is permitted for historical data display.

## Indexes

```sql
-- skills
CREATE INDEX idx_skills_team_id ON skills(team_id);
CREATE INDEX idx_skills_team_status ON skills(team_id, status);
CREATE INDEX idx_skills_slug ON skills(slug);

-- skill_executions
CREATE INDEX idx_skill_executions_skill_id ON skill_executions(skill_id);
CREATE INDEX idx_skill_executions_team_id ON skill_executions(team_id);
CREATE INDEX idx_skill_executions_conversation_id ON skill_executions(conversation_id);
CREATE INDEX idx_skill_executions_created_at ON skill_executions(created_at DESC);
```

## RLS Policies

```sql
-- skills: team members can read/update their team's skills
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can read skills" ON skills
  FOR SELECT USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "Team members can update skills" ON skills
  FOR UPDATE USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- skill_executions: team members can read their team's executions
ALTER TABLE skill_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can read executions" ON skill_executions
  FOR SELECT USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));
```

## Seed Data

The initial migration seeds `skills` from the code registry (`src/data/skills.ts`) for each existing team. Each of the 34 agent definitions becomes a skill with status 'available'. Skills that were previously "installed" as agents get status 'active'.
