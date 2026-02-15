# Data Model: App Event Triggers

**Feature**: 021-app-event-triggers
**Date**: 2026-02-15

## Entity Relationship

```
app_connections (existing)
  └── trigger_subscriptions (NEW) ──┐
                                    ├── agent_workflows (existing, extended)
agent_workflows (existing)  ────────┘
  └── agent_workflow_runs (existing, extended)
```

## New Table: `trigger_subscriptions`

Stores active Composio trigger subscriptions linked to workflows.

| Column              | Type        | Constraints                                          | Description                                            |
| ------------------- | ----------- | ---------------------------------------------------- | ------------------------------------------------------ |
| id                  | uuid        | PK, default gen_random_uuid()                        | Internal ID                                            |
| agent_workflow_id   | uuid        | FK → agent_workflows(id) ON DELETE CASCADE, NOT NULL | Linked workflow                                        |
| agent_id            | uuid        | FK → agents(id) ON DELETE CASCADE, NOT NULL          | Owning agent                                           |
| user_id             | uuid        | FK → auth.users(id) ON DELETE CASCADE, NOT NULL      | User who created                                       |
| composio_trigger_id | text        | NOT NULL                                             | Composio's trigger instance ID (e.g., "ti_abc123")     |
| trigger_slug        | text        | NOT NULL                                             | Composio trigger type (e.g., "GITHUB_COMMIT_EVENT")    |
| app_id              | text        | NOT NULL                                             | App identifier (e.g., "github", "discord")             |
| trigger_config      | jsonb       | DEFAULT '{}'                                         | Composio trigger configuration (e.g., { owner, repo }) |
| filters             | jsonb       | DEFAULT '[]'                                         | Event filters (array of WorkflowCondition)             |
| field_mappings      | jsonb       | DEFAULT '{}'                                         | Maps event fields to workflow variables                |
| is_enabled          | boolean     | DEFAULT true, NOT NULL                               | Active/paused state                                    |
| last_event_at       | timestamptz | NULL                                                 | Last event received                                    |
| event_count         | integer     | DEFAULT 0, NOT NULL                                  | Total events received                                  |
| created_at          | timestamptz | DEFAULT now(), NOT NULL                              | Creation time                                          |
| updated_at          | timestamptz | DEFAULT now(), NOT NULL                              | Last update                                            |

**Indexes**:

- `idx_trigger_subs_workflow` ON (agent_workflow_id)
- `idx_trigger_subs_agent` ON (agent_id)
- `idx_trigger_subs_composio_id` ON (composio_trigger_id) UNIQUE
- `idx_trigger_subs_enabled` ON (agent_id, is_enabled) WHERE is_enabled = true

**RLS**:

- SELECT/INSERT/UPDATE/DELETE: `auth.uid() = user_id`

## Extended Table: `agent_workflows`

Existing table — add column for app event trigger association.

| Column (new)            | Type | Constraints                                             | Description                         |
| ----------------------- | ---- | ------------------------------------------------------- | ----------------------------------- |
| trigger_subscription_id | uuid | FK → trigger_subscriptions(id) ON DELETE SET NULL, NULL | Link to active trigger subscription |

## Extended Table: `agent_workflow_runs`

Existing table — add columns for pipeline step tracking and event correlation.

| Column (new)       | Type    | Constraints  | Description                           |
| ------------------ | ------- | ------------ | ------------------------------------- |
| event_log_id       | text    | NULL         | Composio event log_id for idempotency |
| pipeline_steps     | jsonb   | DEFAULT '[]' | Array of step execution records       |
| current_step_index | integer | DEFAULT 0    | Index of currently executing step     |

**Index**:

- `idx_workflow_runs_event_log` ON (event_log_id) WHERE event_log_id IS NOT NULL

## Extended Type: `WorkflowTriggerConfig` Union

Add `app_event` variant to existing union in `src/lib/workflows/types.ts`:

```typescript
export interface AppEventTriggerConfig {
  type: 'app_event'
  trigger_subscription_id: string // FK to trigger_subscriptions
  trigger_slug: string // e.g., "GITHUB_COMMIT_EVENT"
  app_id: string // e.g., "github"
}
```

## Extended Type: `WorkflowActionConfig` Union

Add `claude_agent` variant to existing action types:

```typescript
export interface ClaudeAgentActionConfig {
  type: 'claude_agent'
  prompt: string // System prompt template, supports {{trigger.field}} and {{prev.key}}
  output_key: string // Key to store structured result
  tools?: string[] // Composio tool IDs the agent can use
  model?: string // Model override (default: configured model)
  timeout_ms?: number // Max execution time (default: 300000 = 5 min)
  output_format?: 'json' | 'text' // Expected output format
}
```

## Pipeline Step Record (JSONB in `pipeline_steps`)

```typescript
export interface PipelineStepRecord {
  step_index: number
  action_type: WorkflowActionType
  action_config: WorkflowActionConfig
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  input: Record<string, unknown> | null
  output: unknown | null
  error: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
}
```

## State Transitions

### Trigger Subscription States

```
created → enabled → disabled → enabled (toggle)
                  → deleted (permanent)
```

### Pipeline Run States

```
pending → running → completed
                  → failed
                  → skipped (conditions not met)
```

### Pipeline Step States

```
pending → running → completed
                  → failed → (subsequent steps become 'skipped')
                  → skipped (previous step failed or condition not met)
```
