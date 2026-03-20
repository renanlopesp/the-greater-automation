# Quickstart: Snew Orchestrator System

**Date**: 2026-03-19

## Prerequisites

- Node.js 22+, bun installed
- Supabase project configured (test: `ejqumzvclfkbbzzdvmmi`)
- Environment variables set (`.env.local`)

## Development

```bash
# Start dev server
bun dev

# Navigate to dashboard
open http://localhost:3000/dashboard
```

## Key Files to Modify

### Phase 1: Foundation

| File                                           | Action | Purpose                                   |
| ---------------------------------------------- | ------ | ----------------------------------------- |
| `src/lib/retail/provision-store.ts`            | MODIFY | Always create orchestrator                |
| `src/app/(dashboard)/chat/page.tsx`            | CREATE | Orchestrator chat page (Server Component) |
| `src/components/chat/orchestrator-chat.tsx`    | CREATE | Chat client using useAgentChat            |
| `src/components/chat/chat-message-bubble.tsx`  | CREATE | Message bubble component                  |
| `src/components/home/greeting-section-new.tsx` | MODIFY | Wire input to /chat?q=                    |

### Phase 2: Co-worker Features

| File                                               | Action | Purpose                                       |
| -------------------------------------------------- | ------ | --------------------------------------------- |
| `src/lib/ai/platform-tools.ts`                     | MODIFY | Add structured markers to orchestrator prompt |
| `src/components/chat/coworker-suggestion-card.tsx` | CREATE | Co-worker card in responses                   |
| `src/components/chat/follow-up-suggestions.tsx`    | CREATE | Follow-up buttons                             |
| `src/lib/messaging/telegram-processor.ts`          | MODIFY | Route to orchestrator (done)                  |

### Phase 3: History & Polish

| File                                        | Action | Purpose                            |
| ------------------------------------------- | ------ | ---------------------------------- |
| `src/app/(dashboard)/history/page.tsx`      | MODIFY | Include orchestrator conversations |
| `src/components/chat/orchestrator-chat.tsx` | MODIFY | Empty state, mobile responsive     |

## Testing Checklist

1. Complete onboarding → verify orchestrator created
2. Dashboard input → type question → verify navigation to `/chat?q=...`
3. Chat page → send message → verify streaming response with avatar
4. Ask about abandoned carts → verify co-worker suggestion card
5. Verify follow-up buttons appear after response
6. Link Telegram → send message → verify orchestrator responds
7. History page → verify orchestrator conversations listed

## Existing Infrastructure (No Changes Needed)

- `POST /api/agents/[id]/chat` — Already handles orchestrators
- `useAgentChat` hook — Full streaming, conversation management, realtime
- `buildOrchestratorSystemPrompt()` — Delegation prompt with agent catalog
- `buildPlatformTools()` — All SNEW\_ tools including SNEW_ASK_AGENT
- `runAgentChat()` / `runAgentChatSync()` — Streaming and sync AI execution
