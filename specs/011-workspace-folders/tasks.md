# Tasks: Workspace Folder System

**Input**: Design documents from `/specs/011-workspace-folders/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL for this feature - only include if explicitly requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Install missing shadcn components, create scaffold files

- [ ] T001 [P] Install AlertDialog component via `npx shadcn@latest add alert-dialog` - verify `src/components/ui/alert-dialog.tsx` exists
- [ ] T002 [P] Create Zod schemas file `src/lib/schemas/workspace.ts` with `createFolderSchema`, `renameFolderSchema`, `deleteFolderSchema`, `moveToFolderSchema` per contracts/server-actions.md
- [ ] T003 [P] Create empty server actions file `src/lib/actions/workspace.ts` with `'use server'` directive, `WorkspaceActionResult` type, and function stubs (return `{ error: 'Not implemented' }`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Server actions and query functions that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Add `WorkspaceFolder` and `FolderTreeNode` interfaces to `src/lib/queries/workspace.ts`
- [ ] T005 Implement `fetchFolders(supabase, teamId)` query function in `src/lib/queries/workspace.ts` - fetch folders with workflow counts and subfolder counts
- [ ] T006 Implement `buildFolderTree(folders)` utility function in `src/lib/queries/workspace.ts` - pure function converting flat folder array to tree structure
- [ ] T007 Update `WorkspaceItem` type union in `src/lib/queries/workspace.ts` to include `WorkspaceFolder`
- [ ] T008 Implement `createFolder` server action in `src/lib/actions/workspace.ts` - validate with Zod, insert into `folders` table, `revalidatePath('/workspace')`
- [ ] T009 [P] Implement `renameFolder` server action in `src/lib/actions/workspace.ts` - validate with Zod, update `folders.name`, `revalidatePath('/workspace')`
- [ ] T010 [P] Implement `deleteFolder` server action in `src/lib/actions/workspace.ts` - support `move-to-root` and `delete-all` modes per contract
- [ ] T011 [P] Implement `moveToFolder` server action in `src/lib/actions/workspace.ts` - parse JSON `itemIds`, update `workflows.folder_id`, `revalidatePath('/workspace')`
- [ ] T012 Modify `src/app/(dashboard)/workspace/page.tsx` - call `fetchFolders` alongside existing data fetching, pass `folders` as prop to `WorkspaceClient`

**Checkpoint**: Foundation ready - all server actions functional, folders fetched and passed to client

---

## Phase 3: User Story 1 - Create Folder (Priority: P1)

**Goal**: Users can create folders via a dialog and see them rendered as rows in the workspace table

**Independent Test**: Click "New folder", enter name, submit, verify folder row appears in table

### Implementation for User Story 1

- [ ] T013 [US1] Create `src/components/workspace/create-folder-dialog.tsx` - Dialog with name Input, form validation using `folderNameSchema`, calls `createFolder` server action on submit, Cancel/Create buttons
- [ ] T014 [US1] Modify `src/components/workspace/workspace-header.tsx` - replace the toast-only "New folder" button with opening the CreateFolderDialog, pass `teamId` prop
- [ ] T015 [US1] Modify `src/components/workspace/columns.tsx` - add folder row rendering in the `name` column cell: FolderOpen icon + folder name + expand/collapse chevron for folder type items
- [ ] T016 [US1] Add folder type badge rendering in the `type` column cell in `src/components/workspace/columns.tsx` - show "Folder" badge for folder items
- [ ] T017 [US1] Modify `src/components/workspace/workspace-client.tsx` - accept `folders` prop, include `WorkspaceFolder` items in `flatData` computation, render folders before workflows

**Checkpoint**: At this point, users can create folders and see them in the workspace table

---

## Phase 4: User Story 2 - Move to Folder (Priority: P1)

**Goal**: Users can move one or more workflows into a folder via a tree picker dialog

**Independent Test**: Use "Move to folder" on a workflow, select target folder, verify workflow moves

### Implementation for User Story 2

- [ ] T018 [US2] Create `src/components/workspace/folder-tree-picker.tsx` - recursive tree component rendering folders with FolderOpen icon, radio selection, indent per depth level, "Root (no folder)" option at top
- [ ] T019 [US2] Create `src/components/workspace/move-to-folder-dialog.tsx` - Dialog wrapping FolderTreePicker, "Cancel"/"Move" buttons, calls `moveToFolder` server action with selected folder ID and item IDs
- [ ] T020 [US2] Wire "Move to folder" DropdownMenuItem in `src/components/workspace/columns.tsx` - clicking it opens MoveToFolderDialog for the single workflow row
- [ ] T021 [US2] Add bulk move support in `src/components/workspace/workspace-client.tsx` - when rows are selected, show a "Move to folder" bulk action button above the table that opens MoveToFolderDialog with all selected workflow IDs
- [ ] T022 [US2] Add "Move to root" quick action in folder row action menu in `src/components/workspace/columns.tsx` - for workflows currently in a folder, show a "Move to root" option that directly calls `moveToFolder` with `folderId: null`

**Checkpoint**: At this point, users can create folders AND move workflows into them

---

## Phase 5: User Story 3 - Folder View Mode (Priority: P2)

**Goal**: Folder view shows items grouped by folder with breadcrumb navigation

**Independent Test**: Create folders, move workflows, switch to folder view, navigate into folders, verify breadcrumb

### Implementation for User Story 3

- [ ] T023 [US3] Add `currentFolderId` URL state in `src/components/workspace/workspace-client.tsx` via nuqs `parseAsString` - stored as `?folder=<id>` search param, null means root
- [ ] T024 [US3] Update `flatData` computation in `src/components/workspace/workspace-client.tsx` - when `activeView === 'folder'`: if `currentFolderId` is null, show root folders + root workflows; if set, show items where `folder_id === currentFolderId` or `parent_id === currentFolderId`
- [ ] T025 [US3] Add folder row click handler in `src/components/workspace/columns.tsx` - clicking a folder row sets `currentFolderId` to that folder's ID (navigates into the folder)
- [ ] T026 [US3] Create `src/components/workspace/folder-breadcrumb.tsx` - uses shadcn Breadcrumb component, computes path from `currentFolderId` back to root via `parent_id` chain, each segment is clickable and sets `currentFolderId`
- [ ] T027 [US3] Wire folder breadcrumb into `src/components/workspace/workspace-client.tsx` - render FolderBreadcrumb between filters row and table when `currentFolderId` is not null
- [ ] T028 [US3] Add empty state for empty folders in `src/components/workspace/workspace-client.tsx` - when inside a folder that has no items, show "This folder is empty" message

**Checkpoint**: At this point, the folder view mode is fully functional with navigation and breadcrumbs

---

## Phase 6: User Story 4 - Delete Folder (Priority: P2)

**Goal**: Users can delete folders with clear options for handling contents

**Independent Test**: Create a folder with workflows, delete it with both modes, verify outcomes

### Implementation for User Story 4

- [ ] T029 [US4] Create `src/components/workspace/delete-folder-dialog.tsx` - AlertDialog showing folder name, two action buttons: "Move contents to root" and "Delete all", calls `deleteFolder` server action with appropriate mode
- [ ] T030 [US4] Wire "Delete" action in folder row menu in `src/components/workspace/columns.tsx` - clicking "Delete" on a folder row opens DeleteFolderDialog
- [ ] T031 [US4] Handle empty folder deletion in `src/components/workspace/delete-folder-dialog.tsx` - if folder has 0 workflows and 0 subfolders, show simplified AlertDialog with just a "Delete" button (no mode selection needed)
- [ ] T032 [US4] Handle breadcrumb navigation after deletion in `src/components/workspace/workspace-client.tsx` - if `currentFolderId` points to a deleted folder, reset to root (null) with a toast notification

**Checkpoint**: At this point, the complete folder lifecycle (create, move, view, delete) is functional

---

## Phase 7: User Story 5 - Rename Folder (Priority: P3)

**Goal**: Users can rename folders via inline editing

**Independent Test**: Double-click folder name, type new name, press Enter, verify update

### Implementation for User Story 5

- [ ] T033 [US5] Create `src/components/workspace/inline-folder-name.tsx` - controlled component: static text by default, switches to Input on double-click, saves on Enter/blur, cancels on Escape, calls `renameFolder` server action
- [ ] T034 [US5] Wire inline rename into `src/components/workspace/columns.tsx` - replace static folder name text with InlineFolderName component for folder rows
- [ ] T035 [US5] Add "Rename" option to folder row action menu in `src/components/workspace/columns.tsx` - clicking "Rename" programmatically triggers the inline edit mode

**Checkpoint**: At this point, folders can be renamed inline

---

## Phase 8: User Story 6 - Nested Folders (Priority: P3)

**Goal**: Users can create folders inside other folders with a 3-level depth limit

**Independent Test**: Create nested folders, verify parent_id, verify depth limit, verify breadcrumb path

### Implementation for User Story 6

- [ ] T036 [US6] Update `src/components/workspace/create-folder-dialog.tsx` - add optional "Parent folder" Select dropdown populated from folders list, pre-select current folder when creating from within a folder view
- [ ] T037 [US6] Update `createFolder` server action in `src/lib/actions/workspace.ts` - add depth validation: walk `parent_id` chain to compute depth, reject if depth >= 3
- [ ] T038 [US6] Update `src/components/workspace/folder-tree-picker.tsx` - render nested folders with indentation in the move-to-folder dialog, support expand/collapse per tree node
- [ ] T039 [US6] Update `src/components/workspace/folder-breadcrumb.tsx` - handle multi-level breadcrumb paths (e.g., "Workspace > A > B > C")
- [ ] T040 [US6] Disable "New folder" button or show tooltip when user is at depth 3 in `src/components/workspace/workspace-header.tsx`

**Checkpoint**: Nested folders are fully functional with depth enforcement

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, edge cases, cleanup

- [ ] T041 [P] Review all new components for keyboard accessibility - ensure Dialog focus trapping, Escape to close, Tab navigation through tree picker
- [ ] T042 [P] Review all new components for proper ARIA attributes - `aria-label` on buttons, `role="tree"` on tree picker, `role="treeitem"` on tree nodes
- [ ] T043 Add loading states to all dialogs in `src/components/workspace/` - disable submit buttons during server action execution, show spinner
- [ ] T044 Add optimistic UI for inline rename in `src/components/workspace/inline-folder-name.tsx` - show new name immediately, revert on error
- [ ] T045 Run `bun run build` and fix any TypeScript or build errors
- [ ] T046 Run `bun run lint` and fix any linting warnings
- [ ] T047 Manual smoke test following quickstart.md verification checklist (create, move, view, rename, delete, nest, bulk move)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all user stories
- **US1 Create Folder (Phase 3)**: Depends on Phase 2
- **US2 Move to Folder (Phase 4)**: Depends on Phase 2; works best after Phase 3 (need folders to move into)
- **US3 Folder View Mode (Phase 5)**: Depends on Phase 2; works best after Phase 3 and 4 (need folders with items to view)
- **US4 Delete Folder (Phase 6)**: Depends on Phase 2; works best after Phase 3 (need folders to delete)
- **US5 Rename Folder (Phase 7)**: Depends on Phase 2 and Phase 3 (need folder rows to rename)
- **US6 Nested Folders (Phase 8)**: Depends on Phase 3 and Phase 5 (needs create dialog and breadcrumb)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1) Create Folder**: Can start after Phase 2 - No dependencies on other stories
- **US2 (P1) Move to Folder**: Can start after Phase 2 - Independently testable (can create folders via DB seed)
- **US3 (P2) Folder View Mode**: Can start after Phase 2 - Independently testable (can seed folders + workflows)
- **US4 (P2) Delete Folder**: Can start after Phase 2 - Independently testable (can seed folders)
- **US5 (P3) Rename Folder**: Depends on US1 (folder row rendering in columns.tsx) - Needs folder rows to exist
- **US6 (P3) Nested Folders**: Depends on US1 (create dialog) and US3 (breadcrumb) - Extends existing components

### Within Each User Story

- Create component files before wiring into existing files
- Server-side changes before client-side rendering
- Core functionality before edge case handling

### Parallel Opportunities

- T001, T002, T003 can all run in parallel (Phase 1)
- T009, T010, T011 can run in parallel (different server action functions)
- T041, T042 can run in parallel (different accessibility concerns)
- US1 and US2 can proceed in parallel after Phase 2 (different components, different actions)
- US3 and US4 can proceed in parallel after Phase 2 (different concerns)

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 - Create Folder
4. Complete Phase 4: User Story 2 - Move to Folder
5. **STOP and VALIDATE**: Create a folder, move a workflow into it, verify table rendering
6. Deploy/demo if ready - this is the minimum viable folder system

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add US1 Create Folder -> Test independently -> Folders appear in table (MVP start)
3. Add US2 Move to Folder -> Test independently -> Workflows can be organized (MVP complete!)
4. Add US3 Folder View Mode -> Test independently -> Navigation and breadcrumbs work
5. Add US4 Delete Folder -> Test independently -> Full lifecycle
6. Add US5 Rename Folder -> Test independently -> Polish
7. Add US6 Nested Folders -> Test independently -> Power user feature
8. Each story adds value without breaking previous stories

### Recommended Sequence (Single Developer)

Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6 -> Phase 7 -> Phase 8 -> Phase 9

Total: 47 tasks across 9 phases

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The `folders` table already exists in the database - no migration needed
- AlertDialog must be installed before delete folder dialog can be built
- The existing "Move to folder" DropdownMenuItem in columns.tsx is already stubbed (it exists but does nothing)
