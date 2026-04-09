# Tasks: Agent Provisioning + Onboarding

**Input**: Design documents from `/specs/059-agent-provisioning/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-routes.md, quickstart.md

**Tests**: Not explicitly requested.

**Organization**: Tasks grouped by user story.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

**Purpose**: Database migration and dependency verification

- [x] T001 Create Supabase migration — ALREADY EXISTS from 057 branch (columns confirmed in production)
- [x] T002 Verify `@anthropic-ai/sdk` is installed and `src/lib/anthropic.ts` exports `getAnthropicClient()` — confirmed from 057 branch

---

## Phase 2: Foundational — Two-Mode System Prompt (Blocking)

**Purpose**: Refactor `buildOrchestratorSystemPrompt()` to support onboarding and full modes. This blocks all user stories.

- [x] T003 Refactor `buildOrchestratorSystemPrompt()` in `src/lib/ai/platform-tools.ts` — add a `mode` parameter (`'onboarding' | 'full'`). Default to `'full'` for backward compatibility. When mode is `'onboarding'`: include setup guidance sections (connect store, analyze brand, configure skills), omit brand-specific language, omit retail tool instructions, include a friendly generic personality. When mode is `'full'`: current behavior unchanged.
- [x] T004 Verify backward compatibility — `bun run build` passes, existing `/api/chat` route still works since `buildOrchestratorSystemPrompt()` defaults to `'full'` mode

**Checkpoint**: System prompt builder supports two modes. Build passes.

---

## Phase 3: User Story 1 — New Customer Gets a Personal AI Agent (Priority: P1) MVP

**Goal**: Refactor provision endpoint to use onboarding mode prompt.

**Independent Test**: Call `POST /api/agents/provision` for a new team, verify agent is created with onboarding prompt.

### Implementation for User Story 1

- [x] T005 [US1] Refactor `src/app/api/agents/provision/route.ts` — when the team has no brand DNA (or brand DNA is empty), use `buildOrchestratorSystemPrompt({ mode: 'onboarding' })`. When brand DNA exists, use `mode: 'full'`. Keep existing idempotency check and ID persistence logic.
- [x] T006 [US1] Add model selection to provision route — check team's Stripe subscription. Free plan → `claude-sonnet-4-6`. Pro plan → `claude-opus-4-6`. Use the billing helpers already in `src/lib/billing/` or `src/lib/stripe/` to determine plan.
- [x] T007 [US1] Manual test: provision agent for a test team via curl, verify agent_id and env_id are saved to the teams table

**Checkpoint**: New teams get a provisioned agent with onboarding personality.

---

## Phase 4: User Story 2 — Agent Evolves After Brand Analysis (Priority: P1)

**Goal**: Create update-prompt endpoint that upgrades agent personality with brand DNA.

**Independent Test**: Complete brand DNA for a provisioned team, call update-prompt, verify agent personality changes.

### Implementation for User Story 2

- [x] T008 [US2] Create `src/app/api/agents/update-prompt/route.ts` — POST endpoint that: (1) authenticates user, (2) gets team + agent_id, (3) fetches brand DNA + store + skills, (4) generates full mode system prompt, (5) calls `anthropic.beta.agents.update(agentId, { system: newPrompt })` to update the agent, (6) optionally updates model if provided in request body.
- [x] T009 [US2] Hook into onboarding completion — in the existing onboarding completion flow (`src/app/api/onboarding/complete/route.ts` or equivalent), add a call to `/api/agents/update-prompt` after brand DNA is saved. This ensures the agent automatically evolves when onboarding finishes.
- [x] T010 [US2] Manual test: complete brand DNA analysis, verify agent prompt updates, send a message and confirm brand-aware response

**Checkpoint**: Agent personality automatically updates when brand DNA is ready.

---

## Phase 5: User Story 3 — Agent Personality Has Two Modes (Priority: P1)

**Goal**: Already implemented in Phase 2 (T003). This phase validates the two modes work correctly end-to-end.

- [x] T011 [US3] Validate onboarding mode prompt — generate prompt with mode='onboarding', verify it contains setup guidance, does NOT contain brand-specific sections
- [x] T012 [US3] Validate full mode prompt — generate prompt with mode='full' and real brand DNA, verify it contains brand tone, audience, palette references
- [x] T013 [US3] Validate graceful degradation — generate prompt with mode='full' but partial brand DNA (missing tone, missing audience), verify it still generates a valid prompt with available data

**Checkpoint**: Both prompt modes generate correct, distinct prompts.

---

## Phase 6: User Story 4 — Model Selection Per Plan (Priority: P2)

**Goal**: Already partially implemented in T006. This phase validates model selection works.

- [x] T014 [US4] Verify model selection logic — check that provision route correctly reads team's subscription plan and maps to model. Add model field to the update-prompt endpoint so plan upgrades can change the model.
- [x] T015 [US4] Manual test: provision agent for free-plan team (should use sonnet), verify by checking the agent configuration via Anthropic API

**Checkpoint**: Model selection tied to subscription plan.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T016 Run `bun run build` — verify zero TypeScript errors
- [x] T017 Run `bun run lint` — fix any lint warnings in new/modified files
- [x] T018 Verify existing tests pass — `bunx vitest run`

---

## Dependencies & Execution Order

- **Phase 1** (Setup): No dependencies
- **Phase 2** (Foundational): Depends on Phase 1 — BLOCKS all user stories
- **Phases 3-6** (User Stories): All depend on Phase 2
  - US1 (Phase 3): Independent
  - US2 (Phase 4): Depends on US1 (needs provisioned agent to update)
  - US3 (Phase 5): Independent (validation only)
  - US4 (Phase 6): Independent
- **Phase 7** (Polish): Depends on all above

### Parallel Opportunities

- T011, T012, T013 can run in parallel (different validation checks)
- T014, T015 can run in parallel with Phase 5

---

## Implementation Strategy

### MVP First

1. Phase 1: Migration (T001-T002)
2. Phase 2: Two-mode prompt (T003-T004)
3. Phase 3: Provision with onboarding mode (T005-T007)
4. **STOP**: Agent provisioning works end-to-end with onboarding personality

### Full Delivery

5. Phase 4: Update-prompt endpoint (T008-T010)
6. Phase 5: Mode validation (T011-T013)
7. Phase 6: Model selection (T014-T015)
8. Phase 7: Polish (T016-T018)
