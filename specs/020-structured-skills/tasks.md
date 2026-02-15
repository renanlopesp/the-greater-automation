# Tasks: Structured Skills & Terminology Alignment

**Input**: Design documents from `/specs/020-structured-skills/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — test tasks are integrated into each phase per the project's testing convention.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Database migration and type regeneration — everything else depends on this.

- [ ] T001 Apply Supabase migration `rename_skills_workflows_tables` — rename `agent_skills` → `agent_workflows`, `agent_skill_runs` → `agent_workflow_runs` (with `skill_id` → `workflow_id` column rename), `agent_knowledge_skills` → `agent_skills`, add columns `type`, `parameters`, `version`, `metadata` to new `agent_skills`, add check constraint and indexes. Use Supabase MCP `apply_migration` on branch project `ejqumzvclfkbbzzdvmmi`
- [ ] T002 Regenerate `src/lib/supabase/database.types.ts` from new schema using Supabase MCP `generate_typescript_types`

**Checkpoint**: Database tables renamed, TypeScript types updated. Build will fail until code references are updated.

---

## Phase 2: Foundational — Code Terminology Rename (US3, US8)

**Purpose**: Rename all source files, components, actions, hooks, queries, and API routes to use correct terminology. Must complete before feature work.

**Goal**: Every code reference uses "workflow" for automations and "skill" for knowledge/procedure packages.

**Independent Test**: `bun run build` passes with zero errors, `bun run test` passes with all existing tests updated.

### Layer 1 — Server Actions & Types

- [ ] T003 [P] Rename `src/lib/actions/agent-skills.ts` → `src/lib/actions/agent-workflows.ts` — update function names: `addSkill` → `addWorkflow`, `removeSkill` → `removeWorkflow`, `saveSkillFromExecution` → `saveWorkflowFromExecution`, `deleteSkill` → `deleteWorkflow`. Update all table references from `agent_skills` to `agent_workflows`
- [ ] T004 [P] Rename `src/lib/actions/agent-knowledge-skills.ts` → `src/lib/actions/agent-skills.ts` — update function names: `createKnowledgeSkill` → `createSkill`, `updateKnowledgeSkill` → `updateSkill`, `deleteKnowledgeSkill` → `deleteSkill`, `toggleKnowledgeSkill` → `toggleSkill`. Update table references from `agent_knowledge_skills` to `agent_skills`
- [ ] T005 [P] Rename `src/lib/skills/types.ts` → `src/lib/workflows/types.ts` — update type names containing "Skill" to "Workflow" (e.g., `SkillDefinition` → `WorkflowDefinition`, `SkillRun` → `WorkflowRun`, `AgentSkillRow` → `AgentWorkflowRow`)

### Layer 2 — Execution Engine & Queries

- [ ] T006 [P] Rename `src/lib/skills/skill-executor.ts` → `src/lib/workflows/workflow-executor.ts` — update class/function names and internal references
- [ ] T007 [P] Rename `src/lib/skills/skill-router.ts` → `src/lib/workflows/workflow-router.ts` — update function names and internal references
- [ ] T008 [P] Rename `src/lib/skills/action-executor.ts` → `src/lib/workflows/action-executor.ts` — update imports from new types path
- [ ] T009 [P] Rename `src/lib/skills/condition-engine.ts` → `src/lib/workflows/condition-engine.ts` — update imports
- [ ] T010 [P] Rename `src/lib/queries/skill-runs.ts` → `src/lib/queries/workflow-runs.ts` — update table references from `agent_skill_runs` to `agent_workflow_runs`, rename `skill_id` to `workflow_id`
- [ ] T011 Update `src/lib/queries/agents.ts` — change all `agent_skills` table references to `agent_workflows`
- [ ] T012 Update `src/lib/queries/workspace.ts` — change all `agent_skills` table references to `agent_workflows`
- [ ] T013 Update `src/lib/queries/dashboard.ts` — change all `agent_skills` table references to `agent_workflows`
- [ ] T014 Update `src/lib/actions/workspace.ts` — change all `agent_skills` references to `agent_workflows`, `agent_knowledge_skills` to `agent_skills`

### Layer 3 — Hooks

- [ ] T015 Rename `src/hooks/use-agent-skills.ts` → `src/hooks/use-agent-workflows.ts` — rename exports: `agentSkillsKey` → `agentWorkflowsKey`, `useAgentSkills` → `useAgentWorkflows`, `useInvalidateAgentSkills` → `useInvalidateAgentWorkflows`

### Layer 4 — Components

- [ ] T016 [P] Rename `src/components/agent-detail/skills-list.tsx` → `src/components/agent-detail/workflows-list.tsx` — rename component `SkillsList` → `WorkflowsList`, props interface `SkillsListProps` → `WorkflowsListProps`, internal `Skill` type → `Workflow` type. Update import from `agent-workflows` action and `use-agent-workflows` hook
- [ ] T017 [P] Rename `src/components/agent-detail/knowledge-skills-list.tsx` → `src/components/agent-detail/skills-list.tsx` — rename component `KnowledgeSkillsList` → `SkillsList`, props `KnowledgeSkillsListProps` → `SkillsListProps`, type `KnowledgeSkill` → `Skill`. Update import from `agent-skills` action
- [ ] T018 Update `src/components/agent-detail/agent-sidebar.tsx` — update imports to use `WorkflowsList` from `workflows-list` and `SkillsList` from `skills-list`, update variable names (`skills` → `workflows` for automation data, `knowledgeSkills` → `skills` for knowledge data)
- [ ] T019 Update `src/components/agent-detail/chat-panel.tsx` — update any skill-related references to use workflow terminology for automations
- [ ] T020 Update `src/components/agent-detail/skill-run-history.tsx` — update table references from `agent_skill_runs` to `agent_workflow_runs`, `skill_id` to `workflow_id`

### Layer 5 — Pages & API Routes

- [ ] T021 Update `src/app/(dashboard)/agents/[id]/page.tsx` — update queries from `agent_skills` to `agent_workflows`, `agent_knowledge_skills` to `agent_skills`. Update variable names passed to components
- [ ] T022 Update `src/app/(dashboard)/agents/[id]/edit/page.tsx` — update table references
- [ ] T023 Move `src/app/api/skills/[id]/execute/route.ts` → `src/app/api/agent-workflows/[id]/execute/route.ts` — update internal table references
- [ ] T024 Move `src/app/api/skills/webhook/[token]/route.ts` → `src/app/api/agent-workflows/webhook/[token]/route.ts` — update table references
- [ ] T025 Move `src/app/api/skills/cron/route.ts` → `src/app/api/agent-workflows/cron/route.ts` — update table references
- [ ] T026 Update `src/app/api/agents/[id]/chat/route.ts` — update queries from `agent_knowledge_skills` to `agent_skills`, `agent_skills` to `agent_workflows`
- [ ] T027 Update `src/app/api/workflows/[id]/route.ts` — update any `agent_skills` references to `agent_workflows`

### Layer 6 — LLM Tools & Chat

- [ ] T028 Update `src/lib/ai/skill-builder-tools.ts` — change all Supabase queries from `agent_skills` to `agent_workflows` (for workflow CRUD tools) and from `agent_knowledge_skills` to `agent_skills` (for skill CRUD tools)
- [ ] T029 Update `src/hooks/use-agent-chat.ts` — update `SKILL_MUTATING_TOOLS` array and any other skill-related references

### Layer 7 — Tests

- [ ] T030 [P] Rename `src/components/agent-detail/__tests__/skills-list.test.tsx` → `workflows-list.test.tsx` — update component imports, mock names, and test descriptions
- [ ] T031 [P] Rename `src/lib/actions/__tests__/agent-knowledge-skills.test.ts` → `agent-skills.test.ts` — update function imports, mock table names, test descriptions
- [ ] T032 [P] Rename `src/lib/skills/__tests__/skill-executor.test.ts` → `src/lib/workflows/__tests__/workflow-executor.test.ts` — update imports and references
- [ ] T033 [P] Rename `src/lib/skills/__tests__/condition-engine.test.ts` → `src/lib/workflows/__tests__/condition-engine.test.ts` — update imports
- [ ] T034 [P] Rename `src/lib/skills/__tests__/action-executor.test.ts` → `src/lib/workflows/__tests__/action-executor.test.ts` — update imports
- [ ] T035 [P] Update `src/lib/ai/__tests__/skill-builder-tools-rename.test.ts` — update mock table names and tool references
- [ ] T036 [P] Update `src/lib/ai/__tests__/agent-chat-knowledge-skills.test.ts` — update references for renamed functions
- [ ] T037 Update `src/lib/queries/__tests__/workflow-editor.test.ts` and any other query tests — update table references

### Layer 8 — Build & Verify

- [ ] T038 Run `bun run build` — fix any remaining import errors or type mismatches
- [ ] T039 Run `bun run test` — verify all 724+ tests pass with new names

**Checkpoint**: All terminology aligned. Build passes, all tests pass. Zero regressions.

---

## Phase 3: User Story 1 — Agent Creates Knowledge Skill via Chat (Priority: P1)

**Goal**: `SNEW_CREATE_SKILL` accepts a `type` parameter and guides the agent to create structured markdown content with defined sections.

**Independent Test**: Chat with agent, ask it to "learn our deploy process", verify the created skill has structured sections (## Description, ## Instructions at minimum).

### Implementation

- [ ] T040 [US1] Update `SNEW_CREATE_SKILL` in `src/lib/ai/skill-builder-tools.ts` — add `type` parameter (default 'knowledge'), add `parameters` parameter (for procedure type), update tool description with knowledge skill template (## Description, ## When to Use, ## Instructions, ## Examples, ## Constraints, ## References). Insert `type`, `parameters`, `version`, `metadata` columns
- [ ] T041 [US1] Update `SNEW_LIST_SKILLS` in `src/lib/ai/skill-builder-tools.ts` — return `type`, `version` fields in response
- [ ] T042 [US1] Add `SNEW_UPDATE_SKILL` tool in `src/lib/ai/skill-builder-tools.ts` — update skill content/params by ID, auto-increment `version` when `content` or `parameters` change
- [ ] T043 [US1] Add `updateSkill` server action in `src/lib/actions/agent-skills.ts` — if not already present, add update function that increments version on content/parameter changes
- [ ] T044 [P] [US1] Write test for structured skill creation in `src/lib/ai/__tests__/structured-skill-creation.test.ts` — verify SNEW_CREATE_SKILL inserts type, parameters, version columns correctly
- [ ] T045 [P] [US1] Write test for SNEW_UPDATE_SKILL in `src/lib/ai/__tests__/skill-update-version.test.ts` — verify version auto-increments on content change

**Checkpoint**: Agent can create structured knowledge skills with type field and template-guided content.

---

## Phase 4: User Story 4 — Progressive Disclosure (Priority: P2)

**Goal**: Agent system prompt includes only skill metadata. Full content loaded on demand via `SNEW_GET_SKILL_CONTENT`.

**Independent Test**: Create 5 skills, start a chat, verify system prompt contains only names/types/descriptions (not full content). Ask about a topic matching a skill, verify agent calls SNEW_GET_SKILL_CONTENT.

### Implementation

- [ ] T046 [US4] Add `SNEW_GET_SKILL_CONTENT` tool in `src/lib/ai/skill-builder-tools.ts` — query `agent_skills` by ID or name (fuzzy match on name), return full `content`, `parameters`, `type`, `version`, `is_enabled`
- [ ] T047 [US4] Update `buildAgentSystemPrompt()` in `src/lib/ai/agent-chat.ts` — replace full skill content injection with metadata-only listing (name, type, description). Add instruction: "Use SNEW_GET_SKILL_CONTENT to load full details when a skill is relevant to the conversation"
- [ ] T048 [US4] Update `src/app/api/agents/[id]/chat/route.ts` — pass only skill metadata (not full content) to `buildAgentSystemPrompt()`. Adjust the query to select only `id`, `name`, `type`, `description`, `is_enabled` from `agent_skills`
- [ ] T049 [P] [US4] Write test for progressive disclosure in `src/lib/ai/__tests__/progressive-disclosure.test.ts` — verify `buildAgentSystemPrompt()` does NOT include full skill content, only metadata
- [ ] T050 [P] [US4] Write test for SNEW_GET_SKILL_CONTENT in `src/lib/ai/__tests__/get-skill-content.test.ts` — verify it returns full content by ID and by name

**Checkpoint**: System prompt is lightweight. Agent loads skill content on demand.

---

## Phase 5: User Story 5 — Skill Template for Consistent Structure (Priority: P2)

**Goal**: Agent follows type-specific templates when creating skills. Knowledge skills get instruction sections, procedure skills get parameter/step sections.

**Independent Test**: Ask agent to create a procedure skill with steps, verify content has ## Parameters and ## Steps sections.

### Implementation

- [ ] T051 [US5] Update `SNEW_CREATE_SKILL` description in `src/lib/ai/skill-builder-tools.ts` — add procedure skill template guidance in tool description (## Description, ## Parameters, ## Steps, ## Error Handling). Add validation: if type is 'procedure' and parameters is null, return hint to define parameters
- [ ] T052 [P] [US5] Write test for procedure skill creation in `src/lib/ai/__tests__/procedure-skill-creation.test.ts` — verify SNEW_CREATE_SKILL with type 'procedure' stores parameters JSONB correctly

**Checkpoint**: Both skill types have clear templates. Agent creates structured content.

---

## Phase 6: User Story 2 — Agent Creates Procedure Skill (Priority: P1) & User Story 6 — Execute Procedure (Priority: P2)

**Goal**: Agent can create procedure skills with parameters and steps, and execute them on demand during conversation.

**Independent Test**: Create a procedure skill "Create GitHub Issue" with parameters (title, body, repo). Ask agent to execute it. Verify SNEW_EXECUTE_SKILL loads steps and the agent calls referenced tools.

### Implementation

- [ ] T053 [US2] Add `SNEW_EXECUTE_SKILL` tool in `src/lib/ai/skill-builder-tools.ts` — loads procedure skill by ID, validates that type='procedure', resolves parameter values from provided params, returns step list with resolved template variables ({{param}}, {{prev.field}}) for the agent to follow. Does NOT execute steps server-side
- [ ] T054 [US2] Add parameter resolution utility in `src/lib/ai/skill-builder-tools.ts` (inline function) — resolve `{{param.name}}` from provided params, `{{prev.field}}` from previous step outputs, static defaults from parameter definitions
- [ ] T055 [US2] Update `SNEW_CREATE_SKILL` validation — when type is 'procedure', validate that `parameters` field has valid structure: array of `{name, type, required, default?, description}`
- [ ] T056 [P] [US2] Write test for SNEW_EXECUTE_SKILL in `src/lib/ai/__tests__/execute-skill.test.ts` — verify it loads procedure, resolves params, returns step list. Verify it rejects non-procedure skills with clear error
- [ ] T057 [P] [US2] Write test for parameter resolution in `src/lib/ai/__tests__/skill-param-resolution.test.ts` — verify template variable resolution from params, prev outputs, and defaults

**Checkpoint**: Procedure skills can be created with parameters and executed via agent chat.

---

## Phase 7: User Story 7 — UI Renders Structured Skill Sections (Priority: P3)

**Goal**: Skills tab shows type badges and collapsible markdown sections for structured skills.

**Independent Test**: Create a skill with 4 sections, view in sidebar, verify each section is collapsible with correct heading.

### Implementation

- [ ] T058 [US7] Add markdown section parser utility in `src/components/agent-detail/skills-list.tsx` — parse content string into sections by splitting on `## ` headers, return array of `{heading, content}`. Handle unstructured content as single block (backward compat)
- [ ] T059 [US7] Update `SkillsList` component in `src/components/agent-detail/skills-list.tsx` — add type badge ("Knowledge" / "Procedure") using shadcn Badge. For procedure skills, show parameter count and step count in collapsed view
- [ ] T060 [US7] Add collapsible sections to `SkillsList` in `src/components/agent-detail/skills-list.tsx` — use shadcn Collapsible for each parsed section. Show section heading as trigger, content as collapsible body
- [ ] T061 [US7] Ensure shadcn Collapsible component is installed — run `npx shadcn@latest add collapsible` if not present
- [ ] T062 [P] [US7] Write test for section parser in `src/components/agent-detail/__tests__/skills-list.test.tsx` — verify structured content splits into sections, unstructured content renders as single block
- [ ] T063 [P] [US7] Write test for type badge in `src/components/agent-detail/__tests__/skills-list.test.tsx` — verify Knowledge and Procedure badges render

**Checkpoint**: Skills tab renders structured content with type badges and collapsible sections.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, integration verification, build validation.

- [ ] T064 Apply migration to production Supabase project `djohaxwfketlsjurwqne` (after branch testing is complete)
- [ ] T065 Run `bun run build` — verify zero errors
- [ ] T066 Run `bun run test` — verify all tests pass (existing + new)
- [ ] T067 Run `bun run lint` — verify zero warnings
- [ ] T068 Manual E2E verification — create knowledge skill via chat, create procedure skill via chat, execute procedure skill, verify progressive disclosure works, verify UI renders sections

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Code Rename)**: Depends on Phase 1 — BLOCKS all feature work
- **Phase 3 (Knowledge Skills)**: Depends on Phase 2
- **Phase 4 (Progressive Disclosure)**: Depends on Phase 2
- **Phase 5 (Skill Templates)**: Depends on Phase 3
- **Phase 6 (Procedure Skills)**: Depends on Phase 3 and Phase 5
- **Phase 7 (UI)**: Depends on Phase 3 (needs type field)
- **Phase 8 (Polish)**: Depends on all phases

### User Story Dependencies

- **US3 (DB Rename) + US8 (Code Rename)**: Phase 2 — foundational, blocks everything
- **US1 (Knowledge Skills)**: Phase 3 — can start after Phase 2
- **US4 (Progressive Disclosure)**: Phase 4 — can run in parallel with Phase 3
- **US5 (Skill Templates)**: Phase 5 — depends on US1 (needs type param)
- **US2 (Procedure Skills) + US6 (Execute)**: Phase 6 — depends on US1 + US5
- **US7 (UI)**: Phase 7 — can start after Phase 3

### Parallel Opportunities

```
Phase 2 (within):
  T003 || T004 || T005          # Server actions & types (different files)
  T006 || T007 || T008 || T009  # Execution engine files (different files)
  T016 || T017                  # Components (different files)
  T030 || T031 || T032 || T033 || T034 || T035 || T036  # Tests (different files)

After Phase 2:
  Phase 3 || Phase 4            # Knowledge skills + Progressive disclosure
  Phase 5 → Phase 6             # Templates then procedures (sequential)
  Phase 7 (after Phase 3)       # UI can start once type field exists
```

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + 3)

1. Apply migration (Phase 1)
2. Rename all code (Phase 2)
3. Add structured knowledge skills (Phase 3)
4. **STOP and VALIDATE**: Agent creates structured skills, all existing features work

### Full Delivery

1. MVP (above)
2. Add progressive disclosure (Phase 4)
3. Add skill templates + procedure type (Phase 5 + 6)
4. Add UI collapsible sections (Phase 7)
5. Polish + production deploy (Phase 8)

---

## Summary

- **Total tasks**: 68
- **Phase 1 (Setup)**: 2 tasks
- **Phase 2 (Code Rename)**: 37 tasks (foundational, most parallelizable)
- **Phase 3 (Knowledge Skills)**: 6 tasks
- **Phase 4 (Progressive Disclosure)**: 5 tasks
- **Phase 5 (Skill Templates)**: 2 tasks
- **Phase 6 (Procedure Skills)**: 5 tasks
- **Phase 7 (UI)**: 6 tasks
- **Phase 8 (Polish)**: 5 tasks
- **Parallel opportunities**: 20+ tasks can run in parallel within Phase 2; Phases 3/4/7 can overlap
- **Suggested MVP**: Phases 1-3 (45 tasks) — rename + structured knowledge skills
