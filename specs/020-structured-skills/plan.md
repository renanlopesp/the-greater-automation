# Implementation Plan: Structured Skills & Terminology Alignment

**Branch**: `020-structured-skills` | **Date**: 2026-02-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-structured-skills/spec.md`

## Summary

Align the project's terminology with the industry-standard skill concept (OpenAI Codex model): skills are structured capability packages (knowledge or executable procedures) that extend agent behavior, while workflows are trigger-based automations. This involves renaming 3 database tables, ~30 source files, and evolving skills from unstructured text blobs to structured markdown documents with two types: knowledge (instructions/guidelines) and procedure (executable subprograms with parameters and steps).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, Supabase, Vercel AI SDK, Composio SDK
**Storage**: PostgreSQL via Supabase (production: `djohaxwfketlsjurwqne`, branch: `ejqumzvclfkbbzzdvmmi`)
**Testing**: Vitest + @testing-library/react + happy-dom
**Target Platform**: Web (Next.js App Router)
**Project Type**: Web application (monorepo)
**Performance Goals**: Agent system prompt size reduces 50%+ with progressive disclosure
**Constraints**: Zero downtime migration, zero user-facing regressions
**Scale/Scope**: ~30 files to rename/modify, 3 table renames, 4 new LLM tools

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status | Notes                                                                                                                             |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | All changes use App Router, Server Components for data fetching                                                                   |
| II. shadcn/ui Component System | PASS   | Collapsible sections will use shadcn Collapsible primitive                                                                        |
| III. Tailwind CSS v4 + OKLCH   | PASS   | Type badges use theme tokens, no hex/rgb                                                                                          |
| IV. TypeScript Strict Mode     | PASS   | All new code in strict TypeScript, Zod for external data                                                                          |
| V. Simplicity and YAGNI        | PASS   | Procedure execution reuses existing tool infrastructure, no new runtime. Structured content is plain markdown, no complex parsers |
| VI. Supabase as Backend        | PASS   | All data in Supabase, RLS on all tables, migrations for schema changes                                                            |

No violations. Gate passed.

## Project Structure

### Documentation (this feature)

```text
specs/020-structured-skills/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research output
├── data-model.md        # Phase 1 data model
├── quickstart.md        # Phase 1 quickstart guide
├── contracts/
│   ├── llm-tools.md     # LLM tool contracts
│   └── server-actions.md # Server action contracts
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (dashboard)/agents/[id]/
│   │   ├── page.tsx                    # Query renamed tables
│   │   └── edit/page.tsx               # Query renamed tables
│   └── api/
│       ├── agents/[id]/chat/route.ts   # Updated system prompt, skill queries
│       ├── agent-workflows/            # RENAMED from api/skills/
│       │   ├── [id]/execute/route.ts
│       │   ├── webhook/[token]/route.ts
│       │   └── cron/route.ts
│       └── workflows/                  # Existing (unchanged)
├── components/
│   └── agent-detail/
│       ├── agent-sidebar.tsx           # Updated imports
│       ├── workflows-list.tsx          # RENAMED from skills-list.tsx
│       ├── skills-list.tsx             # RENAMED from knowledge-skills-list.tsx (NEW content)
│       ├── skill-run-history.tsx       # Updated to query agent_workflow_runs
│       └── chat-panel.tsx              # Updated tool name refs
├── hooks/
│   ├── use-agent-workflows.ts          # RENAMED from use-agent-skills.ts
│   └── use-agent-chat.ts              # Updated tool name refs
├── lib/
│   ├── actions/
│   │   ├── agent-workflows.ts         # RENAMED from agent-skills.ts
│   │   ├── agent-skills.ts            # RENAMED from agent-knowledge-skills.ts (NEW content)
│   │   └── workspace.ts               # Updated table refs
│   ├── ai/
│   │   ├── agent-chat.ts              # Updated system prompt (progressive disclosure)
│   │   └── skill-builder-tools.ts     # New tools + updated queries
│   ├── queries/
│   │   ├── workflow-runs.ts           # RENAMED from skill-runs.ts
│   │   └── agents.ts                  # Updated table refs
│   ├── workflows/                     # RENAMED from lib/skills/
│   │   ├── types.ts
│   │   ├── workflow-executor.ts       # RENAMED from skill-executor.ts
│   │   ├── workflow-router.ts         # RENAMED from skill-router.ts
│   │   ├── action-executor.ts
│   │   └── condition-engine.ts
│   └── supabase/
│       └── database.types.ts          # Regenerated from new schema
└── ...
```

**Structure Decision**: Standard Next.js App Router monorepo. No structural changes — only file renames and content updates within the existing layout.

## Implementation Phases

### Phase 1: Database Migration (P1 — User Story 3)

Single Supabase migration that renames tables in the correct order to avoid name collision.

**Migration**: `rename_skills_workflows_tables`

```sql
-- Step 1: Rename agent_skills → agent_workflows (frees the name)
ALTER TABLE agent_skills RENAME TO agent_workflows;

-- Step 2: Rename agent_skill_runs → agent_workflow_runs
ALTER TABLE agent_skill_runs RENAME TO agent_workflow_runs;
ALTER TABLE agent_workflow_runs RENAME COLUMN skill_id TO workflow_id;

-- Step 3: Rename agent_knowledge_skills → agent_skills (takes the freed name)
ALTER TABLE agent_knowledge_skills RENAME TO agent_skills;

-- Step 4: Add new columns to agent_skills
ALTER TABLE agent_skills ADD COLUMN type text NOT NULL DEFAULT 'knowledge';
ALTER TABLE agent_skills ADD COLUMN parameters jsonb DEFAULT NULL;
ALTER TABLE agent_skills ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE agent_skills ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}';

-- Step 5: Add check constraint
ALTER TABLE agent_skills ADD CONSTRAINT agent_skills_type_check CHECK (type IN ('knowledge', 'procedure'));

-- Step 6: Rename indexes
ALTER INDEX IF EXISTS idx_skill_runs_skill_id RENAME TO idx_workflow_runs_workflow_id;
ALTER INDEX IF EXISTS idx_skill_runs_agent_id RENAME TO idx_workflow_runs_agent_id;
ALTER INDEX IF EXISTS idx_skill_runs_status RENAME TO idx_workflow_runs_status;
ALTER INDEX IF EXISTS idx_skill_runs_created_at RENAME TO idx_workflow_runs_created_at;

-- Step 7: Add indexes for new agent_skills table
CREATE INDEX IF NOT EXISTS idx_agent_skills_agent_id ON agent_skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_type ON agent_skills(type);
```

**After migration**: Regenerate `database.types.ts` from Supabase schema.

### Phase 2: Code Terminology Rename (P1 — User Stories 3, 8)

Bottom-up rename to avoid broken imports. Order matters.

**Layer 1 — Types**: Update `database.types.ts` with regenerated types.

**Layer 2 — Server Actions**:

- Rename file `agent-skills.ts` → `agent-workflows.ts`, update all function names (`addSkill` → `addWorkflow`, `removeSkill` → `removeWorkflow`, etc.)
- Rename file `agent-knowledge-skills.ts` → `agent-skills.ts`, update function names (`createKnowledgeSkill` → `createSkill`, etc.)

**Layer 3 — Queries**:

- Rename `skill-runs.ts` → `workflow-runs.ts`, update table references
- Update `agents.ts`, `workspace.ts`, `dashboard.ts` table references

**Layer 4 — Execution Engine**:

- Rename directory `src/lib/skills/` → `src/lib/workflows/`
- Rename files: `skill-executor.ts` → `workflow-executor.ts`, `skill-router.ts` → `workflow-router.ts`
- Update all internal references

**Layer 5 — Hooks**:

- Rename `use-agent-skills.ts` → `use-agent-workflows.ts`
- Update exported function names

**Layer 6 — Components**:

- Rename `skills-list.tsx` → `workflows-list.tsx` (component: `WorkflowsList`)
- Rename `knowledge-skills-list.tsx` → `skills-list.tsx` (component: `SkillsList`)
- Update `agent-sidebar.tsx` imports

**Layer 7 — API Routes**:

- Move `src/app/api/skills/` → `src/app/api/agent-workflows/`
- Update internal references and fetch URLs

**Layer 8 — LLM Tools**:

- Update `skill-builder-tools.ts` table references (queries now target `agent_workflows` and `agent_skills`)
- Update `use-agent-chat.ts` tool name references

### Phase 3: Structured Skills — Knowledge Type (P1 — User Stories 1, 5)

Update `SNEW_CREATE_SKILL` to accept `type` parameter and enforce structured markdown template via tool description.

**Changes to `skill-builder-tools.ts`**:

- `SNEW_CREATE_SKILL`: Add `type` parameter, update description with template instructions, insert `type` and `parameters` columns
- `SNEW_LIST_SKILLS`: Return `type` field in response
- `SNEW_DELETE_SKILL`: No changes (already works)
- NEW `SNEW_GET_SKILL_CONTENT`: Query full skill content by ID or name
- NEW `SNEW_UPDATE_SKILL`: Update skill content/params, auto-increment version

**Changes to `agent-chat.ts` (system prompt)**:

- Replace full skill content injection with metadata-only listing
- Add instruction for agent to call `SNEW_GET_SKILL_CONTENT` when a skill is relevant

### Phase 4: Structured Skills — Procedure Type (P1 — User Stories 2, 6)

Add procedure skill creation and execution.

**Changes to `skill-builder-tools.ts`**:

- Update `SNEW_CREATE_SKILL` description to include procedure template guidance
- NEW `SNEW_EXECUTE_SKILL`: Loads procedure definition, validates parameters, returns step list for agent to follow

**Execution model**: The `SNEW_EXECUTE_SKILL` tool does NOT execute steps server-side. It loads the procedure definition and returns the steps with resolved parameters. The agent then executes each step by calling the referenced tools (Composio actions, etc.) in sequence. This keeps execution in the agent's tool loop, enabling natural error handling, user interaction, and progress reporting.

### Phase 5: UI Updates (P3 — User Story 7)

Update `SkillsList` component (formerly `KnowledgeSkillsList`) to render structured content.

**Changes**:

- Add type badge ("Knowledge" / "Procedure") using shadcn `Badge`
- Parse markdown content into sections (split on `## ` headers)
- Render collapsible sections using shadcn `Collapsible`
- For procedure skills: show parameter count and step count in collapsed view
- Backward compat: unstructured content renders as single block

### Phase 6: Testing

Update all existing tests for new names + add new tests.

**Rename existing tests**:

- `skills-list.test.tsx` → `workflows-list.test.tsx`
- `agent-knowledge-skills.test.ts` → `agent-skills.test.ts`
- Update all mock table names and function names

**New tests**:

- Structured skill creation (knowledge type with sections)
- Structured skill creation (procedure type with params/steps)
- `SNEW_GET_SKILL_CONTENT` returns full content
- `SNEW_EXECUTE_SKILL` returns procedure steps
- `SNEW_UPDATE_SKILL` increments version
- Progressive disclosure: system prompt contains only metadata
- UI: collapsible sections render for structured skills
- UI: type badge renders correctly
- Backward compat: unstructured content renders as single block

## Complexity Tracking

No constitution violations — this section is empty.

## Risk Assessment

| Risk                                               | Likelihood | Impact | Mitigation                                                        |
| -------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------- |
| Table rename breaks running queries                | Low        | High   | `ALTER TABLE RENAME` is atomic; deploy during low-traffic window  |
| Import chain breaks during rename                  | Medium     | Medium | Bottom-up rename order; build after each layer                    |
| Existing skills lose content during migration      | Low        | High   | Rename preserves all data; no data transformation                 |
| Agent creates unstructured skills despite template | Medium     | Low    | Template is guidance, not enforcement; backward compat handles it |
| Procedure execution fails mid-way                  | Medium     | Medium | Step-by-step execution with error reporting and retry options     |
