# Tasks: Restore Real Data Integration

**Input**: Design documents from `/specs/032-restore-data-integration/`
**Prerequisites**: plan.md (required), spec.md (required), research.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No setup needed — all infrastructure exists. This phase validates that prerequisites are intact.

- [x] T001 Verify query infrastructure is intact by checking exports in `src/lib/queries/dashboard.ts`, `src/lib/queries/agents.ts`, `src/lib/queries/agent-conversations.ts`, and `src/lib/queries/workspace.ts`
- [x] T002 Verify auth utilities exist: `createServerClient` in `src/lib/supabase/server.ts` and `getActiveTeamId` in `src/lib/get-active-team.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational work needed — all infrastructure (queries, auth, Supabase client) is already in place from previous specs.

**⚠️ CRITICAL**: Phase 1 verification must pass before proceeding.

**Checkpoint**: Foundation verified — user story implementation can now begin

---

## Phase 3: User Story 1 — Agent Workspace Real Data (Priority: P1) 🎯 MVP

**Goal**: Restore the full `/agents/[id]` page with all 8+ parallel Supabase queries, ChatPanel, AgentSidebar, SetupChecklist, and PresenceIndicator.

**Independent Test**: Navigate to `/agents/[id]` with a valid agent ID. The page must load real agent data from Supabase, show the chat panel with conversation history, display workflows/skills in the sidebar, and show the setup checklist.

### Implementation for User Story 1

- [x] T003 [US1] Restore the full server-side data fetching in `src/app/(dashboard)/agents/[id]/page.tsx` by copying the original implementation from `main` branch (`git show main:src/app/(dashboard)/agents/[id]/page.tsx`). This includes: auth check with redirect, 2-phase parallel Supabase fetching (auth+agent, then profile+conversation+role+store+messaging+skills+workflows), `buildSetupSteps()` function, orchestrator detection, and full render with ChatPanel, AgentSidebar, SetupChecklist, PresenceIndicator, AgentAvatar, AgentStatus, NewChatButton, ChatHistoryButton. All components are in `src/components/agent-detail/`. The `AgentSidebarData` async component for Suspense-streamed sidebar data must also be restored.
- [x] T004 [US1] Verify the restored page renders correctly: check that all imported components from `src/components/agent-detail/` (ChatPanel, AgentSidebar, SetupChecklist, PresenceIndicator, AgentAvatar, AgentStatus, NewChatButton, ChatHistoryButton) resolve without import errors. Run `bun run build` to catch any TypeScript issues.
- [x] T005 [US1] Handle empty states in the restored `/agents/[id]` page: ensure the page shows appropriate fallback UI when agent has no conversations (empty ChatPanel), no workflows/skills (empty sidebar sections), and no setup steps (hide checklist). Test with a valid agent ID that has no associated data.

**Checkpoint**: `/agents/[id]` page fully functional with real Supabase data

---

## Phase 4: User Story 2 — Dashboard Real Data (Priority: P1)

**Goal**: Restore `/dashboard` page with real team, agents, workflows, and run count data from Supabase.

**Independent Test**: Navigate to `/dashboard`. Verify team name, agent cards, workflows, and run count reflect actual database state.

### Implementation for User Story 2

- [x] T006 [US2] Modify `src/components/home/home-client-new.tsx` to accept optional props for real data: `team` (name, avatar_url), `agents` (array with name, description, skills, workflows), `runsToday` (number). When props are provided, use them instead of static imports from `src/data/home-dashboard.ts` and `src/data/coworkers.ts`. Keep static data as fallback when props are undefined.
- [x] T007 [US2] Restore server-side data fetching in `src/app/(dashboard)/dashboard/page.tsx`: make it an async server component that calls `createServerClient()`, `auth.getUser()` (redirect to `/login` if no user), `getActiveTeamId()`, then `fetchTeam()`, `fetchAgentsWithSkills()`, `fetchWorkflows()`, `fetchRunsToday()` from `src/lib/queries/dashboard.ts`. Pass results as props to `HomeClientNew`. Reference the original implementation: `git show main:src/app/(dashboard)/dashboard/page.tsx`.
- [x] T008 [US2] Handle empty states in dashboard: when team has no agents, show "Add co-worker" CTA instead of empty cards. When no workflows exist, show an appropriate empty state. When `runsToday` is 0, display "0" instead of hiding the metric.

**Checkpoint**: `/dashboard` page shows real team data from Supabase

---

## Phase 5: User Story 3 — Chat History Real Data (Priority: P2)

**Goal**: Wire `/history` page to real `agent_conversations` data from Supabase.

**Independent Test**: Navigate to `/history` after having at least one conversation. Verify conversations appear with correct titles, dates, and agent names.

### Implementation for User Story 3

- [x] T009 [US3] Modify `src/components/history/history-client.tsx` to accept an optional `conversations` prop (array of conversation objects with id, title, agent name, last message preview, created_at, updated_at). When provided, use it instead of static data from `src/data/conversations.ts`. Keep static data as fallback.
- [x] T010 [US3] Add server-side data fetching in `src/app/(dashboard)/history/page.tsx`: make it an async server component that calls `createServerClient()`, `auth.getUser()` (redirect if no user), then queries `agent_conversations` filtered by `user_id` with agent name join. Pass results to `HistoryClient`. Use existing query patterns from `src/lib/queries/agent-conversations.ts` or write a simple Supabase query inline.
- [x] T011 [US3] Handle empty state in history: when user has no conversations, show an appropriate empty state message (e.g., "No conversations yet. Start chatting with a co-worker!").

**Checkpoint**: `/history` page shows real conversation history

---

## Phase 6: User Story 4 — Connected Apps Real Data (Priority: P2)

**Goal**: Wire `/apps` page to real app connections from Supabase and Composio catalog.

**Independent Test**: Navigate to `/apps`. Verify connected apps show "Connected" badge and unconnected apps show "Connect" button.

### Implementation for User Story 4

- [x] T012 [US4] Modify `src/components/apps/apps-client.tsx` to accept an optional `apps` prop (array of app objects with name, icon, description, connected status). When provided, use it instead of static data from `src/data/apps.ts`. Keep static data as fallback.
- [x] T013 [US4] Add server-side data fetching in `src/app/(dashboard)/apps/page.tsx`: make it an async server component that calls `createServerClient()`, `auth.getUser()` (redirect if no user), then uses `getAppConnections()` from `src/lib/composio/actions/get-app-connections.ts` and optionally `getComposioApps()` from `src/lib/composio/actions/get-composio-apps.ts` to build the app list with connection status. Pass results to `AppsClient`.
- [x] T014 [US4] Handle empty/error states in apps: when Composio API is unreachable, show apps from `app_connections` table only. When user has no connections, all apps show "Connect" buttons.

**Checkpoint**: `/apps` page shows real app connection status

---

## Phase 7: User Story 5 — Discover Page Real Data (Priority: P3)

**Goal**: Wire `/agents` discover page to real agents from the database.

**Independent Test**: Navigate to `/agents`. Verify agents match the database records for the user's team.

### Implementation for User Story 5

- [x] T015 [US5] Modify `src/components/discover/discover-client.tsx` to accept an optional `agents` prop (array of agent objects). When provided, use it instead of static data from `src/data/agents.ts`. Keep static data as fallback. Ensure search and category filtering still work with real data.
- [x] T016 [US5] Add server-side data fetching in `src/app/(dashboard)/agents/page.tsx`: make it an async server component that calls `createServerClient()`, `auth.getUser()` (redirect if no user), `getActiveTeamId()`, then `fetchAgentsWithSkills()` from `src/lib/queries/dashboard.ts` (or a simpler agents query). Pass results to `DiscoverClient`.
- [x] T017 [US5] Handle empty state in discover: when team has no agents, show an appropriate empty state with "Add co-worker" CTA.

**Checkpoint**: `/agents` discover page shows real agent catalog

---

## Phase 8: User Story 6 — New Chat Backend Integration (Priority: P3)

**Goal**: Wire `/chat` page to fetch real agents and support creating chat sessions.

**Independent Test**: Navigate to `/chat`. Verify coworker selector shows real agents. Sending a message creates a real conversation.

### Implementation for User Story 6

- [x] T018 [US6] Modify `src/components/chat/new-chat-client.tsx` to accept an optional `agents` prop for the coworker selector. When provided, pass real agent data to `CoworkerSelector` in `src/components/chat/coworker-selector.tsx` instead of using static data from `src/data/coworkers.ts`.
- [x] T019 [US6] Add server-side data fetching in `src/app/(dashboard)/chat/page.tsx`: make it an async server component that calls `createServerClient()`, `auth.getUser()` (redirect if no user), `getActiveTeamId()`, then fetches team agents. Pass results to `NewChatClient`.
- [x] T020 [US6] Wire up message sending in `src/components/chat/new-chat-client.tsx`: when user sends a message, create a new `agent_conversation` via the existing chat API (`/api/agents/[id]/chat`) and redirect to `/chat/[id]` for the streaming response. Use the selected coworker (or orchestrator) as the target agent.

**Checkpoint**: `/chat` page creates real conversations

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all pages.

- [x] T021 Verify all 6 restored pages build without errors by running `bun run build`
- [x] T022 Verify all pages redirect unauthenticated users to `/login` by checking each page route has auth checks
- [x] T023 Verify all pages handle empty states gracefully — test with a user/team that has no data
- [x] T024 Run `bun run lint` and fix any linting issues introduced by the changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — verification only
- **Foundational (Phase 2)**: Depends on Phase 1 verification
- **US1 Agent Workspace (Phase 3)**: Can start after Phase 2 — highest priority, most complex
- **US2 Dashboard (Phase 4)**: Can start after Phase 2 — can run in parallel with US1
- **US3 History (Phase 5)**: Can start after Phase 2 — independent of US1/US2
- **US4 Apps (Phase 6)**: Can start after Phase 2 — independent of US1/US2/US3
- **US5 Discover (Phase 7)**: Can start after Phase 2 — independent
- **US6 Chat (Phase 8)**: Can start after Phase 2 — independent
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Agent Workspace)**: Independent — no dependency on other stories
- **US2 (Dashboard)**: Independent — no dependency on other stories
- **US3 (History)**: Independent
- **US4 (Apps)**: Independent
- **US5 (Discover)**: Independent
- **US6 (Chat)**: Independent (but benefits from US1 being done for agent data patterns)

### Parallel Opportunities

- **US1 + US2**: Can run in parallel (different page files, different client components)
- **US3 + US4**: Can run in parallel (different page files, different client components)
- **US5 + US6**: Can run in parallel (different page files, different client components)
- Within each story: T0xx client component modification [P] can be done before page route modification

---

## Parallel Example: US1 + US2

```bash
# These can run in parallel — they touch completely different files:
Agent 1: T003 → T004 → T005 (Agent Workspace: agents/[id]/page.tsx)
Agent 2: T006 → T007 → T008 (Dashboard: dashboard/page.tsx + home-client-new.tsx)
```

## Parallel Example: US3 + US4

```bash
# These can run in parallel:
Agent 1: T009 → T010 → T011 (History: history/page.tsx + history-client.tsx)
Agent 2: T012 → T013 → T014 (Apps: apps/page.tsx + apps-client.tsx)
```

---

## Implementation Strategy

### MVP First (US1 + US2 — Both P1)

1. Verify infrastructure (Phase 1–2)
2. Restore Agent Workspace (Phase 3) — most critical page
3. Restore Dashboard (Phase 4) — main entry point
4. **STOP and VALIDATE**: Both P1 pages should work with real data
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1–2: Verify infrastructure
2. Phase 3–4: P1 pages (Agent Workspace + Dashboard) → Test → Deploy
3. Phase 5–6: P2 pages (History + Apps) → Test → Deploy
4. Phase 7–8: P3 pages (Discover + Chat) → Test → Deploy
5. Phase 9: Polish and final validation

---

## Notes

- All user stories are independent — they can be implemented in any order
- The pattern is the same for every page: (1) modify client component to accept props, (2) add server-side fetching to page route, (3) handle empty states
- US1 (Agent Workspace) is the exception — it restores the original 422-line implementation from `main` rather than modifying the new component
- Static data files in `/data/` should remain as fallback but pages must use real data when available
- No new query functions are needed — all exist in `/lib/queries/`
