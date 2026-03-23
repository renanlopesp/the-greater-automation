# Implementation Plan: Single Agent + Skills Migration

**Branch**: `038-single-agent-skills` | **Date**: 2026-03-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/038-single-agent-skills/spec.md`

## Summary

Migrate from a multi-agent architecture (34 specialist agents + 1 orchestrator delegating via `SNEW_ASK_AGENT`) to a single-agent architecture where the orchestrator (Snew) is the only agent and all capabilities are modeled as **skills**. This involves: new database tables (`skills`, `skill_executions`), a skill registry in code, refactoring platform tools, refactoring the chat route, unifying conversations, and updating all UI (dashboard, sidebar, pages) to show skills instead of agents.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, Vercel AI SDK, TanStack React Query, Zustand, shadcn/ui (new-york), Tailwind CSS v4
**Storage**: Supabase PostgreSQL (production: `djohaxwfketlsjurwqne`)
**Testing**: `bun run build` + `bun run lint` (zero errors/warnings)
**Target Platform**: Web (Next.js App Router)
**Project Type**: Web application (fullstack)
**Performance Goals**: Chat response time < 5s (no degradation from current)
**Constraints**: Must preserve all historical data. No destructive migrations.
**Scale/Scope**: 34 agent definitions → 34 skill definitions. ~30 files modified, ~20 files created.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status | Notes                                                                                                    |
| ------------------------------ | ------ | -------------------------------------------------------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | All new pages use App Router. Server Components by default.                                              |
| II. shadcn/ui Component System | PASS   | New skill cards/grids compose shadcn primitives (Card, Badge, Button).                                   |
| III. Tailwind CSS v4 + OKLCH   | PASS   | All styling via Tailwind. No hardcoded colors.                                                           |
| IV. TypeScript Strict Mode     | PASS   | All new code in strict TypeScript. Zod for external data validation.                                     |
| V. Simplicity and YAGNI        | PASS   | No premature abstractions. Skill composition deferred. Hybrid registry (code + DB) is simplest approach. |
| VI. Supabase as Backend        | PASS   | New tables with RLS. No custom CRUD routes — server actions + Supabase client.                           |

**Post-design re-check**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/038-single-agent-skills/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 — decisions and rationale
├── data-model.md        # Phase 1 — skills, skill_executions, brand_dna tables
├── quickstart.md        # Phase 1 — dev setup and verification
├── contracts/
│   └── api.md           # Phase 1 — API endpoints, tools, hooks
└── checklists/
    └── requirements.md  # Spec quality validation
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   └── chat/route.ts              # MODIFY — load skills instead of agents
│   └── (dashboard)/
│       ├── skills/
│       │   ├── page.tsx               # NEW — skill library (replaces /agents)
│       │   └── [slug]/page.tsx        # NEW — skill detail page
│       └── chat/page.tsx              # KEEP — unchanged
├── components/
│   ├── skills/
│   │   ├── skill-card.tsx             # NEW — card for dashboard grid
│   │   ├── skill-library.tsx          # NEW — grid grouped by category
│   │   └── skill-detail.tsx           # NEW — detail view with executions
│   ├── dashboard/
│   │   ├── skills-grid.tsx            # NEW — replaces agents-grid.tsx
│   │   └── agent-card.tsx             # DEPRECATED
│   └── chat/
│       └── orchestrator-chat.tsx      # MODIFY — remove co-worker references
├── data/
│   └── skills.ts                      # NEW — skill registry (replaces agents.ts)
├── hooks/
│   ├── use-skills.ts                  # NEW — replaces use-agents.ts
│   └── use-chat.ts                    # NEW — unified chat hook
├── lib/
│   ├── ai/
│   │   ├── platform-tools.ts         # MODIFY — agent tools → skill tools
│   │   ├── skill-loader.ts           # NEW — load skill context
│   │   └── skill-executor.ts         # NEW — execute and track skills
│   ├── actions/
│   │   └── skills.ts                  # NEW — server actions for skills
│   └── queries/
│       └── skills.ts                  # NEW — query functions for skills
└── stores/
    └── skill-store.ts                 # NEW — if needed for UI state

supabase/migrations/
├── YYYYMMDD_create_skills_table.sql
├── YYYYMMDD_create_skill_executions_table.sql
├── YYYYMMDD_add_skill_slug_to_conversation_messages.sql
└── YYYYMMDD_seed_initial_skills.sql
```

**Structure Decision**: Follows existing project structure. New `skills/` directories mirror the existing `agents/` pattern. Shared infrastructure (chat engine, retail tools, workflows) is kept in place. The migration is additive — new files alongside deprecated ones, not in-place renames (to avoid breaking imports across 30+ files at once).

## Design Decisions

### D1: Skill Registry — Hybrid Code + DB

Skill definitions live in `src/data/skills.ts` (static, ships with deploys). Per-team state (active/inactive, custom config) lives in the `skills` table. On team creation (or migration), the code registry seeds the DB. See [research.md](./research.md#r2).

### D2: Skill Invocation — Context Injection

When Snew needs a skill, the system loads the skill's `system_prompt` + `tools` + `knowledge` and injects them into the current chat context. No HTTP call, no separate conversation. See [research.md](./research.md#r1).

### D3: Conversation Unification — Forward-only

New conversations go to `conversations` + `conversation_messages`. Legacy tables stay read-only. No data migration. See [research.md](./research.md#r3).

### D4: UI Migration — Incremental Replacement

New components (`skill-card`, `skills-grid`, `skill-library`) replace agent equivalents. Deprecated components are kept but unused. This avoids a risky big-bang rewrite. See [research.md](./research.md#r5).

### D5: Platform Tools — Clean Swap

4 agent tools removed, 3 skill tools added. `SNEW_CREATE_AGENT` has no equivalent (skills come from registry). See [research.md](./research.md#r6).

## Implementation Phases

### Phase 1: Database + Data Layer

1. Create `skills` table migration
2. Create `skill_executions` table migration
3. Add `skill_slug` column to `conversation_messages`
4. Create `src/data/skills.ts` (migrate 34 agent definitions)
5. Create `src/lib/queries/skills.ts` (fetchTeamSkills, fetchSkillBySlug)
6. Create `src/lib/actions/skills.ts` (activateSkill, deactivateSkill, seedTeamSkills)
7. Create seed migration (populate skills for existing teams)

### Phase 2: Skill Loader + Executor

1. Create `src/lib/ai/skill-loader.ts` (loadSkill, loadSkillsForOrchestrator)
2. Create `src/lib/ai/skill-executor.ts` (executeSkill, trackExecution)
3. Refactor `src/lib/ai/platform-tools.ts`:
   - Remove: SNEW_ASK_AGENT, SNEW_LIST_AGENTS, SNEW_GET_AGENT, SNEW_CREATE_AGENT
   - Add: SNEW_LIST_SKILLS, SNEW_GET_SKILL, SNEW_RUN_SKILL
4. Refactor `buildOrchestratorSystemPrompt()` to accept skills instead of agents
5. Refactor `src/app/api/chat/route.ts` to load skills and use new tools

### Phase 3: Client Hooks + Data Fetching

1. Create `src/hooks/use-skills.ts` (replaces use-agents.ts)
2. Create `src/hooks/use-skill.ts` (single skill detail + executions)
3. Unify `use-orchestrator-chat.ts` into `use-chat.ts`

### Phase 4: UI — Dashboard + Skill Library

1. Create `src/components/skills/skill-card.tsx`
2. Create `src/components/dashboard/skills-grid.tsx`
3. Create `src/components/skills/skill-library.tsx` (grouped by category)
4. Create `src/app/(dashboard)/skills/page.tsx`
5. Create `src/app/(dashboard)/skills/[slug]/page.tsx`
6. Modify dashboard page to render skills-grid instead of agents-grid

### Phase 5: UI — Navigation + Cleanup

1. Refactor sidebar (`app-sidebar.ts`) — skills section instead of agent links
2. Refactor command menu (`command-menu.tsx`) — skill search
3. Remove co-worker references from chat components
4. Deprecate `/api/agents/[id]/chat` route (return 410)
5. Update any remaining "agent" text in UI to "skill"

### Phase 6: Verification

1. `bun run build` — zero errors
2. `bun run lint` — zero warnings
3. Manual test: chat with skill invocation
4. Manual test: dashboard shows skills
5. Manual test: sidebar + command menu
6. Verify skill_executions are being tracked
7. Verify legacy data is still accessible

## Complexity Tracking

No constitution violations. No complexity justifications needed.

## Artifacts

| Artifact      | Path                                   | Description                                     |
| ------------- | -------------------------------------- | ----------------------------------------------- |
| Research      | [research.md](./research.md)           | 6 decisions with rationale                      |
| Data Model    | [data-model.md](./data-model.md)       | skills, skill_executions tables + RLS + indexes |
| API Contracts | [contracts/api.md](./contracts/api.md) | Endpoints, platform tools, hooks                |
| Quickstart    | [quickstart.md](./quickstart.md)       | Dev setup and verification checklist            |
