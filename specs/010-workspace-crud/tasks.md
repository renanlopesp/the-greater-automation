# Tasks: Workspace CRUD Actions

**Input**: Design documents from `/specs/010-workspace-crud/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/server-actions.md, quickstart.md

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure shadcn/ui components are installed and shared files are scaffolded

- [ ] T001 Ensure shadcn/ui AlertDialog component is installed (`npx shadcn@latest add alert-dialog`) — verify `src/components/ui/alert-dialog.tsx` exists
- [ ] T002 [P] Ensure shadcn/ui Dialog component is installed (`npx shadcn@latest add dialog`) — verify `src/components/ui/dialog.tsx` exists
- [ ] T003 Create `src/lib/actions/workspace.ts` with `'use server'` directive and placeholder exports for all 8 server actions per `contracts/server-actions.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Server actions that multiple user stories depend on — MUST be complete before any UI wiring

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement `createWorkflow(teamId, userId)` server action in `src/lib/actions/workspace.ts` — insert into `workflows` table with defaults (name: "Untitled Workflow", emoji: "📋", status: "draft"), return `{ id }`, call `revalidatePath('/workspace')`
- [ ] T005 Implement `deleteWorkflow(workflowId)` server action in `src/lib/actions/workspace.ts` — check for active runs (status 'running'|'pending' in workflow_runs), if active return `{ error }`, otherwise delete workflow (FK cascade handles children), call `revalidatePath('/workspace')`
- [ ] T006 Implement `deleteAgent(agentId)` server action in `src/lib/actions/workspace.ts` — delete agent (FK cascade handles agent_skills, orphaning workflows), call `revalidatePath('/workspace')`
- [ ] T007 Create reusable `DeleteDialog` component in `src/components/workspace/delete-dialog.tsx` — compose shadcn/ui AlertDialog with props: `open`, `onOpenChange`, `title`, `description`, `onConfirm`, `loading`. Show Cancel and destructive Delete buttons. Use `"use client"` directive

**Checkpoint**: Foundation ready — server actions for create/delete exist, DeleteDialog is reusable

---

## Phase 3: User Story 1 — Create Blank Workflow (Priority: P1) 🎯 MVP

**Goal**: Users can click "New workflow" to create a real workflow in the DB and land in the editor

**Independent Test**: Click "New workflow" → verify workflow appears in DB → verify redirect to `/workflows/[id]/edit`

### Implementation for User Story 1

- [ ] T008 [US1] Update `src/components/workspace/workspace-header.tsx` — import `createWorkflow` action, replace `router.push('/workflows/new/edit')` in `onNewBlank` with: call `createWorkflow(teamId, userId)`, on success `router.push(/workflows/${id}/edit)`, on error show toast
- [ ] T009 [US1] Update `src/components/workspace/workspace-client.tsx` — pass `teamId` and `userId` as props to `WorkspaceHeader` so it can call the server action
- [ ] T010 [US1] Update `src/components/workspace/workspace-header.tsx` — accept `teamId` and `userId` props, add loading state while creating workflow, disable button during creation

**Checkpoint**: User Story 1 fully functional — "New workflow" creates a real DB record and redirects to editor

---

## Phase 4: User Story 2 — Delete Workflow with Confirmation (Priority: P1)

**Goal**: Users can delete a workflow via the action menu with a confirmation dialog

**Independent Test**: Click "Delete" on workflow action menu → confirmation dialog appears → confirm → workflow removed from table

### Implementation for User Story 2

- [ ] T011 [US2] Update `src/components/workspace/columns.tsx` — add `onDeleteWorkflow: (id: string, name: string) => void` to `ColumnMeta` interface, wire the workflow Delete `DropdownMenuItem` to call `onDeleteWorkflow(item.id, item.name)`
- [ ] T012 [US2] Update `src/components/workspace/workspace-client.tsx` — add state for delete dialog (`deleteTarget: { id, name, type } | null`), pass `onDeleteWorkflow` callback to `createColumns` meta, render `DeleteDialog` conditionally with title "Delete workflow", description mentioning the workflow name, `onConfirm` calling `deleteWorkflow` action
- [ ] T013 [US2] Handle loading and error states in delete flow in `src/components/workspace/workspace-client.tsx` — add `isDeleting` state, disable dialog confirm button during deletion, show toast on error, clear selection after successful delete

**Checkpoint**: User Story 2 fully functional — workflows can be deleted with confirmation

---

## Phase 5: User Story 3 — Delete Agent with Confirmation (Priority: P1)

**Goal**: Users can delete an agent via the action menu, with orphaned workflows becoming standalone

**Independent Test**: Click "Delete" on agent action menu → dialog warns about workflow unassignment → confirm → agent removed, workflows remain

### Implementation for User Story 3

- [ ] T014 [US3] Update `src/components/workspace/columns.tsx` — add `onDeleteAgent: (id: string, name: string) => void` to `ColumnMeta`, wire the agent Delete `DropdownMenuItem` to call `onDeleteAgent(item.id, item.name)`
- [ ] T015 [US3] Update `src/components/workspace/workspace-client.tsx` — extend delete dialog state to handle agents, set description to warn about workflow unassignment ("Workflows assigned to this agent will become standalone"), `onConfirm` calls `deleteAgent` action

**Checkpoint**: User Story 3 fully functional — agents can be deleted, workflows orphaned correctly

---

## Phase 6: User Story 4 — Duplicate Workflow (Priority: P2)

**Goal**: Users can duplicate a workflow with all its steps and trigger, landing in the editor for the copy

**Independent Test**: Click "Duplicate" on workflow → new workflow created with "(copy)" suffix → redirect to editor → verify steps and trigger are identical

### Implementation for User Story 4

- [ ] T016 [US4] Implement `duplicateWorkflow(workflowId, teamId, userId)` server action in `src/lib/actions/workspace.ts` — fetch source workflow, its steps, and trigger; generate copy name with "(copy)" suffix (handle "(copy N)" incrementing); insert new workflow + copied steps + copied trigger; return `{ id }`; call `revalidatePath('/workspace')`
- [ ] T017 [US4] Update `src/components/workspace/columns.tsx` — add `onDuplicateWorkflow: (id: string) => void` to `ColumnMeta`, wire the Duplicate `DropdownMenuItem` to call it
- [ ] T018 [US4] Update `src/components/workspace/workspace-client.tsx` — add `onDuplicateWorkflow` callback that calls `duplicateWorkflow` action then `router.push(/workflows/${id}/edit)`, pass to `createColumns` meta, show toast on error

**Checkpoint**: User Story 4 fully functional — duplicate creates a full copy and redirects to editor

---

## Phase 7: User Story 5 — Create Workflow from Template (Priority: P2)

**Goal**: Users can create a workflow from a pre-defined template via a dialog

**Independent Test**: Click "From template" → dialog shows templates → select one → workflow created with pre-populated steps → redirect to editor

### Implementation for User Story 5

- [ ] T019 [P] [US5] Create `src/lib/data/workflow-templates.ts` — define `WorkflowTemplate` type and export `WORKFLOW_TEMPLATES` array with 4 templates: "Email Automation" (trigger: app, steps: app+ai), "Data Sync" (trigger: scheduled, steps: http+app), "Approval Flow" (trigger: form, steps: human_in_loop+ai+app), "Web Scraping Pipeline" (trigger: manual, steps: web_scraping+ai+utility)
- [ ] T020 [P] [US5] Implement `createWorkflowFromTemplate(teamId, userId, templateId)` server action in `src/lib/actions/workspace.ts` — look up template from `WORKFLOW_TEMPLATES`, create workflow with template name/emoji, insert steps and trigger from template config, return `{ id }`, call `revalidatePath('/workspace')`
- [ ] T021 [US5] Create `src/components/workspace/template-dialog.tsx` — compose shadcn/ui Dialog with template grid/list showing name, description, emoji for each template. On select: call `createWorkflowFromTemplate`, on success `router.push`, loading state per template card. Accept `open`, `onOpenChange`, `teamId`, `userId` props. `"use client"` directive
- [ ] T022 [US5] Update `src/components/workspace/workspace-header.tsx` — replace `toast('Coming soon')` on `onNewFromTemplate` with opening the template dialog, render `TemplateDialog` component

**Checkpoint**: User Story 5 fully functional — templates create pre-populated workflows

---

## Phase 8: User Story 6 — Edit Agent Navigation (Priority: P2)

**Goal**: Users can click "Edit" on an agent to navigate to the agent detail page

**Independent Test**: Click "Edit" on agent action menu → navigate to `/agents/[id]`

### Implementation for User Story 6

- [ ] T023 [US6] Update `src/components/workspace/columns.tsx` — replace the agent "Edit" `DropdownMenuItem` with `<DropdownMenuItem asChild><Link href={/agents/${item.id}}>Edit</Link></DropdownMenuItem>` (same pattern as workflow Edit link)

**Checkpoint**: User Story 6 fully functional — agent edit navigates correctly

---

## Phase 9: User Story 7 — Inline Rename Workflow (Priority: P3)

**Goal**: Users can double-click a workflow name to rename it inline

**Independent Test**: Double-click workflow name → input appears → type new name → press Enter → name updates in table and persists

### Implementation for User Story 7

- [ ] T024 [US7] Implement `renameWorkflow(workflowId, name)` server action in `src/lib/actions/workspace.ts` — validate name non-empty, update `workflows.name` via Supabase, call `revalidatePath('/workspace')`
- [ ] T025 [US7] Update the workflow name cell renderer in `src/components/workspace/columns.tsx` — add `onRenameWorkflow: (id: string, newName: string) => void` to `ColumnMeta`, replace the `<Link>` with a component that: renders normally as a link, on double-click switches to an `<input>` pre-filled with current name, on Enter calls `onRenameWorkflow` and exits edit mode, on Escape reverts and exits edit mode, on blur saves
- [ ] T026 [US7] Update `src/components/workspace/workspace-client.tsx` — add `onRenameWorkflow` callback that calls `renameWorkflow` action, show toast on error (empty name or server error), pass to `createColumns` meta

**Checkpoint**: User Story 7 fully functional — inline rename persists immediately

---

## Phase 10: User Story 8 — Bulk Delete and Status Change (Priority: P3)

**Goal**: Users can select multiple items and perform bulk delete or status toggle

**Independent Test**: Select 3+ workflows → action bar appears → click "Delete selected" → confirm → all removed. Select drafts → "Change status" → all become published.

### Implementation for User Story 8

- [ ] T027 [P] [US8] Implement `bulkDeleteItems(items)` server action in `src/lib/actions/workspace.ts` — separate workflow/agent IDs, check active runs, delete workflows then agents via Supabase `.in('id', ids)`, call `revalidatePath('/workspace')`
- [ ] T028 [P] [US8] Implement `bulkToggleStatus(workflowIds, newStatus)` server action in `src/lib/actions/workspace.ts` — update all workflows to newStatus, set `published_at` to `new Date().toISOString()` if publishing or `null` if drafting, call `revalidatePath('/workspace')`
- [ ] T029 [US8] Create `src/components/workspace/bulk-action-bar.tsx` — floating bar component that accepts `selectedCount`, `onDelete`, `onChangeStatus`, `isLoading`. Shows "[N] selected", "Delete selected" (destructive), "Change status" dropdown (Draft/Published). Positioned above table. `"use client"` directive
- [ ] T030 [US8] Update `src/components/workspace/workspace-client.tsx` — render `BulkActionBar` when `Object.keys(rowSelection).length > 0`, compute selected items from `flatData` + `rowSelection`, wire `onDelete` to open DeleteDialog with bulk count description, wire `onChangeStatus` to call `bulkToggleStatus`, clear `rowSelection` after successful bulk action

**Checkpoint**: User Story 8 fully functional — bulk delete and status toggle work for multi-select

---

## Phase 11: User Story 9 — Additional Table Columns (Priority: P3)

**Goal**: Workspace table shows Published date, Steps count, and AI indicator columns

**Independent Test**: Verify published workflows show date, all workflows show step count, AI workflows show sparkle icon

### Implementation for User Story 9

- [ ] T031 [P] [US9] Add "Published" column to `src/components/workspace/columns.tsx` — accessor: `(row) => row.type === 'workflow' ? (row as WorkspaceWorkflow).published_at : null`, cell: format date with `formatRelativeTime` or show "--" for drafts/agents, sortable
- [ ] T032 [P] [US9] Add "Steps" column to `src/components/workspace/columns.tsx` — accessor: `(row) => row.type === 'workflow' ? (row as WorkspaceWorkflow).step_count : null`, cell: show count number or "--" for agents, sortable
- [ ] T033 [P] [US9] Add "AI" column to `src/components/workspace/columns.tsx` — accessor: `(row) => row.type === 'workflow' ? (row as WorkspaceWorkflow).has_ai_steps : false`, cell: show Sparkles icon from lucide-react if true, empty otherwise, 44px width

**Checkpoint**: User Story 9 fully functional — all 3 columns display accurate data

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Remove remaining stubs and validate everything works together

- [ ] T034 Remove the `toast('Coming soon')` import and usage from `src/components/workspace/workspace-header.tsx` if "New folder" toast still exists (folder feature is spec 011 — keep the button but make it a no-op or disable it with tooltip "Coming in next update")
- [ ] T035 Run `bun run build` and fix any TypeScript or build errors
- [ ] T036 Run `bun run lint` and fix any linting issues
- [ ] T037 Run `bun run test` and fix any failing tests
- [ ] T038 Smoke test: navigate to `/workspace`, verify all CRUD actions work end-to-end, verify new columns render, verify bulk actions function

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Stories (Phase 3–11)**: All depend on Phase 2 completion
  - US1 (Create): Independent
  - US2 (Delete Workflow): Independent (uses DeleteDialog from Phase 2)
  - US3 (Delete Agent): Independent (uses DeleteDialog from Phase 2)
  - US4 (Duplicate): Independent
  - US5 (Templates): Independent
  - US6 (Edit Agent Nav): Independent
  - US7 (Inline Rename): Independent
  - US8 (Bulk Actions): Benefits from US2 patterns but independently implementable
  - US9 (Columns): Independent — purely additive
- **Polish (Phase 12)**: Depends on all user stories being complete

### User Story Dependencies

- **US1–US3 (P1)**: Can all start in parallel after Phase 2
- **US4–US6 (P2)**: Can all start in parallel after Phase 2
- **US7–US9 (P3)**: Can all start in parallel after Phase 2
- No cross-story blocking dependencies

### Parallel Opportunities

Within Phase 2: T004, T005, T006 modify the same file sequentially. T007 is parallel (different file).

Within each story phase: tasks marked [P] can run in parallel.

Across story phases: all user stories can run in parallel after Phase 2 completes.

---

## Parallel Example: User Story 5 (Templates)

```bash
# These can run in parallel (different files):
Task: "Create src/lib/data/workflow-templates.ts"    # T019
Task: "Implement createWorkflowFromTemplate action"   # T020

# Then sequentially:
Task: "Create template-dialog.tsx"                     # T021 (depends on T019, T020)
Task: "Wire template dialog to workspace header"       # T022 (depends on T021)
```

---

## Implementation Strategy

### MVP First (User Stories 1–3 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T007)
3. Complete Phase 3: US1 — Create Blank Workflow (T008–T010)
4. **STOP and VALIDATE**: Test creating a workflow
5. Complete Phase 4–5: US2 + US3 — Delete Workflow/Agent (T011–T015)
6. **STOP and VALIDATE**: Test delete flows

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → MVP: users can create workflows
3. Add US2 + US3 → Core CRUD: create + delete
4. Add US4 + US5 + US6 → Full create experience: duplicate + templates + agent nav
5. Add US7 + US8 + US9 → Power user features: rename + bulk + columns
6. Polish → Production ready

---

## Summary

- **Total tasks**: 38
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundation)**: 4 tasks
- **US1 (Create)**: 3 tasks
- **US2 (Delete Workflow)**: 3 tasks
- **US3 (Delete Agent)**: 2 tasks
- **US4 (Duplicate)**: 3 tasks
- **US5 (Templates)**: 4 tasks
- **US6 (Edit Agent)**: 1 task
- **US7 (Inline Rename)**: 3 tasks
- **US8 (Bulk Actions)**: 4 tasks
- **US9 (Columns)**: 3 tasks
- **Polish**: 5 tasks
- **Parallel opportunities**: 11 tasks marked [P]
- **Suggested MVP**: US1 + US2 + US3 (create + delete = core CRUD)
