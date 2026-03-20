# Implementation Plan: Snew Orchestrator System

**Branch**: `037-orchestrator-system` | **Date**: 2026-03-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/037-orchestrator-system/spec.md`

## Summary

Build the Snew orchestrator as the central AI assistant for every workspace. It is auto-created during provisioning, handles all user interactions (web chat + Telegram), delegates to installed co-workers, suggests and installs new ones, displays structured results via artifacts, manages approval workflows, provides proactive notifications, and powers the complete dashboard experience. Most backend AI infrastructure already exists — the main work is the chat UI, artifact panel, approval flow, dashboard real data integration, and notification system.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, Vercel AI SDK (useChat, streamText), TanStack React Query, Zustand, shadcn/ui (new-york), Tailwind CSS v4
**Storage**: Supabase PostgreSQL (agents, agent_conversations, agent_messages, + new notifications table)
**Testing**: Manual + Playwright (existing setup)
**Target Platform**: Web (Next.js App Router), Telegram (webhook)
**Project Type**: Web application (single Next.js repo)
**Performance Goals**: <10s for first response, streaming for perceived speed, <30s for Telegram, <3s dashboard load
**Constraints**: Reuse existing agent_conversations/agent_messages schema, Vercel AI SDK streaming, shadcn/ui components
**Scale/Scope**: 1 orchestrator per workspace, 50+ concurrent conversations, 13 user stories, 40 FRs

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status | Notes                                                             |
| ------------------------------ | ------ | ----------------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | All new pages use App Router, Server Components for data fetching |
| II. shadcn/ui Component System | PASS   | All UI composed from shadcn primitives                            |
| III. Tailwind CSS v4 + OKLCH   | PASS   | All styling via Tailwind, theme tokens from CSS variables         |
| IV. TypeScript Strict Mode     | PASS   | Full strict mode, Zod for API validation                          |
| V. Simplicity and YAGNI        | PASS   | Reuses existing AI infrastructure, incremental delivery           |
| VI. Supabase as Backend        | PASS   | All data via Supabase, RLS on all tables                          |

## Project Structure

### Documentation (this feature)

```text
specs/037-orchestrator-system/
├── plan.md              # This file
├── spec.md              # Feature specification (13 stories, 40 FRs)
├── research.md          # Phase 0 research
├── data-model.md        # Phase 1 data model
├── quickstart.md        # Phase 1 quickstart
├── contracts/           # Phase 1 API contracts
│   ├── chat-api.md
│   └── orchestrator-api.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (dashboard)/
│   │   ├── chat/
│   │   │   └── page.tsx                         # NEW: Orchestrator chat page
│   │   ├── dashboard/
│   │   │   └── page.tsx                         # MODIFY: Real data for all sections
│   │   └── layout.tsx                           # MODIFY: Pass orchestratorId
│   └── api/
│       ├── agents/[id]/chat/route.ts            # EXISTS: Already handles orchestrator
│       └── notifications/route.ts               # NEW: Notification endpoints
├── components/
│   ├── chat/
│   │   ├── orchestrator-chat.tsx                # NEW: Main chat client component
│   │   ├── chat-message-bubble.tsx              # NEW: Message bubble (user/assistant)
│   │   ├── coworker-suggestion-card.tsx         # NEW: Co-worker attribution/suggestion card
│   │   ├── follow-up-suggestions.tsx            # NEW: Follow-up buttons
│   │   ├── artifact-chip.tsx                    # NEW: Clickable artifact tag in messages
│   │   ├── artifact-panel.tsx                   # NEW: Side panel for structured results
│   │   ├── approval-artifact.tsx                # NEW: Approval card with recipients/preview
│   │   ├── whatsapp-bubble-preview.tsx          # NEW: WhatsApp message template preview
│   │   └── chat-input-bar.tsx                   # EXISTS: Reuse
│   ├── home/
│   │   ├── greeting-section-new.tsx             # MODIFY: Wire input to /chat
│   │   ├── coworkers-in-action.tsx              # MODIFY: Real data from workflow_run_outputs
│   │   ├── coworker-recommendation.tsx          # MODIFY: Real recommendations
│   │   ├── opportunities-section.tsx            # NEW: Real opportunity data
│   │   └── connected-apps-section.tsx           # MODIFY: Real connection status
│   └── notifications/
│       ├── notification-panel.tsx               # NEW: Notification dropdown panel
│       ├── notification-item.tsx                # NEW: Single notification row
│       └── notification-badge.tsx               # NEW: Unread count badge
├── hooks/
│   ├── use-agent-chat.ts                        # EXISTS: Reuse for orchestrator
│   └── use-notifications.ts                     # NEW: Notification polling/realtime
├── lib/
│   ├── ai/
│   │   ├── agent-chat.ts                        # EXISTS: No changes
│   │   └── platform-tools.ts                    # MODIFY: Structured markers in prompt
│   ├── chat/
│   │   └── parse-orchestrator-response.ts       # NEW: Parse coworker/followup/artifact markers
│   ├── retail/
│   │   └── provision-store.ts                   # MODIFY: Always create orchestrator
│   └── messaging/
│       └── telegram-processor.ts                # MODIFY: Route to orchestrator (done)
└── types/
    └── artifacts.ts                             # NEW: Artifact type definitions
```

## Architecture

### Data Flow

```
Dashboard Input → navigate(/chat?q=message) → Orchestrator Chat Page
                                                    ↓
                                            useAgentChat(orchestratorId)
                                                    ↓
                                        POST /api/agents/{id}/chat
                                                    ↓
                                    buildOrchestratorSystemPrompt()
                                    + buildPlatformTools()
                                    + SNEW_ASK_AGENT (delegation)
                                                    ↓
                                            streamText() → Response
                                                    ↓
                                    parseOrchestratorResponse():
                                    ├── text content (markdown)
                                    ├── coworker markers → CoworkerSuggestionCard
                                    ├── followup markers → FollowUpSuggestions
                                    ├── artifact markers → ArtifactChip → ArtifactPanel
                                    └── approval markers → ApprovalArtifact
```

### Key Design Decisions

1. **Reuse existing chat API** — `/api/agents/[id]/chat` already handles `is_orchestrator=true`. No new chat endpoints.

2. **Orchestrator chat at `/chat`** — Resolves orchestrator ID server-side. Dashboard input navigates with `?q=initialMessage`.

3. **Structured markers in AI response** — System prompt instructs orchestrator to emit HTML comments (`<!-- snew:coworker {...} -->`, `<!-- snew:followups [...] -->`, `<!-- snew:artifact {...} -->`). Frontend parser extracts and renders components.

4. **Artifact panel as side panel** — Clicking an artifact chip opens a right-side panel (like the prototype). Panel shows structured data with tabs for different views.

5. **Approval as special artifact** — Approval workflows are a type of artifact with interactive elements (recipient toggles, approve/reject buttons). Actions call dedicated API endpoints.

6. **Notifications table** — New `notifications` table with Supabase Realtime for push to connected clients. Co-workers insert notifications via existing workflow/module infrastructure.

7. **Dashboard real data** — Replace mock sections with real queries against `workflow_run_outputs`, `agents`, `app_connections`, and new notification data.

## Phases

### Phase 1: Orchestrator Foundation (US1–US3, P1)

**Goal**: Orchestrator exists, chat works end-to-end, dashboard routes to it.

1. Fix `provisionStore` to always create orchestrator (partially done)
2. Backfill orchestrator for existing teams
3. Create `/chat` page (Server Component)
4. Build `OrchestratorChat` client component with `useAgentChat`
5. Build `ChatMessageBubble` component
6. Wire dashboard input to `/chat?q=message`
7. Add streaming indicator, auto-scroll, empty state
8. Support conversation resume via `?c=conversationId`

### Phase 2: Delegation & Chat Intelligence (US4–US5, P2)

**Goal**: Co-worker attribution, suggestions, follow-ups.

1. Update orchestrator system prompt for structured markers
2. Build response parser (`parseOrchestratorResponse`)
3. Build `CoworkerSuggestionCard` component
4. Build `FollowUpSuggestions` component
5. Integrate parser + components into chat

### Phase 3: Co-worker Install from Chat (US7, P2)

**Goal**: Install co-workers without leaving chat.

1. Wire suggestion card install button to install wizard modal
2. Add chat command support ("instala o [name]")
3. Post-install confirmation message in chat

### Phase 4: Artifacts & Structured Results (US8, P2)

**Goal**: Rich data display in chat responses.

1. Define artifact type system (`types/artifacts.ts`)
2. Build `ArtifactChip` component (inline tags)
3. Build `ArtifactPanel` (side panel with data tables, KPIs, documents)
4. Update parser to extract artifact markers
5. Integrate into chat with panel open/close

### Phase 5: Telegram (US6, P2)

**Goal**: Telegram messages route through orchestrator.

1. Verify telegram-processor routes to orchestrator (done)
2. Ensure Telegram conversations visible in web history
3. Clean up legacy misrouted conversations

### Phase 6: Approvals (US9, P3)

**Goal**: Approve/reject co-worker actions from chat.

1. Build `ApprovalArtifact` component (recipient list, message preview, buttons)
2. Build `WhatsAppBubblePreview` component
3. Create approval execution API endpoint
4. Wire approve/reject actions with confirmation

### Phase 7: Co-worker Activity (US10, P3)

**Goal**: "What did my co-workers do today?"

1. Query `workflow_run_outputs` for activity data
2. Build activity summary rendering in chat responses
3. Support multi-agent summary ("como estão meus co-workers?")

### Phase 8: Dashboard Real Data (US11, P3)

**Goal**: All dashboard sections show real data.

1. Replace "Co-workers em ação" mocks with real `workflow_run_outputs` queries
2. Replace "Co-workers recomendados" mocks with segment-based recommendations
3. Replace "Conecte seus apps" mocks with real `app_connections` status
4. Build "Oportunidades detectadas" with real co-worker insights
5. Add opportunity detail drawer

### Phase 9: Notifications (US12, P3)

**Goal**: Proactive alerts from co-workers.

1. Create `notifications` table with migration
2. Build `NotificationBadge`, `NotificationPanel`, `NotificationItem` components
3. Create notification API endpoints (list, mark read)
4. Wire co-worker modules to create notifications
5. Add Supabase Realtime subscription for push updates

### Phase 10: History & Polish (US13, P3)

**Goal**: Conversation management, i18n, responsive.

1. Wire History page with real orchestrator conversations
2. Auto-generate conversation titles
3. Responsive layout for all new components
4. i18n for all new UI strings
5. Build validation and `bun run build` pass

## Complexity Tracking

No constitution violations. All work reuses existing infrastructure. The `notifications` table is the only new schema addition — justified by FR-034 through FR-036 requiring persistent, queryable notification state.
