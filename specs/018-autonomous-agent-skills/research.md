# Research: Autonomous Agent with Dynamic Skill Creation

**Feature**: 018-autonomous-agent-skills
**Date**: 2026-02-13

## R1: Kiro Chat API Function Calling Support

### Decision

Use OpenAI-compatible `tools` parameter with `tool_choice: "auto"` for dynamic action selection.

### Rationale

The Kiro Chat API is OpenAI-compatible, supporting the standard function calling protocol:

**Request format**:

```json
{
  "model": "kiro",
  "messages": [...],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "GITHUB_CREATE_ISSUE",
        "description": "Create a new issue in a GitHub repository",
        "parameters": {
          "type": "object",
          "properties": {
            "owner": { "type": "string", "description": "Repository owner" },
            "repo": { "type": "string", "description": "Repository name" },
            "title": { "type": "string", "description": "Issue title" },
            "body": { "type": "string", "description": "Issue body" }
          },
          "required": ["owner", "repo", "title"]
        }
      }
    }
  ],
  "tool_choice": "auto",
  "stream": true
}
```

**Streaming response with tool calls**:

```
data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_abc","type":"function","function":{"name":"GITHUB_CREATE_ISSUE","arguments":""}}]}}]}
data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\"owner\":"}}]}}]}
data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\"renanlopesp\","}}]}}]}
...
data: {"choices":[{"finish_reason":"tool_calls"}]}
```

**After tool execution, feed results back**:

```json
{
  "messages": [
    ...previous_messages,
    { "role": "assistant", "tool_calls": [{"id": "call_abc", "type": "function", "function": {"name": "GITHUB_CREATE_ISSUE", "arguments": "..."}}] },
    { "role": "tool", "tool_call_id": "call_abc", "content": "{\"issue_number\": 47, \"url\": \"...\"}" }
  ]
}
```

### Alternatives Considered

1. **JSON-in-text (current approach)**: Works but fragile — relies on AI outputting valid JSON. No structured retry, no multi-tool support. Used by `executeAppStepWithAI` currently.
2. **Custom orchestration engine**: Build a DAG executor that plans and executes steps. Over-engineered — the AI model already does planning via function calling.

---

## R2: Tool Catalog Construction

### Decision

Build OpenAI function definitions at request time by mapping Composio action schemas.

### Rationale

Composio's `actions.list({ apps: appId })` returns actions with JSON Schema `parameters`:

```typescript
// Composio action (from getAppActions)
{
  name: "GITHUB_CREATE_ISSUE",
  displayName: "Create Issue",
  description: "Creates a new issue in a GitHub repository",
  parameters: {
    properties: {
      owner: { type: "string", description: "Repository owner" },
      repo: { type: "string", description: "Repository name" },
      title: { type: "string", description: "Issue title" },
      body: { type: "string", description: "Issue body" }
    },
    required: ["owner", "repo", "title"]
  }
}
```

This maps nearly 1:1 to OpenAI's function definition format. The mapping function:

```typescript
function composioActionToTool(action, appId): OpenAITool {
  return {
    type: 'function',
    function: {
      name: action.name,
      description: `[${appId}] ${action.description}`,
      parameters: {
        type: 'object',
        properties: action.parameters?.properties ?? {},
        required: action.parameters?.required ?? [],
      },
    },
  }
}
```

### Tool Catalog Size Limits

- OpenAI recommends < 20 tools for best quality
- Each connected app may have 50-200 actions
- **Strategy**: Filter to most relevant actions per app (top 20 by usage/importance), or let the AI handle the full catalog with good descriptions
- **Initial approach**: Send all actions (Kiro model handles large tool sets). If quality degrades, add relevance filtering in Phase 2.

### Alternatives Considered

1. **Pre-cached catalog in DB**: Would require sync jobs, stale data issues, schema complexity
2. **Hardcoded action subsets**: Defeats dynamic discovery. User connects Gmail → agent should immediately see Gmail actions

---

## R3: Multi-Step Execution (Action Chaining)

### Decision

Use the AI model's native multi-turn tool calling loop. No custom orchestration.

### Rationale

Modern LLMs with function calling handle multi-step reasoning naturally:

1. User: "Check my open GitHub PRs and send me a summary on Slack"
2. AI calls `GITHUB_LIST_PRS` → gets PR list
3. AI calls `SLACK_SEND_MESSAGE` with formatted summary → gets confirmation
4. AI responds: "Done! I found 3 open PRs and sent a summary to #engineering on Slack."

The chat route implements a loop:

```
while (true):
  response = callKiroChat(messages, tools)
  if response.has_tool_calls:
    for each tool_call:
      result = composio.execute(tool_call)
      messages.append(tool_call_message)
      messages.append(tool_result_message)
    continue  // let AI process results
  else:
    stream text response to client
    break
```

**Max iterations**: Cap at 10 tool calls per request to prevent runaway execution. If the AI keeps calling tools, force a text response after 10 iterations.

### Alternatives Considered

1. **Custom step planner**: Build a planner that decomposes requests into a DAG of actions. Complex, fragile, and the AI already does this.
2. **User-confirmed steps**: Ask user to approve each step before execution. Too slow for interactive use. Reserve for destructive actions only (per FR-013).

---

## R4: Conversation Persistence

### Decision

Use existing `agent_messages` table with `role` field and `metadata` JSONB for tool call data.

### Rationale

The `agent_messages` table already supports roles: `user`, `assistant`, `system`, `tool`. The `metadata` JSONB column stores structured data per message type:

| Role        | Content                             | Metadata                                                                                      |
| ----------- | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `user`      | User's text message                 | `{}`                                                                                          |
| `assistant` | AI's text response                  | `{}`                                                                                          |
| `assistant` | (empty when tool calling)           | `{ "tool_calls": [{"id": "...", "function": {"name": "...", "arguments": "..."}}] }`          |
| `tool`      | Tool execution result (JSON string) | `{ "tool_call_id": "...", "action_name": "...", "success": true/false, "duration_ms": 1234 }` |

**Loading history**: On page mount, fetch messages from `agent_messages` ordered by `created_at`. The hook sends a GET request (or uses a server action) to load the latest conversation for this agent+user pair.

**Context window**: Send the last 50 messages to the AI. For long conversations, older messages are in the DB but not sent to the AI (prevents token overflow).

### Alternatives Considered

1. **Separate `tool_executions` table**: Breaks conversation flow. Would need complex JOINs to reconstruct the message timeline.
2. **Store everything in content**: Loses structure. Can't render tool results differently from text.

---

## R5: Skill Persistence Model

### Decision

Extend `agent_skills` table with `action_template JSONB` and make `workflow_id` optional. Skills store the action sequence from successful executions.

### Rationale

A skill is a saved execution pattern:

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

Or multi-step:

```json
{
  "type": "multi",
  "description": "Scrape website and email products",
  "steps": [
    {
      "action": "WEB_SCRAPE",
      "app_id": "web",
      "parameter_template": { "url": "{{url}}" },
      "output_key": "scraped_data"
    },
    {
      "action": "GMAIL_SEND_EMAIL",
      "app_id": "gmail",
      "parameter_template": {
        "to": "{{email}}",
        "subject": "Products from {{url}}",
        "body": "{{scraped_data}}"
      }
    }
  ]
}
```

When invoked, the agent fills `{{placeholders}}` from conversation context or asks the user.

### Alternatives Considered

1. **Create full workflows**: Convert skills to workflow definitions (steps, triggers). Over-engineered for chat-triggered skills. The workflow editor is for visual workflow building, not for AI-generated action sequences.
2. **New `dynamic_skills` table**: Unnecessary duplication. `agent_skills` can serve both static (workflow-linked) and dynamic (action-template) skills.

---

## R6: Streaming Protocol for Tool Execution

### Decision

Extend the SSE stream with custom event types for tool execution status.

### Rationale

The current chat stream only sends `data:` events with OpenAI-format chunks. For tool execution visibility, we add custom SSE events:

```
event: tool_start
data: {"tool_call_id":"call_abc","action":"GITHUB_CREATE_ISSUE","app_id":"github","description":"Creating issue in relay repo"}

event: tool_result
data: {"tool_call_id":"call_abc","success":true,"summary":"Created issue #47: Login bug","duration_ms":1234}

data: {"choices":[{"delta":{"content":"Done! I created"}}]}
data: {"choices":[{"delta":{"content":" issue #47 in the relay repo."}}]}
data: [DONE]
```

The client parses these events to show inline tool execution cards in the chat UI:

- `tool_start` → shows a loading card with action name and app icon
- `tool_result` → updates the card with success/failure and result summary

### Alternatives Considered

1. **Embed tool status in text stream**: Can't distinguish tool events from AI text. UI can't render them differently.
2. **Separate WebSocket for tool status**: Overkill. SSE custom events work perfectly for this unidirectional stream.
