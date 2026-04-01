# Quickstart: Chat-Driven Artifact Modification

## What This Feature Does

Allows users to modify the seasonal calendar in the artifact panel by chatting with Snew. Users can generate campaigns for dates, remove dates, filter the calendar, and clear campaign content — all through natural language.

## Files to Modify

| File                                                | Change                                                 |
| --------------------------------------------------- | ------------------------------------------------------ |
| `src/lib/ai/platform-tools.ts`                      | Refactor `SNEW_MODIFY_ARTIFACT` tool with 4 operations |
| `src/app/api/chat/route.ts`                         | Artifact context injection + keyword detection fix     |
| `src/components/chat/orchestrator-chat-wrapper.tsx` | Query invalidation on chat completion                  |
| `src/hooks/use-task.ts`                             | Smart polling (only during skill execution)            |

## How to Test

1. Start dev server: `bun dev`
2. Go to dashboard, type "mostra o calendário sazonal" → creates task + generates calendar
3. In the chat, type "gere a campanha de Black Friday" → Black Friday should change from "Pendente" to "Gerada"
4. Type "remova Carnaval do calendário" → Carnaval disappears from the list
5. Type "limpe todas as campanhas menos Dia das Mães" → All dates show "Pendente" except Dia das Mães
6. Type "quantas datas têm campanha?" → AI answers without modifying anything

## Key Contracts

- **Tool**: `SNEW_MODIFY_ARTIFACT` with operations: `generate_campaign`, `filter_dates`, `remove_dates`, `clear_campaigns`
- **Context**: System prompt includes date IDs + available operations
- **Reactivity**: `queryClient.invalidateQueries(['task', taskId])` on `status: streaming → ready`

## Implementation Order

1. Tool reliability (tool definition + serviceClient + validation)
2. Context & detection (system prompt + keyword fix)
3. Reactivity (query invalidation + smart polling)
4. Behavioral guardrails (system prompt instructions)
5. Error handling (edge cases)
