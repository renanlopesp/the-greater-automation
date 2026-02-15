# Data Model: Structured Skills & Terminology Alignment

## Entity Relationship

```
agents 1──* agent_skills (renamed from agent_knowledge_skills)
agents 1──* agent_workflows (renamed from agent_skills)
agent_workflows 1──* agent_workflow_runs (renamed from agent_skill_runs)
```

## Tables

### `agent_skills` (renamed from `agent_knowledge_skills`)

Structured capability packages that extend agent behavior.

| Column      | Type        | Default           | Nullable | Description                                  |
| ----------- | ----------- | ----------------- | -------- | -------------------------------------------- |
| id          | uuid        | gen_random_uuid() | NO       | Primary key                                  |
| agent_id    | uuid        | —                 | NO       | FK → agents(id) ON DELETE CASCADE            |
| name        | text        | —                 | NO       | Skill name                                   |
| description | text        | —                 | YES      | Short description for progressive disclosure |
| content     | text        | —                 | NO       | Structured markdown content                  |
| type        | text        | 'knowledge'       | NO       | Skill type: 'knowledge' or 'procedure'       |
| parameters  | jsonb       | null              | YES      | Parameter definitions for procedure skills   |
| version     | integer     | 1                 | NO       | Version number (increments on update)        |
| source      | text        | 'manual'          | NO       | Creation source: 'manual', 'chat'            |
| is_enabled  | boolean     | true              | YES      | Whether skill is active                      |
| metadata    | jsonb       | '{}'              | NO       | Extensible metadata (tags, author, etc.)     |
| created_at  | timestamptz | now()             | NO       | Created timestamp                            |
| updated_at  | timestamptz | now()             | NO       | Updated timestamp                            |

**New columns** (added during rename migration): `type`, `parameters`, `version`, `metadata`

**Indexes**:

- `idx_agent_skills_agent_id` on (agent_id)
- `idx_agent_skills_type` on (type)

**RLS Policies**:

- SELECT: Team members can view skills via agent's team
- INSERT/UPDATE/DELETE: Team members can manage skills via agent's team

**Check constraint**: `type IN ('knowledge', 'procedure')`

### `agent_workflows` (renamed from `agent_skills`)

Trigger-based automation rules following WHEN → IF → THEN pattern.

| Column          | Type        | Default           | Nullable | Description                       |
| --------------- | ----------- | ----------------- | -------- | --------------------------------- |
| id              | uuid        | gen_random_uuid() | NO       | Primary key                       |
| agent_id        | uuid        | —                 | NO       | FK → agents(id) ON DELETE CASCADE |
| workflow_id     | uuid        | —                 | YES      | FK → workflows(id)                |
| name            | text        | —                 | NO       | Workflow name                     |
| description     | text        | —                 | YES      | Description                       |
| source          | text        | —                 | YES      | 'manual', 'dynamic', 'rule'       |
| action_template | jsonb       | —                 | YES      | Template for dynamic workflows    |
| trigger_config  | jsonb       | —                 | YES      | Trigger configuration             |
| conditions      | jsonb       | '[]'              | NO       | Condition array                   |
| actions         | jsonb       | '[]'              | NO       | Action array                      |
| is_enabled      | boolean     | true              | NO       | Whether workflow is active        |
| execution_mode  | text        | 'auto'            | NO       | 'auto', 'confirm', 'draft'        |
| last_run_at     | timestamptz | —                 | YES      | Last execution time               |
| run_count       | integer     | 0                 | NO       | Total execution count             |
| created_at      | timestamptz | now()             | NO       | Created timestamp                 |
| updated_at      | timestamptz | now()             | NO       | Updated timestamp                 |

**No schema changes** — just rename from `agent_skills`.

**Indexes**:

- `idx_agent_workflows_agent_id` on (agent_id)

**Unique constraint**: `(agent_id, workflow_id)`

### `agent_workflow_runs` (renamed from `agent_skill_runs`)

Execution history for agent workflows.

| Column            | Type        | Default           | Nullable | Description                                                                    |
| ----------------- | ----------- | ----------------- | -------- | ------------------------------------------------------------------------------ |
| id                | uuid        | gen_random_uuid() | NO       | Primary key                                                                    |
| workflow_id       | uuid        | —                 | NO       | FK → agent_workflows(id) ON DELETE CASCADE                                     |
| agent_id          | uuid        | —                 | NO       | FK → agents(id) ON DELETE CASCADE                                              |
| status            | text        | 'pending'         | NO       | 'pending', 'running', 'completed', 'failed', 'skipped', 'waiting_confirmation' |
| trigger_data      | jsonb       | —                 | YES      | Incoming trigger payload                                                       |
| condition_results | jsonb       | —                 | YES      | Evaluation results                                                             |
| actions_executed  | jsonb       | —                 | YES      | Action execution details                                                       |
| error             | text        | —                 | YES      | Error message if failed                                                        |
| started_at        | timestamptz | —                 | YES      | Execution start                                                                |
| completed_at      | timestamptz | —                 | YES      | Execution end                                                                  |
| duration_ms       | integer     | —                 | YES      | Duration in milliseconds                                                       |
| created_at        | timestamptz | now()             | NO       | Created timestamp                                                              |

**Column rename**: `skill_id` → `workflow_id`

**Indexes** (renamed):

- `idx_workflow_runs_workflow_id` on (workflow_id)
- `idx_workflow_runs_agent_id` on (agent_id)
- `idx_workflow_runs_status` on (status)
- `idx_workflow_runs_created_at` on (created_at DESC)

## Procedure Skill Parameters Schema

The `parameters` JSONB column for procedure skills follows this structure:

```json
{
  "params": [
    {
      "name": "branch",
      "type": "string",
      "required": true,
      "default": null,
      "description": "Git branch to deploy"
    },
    {
      "name": "environment",
      "type": "enum",
      "required": true,
      "default": "staging",
      "options": ["staging", "production"],
      "description": "Target deployment environment"
    }
  ]
}
```

## Migration Order

Critical: must rename in correct order to avoid name collision.

1. `agent_skills` → `agent_workflows` (frees the name `agent_skills`)
2. `agent_skill_runs` → `agent_workflow_runs` (update FK column `skill_id` → `workflow_id`)
3. `agent_knowledge_skills` → `agent_skills` (takes the freed name)
4. Add new columns to `agent_skills`: `type`, `parameters`, `version`, `metadata`
5. Rename indexes and RLS policies for clarity
