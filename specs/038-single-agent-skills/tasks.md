# Tasks: Single Agent + Skills Migration

**Input**: Design documents from `/specs/038-single-agent-skills/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US6)
- Exact file paths included

---

## Phase 1: Setup

**Purpose**: Database schema and skill registry — the data foundation everything depends on.

- [x] T001 Create migration `create_skills_table` with schema from data-model.md in `supabase/migrations/`
- [x] T002 Create migration `create_skill_executions_table` with schema from data-model.md in `supabase/migrations/`
- [x] T003 Create migration `add_skill_slug_to_conversation_messages` — add nullable `skill_slug text` column to `conversation_messages` in `supabase/migrations/`
- [x] T004 Create skill registry `src/data/skills.ts` — migrate all 34 agent definitions from `src/data/agents.ts` to skill format (slug, name, description, category, phase, icon, dependencies, systemPrompt, tools, requiredConnections). Export `SkillDefinition` type, `skillCategories`, `skills` array.
- [x] T005 Create seed migration `seed_initial_skills` — for each existing team, insert skills from the code registry with status 'available'. Mark skills whose `agentType` matches an installed agent as 'active'. In `supabase/migrations/`

**Checkpoint**: Database tables exist. Skill registry in code. Seed data populates skills for existing teams.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core skill infrastructure that ALL user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 [P] Create `src/lib/queries/skills.ts` — `fetchTeamSkills(teamId)`, `fetchSkillBySlug(teamId, slug)`, `fetchSkillExecutions(skillId, limit?)`. Use Supabase client with proper typing.
- [x] T007 [P] Create `src/lib/actions/skills.ts` — `activateSkill(teamId, slug)`, `deactivateSkill(teamId, slug)`, `seedTeamSkills(teamId)`. Server actions using `createServiceRoleClient`.
- [x] T008 Create `src/lib/ai/skill-loader.ts` — `loadSkill(supabase, teamId, slug)` returns skill context (system_prompt + tools + knowledge). `loadSkillsForOrchestrator(supabase, teamId)` returns list of active skills for system prompt injection.
- [x] T009 Create `src/lib/ai/skill-executor.ts` — `executeSkill(supabase, teamId, skillSlug, input, conversationId?)` runs a skill, creates `skill_executions` record with status tracking (running → completed/failed), measures duration_ms.

**Checkpoint**: Foundation ready — skill loading, execution, and data access are operational.

---

## Phase 3: User Story 1 — Snew responds using skills (Priority: P1) MVP

**Goal**: Chat uses skills instead of SNEW_ASK_AGENT delegation. The core behavioral change.

**Independent Test**: Send a message in chat that previously triggered SNEW_ASK_AGENT → verify Snew responds directly with skill context loaded. Check `skill_executions` table for the record.

### Implementation

- [x] T010 [US1] Refactor `buildOrchestratorSystemPrompt()` in `src/lib/ai/platform-tools.ts` — change signature to accept `skills: Array<{ slug, name, description, category, status }>` instead of `agents: Array<{ id, name, description }>`. Update prompt text: replace all "agent"/"co-worker" references with "skill" references. Replace delegation instructions with skill activation instructions.
- [x] T011 [US1] Remove tools `SNEW_ASK_AGENT`, `SNEW_LIST_AGENTS`, `SNEW_GET_AGENT`, `SNEW_CREATE_AGENT` from `buildPlatformTools()` in `src/lib/ai/platform-tools.ts`. Remove the `runAgentChatSync` import and the `catalog` import from `@/data/agents`.
- [x] T012 [US1] Add tool `SNEW_LIST_SKILLS` to `buildPlatformTools()` in `src/lib/ai/platform-tools.ts` — queries `skills` table for team, returns slug, name, description, category, status. Per contracts/api.md.
- [x] T013 [US1] Add tool `SNEW_GET_SKILL` to `buildPlatformTools()` in `src/lib/ai/platform-tools.ts` — takes `skill_slug`, returns full skill detail including last execution. Per contracts/api.md.
- [x] T014 [US1] Add tool `SNEW_RUN_SKILL` to `buildPlatformTools()` in `src/lib/ai/platform-tools.ts` — takes `skill_slug` + `input`, calls `executeSkill()` from skill-executor.ts, returns structured output. Per contracts/api.md.
- [x] T015 [US1] Refactor `src/app/api/chat/route.ts` — replace `teamAgents` query with `teamSkills` query (from `skills` table where status='active'). Pass skills to `buildOrchestratorSystemPrompt()`. Pass skills context to `buildPlatformTools()`. Remove agent-related queries.
- [x] T016 [US1] Deprecate `src/app/api/agents/[id]/chat/route.ts` — replace POST handler with 410 Gone response pointing to `/api/chat`. Keep file to avoid 404s for any cached/bookmarked requests.

**Checkpoint**: Chat works end-to-end with skills. No SNEW_ASK_AGENT calls. Skill executions tracked.

---

## Phase 4: User Story 2 — Skill registry replaces agent catalog (Priority: P1)

**Goal**: The skill registry is the source of truth. Agent catalog (`src/data/agents.ts`) is no longer used by any active code path.

**Independent Test**: Query the `skills` table → verify 34 skills with correct slugs, categories, descriptions. Load orchestrator context → verify skills appear in system prompt.

### Implementation

- [x] T017 [US2] Verify `src/data/skills.ts` has all 34 entries from `src/data/agents.ts` with correct field mapping: `id` → `slug`, `category` (agent) → `category` (skill), `tools` → `requiredConnections`, `agentType` → preserved as metadata. Ensure no agent definition was lost.
- [x] T018 [US2] Create `src/hooks/use-skills.ts` — `useSkills()` hook using TanStack React Query. Returns `{ skills, isLoading, error, activeSkills, skillsByCategory }`. Fetches from `skills` table via `fetchTeamSkills`. Replaces `useAgents()`.
- [x] T019 [US2] Create `src/hooks/use-skill.ts` — `useSkill(slug)` hook. Returns `{ skill, isLoading, executions }`. Fetches skill detail + recent executions. Replaces `useAgent()`.
- [x] T020 [US2] Update any import of `useAgents` or `src/data/agents.ts` in active code paths to use `useSkills` / `src/data/skills.ts`. Grep for `from '@/data/agents'` and `from '@/hooks/use-agents'` across `src/` and update each usage.

**Checkpoint**: Skill registry is the single source of truth. No active code imports agent catalog for runtime use.

---

## Phase 5: User Story 3 — Dashboard shows skills (Priority: P2)

**Goal**: Dashboard renders skill cards grouped by category instead of agent cards.

**Independent Test**: Open dashboard → verify skill cards with categories visible. No agent cards or co-worker avatars.

### Implementation

- [x] T021 [P] [US3] Create `src/components/skills/skill-card.tsx` — shadcn Card component showing skill name, description, category badge, status indicator (active/available), icon. Use `cn()` for dynamic classes. Style with Tailwind/OKLCH variables.
- [x] T022 [P] [US3] Create `src/components/dashboard/skills-grid.tsx` — grid layout grouped by category. Uses `useSkills()` hook. Maps `skillsByCategory` to sections. Each section has category header + grid of `SkillCard` components.
- [x] T023 [US3] Modify dashboard page `src/app/(dashboard)/page.tsx` (or wherever agents-grid is rendered) — replace `AgentsGrid` / `agents-grid` import with `SkillsGrid` / `skills-grid`. Remove any import of `agent-card` or `agents-grid` from the dashboard.
- [x] T024 [US3] Remove co-worker suggestion cards from chat. In `src/components/chat/orchestrator-chat-wrapper.tsx` (or equivalent), remove `CoworkerSuggestionCard` rendering and related marker parsing logic. Keep the chat wrapper functional.

**Checkpoint**: Dashboard shows skill cards. No agent cards visible. Chat has no co-worker suggestions.

---

## Phase 6: User Story 4 — Navigation reflects skills (Priority: P2)

**Goal**: Sidebar and command menu show skills. No "agents" references.

**Independent Test**: Open sidebar → verify "Skills" section. Open Cmd+K → type a skill name → verify it appears.

### Implementation

- [x] T025 [P] [US4] Refactor `src/components/app-sidebar.ts` (or `.tsx`) — replace agent links section with "Skills" section. Group by category or show top active skills. Link to `/skills/[slug]` instead of `/agents/[id]`.
- [x] T026 [P] [US4] Refactor `src/components/command-menu.tsx` — replace agent search/commands with skill search. Query skills from `useSkills()`. Navigate to `/skills/[slug]` on selection.
- [x] T027 [US4] Create `src/app/(dashboard)/skills/page.tsx` — skill library page. Uses `SkillLibrary` component (or inline `SkillsGrid` with activation controls). Server component that fetches skills. Replaces `/agents` page.
- [x] T028 [US4] Create `src/components/skills/skill-library.tsx` — full skill library with category filters, activation toggle per skill, search. Uses `useSkills()` hook + `activateSkill`/`deactivateSkill` server actions.
- [x] T029 [US4] Create `src/app/(dashboard)/skills/[slug]/page.tsx` — skill detail page. Shows skill description, configuration, execution history, dependencies, required connections. Replaces `/agents/[id]` page.
- [x] T030 [US4] Create `src/components/skills/skill-detail.tsx` — detail view component. Uses `useSkill(slug)` hook. Shows tabs: Overview, Executions, Configuration. Uses shadcn Tabs, Card, Badge.

**Checkpoint**: Full navigation works with skills. Sidebar, command menu, skill library, and detail pages operational.

---

## Phase 7: User Story 5 — Skill executions tracked (Priority: P3)

**Goal**: Every skill invocation creates a tracked execution record.

**Independent Test**: Send message in chat that activates a skill → query `skill_executions` → verify record exists with input, output, duration, status.

### Implementation

- [x] T031 [US5] Verify `skill-executor.ts` (T009) correctly writes to `skill_executions` table — check that `executeSkill()` creates record on start (status='running'), updates on completion (status='completed', output, duration_ms, completed_at), and handles errors (status='failed', error_message).
- [x] T032 [US5] Add execution history display to `skill-detail.tsx` (T030) — show recent executions list with date, duration, status badge (completed=green, failed=red, running=yellow). Use shadcn Table or simple list.
- [x] T033 [US5] Add `skill_slug` to `conversation_messages` when skill is active — in `src/app/api/chat/route.ts`, when inserting assistant messages that were generated with a skill context, include the `skill_slug` field.

**Checkpoint**: Executions tracked end-to-end. Visible in skill detail. Messages tagged with skill_slug.

---

## Phase 8: User Story 6 — Unified conversations (Priority: P3)

**Goal**: All new conversations go to orchestrator tables. No new writes to agent_conversations/agent_messages.

**Independent Test**: Send messages in chat → verify they appear in `conversations` + `conversation_messages` tables only (not in `agent_conversations` or `agent_messages`).

### Implementation

- [x] T034 [US6] Audit all code paths that insert into `agent_conversations` or `agent_messages` — grep for these table names across `src/`. Ensure the only remaining insert path is the orchestrator's `conversations` + `conversation_messages` tables. List any code that still writes to legacy tables and either remove or redirect.
- [x] T035 [US6] Verify `src/app/api/chat/route.ts` exclusively uses `conversations` + `conversation_messages` (already the case from the orchestrator branch — confirm no regression from skill migration changes).
- [x] T036 [US6] Ensure historical data remains accessible — verify that any UI showing conversation history (e.g., history page at `src/app/(dashboard)/history/page.tsx`) can still read from legacy `agent_conversations` + `agent_messages` for pre-migration data. Add read-only fallback if needed.

**Checkpoint**: All new conversations unified. Legacy data accessible. No new writes to agent tables.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, consistency, and verification across all stories.

- [x] T037 [P] Remove or deprecate `src/data/agents.ts` — add deprecation comment or delete if no remaining imports. Grep for any remaining usage.
- [x] T038 [P] Remove or deprecate `src/hooks/use-coworker-avatars.ts` — delete or mark deprecated. Remove any imports.
- [x] T039 [P] Remove or deprecate `src/components/agents/agents-discover-client.tsx` — no longer needed. Redirect `/agents` to `/skills` if the page still exists.
- [x] T040 [P] Audit all UI text for "agent", "co-worker", "coworker" strings — grep across `src/components/` and `src/app/`. Replace user-facing text with "skill" equivalents. Keep internal variable names if renaming would cause too many changes.
- [x] T041 Update `CLAUDE.md` Active Technologies section for branch `038-single-agent-skills` — replace agent references with skill references. Note the architectural change.
- [x] T042 Run `bun run build` — verify zero errors.
- [x] T043 Run `bun run lint` — verify zero warnings.
- [x] T044 Manual verification per quickstart.md checklist: chat with skills, dashboard shows skills, sidebar correct, command menu works, executions tracked, no "agents" in UI, legacy data accessible.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (tables must exist)
- **Phase 3 (US1 — Chat with skills)**: Depends on Phase 2 (loader + executor must exist)
- **Phase 4 (US2 — Skill registry)**: Depends on Phase 1 (skills.ts must exist). Can run in parallel with Phase 3.
- **Phase 5 (US3 — Dashboard)**: Depends on Phase 4 (useSkills hook must exist)
- **Phase 6 (US4 — Navigation)**: Depends on Phase 4 (useSkills hook). Can run in parallel with Phase 5.
- **Phase 7 (US5 — Executions)**: Depends on Phase 3 (executor must be working)
- **Phase 8 (US6 — Conversations)**: Depends on Phase 3 (chat route refactored)
- **Phase 9 (Polish)**: Depends on all previous phases

### User Story Dependencies

```
Phase 1 (Setup)
  ↓
Phase 2 (Foundation)
  ↓
  ├── Phase 3 (US1 — Chat) ←── MVP
  │     ↓
  │     ├── Phase 7 (US5 — Executions)
  │     └── Phase 8 (US6 — Conversations)
  │
  └── Phase 4 (US2 — Registry) ←── can parallel with Phase 3
        ↓
        ├── Phase 5 (US3 — Dashboard)  ┐
        └── Phase 6 (US4 — Navigation) ┘ can parallel
  ↓
Phase 9 (Polish)
```

### Parallel Opportunities

**Phase 1**: T001, T002, T003 can run in parallel (different migration files). T004 can parallel too (code file).
**Phase 2**: T006, T007 can run in parallel (different files).
**Phase 3 + Phase 4**: Can run in parallel (different concerns — chat vs registry).
**Phase 5 + Phase 6**: Can run in parallel (different UI areas — dashboard vs navigation).
**Phase 7 + Phase 8**: Can run in parallel (executions vs conversations).
**Phase 9**: T037, T038, T039, T040 can all run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (migrations + skill registry)
2. Complete Phase 2: Foundation (loader + executor + queries)
3. Complete Phase 3: US1 — Chat with skills
4. **STOP and VALIDATE**: Send messages in chat, verify skills work, check executions
5. This is the minimum to prove the architecture works

### Incremental Delivery

1. Setup + Foundation → data layer ready
2. US1 (Chat) → core behavior validated (MVP!)
3. US2 (Registry) → skill source of truth established
4. US3 + US4 (Dashboard + Nav) → UI fully migrated
5. US5 + US6 (Executions + Conversations) → observability + cleanup
6. Polish → production ready

---

## Notes

- Total tasks: **44**
- Tasks per story: US1=7, US2=4, US3=4, US4=6, US5=3, US6=3, Setup=5, Foundation=4, Polish=8
- Parallel opportunities: 6 groups of parallelizable tasks
- MVP scope: Phases 1-3 (16 tasks) delivers working chat with skills
- The migration is additive — new files alongside deprecated ones. This avoids breaking 30+ imports at once.
- `src/data/agents.ts` is deprecated, not deleted in Phase 9 (safer — grep first to confirm zero remaining usage)
