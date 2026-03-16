# Feature Specification: Restore Real Data Integration After Layout Redesign

**Feature Branch**: `032-restore-data-integration`
**Created**: 2026-03-10
**Status**: Draft
**Input**: Restore all real Supabase data fetching that was removed during the layout redesign (spec 031). The new visual components are correct and must be kept — only the data source changes from static mock files to real database queries.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Agent Workspace Real Data (Priority: P1)

A user navigates to `/agents/[id]` and sees the real agent detail page with live chat, workflows, skills, connected apps, setup checklist, and presence indicator — all fetched from Supabase. The page authenticates the user, resolves their team, and renders the full workspace experience that existed before the redesign.

**Why this priority**: This is the most critical page in the application. It lost 422 lines of server-side logic including 8+ parallel Supabase queries, the ChatPanel with streaming chat, AgentSidebar with workflows/skills/runs, SetupChecklist with context-aware steps, and PresenceIndicator. Without this, agents are non-functional.

**Independent Test**: Navigate to `/agents/[id]` with a valid agent ID. The page must load real agent data, show the chat panel with conversation history (if any), display workflows and skills in the sidebar, and show the setup checklist with steps appropriate to the agent's role.

**Acceptance Scenarios**:

1. **Given** a logged-in user with an active agent, **When** they navigate to `/agents/[id]`, **Then** the page displays the agent's real name, description, status, avatar, and all sidebar data (workflows, skills, runs, connected apps) fetched from Supabase.
2. **Given** a logged-in user with an existing conversation with the agent, **When** the page loads, **Then** the ChatPanel shows the real conversation history with streaming support.
3. **Given** a logged-in user viewing an agent, **When** the AgentSidebar loads, **Then** workflows, skills, recent runs, and connected apps are fetched independently via Suspense boundaries.
4. **Given** an agent with role "Stock Manager", **When** the page loads, **Then** the SetupChecklist shows context-aware steps specific to that role (e.g., connect Nuvemshop, configure stock alerts).
5. **Given** a user who is not authenticated, **When** they try to access `/agents/[id]`, **Then** they are redirected to the login page.
6. **Given** an invalid agent ID, **When** the page loads, **Then** the user sees a 404 or appropriate error state.

---

### User Story 2 - Dashboard Real Data (Priority: P1)

A user lands on `/dashboard` and sees their real team name, active agents with skill counts, workflows filtered by status, and today's run count — all fetched server-side from Supabase and passed to the new home components.

**Why this priority**: This is the main entry point of the application. Users see it first and it must reflect real team/agent/workflow state to be useful.

**Independent Test**: Log in and navigate to `/dashboard`. Verify that the team name, agent cards, workflow list, and run count reflect the actual database state for the user's team.

**Acceptance Scenarios**:

1. **Given** a logged-in user with a team, **When** they visit `/dashboard`, **Then** the page displays their real team name and avatar.
2. **Given** a team with 3 active agents, **When** the dashboard loads, **Then** the "Co-workers in Action" section shows exactly those 3 agents with their real names, descriptions, and skill/workflow counts.
3. **Given** a team with workflows, **When** the dashboard loads, **Then** the workflows section shows real workflow data with correct status badges and last-run timestamps.
4. **Given** a team with workflow runs today, **When** the dashboard loads, **Then** the metrics show the real count of runs executed today.
5. **Given** a new user with no agents or workflows, **When** the dashboard loads, **Then** the page shows appropriate empty states instead of crashing.

---

### User Story 3 - Chat History Real Data (Priority: P2)

A user navigates to `/history` and sees their real conversation history with agents, grouped by date, with actual message previews fetched from the `agent_conversations` and `agent_messages` tables.

**Why this priority**: Chat history is a core user feature. Without it, users cannot review past interactions with agents.

**Independent Test**: Navigate to `/history` after having at least one conversation with an agent. Verify the conversation appears with correct title, date, and message preview.

**Acceptance Scenarios**:

1. **Given** a user with 5 past conversations, **When** they visit `/history`, **Then** all 5 conversations are listed with real titles, dates, and agent names.
2. **Given** conversations from today and yesterday, **When** the page loads, **Then** conversations are grouped by date (Today, Yesterday, etc.).
3. **Given** a user with no conversations, **When** they visit `/history`, **Then** an empty state message is shown.
4. **Given** a conversation in the list, **When** the user clicks it, **Then** they are navigated to the conversation detail view.

---

### User Story 4 - Connected Apps Real Data (Priority: P2)

A user navigates to `/apps` and sees their real app connections — which apps are connected, which are available to connect — fetched from the `app_connections` table and Composio catalog.

**Why this priority**: App connections are essential for agent functionality. Users need to see which integrations are active and connect new ones.

**Independent Test**: Navigate to `/apps` with at least one connected app. Verify the connected app shows as "Connected" and unconnected apps show "Connect" buttons.

**Acceptance Scenarios**:

1. **Given** a user with Shopify connected, **When** they visit `/apps`, **Then** Shopify shows a "Connected" badge and all other apps show "Connect" buttons.
2. **Given** a user with no connected apps, **When** they visit `/apps`, **Then** all apps show "Connect" buttons.
3. **Given** the app catalog, **When** the page loads, **Then** apps are searchable and filterable.

---

### User Story 5 - Discover Page Real Data (Priority: P3)

A user navigates to `/agents` and sees the real agent catalog from the database — with accurate active/installed status, real categories, and proper search functionality.

**Why this priority**: Discovery is important for onboarding but less critical than the agent workspace and dashboard. Currently shows 27 hardcoded agents instead of real data.

**Independent Test**: Navigate to `/agents` and verify agents match the database records for the user's team.

**Acceptance Scenarios**:

1. **Given** a team with 5 agents, **When** the user visits `/agents`, **Then** the page shows those 5 agents with real names, descriptions, and statuses.
2. **Given** agents with different categories, **When** the user filters by category, **Then** only matching agents are shown.
3. **Given** a search query, **When** the user types in the search bar, **Then** agents are filtered by name or description.
4. **Given** a user with active agents, **When** they view the "Active" tab, **Then** only their active agents appear.

---

### User Story 6 - New Chat Backend Integration (Priority: P3)

A user navigates to `/chat` and can start a new conversation with an agent. The page fetches the orchestrator agent (or available agents) and creates a real chat session when the user sends a message.

**Why this priority**: Chat initiation is needed for the full chat experience but depends on the agent workspace (US1) being functional first.

**Independent Test**: Navigate to `/chat`, type a message, and verify a real conversation is created in the database and the user is redirected to the chat view.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they visit `/chat`, **Then** the coworker selector shows real agents from their team.
2. **Given** a user typing a message, **When** they send it, **Then** a new `agent_conversation` is created and the user is redirected to `/chat/[id]` with a streaming response.
3. **Given** no orchestrator agent configured, **When** the user visits `/chat`, **Then** the page still works with a fallback flow.

---

### Edge Cases

- What happens when a user's team has zero agents? — Empty state with "Add co-worker" CTA on dashboard and discover pages.
- What happens when Supabase queries fail? — Graceful error boundaries; pages should not crash. Show retry option or fallback UI.
- What happens when the user's session expires mid-page? — Redirect to login on next server-side query.
- What happens when an agent is deleted while a user has it open? — 404 state or redirect to `/agents`.
- What happens when a conversation has zero messages? — Show empty chat state with prompts.
- What happens when the Composio API is unreachable? — Apps page shows local `app_connections` data without catalog enrichment.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: All page routes MUST fetch data server-side using existing query functions from `/lib/queries/` — no new query infrastructure unless necessary.
- **FR-002**: All page routes MUST authenticate the user via `createServerClient()` and redirect to login if no session exists.
- **FR-003**: All page routes MUST resolve the user's team via `getActiveTeamId()` before querying team-scoped data.
- **FR-004**: The `/agents/[id]` page MUST restore all 8+ parallel Supabase queries (agent, profile, conversation, team role, store, messaging, skills, workflows).
- **FR-005**: The `/agents/[id]` page MUST render `ChatPanel` with real streaming chat via the existing chat API.
- **FR-006**: The `/agents/[id]` page MUST render `AgentSidebar` with workflows, skills, runs, and connected apps via Suspense streaming.
- **FR-007**: The `/agents/[id]` page MUST render `SetupChecklist` with context-aware steps based on the agent's role.
- **FR-008**: The `/dashboard` page MUST call `fetchTeam()`, `fetchAgentsWithSkills()`, `fetchWorkflows()`, and `fetchRunsToday()` and pass results to the home components.
- **FR-009**: The `/history` page MUST query `agent_conversations` filtered by the current user and pass results to `HistoryClient`.
- **FR-010**: The `/apps` page MUST query `app_connections` for the current user and merge with the Composio app catalog.
- **FR-011**: The `/agents` discover page MUST query real agents from the database instead of static mock data.
- **FR-012**: The `/chat` page MUST fetch available agents and support creating real chat sessions.
- **FR-013**: All pages MUST handle empty states gracefully (new users with no data).
- **FR-014**: The new visual design (layout components from spec 031) MUST be preserved — only the data source changes.
- **FR-015**: Mock data files in `/data/` MAY remain in the codebase for development/fallback but MUST NOT be the primary data source for any page route.

### Key Entities

- **Agent**: Core entity with name, description, role, status, team_id. Linked to skills, workflows, conversations.
- **Agent Conversation**: Chat session between a user and an agent. Contains messages with role, content, timestamps.
- **Agent Workflow**: Automation workflow linked to an agent. Has trigger config, actions, status, emoji.
- **Agent Skill**: Capability assigned to an agent. Has name, description, content, source.
- **App Connection**: User's authenticated connection to an external app (Shopify, Gmail, etc.). Has status, credentials.
- **Team**: User's organization context. All queries are scoped to the active team.
- **Profile**: User's display info (name, avatar). Used for chat message rendering.
- **Workflow Run**: Execution record of a workflow. Has status, credits used, timestamps.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All 6 page routes (`/dashboard`, `/agents/[id]`, `/history`, `/apps`, `/agents`, `/chat`) display real data from the database instead of static mock data.
- **SC-002**: The `/agents/[id]` page renders the full agent workspace experience: chat panel, sidebar with workflows/skills/runs, setup checklist, and presence indicator.
- **SC-003**: Users with no data (new accounts) see appropriate empty states on all pages without errors.
- **SC-004**: All pages authenticate the user and redirect to login if no session exists.
- **SC-005**: Page load performance remains comparable to the mock data version — server-side queries use parallel fetching where possible.
- **SC-006**: The visual design from the layout redesign (spec 031) is preserved unchanged — no CSS or component structure regressions.
- **SC-007**: The `/notifications` page remains unchanged (intentionally stubbed with example data).

## Assumptions

- All existing query functions in `/lib/queries/` are functional and return the expected data shapes.
- The Supabase schema has not changed since the queries were last used.
- The `createServerClient()` and `getActiveTeamId()` utilities work correctly in the current Next.js 16 setup.
- Components in `/components/agent-detail/` (ChatPanel, AgentSidebar, SetupChecklist, etc.) still exist and are importable.
- The chat streaming API at `/api/agents/[id]/chat` is still functional.
- Composio SDK functions for app catalog are still available.

## Scope Boundaries

**In scope**:

- Restoring server-side data fetching on all 6 page routes
- Passing real data as props to existing client components
- Handling empty states for all pages
- Auth checks and redirects

**Out of scope**:

- Changing the visual design or layout
- Creating new Supabase queries or tables
- Modifying the mock data files themselves
- The `/notifications` page (intentionally stubbed)
- The agent modal (already being restored separately)
- New features or functionality not previously present
