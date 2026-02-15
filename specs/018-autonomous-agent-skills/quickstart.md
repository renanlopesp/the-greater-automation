# Quickstart: Autonomous Agent with Dynamic Skill Creation

**Feature**: 018-autonomous-agent-skills
**Date**: 2026-02-13

## Prerequisites

1. **Supabase project** with migrations applied (test branch: `ejqumzvclfkbbzzdvmmi`)
2. **Environment variables** in `.env.local`:
   ```
   KIRO_CHAT_URL=<kiro-chat-api-url>
   KIRO_CHAT_AUTH_TOKEN=<kiro-chat-auth-token>
   COMPOSIO_API_KEY=<composio-api-key>
   ```
3. **At least one connected OAuth app** (e.g., GitHub via Composio)
4. **An agent** created via `/agents/new` with `is_active: true`

## Development Setup

```bash
# Checkout feature branch
git checkout 018-autonomous-agent-skills

# Install dependencies
bun install

# Apply migrations to test branch (if not already applied)
# Migration: extend_agent_skills_for_dynamic_skills

# Start dev server
bun dev
```

## Testing the Feature

### 1. Single Action Execution (P1)

1. Navigate to an agent's chat page: `/agents/[id]`
2. Ensure you have GitHub connected (check Settings > Connections)
3. Type: "Create a GitHub issue titled 'Test issue' in the relay repo"
4. Expected behavior:
   - Chat shows a tool execution card: "Executing GitHub: Create Issue..."
   - After ~2-3 seconds, card updates with result: "Created issue #XX"
   - Agent responds: "Done! I created issue #XX: Test issue in the relay repo."
5. Verify on GitHub: the issue actually exists

### 2. Conversation Persistence (P1)

1. Send a message and get a response
2. Refresh the page (F5)
3. Expected: Previous messages appear, including tool execution results
4. Send a follow-up message referencing earlier context
5. Expected: Agent remembers what was discussed

### 3. Multi-Action Chaining (P2)

1. Type: "Check my open GitHub PRs and send me a summary on Slack"
2. Expected behavior:
   - Tool card 1: "Fetching open PRs from GitHub..." → result
   - Tool card 2: "Sending summary to Slack..." → result
   - Agent responds with summary of what it did

### 4. Tool Discovery (P2)

1. Type: "What can you do?"
2. Expected: Agent lists capabilities grouped by connected app
3. Connect a new app in Settings
4. Return to chat, ask "What can you do?" again
5. Expected: New app's capabilities now listed

### 5. Save as Skill (P3)

1. Execute a task (e.g., create a GitHub issue)
2. Type: "Save this as a skill called 'Quick Bug Report'"
3. Expected: Skill appears in agent's skills list in the sidebar
4. Type: "Run the Quick Bug Report skill" with a new title
5. Expected: Agent executes the saved action pattern

## Key Files

| File                                                  | Purpose                                               |
| ----------------------------------------------------- | ----------------------------------------------------- |
| `src/app/api/agents/[id]/chat/route.ts`               | Chat API with tool calling loop                       |
| `src/lib/ai/agent-chat.ts`                            | AI chat logic, system prompt building, tool execution |
| `src/lib/composio/tool-catalog.ts`                    | Maps Composio actions to OpenAI function definitions  |
| `src/lib/actions/agent-skills.ts`                     | Save/delete skill server actions                      |
| `src/lib/queries/agent-conversations.ts`              | Conversation history queries                          |
| `src/hooks/use-agent-chat.ts`                         | Client-side chat state with history loading           |
| `src/components/agent-detail/tool-execution-card.tsx` | Inline tool execution display                         |
| `src/components/agent-detail/save-skill-dialog.tsx`   | Save execution as skill                               |

## Architecture Notes

- **No custom orchestration**: The AI model handles multi-step planning via native function calling
- **Tool catalog is dynamic**: Built at request time from user's connected apps
- **Skills are action templates**: Saved tool call patterns with `{{placeholder}}` variables
- **SSE events**: Custom event types (`tool_start`, `tool_result`) for real-time execution display
- **Max 10 tool calls per request**: Safety cap to prevent runaway execution
- **Max 50 messages as context**: Prevents token overflow on long conversations

## Troubleshooting

| Problem                      | Solution                                                                |
| ---------------------------- | ----------------------------------------------------------------------- |
| Agent says "I can't do that" | Check if the app is connected in Settings                               |
| Tool execution fails         | Check Composio connection status, OAuth token may be expired            |
| No streaming response        | Verify `KIRO_CHAT_URL` and `KIRO_CHAT_AUTH_TOKEN` in `.env.local`       |
| History not loading          | Check `agent_conversations` and `agent_messages` tables have data       |
| Skills not appearing         | Verify `agent_skills` migration applied (action_template column exists) |
