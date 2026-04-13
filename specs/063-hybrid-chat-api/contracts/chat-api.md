# Contract — `POST /api/chat` (hybrid)

## Purpose

Accept a chat message and stream the assistant response back to the client. Route the request to either the Messages API engine (fast path) or the Managed Agents engine (skills) based on the body and the `FEATURE_HYBRID_CHAT` flag.

## Request

**Headers**

- `Content-Type: application/json`
- `Cookie: sb-access-token=...` (via `@supabase/ssr`)

**Body**

```ts
{
  // Legacy — one of the two is required
  messages?: UIMessage[]                 // preferred, from useChat hook
  message?: string                       // simple string form
  conversationId?: string                // reuse existing conversation
  taskId?: string                        // scope to an existing task

  // New hints (both optional)
  skill_slug?: string                    // explicit skill selection
  model?: string                         // UI-selected model, best effort
}
```

Validation (zod in `src/app/api/chat/route.ts`):

- At least one of `messages[].role === 'user'` or `message` must be present
- `skill_slug` must match a row in `skills` where `team_id = <user team>` and `status = 'active'`

## Response

### Chat path (mode = 'chat')

Content-Type: `text/event-stream` (UIMessage SSE, unchanged shape).

Events:

- `text-start`, `text-delta`, `text-end` — assistant text
- `tool-input-start`, `tool-input-delta`, `tool-input-end`, `tool-output-available` — tool calls (one per call)
- `finish` — terminal event

Headers:

- `X-Conversation-Id: <uuid>` — the conversation (new or reused)
- `X-Chat-Engine: messages-api | managed-agents` — for observability

### Skill path (mode = 'skill')

Content-Type: `application/json`.

```ts
{
  ok: true,
  taskId: '<uuid>',               // client redirects to /chat/task/<taskId>
  skill: 'seasonal-calendar',
  message: 'Gerando seu calendário sazonal...'  // short ack
}
```

The skill runs in the background (`void askAgent(...)`); the artifact populates via Supabase Realtime.

### Error cases

| Status | Body                                                              | When                                                                                                            |
| ------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 401    | `{ error: 'Unauthorized' }`                                       | No Supabase session                                                                                             |
| 400    | `{ error: 'No team found' }`                                      | User has no `team_members` row                                                                                  |
| 400    | `{ error: 'Message is required' }`                                | Neither `messages[].user` nor `message`                                                                         |
| 400    | `{ error: 'Unknown skill', slug }`                                | `skill_slug` doesn't exist / inactive                                                                           |
| 402    | `{ error: 'Credit limit reached', code: 'INSUFFICIENT_CREDITS' }` | `checkUsageLimits` denied                                                                                       |
| 500    | `{ error: 'Stream error' }`                                       | Messages API / tool error after stream start — emitted in SSE `error` event instead of HTTP 500 when mid-stream |

## Engine selection

```
if body.skill_slug is set AND skill exists in team's skills:
  → skill path, use Managed Agents `askAgent()`
elif FEATURE_HYBRID_CHAT === 'true' AND body matches chat-path keyword regex fallback:
  → chat path, use Messages API engine
else:
  → legacy Managed Agents proxy (current behavior)
```

## Tool contract (internal, chat engine → Edge Function)

The chat engine invokes tools over HTTP against the existing `mcp-tools` Edge Function. Request and response shapes match the MCP JSON-RPC protocol; the engine parses the response's first text block and looks for an `__artifact` key to forward to `saveArtifact`.

Endpoint: `GET/POST https://<supabase>.functions.supabase.co/mcp-tools?team_id=X&user_id=Y&store_id=Z&secret=TOKEN&task_id=T`

No change to the Edge Function for this spec.

## Compatibility guarantees

- Existing clients (`useOrchestratorChat` hook) keep working without changes; new hints (`skill_slug`, `model`) are additive.
- Conversations created under the legacy path (with `anthropic_session_id`) remain readable and resumable via either engine.
- `tasks.artifact_data` shape is unchanged — renderers need no updates.

## Observability

- Response header `X-Chat-Engine` on every response
- Structured log line on request entry: `[chat] engine=<name> skill=<slug|none> taskId=<id|none>`
- Metric: `chat.ttft` histogram (time to first `text-delta` event), labeled by engine
- Metric: `chat.total_duration`, labeled by engine and tool_count
