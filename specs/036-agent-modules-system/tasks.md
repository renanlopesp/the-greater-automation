# Tasks: Agent Modules System

**Input**: Design documents from `/specs/036-agent-modules-system/`
**Prerequisites**: plan.md, spec.md

**Tests**: Not explicitly requested — test tasks omitted. Build verification at each checkpoint.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US6)
- Exact file paths included

---

## Phase 1: Setup

**Purpose**: Database migrations and core type definitions

- [x] T001 Create migration `supabase/migrations/YYYYMMDD_create_agent_modules.sql` — table `agent_modules` (id, agent_id, module_type, name, description, enabled, required_connections, config, created_at, updated_at) with RLS and indexes
- [x] T002 Create migration `supabase/migrations/YYYYMMDD_create_workflow_run_outputs.sql` — table `workflow_run_outputs` (id, workflow_run_id, module_id, output_type, output_data, summary_text, created_at) with RLS and indexes
- [x] T003 Create migration `supabase/migrations/YYYYMMDD_alter_agent_workflows_add_module_id.sql` — add `module_id` (uuid FK nullable) to `agent_workflows`
- [x] T004 Create migration `supabase/migrations/YYYYMMDD_alter_agents_add_agent_type.sql` — add `agent_type` (text nullable, unique per team) to `agents`
- [x] T005 [P] Create module types in `src/lib/modules/types.ts` — ModuleStatus, ModuleDefinition, AgentTypeDefinition, WorkflowRunOutput, ArtifactType, ActionLogItem, AgentActivityData interfaces
- [x] T006 [P] Create output data type schemas in `src/lib/modules/output-schemas.ts` — Zod schemas for cart-table, channel-performance, conversion-list, message-approval, category-chart, escalation-cards, kpi-summary

**Checkpoint**: Database schema ready, TypeScript types defined. Run `bun run build` to verify.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Module registry, provisioning engine, and activity queries that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create module registry in `src/lib/modules/registry.ts` — maps agent types to module definitions. Start with `carrinho-conversao` type containing 4 modules (abandoned-cart, conversion-optimizer, urgency-manager, upsell-engine) with their required_connections and workflow definitions (trigger type, cron expression, step descriptions)
- [x] T008 Create module status resolver in `src/lib/modules/status.ts` — function `resolveModuleStatus(module, connections)` that computes status (active/paused/requires_connection/error) from module.enabled + required_connections vs active app_connections + last workflow run status
- [x] T009 Create agent provisioning in `src/lib/modules/provision.ts` — function `installAgent(agentType, teamId, userId)` that in a single transaction: creates agent row with agent_type, creates all modules from registry, creates all workflows from module definitions, returns agentId. Prevents duplicate install (unique agent_type per team)
- [x] T010 Create module server actions in `src/lib/actions/modules.ts` — `toggleModule(moduleId, enabled)` (updates enabled + pauses/resumes workflows), `getModulesByAgent(agentId)` (returns modules with computed status)
- [x] T011 Create activity query functions in `src/lib/queries/agent-activity.ts` — `fetchAgentActivity(agentId, date?)` returns { summary, kpis, actions } aggregated from workflow_run_outputs for the given day. `fetchArtifact(runOutputId)` returns typed artifact data based on output_type
- [x] T012 Create React Query hooks in `src/hooks/use-agent-activity.ts` and `src/hooks/use-agent-modules.ts` — `useAgentActivity(agentId)` and `useAgentModules(agentId)` wrapping the query functions
- [x] T013 Create Zustand store in `src/stores/agent-workspace-store.ts` — manages selectedArtifactId, activeTab (activity/results/configure/connections), artifactPanelWidth

**Checkpoint**: Foundation ready. `installAgent('carrinho-conversao', teamId, userId)` creates agent + 4 modules + workflows in DB. `fetchAgentActivity()` returns data from workflow_run_outputs. Run `bun run build`.

---

## Phase 3: User Story 1 — Install Agent with Pre-configured Modules (Priority: P1) MVP

**Goal**: User clicks "Ativar" on catalog → agent created with 4 working modules → cron runs → real data appears

**Independent Test**: Install Carrinho & Conversao on a store with Nuvemshop. Wait 15min. Verify abandoned cart data in DB.

### Implementation

- [x] T014 [US1] Update install wizard modal in `src/components/discover/install-wizard-modal.tsx` — CTA button calls `installAgent()` server action instead of just closing. On success, redirect to `/agents/{agentId}`
- [x] T015 [US1] Create connection tour component in `src/components/agent-detail/connection-tour.tsx` — modal that shows required connections for the agent type, verifies each (pending/verifying/connected), lets user connect missing ones, "Continue" button when all critical connections verified
- [x] T016 [US1] Update discover client in `src/components/discover/discover-client.tsx` — after install, show connection tour before redirect. Pass agentType to wizard
- [x] T017 [US1] Migrate existing `src/lib/retail/abandoned-cart.ts` — update `checkAbandonedCarts()` to write structured output to `workflow_run_outputs` table (output_type: 'cart-table', 'kpi-summary') in addition to existing Telegram notification. Same for `checkRecoveredCarts()` (output_type: 'conversion-list')
- [x] T018 [US1] Update cron handler in `src/app/api/nuvemshop/cron/route.ts` — when running abandoned cart check, look up the agent's abandoned-cart module and its workflow, create a workflow_run record, then call the cart check logic and write outputs linked to that run
- [x] T019 [US1] Add duplicate install prevention — update `src/app/(dashboard)/agents/page.tsx` to pass installed agent_types to DiscoverClient. Update AgentCard to show "Instalado" badge + link to agent page instead of install wizard for already-installed types

**Checkpoint**: Install flow works end-to-end. Cron produces real workflow_run_outputs. Duplicate installs prevented. `bun run build`.

---

## Phase 4: User Story 2 — Installed Agent Page with Activity Feed (Priority: P1)

**Goal**: 2-panel layout with chat + activity. Real data from workflow runs. Clickable action log opens artifact panel.

**Independent Test**: Navigate to installed agent page. See today's summary, KPIs, action log with real data. Click action → artifact panel opens with typed content.

### Implementation

- [x] T020 [US2] Create installed agent page shell in `src/components/agent-detail/installed-agent-page.tsx` — 2-panel layout: left (chat + activity), right (artifact panel, conditional). Topbar with avatar + name + 4 icon buttons (Historico, Arquivos, Integracoes, Configuracoes)
- [x] T021 [P] [US2] Create activity feed component in `src/components/agent-detail/agent-activity-feed.tsx` — hero section (avatar 80px + name), activity snapshot (summary message with bold highlights, 3 KPI rows), "o que fiz hoje" section with action log items. Uses `useAgentActivity()` hook
- [x] T022 [P] [US2] Create action log item component in `src/components/agent-detail/agent-activity-item.tsx` — row with status dot (done=gray, in_progress=red+animated, scheduled=light, pending=dashed), label text, timestamp, optional badge, chevron. onClick triggers artifact selection in Zustand store
- [x] T023 [P] [US2] Create artifact panel shell in `src/components/agent-detail/artifact-panel.tsx` — resizable right panel (320–900px), drag handle, expand/minimize/close buttons, header (title + timestamp), content area that renders the appropriate artifact type component based on output_type
- [x] T024 [P] [US2] Create artifact: cart table in `src/components/agent-detail/artifact-cart-table.tsx` — table with columns Cliente, Produto, Valor, Abandonado, Status. Status badges: enviado (orange), convertido (green), aguardando (gray)
- [x] T025 [P] [US2] Create artifact: channel performance in `src/components/agent-detail/artifact-channels.tsx` — per-channel bars (name + "N convertidos de M enviados" + progress bar), insight text below
- [x] T026 [P] [US2] Create artifact: conversion list in `src/components/agent-detail/artifact-conversions.tsx` — customer rows (name + product + value + channel + convertido badge), total recovered, insight narrative
- [x] T027 [P] [US2] Create artifact: message approval in `src/components/agent-detail/artifact-approval.tsx` — WhatsApp preview bubble (store name header, message body with [Nome]/[Produto]/[Valor], timestamp + checkmarks), "Enviar para N clientes" text, Aprovar + Editar buttons. Aprovar calls `approveMessage()` server action
- [x] T028 [P] [US2] Create artifact: category donut chart in `src/components/agent-detail/artifact-category-chart.tsx` — donut/ring SVG chart, legend with colored dots + category + count, insight text
- [x] T029 [P] [US2] Create artifact: escalation cards in `src/components/agent-detail/artifact-escalation-cards.tsx` — stacked cards with customer name + status badge (andamento/resolvido/aguardando), 3 fields: Problema, O que fiz, Escalei porque
- [x] T030 [US2] Update agent detail page in `src/app/(dashboard)/agents/[id]/page.tsx` — detect if agent has modules (agent_type is set). If yes, render InstalledAgentPage instead of the old 2-panel chat+workspace layout. Pass agent data
- [x] T031 [US2] Integrate chat panel with activity — chat input at bottom of left panel with placeholder "Message [Agent Name]..." and 3 suggestion pills. Activity snapshot + action log above chat messages in same scroll container

**Checkpoint**: Full installed agent page works with real data. Action log items open correct artifact types. `bun run build`.

---

## Phase 5: User Story 3 — Module Management and Connection Awareness (Priority: P2)

**Goal**: Configure tab shows modules with status, toggle, connection requirements. Connection changes auto-update module status.

**Independent Test**: Open configure tab. Toggle a module off → verify its workflows pause. Connect missing integration → verify module activates.

### Implementation

- [x] T032 [P] [US3] Create module card component in `src/components/agent-detail/module-card.tsx` — card with module name, description, status badge (active=green, paused=gray, requires_connection=amber, error=red), toggle switch, list of required connections with status icons, link to connect missing ones
- [x] T033 [P] [US3] Create module list component in `src/components/agent-detail/module-list.tsx` — renders all modules for the agent using module cards. Uses `useAgentModules()` hook
- [x] T034 [US3] Add configure tab to installed agent page — when activeTab === 'configure', render ModuleList in the workspace area. Wire topbar Configuracoes button to switch to this tab
- [x] T035 [US3] Implement connection-aware status update — when user connects an app (via `/apps` page or OAuth callback), check if any agent modules' required_connections are now satisfied. Update module status accordingly (this is computed at read time, so no background job needed — just ensure `resolveModuleStatus()` checks live connection data)

**Checkpoint**: Module management works. Toggling modules pauses/resumes workflows. Connection status reflected. `bun run build`.

---

## Phase 6: User Story 4 — Connection Tour on First Install (Priority: P2)

**Goal**: First install shows connection tour verifying required integrations before agent activates.

**Independent Test**: Install agent with no connections. See connection tour. Connect Nuvemshop. Tour completes. Agent starts.

### Implementation

- [x] T036 [US4] Wire connection tour into install flow — after `installAgent()` succeeds, check if all required connections are verified. If not, show ConnectionTour modal. On tour completion, navigate to installed agent page
- [x] T037 [US4] Add connection verification logic to `src/components/agent-detail/connection-tour.tsx` — for each required connection, query `app_connections` table to check if it exists and is active. Show animated verification steps (pending → verifying → connected). "Connect" button opens OAuth flow for missing connections
- [x] T038 [US4] Handle skip flow — allow user to skip non-critical connections. Agent installs with available modules active, unavailable ones marked as requires_connection

**Checkpoint**: Connection tour works end-to-end. Skip flow gracefully degrades. `bun run build`.

---

## Phase 7: User Story 5 — Chat with Module-Aware Agent (Priority: P2)

**Goal**: Agent answers questions about its module data using real workflow run outputs.

**Independent Test**: Chat "quantos carrinhos foram recuperados?" → agent responds with real numbers from DB.

### Implementation

- [x] T039 [US5] Create module data tool in `src/lib/ai/platform-tools.ts` — add `AGENT_QUERY_MODULE_DATA` tool that queries workflow_run_outputs for the agent's modules, returning recent KPIs and activity summaries. Agent can use this to answer questions about its own performance
- [x] T040 [US5] Create module trigger tool in `src/lib/ai/platform-tools.ts` — add `AGENT_TRIGGER_MODULE` tool that allows the agent to trigger a module's workflow on demand via chat (e.g., "roda a analise de conversao agora")
- [x] T041 [US5] Update agent chat context in `src/lib/ai/chat.ts` — when the agent has modules, inject module descriptions and recent activity summary into the system prompt so the agent knows what it can do and what it has done recently

**Checkpoint**: Chat responds with real module data. On-demand triggers work. `bun run build`.

---

## Phase 8: User Story 6 — Results and Connections Tabs (Priority: P3)

**Goal**: Results tab shows aggregated KPIs with trends. Connections tab shows integration status.

**Independent Test**: After 7 days of activity, open Results tab. See aggregated KPIs with week-over-week deltas.

### Implementation

- [x] T042 [P] [US6] Create results tab component in `src/components/agent-detail/agent-results-tab.tsx` — aggregated KPIs from all module workflow runs. Grid of KPI cards with label, value, trend indicator (up=green, down=red, neutral=gray), sub text (e.g., "vs semana anterior"). Uses query that aggregates workflow_run_outputs over configurable time window
- [x] T043 [P] [US6] Create connections tab component in `src/components/agent-detail/agent-connections-tab.tsx` — list of all integrations the agent uses (from module required_connections), each showing: app icon + name + status badge (connected/warning/disconnected) + last sync time + reconnect button
- [x] T044 [US6] Wire results and connections tabs into installed agent page — activeTab === 'results' renders AgentResultsTab, activeTab === 'connections' renders AgentConnectionsTab. Wire topbar Integracoes button to connections tab

**Checkpoint**: All 4 tabs work (activity, results, configure, connections). `bun run build`.

---

## Phase 9: User Story — Sidebar Installed Agents List (Priority: P2)

**Goal**: Sidebar shows installed agents for quick navigation.

**Independent Test**: Install 2 agents. See both in sidebar. Click to navigate between them.

### Implementation

- [x] T045 [US2] Update sidebar in `src/components/app-sidebar-new.tsx` — below main nav, add section listing installed agents (query agents where agent_type is not null). Each entry: CoworkerAvatar (28px) + agent name. Clickable to navigate to `/agents/{id}`. Active agent highlighted. Green dot for running agents

**Checkpoint**: Sidebar navigation between installed agents works.

---

## Phase 10: Skill System Cleanup

**Purpose**: Remove old text-based skills, clean up DB and code

- [x] T046 Create migration `supabase/migrations/YYYYMMDD_cleanup_skills.sql` — add `type` column to `agent_skills` (values: 'context', 'knowledge', 'procedure'). Set existing rows to 'context'. Add comment: knowledge/procedure are deprecated
- [x] T047 Update skill creation UI in `src/components/agent-detail/skills-list.tsx` — only create/show 'context' type skills. Rename UI label from "Skills" to "Agent Context". Remove knowledge/procedure creation options
- [x] T048 Update AI tool `SNEW_CREATE_SKILL` in `src/lib/ai/platform-tools.ts` — only creates 'context' type. Update description to reflect new naming
- [x] T049 Remove mock data — set all `FEATURE_FLAGS.MOCK_*` to `false` in `src/lib/feature-flags.ts` for areas now served by real module data (MOCK_AGENT_WORKSPACE, MOCK_COWORKERS_IN_ACTION). Remove mock data constants from agent-workspace-panel.tsx and coworkers-in-action.tsx
- [x] T050 Clean up old agent form — remove `src/components/agent-detail/agent-form.tsx` (edit-only mode no longer needed for module-based agents). Keep only for legacy manually-created agents if any exist, otherwise delete

**Checkpoint**: No mock data in installed agent page. Skills UI shows "Agent Context" only. `bun run build` + `bun run lint`.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, cleanup, build validation

- [x] T051 End-to-end verification — install Carrinho & Conversao → connection tour → agent page → wait for cron → verify real activity data → click action items → verify artifacts → chat with agent about data → toggle module → verify results tab
- [x] T052 [P] Remove temporary screenshots and playwright artifacts from repo root
- [x] T053 [P] Update `src/data/agents.ts` — add `agent_type` field to catalog agents that correspond to installable agent types (e.g., agents in 'Carrinho & Conversao' category map to `agent_type: 'carrinho-conversao'`)
- [x] T054 Run `bun run build` + `bun run lint` + `bun run test` — zero errors, zero warnings, all tests pass
- [x] T055 Update CLAUDE.md with new active technologies for 036-agent-modules-system

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 Install)**: Depends on Phase 2
- **Phase 4 (US2 Activity Page)**: Depends on Phase 2. Can run in parallel with Phase 3 (UI vs backend)
- **Phase 5 (US3 Module Management)**: Depends on Phase 2
- **Phase 6 (US4 Connection Tour)**: Depends on Phase 3 (install flow)
- **Phase 7 (US5 Chat)**: Depends on Phase 2
- **Phase 8 (US6 Results/Connections)**: Depends on Phase 4 (page shell)
- **Phase 9 (Sidebar)**: Depends on Phase 3 (installed agents exist)
- **Phase 10 (Cleanup)**: Depends on Phase 4 (real data replaces mock)
- **Phase 11 (Polish)**: Depends on all previous phases

### Parallel Opportunities

```
Phase 1: T001-T004 sequential (migrations), T005+T006 parallel
Phase 2: T007+T008 parallel, then T009 (depends on both), T010+T011+T012+T013 parallel
Phase 3+4: Can run in parallel (T014-T019 backend || T020-T031 frontend)
Phase 4: T021-T029 all parallel (independent artifact components)
Phase 5+7: Can run in parallel
Phase 8: T042+T043 parallel
```

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + 3 + 4)

1. Phase 1: Database migrations + types (30min)
2. Phase 2: Registry + provisioning + queries (2-3h)
3. Phase 3: Install flow + cron migration (2h)
4. Phase 4: Installed agent page with activity feed (3-4h)
5. **STOP and VALIDATE**: Install agent → see real data → click artifacts

### Incremental Delivery

1. MVP above → demo-ready installed agent page
2. Add Phase 5 (module management) → user control
3. Add Phase 6 (connection tour) → smooth onboarding
4. Add Phase 7 (chat integration) → conversational data access
5. Add Phase 8 (results/connections tabs) → analytics
6. Phase 9+10+11 → polish and cleanup

---

## Summary

| Metric                            | Value                 |
| --------------------------------- | --------------------- |
| Total tasks                       | 55                    |
| Phase 1 (Setup)                   | 6 tasks               |
| Phase 2 (Foundational)            | 7 tasks               |
| Phase 3 (US1 Install)             | 6 tasks               |
| Phase 4 (US2 Activity Page)       | 12 tasks              |
| Phase 5 (US3 Module Mgmt)         | 4 tasks               |
| Phase 6 (US4 Connection Tour)     | 3 tasks               |
| Phase 7 (US5 Chat)                | 3 tasks               |
| Phase 8 (US6 Results/Connections) | 3 tasks               |
| Phase 9 (Sidebar)                 | 1 task                |
| Phase 10 (Cleanup)                | 5 tasks               |
| Phase 11 (Polish)                 | 5 tasks               |
| Parallel opportunities            | 22 tasks marked [P]   |
| MVP scope                         | Phases 1-4 (31 tasks) |
