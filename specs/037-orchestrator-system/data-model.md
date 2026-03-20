# Data Model: Snew Orchestrator System

**Date**: 2026-03-19

## Entities

### Orchestrator (stored in `agents` table)

The orchestrator is stored in the existing `agents` table with `is_orchestrator = true`. No schema changes needed.

| Field           | Type    | Notes                                                          |
| --------------- | ------- | -------------------------------------------------------------- |
| id              | uuid    | PK, auto-generated                                             |
| team_id         | uuid    | FK → teams. One orchestrator per team                          |
| created_by      | uuid    | FK → auth.users. Set to team owner                             |
| name            | text    | Always "Snew"                                                  |
| description     | text    | Central assistant description                                  |
| system_prompt   | text    | NULL — built dynamically via `buildOrchestratorSystemPrompt()` |
| model           | text    | "gpt-4o"                                                       |
| palette         | text    | "indigo"                                                       |
| is_orchestrator | boolean | Always `true`                                                  |
| agent_type      | text    | NULL — orchestrator is not a module-based agent                |

**Constraints**:

- UNIQUE(team_id) WHERE is_orchestrator = true (enforced in application logic; consider DB partial unique index)
- NOT shown in discover catalog (filtered by `agent_type IS NOT NULL` or `is_orchestrator = false`)

### Conversation (existing `agent_conversations` table)

No schema changes. Orchestrator conversations use `agent_id` pointing to the orchestrator.

| Field      | Type      | Notes                                  |
| ---------- | --------- | -------------------------------------- |
| id         | uuid      | PK                                     |
| agent_id   | uuid      | FK → agents (orchestrator ID)          |
| user_id    | uuid      | The user who owns this conversation    |
| created_by | uuid      | Same as user_id for web chat           |
| title      | text      | Auto-generated from first user message |
| is_active  | boolean   | True for current conversation          |
| created_at | timestamp |                                        |

### Message (existing `agent_messages` table)

No schema changes. Co-worker attribution and follow-ups stored in `metadata` JSON.

| Field           | Type      | Notes                                                  |
| --------------- | --------- | ------------------------------------------------------ |
| id              | uuid      | PK                                                     |
| conversation_id | uuid      | FK → agent_conversations                               |
| role            | text      | 'user' or 'assistant'                                  |
| content         | text      | Message text (may contain structured markers)          |
| metadata        | jsonb     | Extended with orchestrator-specific fields (see below) |
| created_at      | timestamp |                                                        |

**Metadata extensions for orchestrator messages** (assistant role):

```json
{
  "channel": "web" | "telegram",
  "usage": { "totalTokens": 1234 },
  "coworker_used": {
    "id": "abandoned-cart",
    "name": "Abandoned Cart",
    "catalog_id": "abandoned-cart"
  },
  "coworker_suggested": {
    "id": "upsell-retention",
    "name": "Upsell & Retention Agent",
    "catalog_id": "upsell-retention",
    "reason": "Could help with cross-sell opportunities"
  },
  "follow_ups": [
    "Como está a taxa de conversão hoje?",
    "Quais produtos estão com mais abandono?",
    "Quer que eu crie uma campanha de recuperação?"
  ]
}
```

### Messaging Link (existing `messaging_links` table)

No schema changes. The `conversation_id` field links to an orchestrator conversation.

| Field           | Type | Notes                                                             |
| --------------- | ---- | ----------------------------------------------------------------- |
| conversation_id | uuid | FK → agent_conversations (orchestrator conversation for Telegram) |

## Notification (existing `notifications` table)

Notifications are stored in the existing `notifications` table. No schema changes required for the base flow. A migration adds urgency-related fields for priority surfacing.

| Field       | Type         | Notes                                                      |
| ----------- | ------------ | ---------------------------------------------------------- |
| id          | uuid         | PK, auto-generated                                         |
| team_id     | uuid         | FK → teams                                                 |
| user_id     | uuid         | FK → auth.users (target recipient)                         |
| title       | text         | Short notification title                                   |
| message     | text         | Full notification body                                     |
| type        | text         | e.g. `'approval'`, `'alert'`, `'info'`                     |
| read        | boolean      | Whether the user has read this notification                |
| workflow_id | uuid \| null | FK → agent_workflows (optional, links to related workflow) |
| created_at  | timestamp    | Auto-set on insert                                         |

**Urgency fields (added via migration)**:

- `urgency` — text, one of `'low'`, `'medium'`, `'high'`; defaults to `'low'`
- `expires_at` — timestamp \| null; notifications past this time are auto-dismissed in the UI

## Relationships

```
teams 1──1 agents (orchestrator, is_orchestrator=true)
agents (orchestrator) 1──N agent_conversations
agent_conversations 1──N agent_messages
messaging_links N──1 agent_conversations (Telegram → orchestrator conversation)
teams 1──N notifications
notifications N──1 auth.users (user_id)
notifications N──1 agent_workflows (workflow_id, optional)
```

## No Additional Tables Required

All data fits within the existing schema. The orchestrator is an `agents` row with `is_orchestrator=true`. Conversations and messages use existing tables. Co-worker metadata is stored in the flexible `metadata` JSONB column on `agent_messages`. Notifications use the existing `notifications` table with urgency fields added via migration.
