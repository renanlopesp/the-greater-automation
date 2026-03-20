# Tasks: Snew Orchestrator System

**Input**: Design documents from `/specs/037-orchestrator-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story. 13 stories, 10 phases, ~65 tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US13)
- Exact file paths included

---

## Phase 1: Setup

**Purpose**: Orchestrator provisioning and shared infrastructure.

- [x] T001 Fix `provisionStore` to always create orchestrator regardless of priorities in `src/lib/retail/provision-store.ts`
- [x] T002 Add idempotency check — skip orchestrator creation if one exists in `src/lib/retail/provision-store.ts`
- [x] T003 Create backfill migration for existing teams without orchestrator in `supabase/migrations/`
- [x] T004 [P] Create artifact type definitions (data, table, document, campaign-table, approval) in `src/types/artifacts.ts`
- [x] T005 [P] Create orchestrator response parser — extracts coworker markers, followups, and artifacts from `<!-- snew:* -->` comments in `src/lib/chat/parse-orchestrator-response.ts`
- [x] T006 [P] Add Snew orchestrator avatar asset (holographic gradient) to `public/assets/coworkers/snew.png` or reuse existing brand icon

**Checkpoint**: Orchestrator exists in every workspace. Shared types and parser ready.

---

## Phase 2: Foundational Components

**Purpose**: Reusable UI components needed by multiple stories.

- [x] T007 [P] Create `ChatMessageBubble` — user right-aligned, assistant left-aligned with Snew avatar, markdown rendering, action bar in `src/components/chat/chat-message-bubble.tsx`
- [x] T008 [P] Create `CoworkerSuggestionCard` — avatar, name, description, reason, action button (install wizard if uninstalled, navigate if installed) in `src/components/chat/coworker-suggestion-card.tsx`
- [x] T009 [P] Create `FollowUpSuggestions` — row of clickable buttons with arrow icon, calls `onSelect(text)` in `src/components/chat/follow-up-suggestions.tsx`
- [x] T010 [P] Create `ArtifactChip` — inline clickable tag showing artifact type icon + title in `src/components/chat/artifact-chip.tsx`

**Checkpoint**: All reusable chat components ready for integration.

---

## Phase 3: User Story 1 — Orchestrator Auto-Creation (Priority: P1) 🎯 MVP

**Goal**: Orchestrator exists from day one for every workspace.

**Independent Test**: Complete onboarding → verify orchestrator created → "Novo Chat" links to orchestrator.

- [x] T011 [US1] Verify orchestrator excluded from discover catalog — `is_orchestrator=true` agents filtered out in `src/components/discover/discover-client.tsx`
- [x] T012 [US1] Verify orchestrator excluded from sidebar "ativos" section — `agent_type IS NOT NULL` filter already excludes it in `src/app/(dashboard)/layout.tsx`
- [x] T013 [US1] Verify `orchestratorId` is passed to sidebar and "Novo Chat" resolves to `/chat` in `src/app/(dashboard)/layout.tsx`

**Checkpoint**: Orchestrator auto-created, invisible in catalog, sidebar links work.

---

## Phase 4: User Story 2+3 — Dashboard → Chat + Chat Interface (Priority: P1)

**Goal**: Dashboard input routes to orchestrator chat. Full conversational UI.

**Independent Test**: Type question on dashboard → navigate to chat → streaming response → conversation persists.

- [x] T014 [US2] Create orchestrator chat Server Component — resolve orchestrator ID from team, read `q` and `c` searchParams in `src/app/(dashboard)/chat/page.tsx`
- [x] T015 [US2] Create `OrchestratorChat` client component — use `useAgentChat(orchestratorId)`, handle `initialQuery` auto-send on mount, render message thread + input bar in `src/components/chat/orchestrator-chat.tsx`
- [x] T016 [US2] Wire dashboard greeting input to navigate to `/chat?q=encoded_message` on submit in `src/components/home/ask-bar.tsx`
- [x] T017 [US2] Wire suggestion chips to navigate to `/chat?q=chip_text` on click in `src/components/home/ask-bar.tsx`
- [x] T018 [US3] Add streaming/typing indicator — animated dots while `isStreaming` is true in `src/components/chat/orchestrator-chat.tsx`
- [x] T019 [US3] Add auto-scroll to latest message via `useRef` + `scrollIntoView` in `src/components/chat/orchestrator-chat.tsx`
- [x] T020 [US3] Add empty state — Snew avatar, greeting text, suggestion chips when no messages in `src/components/chat/orchestrator-chat.tsx`
- [x] T021 [US3] Support conversation resume via `?c=conversationId` — load history on mount in `src/components/chat/orchestrator-chat.tsx`
- [x] T022 [US3] Add conversation title in top bar — derive from first message in `src/components/chat/orchestrator-chat.tsx`

**Checkpoint**: Full chat experience from dashboard to streaming response with persistence.

---

## Phase 5: User Story 4+5 — Delegation, Attribution & Follow-ups (Priority: P2)

**Goal**: Responses show co-worker cards and follow-up suggestions.

**Independent Test**: Ask about abandoned carts → co-worker card appears → follow-up buttons appear → click sends new message.

- [x] T023 [US4] Update orchestrator system prompt to emit `<!-- snew:coworker {...} -->` markers when delegating or suggesting in `src/lib/ai/platform-tools.ts`
- [x] T024 [US4] Integrate response parser into `OrchestratorChat` — strip markers from rendered text, extract coworker/followup data in `src/components/chat/orchestrator-chat.tsx`
- [x] T025 [US4] Render `CoworkerSuggestionCard` after assistant messages with coworker data — show "utilizado" or "sugerido" label in `src/components/chat/orchestrator-chat.tsx`
- [x] T026 [US4] Wire install wizard modal trigger from suggestion card's install button in `src/components/chat/orchestrator-chat.tsx`
- [x] T027 [US5] Update orchestrator system prompt to emit `<!-- snew:followups [...] -->` after each response in `src/lib/ai/platform-tools.ts`
- [x] T028 [US5] Render `FollowUpSuggestions` below last assistant message — clicking sends as new message in `src/components/chat/orchestrator-chat.tsx`
- [x] T029 [US5] Hide previous follow-ups when user sends a new message in `src/components/chat/orchestrator-chat.tsx`

**Checkpoint**: Co-worker cards and follow-ups working in chat.

---

## Phase 6: User Story 7 — Install Co-worker from Chat (Priority: P2)

**Goal**: Install co-workers without leaving the chat.

**Independent Test**: Type "instala o Abandoned Cart" → orchestrator triggers install → confirm in chat → delegation works.

- [x] T030 [US7] Add `SNEW_INSTALL_AGENT` tool to platform tools — accepts catalog ID, triggers install flow server-side in `src/lib/ai/platform-tools.ts`
- [x] T031 [US7] Implement install tool handler — create agent from catalog definition, link modules in `src/lib/ai/platform-tools.ts`
- [x] T032 [US7] Orchestrator confirms installation in chat response after tool execution in `src/lib/ai/platform-tools.ts`
- [x] T033 [US7] Wire suggestion card "Instalar" button to open `InstallWizardModal` (existing component) in `src/components/chat/coworker-suggestion-card.tsx`

**Checkpoint**: Co-workers installable from chat via command or card.

---

## Phase 7: User Story 8 — Artifacts & Structured Results (Priority: P2)

**Goal**: Rich data tables, KPIs, and documents in chat responses.

**Independent Test**: Ask "quantos carrinhos abandonados hoje?" → artifact chip appears → click → side panel with data table.

- [x] T034 [US8] Update orchestrator system prompt to emit `<!-- snew:artifact {...} -->` markers with structured data in `src/lib/ai/platform-tools.ts`
- [x] T035 [US8] Update response parser to extract artifact markers and build artifact objects in `src/lib/chat/parse-orchestrator-response.ts`
- [x] T036 [US8] Render `ArtifactChip` components inline in assistant messages in `src/components/chat/orchestrator-chat.tsx`
- [x] T037 [US8] Create `ArtifactPanel` side panel — renders data tables (columns, rows, deltas), KPI grids (label, value, trend), and documents (markdown) in `src/components/chat/artifact-panel.tsx`
- [x] T038 [US8] Wire artifact chip click to open/close side panel with selected artifact in `src/components/chat/orchestrator-chat.tsx`
- [x] T039 [US8] Add campaign-table artifact type — segments, channels, potential value, priority in `src/components/chat/artifact-panel.tsx`

**Checkpoint**: Structured results render in chat with expandable side panel.

---

## Phase 8: User Story 6 — Telegram Integration (Priority: P2)

**Goal**: Telegram messages route through orchestrator.

**Independent Test**: Link Telegram → send message → orchestrator responds → conversation visible in web.

- [x] T040 [US6] Verify `telegram-processor.ts` creates conversations under orchestrator only (already done) in `src/lib/messaging/telegram-processor.ts`
- [x] T041 [US6] Ensure Telegram conversations visible in History — mark with `channel: 'telegram'` metadata in `src/lib/messaging/telegram-processor.ts`
- [x] T042 [US6] Clean up legacy Telegram conversations linked to non-orchestrator agents via migration in `supabase/migrations/`

**Checkpoint**: Telegram fully routed through orchestrator.

---

## Phase 9: User Story 9 — Approval Workflows (Priority: P3)

**Goal**: Approve/reject co-worker actions from chat.

**Independent Test**: Co-worker generates campaign → approval card in chat → WhatsApp preview → approve → confirmation.

- [x] T043 [US9] Create `WhatsAppBubblePreview` — realistic WhatsApp message UI with header, body, CTA button in `src/components/chat/whatsapp-bubble-preview.tsx`
- [x] T044 [US9] Create `ApprovalArtifact` — recipient list with checkboxes, message preview, approve/reject buttons, count display in `src/components/chat/approval-artifact.tsx`
- [x] T045 [US9] Create approval execution API — `POST /api/approvals/execute` accepts approval ID, recipient list, action (approve/reject) in `src/app/api/approvals/execute/route.ts`
- [x] T046 [US9] Wire approve/reject buttons to API — show confirmation/rejection message in chat in `src/components/chat/approval-artifact.tsx`
- [x] T047 [US9] Add approval artifact type to parser and artifact panel in `src/lib/chat/parse-orchestrator-response.ts`

**Checkpoint**: Approval flows work end-to-end from chat.

---

## Phase 10: User Story 10 — Co-worker Activity (Priority: P3)

**Goal**: "What did my co-workers do today?"

**Independent Test**: Ask "o que o Carrinho Abandonado fez hoje?" → structured activity summary with KPIs.

- [x] T048 [US10] Add `SNEW_GET_AGENT_ACTIVITY` tool — queries `workflow_run_outputs` for recent module activity in `src/lib/ai/platform-tools.ts`
- [x] T049 [US10] Format activity data as artifact (KPIs + action timeline) in orchestrator response in `src/lib/ai/platform-tools.ts`
- [x] T050 [US10] Support multi-agent summary — "como estão meus co-workers?" queries all active agents in `src/lib/ai/platform-tools.ts`

**Checkpoint**: Co-worker activity visible through orchestrator chat.

---

## Phase 11: User Story 11 — Dashboard Real Data (Priority: P3)

**Goal**: All dashboard sections show real data instead of mocks.

**Independent Test**: Navigate to dashboard → all sections render with real workspace data.

- [x] T051 [US11] Replace "Co-workers em ação" mocks — query `workflow_run_outputs` for latest results per active agent in `src/components/home/coworkers-in-action.tsx`
- [x] T052 [US11] Replace "Co-workers recomendados" mocks — filter catalog by segment, exclude installed in `src/components/home/coworker-recommendation.tsx`
- [x] T053 [US11] Replace "Conecte seus apps" mocks — query `app_connections` for real status in `src/components/home/connected-apps-section.tsx` or equivalent
- [x] T054 [US11] Build "Oportunidades detectadas" with real co-worker insights from `workflow_run_outputs` where `output_type = 'opportunity'` in `src/components/home/opportunities-section.tsx`
- [x] T055 [US11] Add opportunity detail drawer — findings, reasoning, sources, suggested action in `src/components/home/opportunity-drawer.tsx`
- [x] T056 [US11] Remove MOCK labels from all dashboard sections in `src/app/(dashboard)/dashboard/page.tsx`

**Checkpoint**: Dashboard fully live with real data.

---

## Phase 12: User Story 12 — Proactive Notifications (Priority: P3)

**Goal**: Co-workers generate alerts visible in top bar.

**Independent Test**: Co-worker generates alert → badge appears → open panel → see notification with urgency, reasoning, CTA.

- [x] T057 [US12] Create `notifications` table migration — id, team_id, user_id, source_agent_id, urgency (urgent/opportunity/insight), title, body, cta_url, is_read, created_at in `supabase/migrations/`
- [x] T058 [US12] Create notification API — `GET /api/notifications` (list), `PATCH /api/notifications/[id]` (mark read) in `src/app/api/notifications/route.ts`
- [x] T059 [P] [US12] Create `NotificationBadge` — unread count from query, pulse animation for urgent in `src/components/notifications/notification-badge.tsx`
- [x] T060 [P] [US12] Create `NotificationPanel` — dropdown/sheet with notification list, unread first in `src/components/notifications/notification-panel.tsx`
- [x] T061 [P] [US12] Create `NotificationItem` — urgency color, source agent avatar, title, reasoning, CTA button in `src/components/notifications/notification-item.tsx`
- [x] T062 [US12] Wire `NotificationBadge` into top bar with panel toggle in `src/components/top-bar.tsx`
- [x] T063 [US12] Add `useNotifications` hook — TanStack Query + Supabase Realtime subscription for push updates in `src/hooks/use-notifications.ts`
- [x] T064 [US12] Add `SNEW_CREATE_NOTIFICATION` tool to platform tools — co-workers can generate notifications in `src/lib/ai/platform-tools.ts`

**Checkpoint**: Notification system working end-to-end.

---

## Phase 13: User Story 13 — History & Management (Priority: P3)

**Goal**: View past conversations and start new ones.

**Independent Test**: Multiple conversations → History page lists all → click to resume → "Novo Chat" starts fresh.

- [x] T065 [US13] Wire History page to list orchestrator conversations — query by `agent_id = orchestratorId`, show title + timestamp in `src/app/(dashboard)/history/page.tsx`
- [x] T066 [US13] Auto-generate conversation title from first user message in `src/hooks/use-agent-chat.ts` or `src/app/api/agents/[id]/chat/route.ts`
- [x] T067 [US13] Make History entries clickable — navigate to `/chat?c=conversationId` in `src/app/(dashboard)/history/page.tsx`
- [x] T068 [US13] "Novo Chat" starts fresh conversation — clear `?c` param, reset state in `src/components/chat/orchestrator-chat.tsx`

**Checkpoint**: Full conversation lifecycle — create, resume, browse history.

---

## Phase 14: Polish & Cross-Cutting

**Purpose**: Quality, responsiveness, i18n, build validation.

- [x] T069 [P] Responsive layout for all new chat components (mobile) in `src/components/chat/*.tsx`
- [x] T070 [P] i18n — add PT-BR and EN strings for all new UI via `useLanguage()` in all new components
- [x] T071 Verify `bun run build` passes with zero errors
- [x] T072 Run quickstart.md end-to-end testing checklist
- [x] T073 Update data-model.md and contracts/ with final schema for notifications table

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ─────────────────┐
Phase 2 (Components) ────────────┤
                                  ├──→ Phase 3 (US1) ──→ Phase 4 (US2+3) ──┐
                                  │                                         ├──→ Phase 5 (US4+5)
                                  │                                         ├──→ Phase 6 (US7 Install)
                                  │                                         ├──→ Phase 7 (US8 Artifacts)
                                  │                                         ├──→ Phase 13 (US13 History)
                                  │                                         │
                                  │                                         ├──→ Phase 9 (US9 Approvals) [needs Artifacts]
                                  │                                         ├──→ Phase 10 (US10 Activity) [needs Artifacts]
                                  │                                         └──→ Phase 11 (US11 Dashboard)
                                  │
                                  ├──→ Phase 8 (US6 Telegram) [independent]
                                  └──→ Phase 12 (US12 Notifications) [independent]

Phase 14 (Polish) ← depends on all desired stories
```

---

## Notes

- **73 total tasks** across 14 phases — **all completed. Build passes.**
