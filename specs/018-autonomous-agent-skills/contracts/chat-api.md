# Contract: Agent Chat API with Tool Calling

**Feature**: 018-autonomous-agent-skills
**Endpoint**: `POST /api/agents/[id]/chat`

## Request

```typescript
interface ChatRequest {
  message: string // User's text message (required, non-empty)
  conversationId?: string // Existing conversation UUID (optional — creates new if omitted)
}
```

**Headers**: Standard Next.js request headers. Auth via Supabase cookie session.

**Validation** (Zod):

```typescript
const chatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message is required'),
  conversationId: z.string().uuid().optional(),
})
```

## Response

**Content-Type**: `text/event-stream`
**Custom Headers**:

- `X-Conversation-Id: <uuid>` — The conversation ID (new or existing)

### SSE Event Types

#### 1. Text Stream (standard OpenAI format)

```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":"! I can"}}]}
data: {"choices":[{"delta":{"content":" help you."}}]}
data: [DONE]
```

#### 2. Tool Execution Start

```
event: tool_start
data: {"tool_call_id":"call_abc123","action":"GITHUB_CREATE_ISSUE","app_id":"github","description":"Creating issue in relay repo"}
```

#### 3. Tool Execution Result

```
event: tool_result
data: {"tool_call_id":"call_abc123","success":true,"summary":"Created issue #47: Fix login bug","duration_ms":2340,"result":{"issue_number":47,"url":"https://github.com/renanlopesp/relay/issues/47"}}
```

#### 4. Tool Execution Error

```
event: tool_result
data: {"tool_call_id":"call_abc123","success":false,"error":"Permission denied: missing repo:write scope","duration_ms":1200}
```

#### 5. Error Event

```
event: error
data: {"error":"Rate limit exceeded for GitHub API","code":"RATE_LIMIT"}
```

### Event Sequence Examples

**Single action execution**:

```
event: tool_start
data: {"tool_call_id":"call_1","action":"GITHUB_CREATE_ISSUE","app_id":"github","description":"Creating issue..."}

event: tool_result
data: {"tool_call_id":"call_1","success":true,"summary":"Created issue #47","duration_ms":2340}

data: {"choices":[{"delta":{"content":"Done! I created issue #47: Fix login bug in the relay repo."}}]}
data: [DONE]
```

**Multi-step execution**:

```
event: tool_start
data: {"tool_call_id":"call_1","action":"GITHUB_LIST_PRS","app_id":"github","description":"Fetching open PRs..."}

event: tool_result
data: {"tool_call_id":"call_1","success":true,"summary":"Found 3 open PRs","duration_ms":1200}

event: tool_start
data: {"tool_call_id":"call_2","action":"SLACK_SEND_MESSAGE","app_id":"slack","description":"Sending summary to #engineering..."}

event: tool_result
data: {"tool_call_id":"call_2","success":true,"summary":"Message sent to #engineering","duration_ms":890}

data: {"choices":[{"delta":{"content":"Done! I found 3 open PRs and sent a summary to #engineering on Slack."}}]}
data: [DONE]
```

**Text-only response (no tools needed)**:

```
data: {"choices":[{"delta":{"content":"I can help with GitHub and Slack. What would you like me to do?"}}]}
data: [DONE]
```

## Error Responses (non-streaming)

| Status | Body                                           | When                        |
| ------ | ---------------------------------------------- | --------------------------- |
| 401    | `{ "error": "Unauthorized" }`                  | No auth session             |
| 400    | `{ "error": "Message is required" }`           | Empty/missing message       |
| 404    | `{ "error": "Agent not found" }`               | Invalid agent ID            |
| 500    | `{ "error": "Failed to create conversation" }` | DB insert failure           |
| 500    | `{ "error": "<error message>" }`               | AI API or execution failure |

## Backend Flow

```
1. Authenticate user (Supabase cookie session)
2. Validate request body (Zod)
3. Load agent config (SELECT * FROM agents WHERE id = agentId)
4. Load/create conversation
5. Insert user message (role: 'user')
6. Load conversation history (last 50 messages, ordered by created_at)
7. Load user's connected apps (app_connections WHERE user_id = ...)
8. Build tool catalog (for each connected app → getAppActions → map to OpenAI tools)
9. Load agent's dynamic skills (agent_skills WHERE source = 'dynamic')
10. TOOL CALLING LOOP:
    a. Call Kiro Chat API (messages + tools + stream: true)
    b. Parse streaming response
    c. If tool_calls in response:
       - For each tool call:
         i.   Send SSE event: tool_start
         ii.  Execute via composio.actions.execute()
         iii. Send SSE event: tool_result
         iv.  Persist assistant message (metadata: {tool_calls})
         v.   Persist tool result message (role: 'tool')
       - Append tool results to messages
       - Go to step (a) — let AI process results
    d. If text content in response:
       - Stream delta chunks to client
       - Accumulate full response
    e. On finish_reason: "stop":
       - Persist assistant message
       - Close stream
11. Update agent status: 'idle'
```

## Conversation History Loading

**Endpoint**: Server action (not API route, per constitution VI)

```typescript
// src/lib/queries/agent-conversations.ts
export async function getLatestConversation(
  supabase: Client,
  agentId: string,
  userId: string
): Promise<{ conversationId: string; messages: AgentMessage[] } | null>

export async function getConversationMessages(
  supabase: Client,
  conversationId: string,
  limit?: number
): Promise<AgentMessage[]>
```

**AgentMessage type**:

```typescript
interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  metadata: Record<string, unknown>
  created_at: string
}
```
