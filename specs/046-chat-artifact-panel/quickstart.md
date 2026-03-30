# Quickstart: Chat with Artifact Side Panel

## Prerequisites

- Relay project cloned and dependencies installed (`bun install`)
- Dev server running (`bun dev`) at `localhost:3000`
- Prototype running (`cd ~/Projects/snew-ai-core && npm run dev`) at `localhost:8080` for visual comparison
- `.env.local` configured with OPENAI_API_KEY (for chat to work)

## Development Flow

### 1. Create feature branch

```bash
git checkout -b feat/chat-artifact-panel
```

### 2. Implementation order

Follow the phases in `plan.md`:

1. **Context & Layout** → ChatContext, ChatLayout (draggable split), ChatHeader
2. **Empty State & Input** → ChatEmptyState (avatar + chips), ChatInput (borderRadius 28)
3. **Messages** → ChatMessage, ContinueWith, TypingIndicator, wire useChat
4. **Artifact** → ArtifactPanel shell, DailySummaryArtifact, open/close wiring
5. **Integration** → Rewrite /chat page, swap header, Visual QA

### 3. Key files to reference

| Prototype file                                                         | Purpose                        |
| ---------------------------------------------------------------------- | ------------------------------ |
| `~/Projects/snew-ai-core/src/pages/NewChatPage.tsx`                    | Empty state + message handling |
| `~/Projects/snew-ai-core/src/components/chat/SimpleChatLayout.tsx`     | 2-panel draggable layout       |
| `~/Projects/snew-ai-core/src/components/chat/AgentMessage.tsx`         | AI message bubble              |
| `~/Projects/snew-ai-core/src/components/chat/UserBubble.tsx`           | User message bubble            |
| `~/Projects/snew-ai-core/src/components/chat/ContinueWith.tsx`         | Follow-up suggestions          |
| `~/Projects/snew-ai-core/src/components/chat/ChatInput.tsx`            | Input with auto-resize         |
| `~/Projects/snew-ai-core/src/components/chat/ActionChatContent.tsx`    | Artifact open/close logic      |
| `~/Projects/snew-ai-core/src/components/artifact/OpsPilotArtifact.tsx` | Daily summary                  |
| `~/Projects/snew-ai-core/src/contexts/ChatContext.tsx`                 | State bridge                   |

### 4. Existing relay files to check

| Relay file                               | Notes                                 |
| ---------------------------------------- | ------------------------------------- |
| `src/app/(dashboard)/chat/page.tsx`      | Current chat page (will be rewritten) |
| `src/app/(dashboard)/chat/[id]/page.tsx` | Conversation page (keep for now)      |
| `src/app/api/chat/route.ts`              | Existing chat API (must keep working) |
| `src/components/dashboard-shell-new.tsx` | Shell to modify for header swap       |
| `src/hooks/use-shell-data.ts`            | Shell data for user info              |

### 5. Visual QA checklist

- [ ] Empty state: avatar pulse, heading, subtitle, 4 chips centered
- [ ] Chat input: borderRadius 28, auto-resize, send button 34px
- [ ] Agent message: avatar 22px + "Snew" label + text
- [ ] User message: right-aligned, muted bg, borderRadius 20
- [ ] Continue with: "↳" prefix, 13px, border between items
- [ ] Typing indicator: 3 dots animated
- [ ] Artifact panel: bg muted, borderLeft, maxWidth 620px
- [ ] Draggable divider: 8px handle, resizes panels
- [ ] Daily summary: 5 items with status icons, timestamps
- [ ] Chat header: title + actions + artifact toggle
- [ ] Chat functional: send message → get streaming AI response
- [ ] Width persists in localStorage

## Useful commands

```bash
bun dev          # Start dev server
bun run build    # Verify production build
bun run lint     # Check for lint errors
```
