# Data Model: Autonomous Agent with Dynamic Skill Creation

**Feature**: 018-autonomous-agent-skills
**Date**: 2026-02-13

## Entity Relationship

```
agents (existing)
  ├── 1:N → agent_conversations (existing)
  │          └── 1:N → agent_messages (existing, extended)
  ├── 1:N → agent_skills (existing, extended)
  └── N:1 → teams (existing)

app_connections (existing)
  └── user_id → auth.users
  └── composio_connection_id → Composio (external)
```

## Entities

### agents (EXISTING — no schema changes needed)

Current columns are sufficient for this feature:

- `id`, `team_id`, `name`, `description`, `system_prompt`, `model`, `temperature`, `max_tokens`, `is_active`, `status`, `conversation_starters`

The `status` column (`idle` | `running`) will be updated by the chat route when the agent is executing tools.

### agent_conversations (EXISTING — no schema changes needed)

- `id`, `agent_id`, `user_id`, `title`, `created_at`, `updated_at`

### agent_messages (EXISTING — no schema changes needed)

The existing schema already supports everything we need:

| Column            | Type        | Purpose                               |
| ----------------- | ----------- | ------------------------------------- |
| `id`              | UUID PK     | Message identifier                    |
| `conversation_id` | UUID FK     | Links to conversation                 |
| `role`            | TEXT CHECK  | `user`, `assistant`, `system`, `tool` |
| `content`         | TEXT        | Message text or tool result JSON      |
| `metadata`        | JSONB       | Tool call details (see below)         |
| `created_at`      | TIMESTAMPTZ | Ordering                              |

**Metadata by role**:

```typescript
// role: 'user' — no metadata needed
{}

// role: 'assistant' — text response, no metadata
{}

// role: 'assistant' — tool calling response (content may be empty)
{
  "tool_calls": [
    {
      "id": "call_abc123",
      "type": "function",
      "function": {
        "name": "GITHUB_CREATE_ISSUE",
        "arguments": "{\"owner\":\"renanlopesp\",\"repo\":\"relay\",\"title\":\"Fix login bug\"}"
      }
    }
  ]
}

// role: 'tool' — tool execution result
{
  "tool_call_id": "call_abc123",
  "action_name": "GITHUB_CREATE_ISSUE",
  "app_id": "github",
  "success": true,
  "duration_ms": 2340
}
```

### agent_skills (EXISTING — schema extension needed)

**Current schema**:

```sql
agent_skills (
  id UUID PK,
  agent_id UUID FK → agents,
  workflow_id UUID FK → workflows NOT NULL,  -- ← must become optional
  name TEXT NOT NULL,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_at, updated_at
)
```

**Required changes**:

```sql
-- Make workflow_id optional (dynamic skills don't have a workflow)
ALTER TABLE agent_skills ALTER COLUMN workflow_id DROP NOT NULL;

-- Add action template for dynamic skills
ALTER TABLE agent_skills ADD COLUMN action_template JSONB;

-- Add description for better discovery
ALTER TABLE agent_skills ADD COLUMN description TEXT;

-- Add source tracking
ALTER TABLE agent_skills ADD COLUMN source TEXT DEFAULT 'manual'
  CHECK (source IN ('manual', 'dynamic'));
```

**After migration**:
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `agent_id` | UUID FK | |
| `workflow_id` | UUID FK (nullable) | NULL for dynamic skills |
| `name` | TEXT | Skill name (user-defined or AI-suggested) |
| `description` | TEXT (nullable) | What the skill does |
| `action_template` | JSONB (nullable) | Saved action sequence (see below) |
| `source` | TEXT | `manual` (workflow-linked) or `dynamic` (AI-created) |
| `last_run_at` | TIMESTAMPTZ | |
| `run_count` | INTEGER | |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**action_template JSONB schema**:

Single-action skill:

```json
{
  "type": "single",
  "action": {
    "name": "GITHUB_CREATE_ISSUE",
    "app_id": "github",
    "parameter_template": {
      "owner": "renanlopesp",
      "repo": "relay",
      "title": "{{title}}",
      "body": "{{body}}"
    }
  }
}
```

Multi-action skill:

```json
{
  "type": "multi",
  "steps": [
    {
      "action": "GITHUB_LIST_PRS",
      "app_id": "github",
      "parameter_template": { "owner": "renanlopesp", "repo": "relay", "state": "open" },
      "output_key": "prs"
    },
    {
      "action": "SLACK_SEND_MESSAGE",
      "app_id": "slack",
      "parameter_template": {
        "channel": "#engineering",
        "text": "Open PRs: {{prs}}"
      }
    }
  ]
}
```

### app_connections (EXISTING — no changes needed)

| Column                   | Type        | Notes                            |
| ------------------------ | ----------- | -------------------------------- |
| `id`                     | UUID PK     |                                  |
| `user_id`                | UUID FK     |                                  |
| `app_id`                 | TEXT        | e.g., `github`, `slack`, `gmail` |
| `account_label`          | TEXT        |                                  |
| `composio_connection_id` | TEXT        | Composio's connection ID         |
| `created_at`             | TIMESTAMPTZ |                                  |

Used by tool catalog builder to determine which apps the user has connected.

## State Transitions

### Agent Status

```
idle → running (when chat route starts tool execution)
running → idle (when tool execution loop completes or errors)
```

Updated via direct DB update in the chat route.

### Message Flow

```
1. User sends message
   → INSERT agent_messages (role: 'user')

2. AI responds with tool calls
   → INSERT agent_messages (role: 'assistant', metadata: {tool_calls: [...]})

3. Each tool executes
   → INSERT agent_messages (role: 'tool', metadata: {tool_call_id, success, ...})

4. AI responds with text (after all tools complete)
   → INSERT agent_messages (role: 'assistant', content: "Done! ...")
```

## Validation Rules

| Entity                       | Rule                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| agent_messages.role          | Must be one of: `user`, `assistant`, `system`, `tool` (DB CHECK constraint)          |
| agent_messages.content       | NOT NULL (tool messages store result JSON as text)                                   |
| agent_skills.action_template | Must be valid JSON with `type: "single"` or `type: "multi"` when source is `dynamic` |
| agent_skills                 | Either `workflow_id` or `action_template` must be non-null                           |
| Tool execution               | Max 10 tool calls per single chat request (prevent runaway)                          |
| Context window               | Max 50 messages loaded as AI context per request                                     |

## Indexes

```sql
-- Already exists:
-- agent_messages: conversation_id (FK index)
-- agent_conversations: agent_id (FK index)

-- Recommended additions:
CREATE INDEX idx_agent_messages_conversation_created
  ON agent_messages(conversation_id, created_at);

CREATE INDEX idx_agent_conversations_agent_user
  ON agent_conversations(agent_id, user_id);

CREATE INDEX idx_agent_skills_source
  ON agent_skills(agent_id, source);
```
