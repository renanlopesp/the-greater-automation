# Data Model — Spec 063 Hybrid Chat API

## Database schema

**No new tables. No column changes.** This spec reuses existing entities.

### `conversations` (existing)

| Column                      | Type            | Role in hybrid flow                                                        |
| --------------------------- | --------------- | -------------------------------------------------------------------------- |
| `id`                        | UUID PK         | Joined on user/team; unchanged                                             |
| `team_id`                   | UUID            | Scoping; unchanged                                                         |
| `user_id`                   | UUID            | Scoping; unchanged                                                         |
| `title`                     | text            | Derived from first user msg; unchanged                                     |
| `anthropic_session_id`      | text (nullable) | **Null for hybrid-chat rows**; still set by Managed Agents path for skills |
| `created_at` / `updated_at` | timestamptz     | Unchanged                                                                  |

### `conversation_messages` (existing)

| Column            | Type                           | Role in hybrid flow                                                                                           |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `id`              | UUID PK                        | Unchanged                                                                                                     |
| `conversation_id` | UUID FK                        | Unchanged                                                                                                     |
| `role`            | text (`'user' \| 'assistant'`) | Unchanged                                                                                                     |
| `content`         | text                           | Accumulated assistant text after the Messages API stream closes; user text on insert                          |
| `metadata`        | jsonb                          | Extended to record `{ engine: 'messages-api' \| 'managed-agents' }` and `{ tool_calls: [...] }` for debugging |
| `created_at`      | timestamptz                    | Unchanged                                                                                                     |

### `tasks` (existing)

Reused for task-scoped chats (URL `/chat/task/:id`). `artifact_type`, `artifact_data`, `skill_status` remain the columns the `ArtifactRenderer` reads, written by the `saveArtifact` helper after a tool returns `__artifact`. Unchanged.

## Runtime entities (in-memory, not persisted)

### `ChatRouterDecision`

Produced by `lib/chat/skill-detector.ts` from the request body.

```ts
type ChatRouterDecision =
  | { mode: 'chat'; model?: string } // default
  | { mode: 'skill'; slug: string; input?: unknown } // fire-and-forget Managed Agents run
```

Validation (zod):

- `mode`: enum `['chat', 'skill']`
- `slug` (when `mode === 'skill'`): non-empty string, must exist in the team's `skills` table
- `input`: optional, skill-specific shape; opaque to the router

### `HybridChatRequest`

Shape of the POST body accepted by `/api/chat`.

```ts
interface HybridChatRequest {
  // existing fields (unchanged from current contract)
  messages?: UIMessage[]
  message?: string
  conversationId?: string
  taskId?: string

  // NEW — optional hints
  skill_slug?: string // explicit skill selection from hero pill
  model?: string // UI selector value; chat engine may honor it
}
```

### `ToolInvocation` (chat engine → tools-client → Edge Function)

```ts
interface ToolInvocation {
  name: string // e.g. 'STORE_LIST_ORDERS'
  input: Record<string, unknown>
  context: {
    teamId: string
    userId: string
    storeId?: string
    taskId?: string
  }
}

interface ToolResult {
  content: Array<{ type: 'text'; text: string }> // raw tool response (JSON string in text blocks)
  isError?: boolean
  // Parsed convenience (by the chat engine, not the transport):
  artifact?: { type: string; title: string; html?: string; data?: unknown }
}
```

## State transitions

### Conversation lifecycle (hybrid path)

```
[no conversation] ──user POST──► [pending DB insert]
                                     │
                                     ▼
                             [messages API call]
                                     │
                       ┌─────────────┴─────────────┐
                       ▼                           ▼
               [tool_use event]           [content_block_delta]
                       │                           │
                       ▼                           ▼
              [tool HTTP call]            [UIMessage stream to client]
                       │                           │
                       ▼                           ▼
            [__artifact → tasks]        [accumulate full text]
                       │                           │
                       └─────────────┬─────────────┘
                                     ▼
                            [assistant message saved]
                                     ▼
                                [credits increment]
                                     ▼
                                  [done]
```

### Task artifact state (unchanged)

```
skill_status:    'idle' → 'running' → 'completed' | 'failed'
artifact_type:   null   → null       → 'chat-data' | 'seasonal-calendar' | ...
```

Written by `saveArtifact(serviceClient, taskId, artifact)` identical to Spec 058-E Option B.

## Edge cases

- **Conversation older than 5 min**: prompt cache miss on first message; still correct, just slower by ~1s.
- **Tool call fails**: `isError: true` in `ToolResult`; chat engine passes `is_error` back to the model so it can apologize; nothing written to `tasks.artifact_data`.
- **Skill request with missing slug**: router returns 400 with `{ error: 'Unknown skill', slug }`.
- **Flag off mid-stream**: env vars are read per-request, so no in-flight request switches engines.
