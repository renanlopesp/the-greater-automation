# API Contract: Orchestrator Chat

**Date**: 2026-03-19

## Existing Endpoint (No Changes)

### POST /api/agents/{id}/chat

The existing chat endpoint already handles orchestrator agents. When the agent has `is_orchestrator=true`, it automatically:

- Loads team specialist agents
- Builds orchestrator system prompt with `buildOrchestratorSystemPrompt()`
- Includes `SNEW_ASK_AGENT` tool for delegation
- Streams response via Vercel AI SDK

**Request** (Vercel AI SDK `useChat` format):

```json
{
  "messages": [{ "role": "user", "content": "Quais carrinhos têm maior chance de conversão?" }]
}
```

**Response**: Vercel AI SDK streaming format with headers:

- `X-Conversation-Id`: UUID of the conversation (created on first message)

**No new endpoints needed** — the orchestrator uses the same chat API as regular agents.

## New Page Route

### GET /chat

Server Component that resolves the orchestrator agent for the current team and renders the chat client.

**Query Parameters**:

- `q` (optional): Initial message to auto-send on mount
- `c` (optional): Conversation ID to resume an existing conversation

**Behavior**:

1. Fetch current user's team
2. Find agent with `is_orchestrator=true` for that team
3. If no orchestrator found, redirect to `/dashboard` with error
4. Render `OrchestratorChat` client component with `orchestratorId`, `initialQuery`, `conversationId`

## Response Parsing Contract

The orchestrator's system prompt instructs it to include structured markers that the frontend parses:

### Co-worker Attribution

When the orchestrator delegates to or recommends a co-worker, it includes an HTML comment block:

```
<!-- snew:coworker {"id":"abandoned-cart","name":"Carrinho Abandonado","type":"used|suggested","reason":"Consultei para dados de abandono"} -->
```

### Follow-up Suggestions

At the end of each response, the orchestrator includes:

```
<!-- snew:followups ["Suggestion 1","Suggestion 2","Suggestion 3"] -->
```

The frontend strips these markers from rendered text and uses them to render UI components.
