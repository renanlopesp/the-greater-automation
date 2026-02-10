# Implementation Plan: Workspace CRUD Actions

**Branch**: `010-workspace-crud` | **Date**: 2026-02-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-workspace-crud/spec.md`

## Summary

Implement all CRUD (Create, Read, Update, Delete) actions on the /workspace page. This includes creating workflows (blank and from templates), duplicating workflows, deleting workflows and agents with confirmation dialogs, inline rename, bulk actions (delete + status change), and adding missing table columns (Published, Steps, AI). The approach uses Next.js server actions following the existing `src/lib/actions/auth.ts` pattern, shadcn/ui AlertDialog for confirmations, and `revalidatePath` for data refresh.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, shadcn/ui (AlertDialog, Dialog), TanStack React Table, Supabase client
**Storage**: Supabase PostgreSQL (existing schema — workflows, agents, workflow_steps, workflow_triggers, workflow_runs, agent_skills tables)
**Testing**: Vitest + @testing-library/react (unit), Playwright (e2e)
**Target Platform**: Web (Next.js App Router)
**Project Type**: Web application (Next.js monolith)
**Performance Goals**: All CRUD operations complete in < 3 seconds, bulk operations < 5 seconds
**Constraints**: Must follow existing server action patterns; no new API routes; shadcn/ui composition only
**Scale/Scope**: Single page (/workspace) with ~7 new/modified files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status | Notes                                                                                |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------ |
| I. Next.js App Router First    | PASS   | Server actions via `'use server'`, revalidatePath for cache refresh, no Pages Router |
| II. shadcn/ui Component System | PASS   | AlertDialog for confirmations, Dialog for templates, composing shadcn primitives     |
| III. Tailwind CSS v4 + OKLCH   | PASS   | All new components use Tailwind classes with theme tokens                            |
| IV. TypeScript Strict Mode     | PASS   | All new code in TypeScript strict, Zod for form validation                           |
| V. Simplicity and YAGNI        | PASS   | Templates hardcoded (not DB), no premature abstractions, minimal new files           |
| VI. Supabase as Backend        | PASS   | All CRUD via Supabase client, RLS enforced, no custom API routes                     |

**Gate Result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/010-workspace-crud/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research decisions
├── data-model.md        # Entity definitions (existing schema)
├── quickstart.md        # Implementation guide
├── contracts/
│   └── server-actions.md # Server action signatures
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── actions/
│   │   └── workspace.ts        # NEW — All workspace server actions
│   └── data/
│       └── workflow-templates.ts # NEW — Hardcoded template definitions
├── components/
│   └── workspace/
│       ├── columns.tsx           # MODIFY — Add columns, wire action handlers
│       ├── workspace-header.tsx  # MODIFY — Connect New folder, From template
│       ├── workspace-client.tsx  # MODIFY — Add bulk actions bar
│       ├── delete-dialog.tsx     # NEW — Reusable AlertDialog confirmation
│       ├── template-dialog.tsx   # NEW — Template picker dialog
│       └── bulk-action-bar.tsx   # NEW — Floating bar for selected rows
```

**Structure Decision**: Follows existing Next.js App Router structure. New server actions go in `src/lib/actions/` alongside existing auth actions. New UI components go in `src/components/workspace/` alongside existing workspace components. Template data goes in a new `src/lib/data/` directory.
