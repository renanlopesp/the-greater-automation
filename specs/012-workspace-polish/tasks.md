# Tasks: Workspace Graph View & Polish

**Input**: Design documents from `/specs/012-workspace-polish/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/graph-types.md
**Depends On**: Specs 010-workspace-crud and 011-workspace-folders must be implemented before this spec.

**Tests**: Tests are included where they add value (graph data transformation is pure logic and benefits from unit tests). E2E tests cover the graph view and keyboard navigation user stories.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install dependencies and create foundational type definitions.

- [ ] T001 Install `@xyflow/react` and `dagre` via `bun add @xyflow/react dagre && bun add -d @types/dagre`
- [ ] T002 Create graph type definitions in `src/lib/workspace/graph-types.ts` per contracts/graph-types.md (AgentNodeData, WorkflowNodeData, WorkspaceNode, WorkspaceEdge, NODE_DIMENSIONS, LayoutConfig, node ID helpers)
- [ ] T003 [P] Create `src/hooks/` directory if it does not exist (may already exist from prior features)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core graph infrastructure that MUST be complete before graph view (US1) can be implemented.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Implement `transformToGraphData()` in `src/lib/workspace/transform-graph-data.ts` -- converts `WorkspaceItem[]` to `{ nodes: WorkspaceNode[], edges: WorkspaceEdge[] }`. Agents become large nodes (type: 'agent'), workflows become small nodes (type: 'workflow'), edges connect agents to their child workflows. Standalone workflows have no incoming edges.
- [ ] T005 [P] Implement `layoutGraph()` in `src/lib/workspace/layout-graph.ts` -- takes unpositioned nodes + edges, runs dagre layout with `NODE_DIMENSIONS` and `DEFAULT_LAYOUT_CONFIG`, returns nodes with computed `position: { x, y }`.
- [ ] T006 [P] Create custom agent node component in `src/components/workspace/graph-node-agent.tsx` -- renders BoringAvatar, agent name, and workflow count badge. Uses `Handle` from @xyflow/react for edge connection points. Clickable (navigates to `/agents/[id]`).
- [ ] T007 [P] Create custom workflow node component in `src/components/workspace/graph-node-workflow.tsx` -- renders emoji, workflow name, and status Badge (draft/published). Uses `Handle` from @xyflow/react. Clickable (navigates to `/workflows/[id]/edit`).
- [ ] T008 [P] Create graph empty state in `src/components/workspace/graph-empty-state.tsx` -- displayed when `items.length === 0`. Shows a message and a call-to-action button.
- [ ] T009 [P] Write unit tests for `transformToGraphData()` in `src/__tests__/lib/workspace/transform-graph-data.test.ts` -- test: agents produce large nodes, workflows produce small nodes, agent-workflow edges created correctly, standalone workflows have no edges, empty input produces empty output.
- [ ] T010 [P] Write unit tests for `layoutGraph()` in `src/__tests__/lib/workspace/layout-graph.test.ts` -- test: all nodes receive position values, no two nodes overlap (positions differ), empty input handled, single node handled.

**Checkpoint**: Graph infrastructure ready -- user story implementation can now begin.

---

## Phase 3: User Story 1 - Graph View Visualization (Priority: P1)

**Goal**: When the user clicks the "Graph" toggle, a network visualization renders showing agents and workflows as connected nodes.

**Independent Test**: Navigate to /workspace, click Graph toggle, verify nodes and edges render, click a node to navigate.

### Implementation for User Story 1

- [ ] T011 [US1] Create main graph view component in `src/components/workspace/graph-view.tsx` -- wraps `ReactFlow` from @xyflow/react, registers custom node types (agent, workflow), passes positioned nodes and edges, configures zoom/pan controls, renders MiniMap and Controls. Accepts `items: WorkspaceItem[]` prop, internally calls `transformToGraphData` + `layoutGraph`.
- [ ] T012 [US1] Modify `src/components/workspace/view-toggle.tsx` -- remove the `if (value === 'graph') { toast('Coming soon'); return }` guard so the graph view toggle actually works. Remove the `toast` import if no longer needed.
- [ ] T013 [US1] Modify `src/components/workspace/workspace-client.tsx` -- conditionally render `<GraphView items={...} />` when `activeView === 'graph'`, and `<WorkspaceTable ... />` when activeView is 'folder' or 'list'. Import and lazy-load GraphView with `React.lazy()` to avoid loading @xyflow/react when not needed.
- [ ] T014 [US1] Add `@xyflow/react/dist/style.css` import to `src/components/workspace/graph-view.tsx` (or `globals.css`) for default ReactFlow styles.
- [ ] T015 [US1] Handle node click events in `graph-view.tsx` -- `onNodeClick` callback reads the node type and ID, navigates to the correct route via `useRouter().push()`.
- [ ] T016 [US1] Add graph empty state rendering -- when `items.length === 0` and `activeView === 'graph'`, render `<GraphEmptyState />` instead of the ReactFlow canvas.

**Checkpoint**: Graph view is functional -- agents and workflows render as connected nodes, clickable navigation works.

---

## Phase 4: User Story 2 - Keyboard Navigation (Priority: P2)

**Goal**: Users can navigate the workspace table using arrow keys and perform actions with Enter, Delete, Escape, Space.

**Independent Test**: Focus the table, use Arrow keys to navigate rows, press Enter to open, Delete to trigger delete dialog.

### Implementation for User Story 2

- [ ] T017 [US2] Implement `useKeyboardNavigation` hook in `src/hooks/use-keyboard-navigation.ts` -- manages `focusedIndex` state, handles ArrowUp (decrement), ArrowDown (increment), Enter (call onOpen), Delete (call onDelete), Escape (clear focus), Space (call onSelect). Clamps index to valid range. Returns `{ focusedIndex, setFocusedIndex, onKeyDown }`.
- [ ] T018 [US2] Modify `src/components/workspace/workspace-table.tsx` -- add `onKeyDown` handler from `useKeyboardNavigation` to the `<tbody>` or table container. Apply `tabIndex={focusedIndex === i ? 0 : -1}` and `aria-selected` to each `<tr>`. Add visual focus ring styling to the focused row.
- [ ] T019 [US2] Modify `src/components/workspace/workspace-client.tsx` -- pass `onOpen`, `onDelete`, and `onSelect` callbacks to the keyboard navigation hook. `onOpen` navigates to the item's detail/editor page. `onDelete` triggers the delete dialog (from 010-workspace-crud). `onSelect` toggles the row selection in the table state.
- [ ] T020 [US2] Ensure keyboard navigation is disabled when `activeView === 'graph'` -- the graph view uses its own pan/zoom keyboard controls.
- [ ] T021 [P] [US2] Write unit test for `useKeyboardNavigation` in `src/__tests__/hooks/use-keyboard-navigation.test.ts` -- test: ArrowDown increments index, ArrowUp decrements, Enter calls onOpen, Delete calls onDelete, Escape clears index, Space calls onSelect, index clamps to bounds.

**Checkpoint**: Keyboard navigation works in table view -- users can traverse rows and perform actions.

---

## Phase 5: User Story 3 - Optimistic UI (Priority: P2)

**Goal**: Delete and status change mutations produce immediate visual feedback, reverting on failure.

**Independent Test**: Delete a workflow, verify it disappears immediately. Simulate a failure, verify it reappears with an error toast.

### Implementation for User Story 3

- [ ] T022 [US3] Implement `useOptimisticWorkspace` hook in `src/hooks/use-optimistic-workspace.ts` -- wraps React 19's `useOptimistic(initialItems, reducer)`. The reducer handles `delete` (filter out item by ID, also remove from parent agent's `workflows[]`) and `updateStatus` (map + update status field). Returns `[optimisticItems, dispatch]`.
- [ ] T023 [US3] Modify `src/components/workspace/workspace-client.tsx` -- replace direct use of `initialItems` with `optimisticItems` from `useOptimisticWorkspace`. Pass `dispatch` to delete and status change handlers.
- [ ] T024 [US3] Wire up delete action -- when the user confirms deletion (from 010-workspace-crud delete dialog), call `dispatch({ type: 'delete', itemId })` immediately, then call the server action. On failure, show error toast via `toast.error()` from sonner. On success, `router.refresh()` replaces optimistic state with real data.
- [ ] T025 [US3] Wire up status change action -- when the user toggles workflow status (from 010-workspace-crud actions), call `dispatch({ type: 'updateStatus', itemId, newStatus })` immediately, then call the server action. On failure, revert + toast. On success, `router.refresh()`.
- [ ] T026 [P] [US3] Write unit test for the optimistic reducer in `src/__tests__/hooks/use-optimistic-workspace.test.ts` -- test: delete removes item, delete removes nested workflow from agent, updateStatus changes workflow status, actions on nonexistent items are no-ops.

**Checkpoint**: Optimistic UI works for delete and status change -- immediate feedback with error rollback.

---

## Phase 6: User Story 4 - Loading States (Priority: P3)

**Goal**: Buttons are disabled and show spinners during server action processing.

**Independent Test**: Click a mutation button, verify it becomes disabled with a spinner until the action completes.

### Implementation for User Story 4

- [ ] T027 [US4] Add `isPending` state tracking to mutation handlers in `src/components/workspace/workspace-client.tsx` -- use `useTransition` or local `useState<boolean>` to track whether a mutation is in flight. Pass `isPending` to child components.
- [ ] T028 [US4] Modify `src/components/workspace/columns.tsx` -- accept `isPending` context. When a mutation is in flight for an item, the action dropdown menu items show a `Loader2` spinner icon (from lucide-react) and are `disabled`.
- [ ] T029 [US4] Modify delete confirmation dialog (from 010-workspace-crud) -- the "Confirm" button shows a `Loader2` spinner and is `disabled` while the delete server action is processing.
- [ ] T030 [US4] Modify the create workflow button in `src/components/workspace/workspace-header.tsx` -- disable the button and show a spinner while the create server action is in flight.

**Checkpoint**: All mutation buttons show loading states and are disabled during processing.

---

## Phase 7: User Story 5 - Real-time Revalidation (Priority: P3)

**Goal**: After every successful mutation, workspace data is refreshed from the server.

**Independent Test**: Create a workflow, verify it appears without manual refresh. Delete one, verify it stays gone.

### Implementation for User Story 5

- [ ] T031 [US5] Add `router.refresh()` call after every successful server action in `src/components/workspace/workspace-client.tsx` -- this triggers the Server Component to re-fetch data from Supabase and pass fresh `initialItems` to the client component, replacing optimistic state.
- [ ] T032 [US5] Ensure revalidation runs after: create workflow, delete item, duplicate workflow, move to folder, status change. Verify each mutation path calls `router.refresh()` on success.
- [ ] T033 [US5] Handle the case where `router.refresh()` fails (e.g., network error) -- show a toast suggesting the user reload the page.

**Checkpoint**: Data is always fresh after mutations -- no stale state.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, remove all remaining placeholder behavior, verify quality gates.

- [ ] T034 Audit the entire workspace page for remaining `toast('Coming soon')` calls -- remove ALL of them. Check `view-toggle.tsx`, `workspace-header.tsx`, `columns.tsx`, `split-button.tsx`, and any other workspace components.
- [ ] T035 [P] Add `@xyflow/react` CSS import to ensure graph styles render correctly in production build. Verify graph renders after `bun run build && bun run start`.
- [ ] T036 [P] Verify graph view respects light/dark theme -- node backgrounds, edge colors, and empty state should use CSS variable-based colors.
- [ ] T037 [P] Add ARIA attributes to graph view -- the graph container should have `role="img"` with `aria-label="Workspace relationship graph"`. Individual nodes should have `aria-label` with the item name.
- [ ] T038 Run `bun run build` and fix any TypeScript or build errors.
- [ ] T039 Run `bun run lint` and fix any linting warnings or errors.
- [ ] T040 Run the full test suite (`bun run test`) and verify all existing + new tests pass.
- [ ] T041 Manual smoke test: navigate to /workspace, test all three views (folder, list, graph), test keyboard navigation, test delete with optimistic UI, test status change, verify no console errors.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion -- BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Phase 2 completion
  - US1 (Phase 3) can start immediately after Phase 2
  - US2 (Phase 4) can start immediately after Phase 2 (independent of US1)
  - US3 (Phase 5) can start immediately after Phase 2 (independent of US1/US2)
  - US4 (Phase 6) depends on US3 (needs optimistic state to add loading states)
  - US5 (Phase 7) depends on US3 (needs optimistic state to know when to revalidate)
- **Polish (Phase 8)**: Depends on all user stories being complete

### External Dependencies

- **010-workspace-crud**: Server actions for create, delete, duplicate, status change must exist before US3, US4, and US5 can be implemented. The delete confirmation dialog must exist before US2 (keyboard Delete key triggers it).
- **011-workspace-folders**: Folder management must exist before US5 revalidation after "move to folder" can be tested.

### Within Each User Story

- Tests (if included) should be written first to clarify expected behavior
- Pure logic functions (transform, layout) before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T002 and T003 can run in parallel (Phase 1)
- T004, T005, T006, T007, T008, T009, T010 -- T005-T010 are all marked [P] and can run in parallel once T004 is started (T004 defines the transform that T009 tests, but tests can be written concurrently)
- US1, US2, US3 can start in parallel after Phase 2 (different files, no dependencies)
- T034, T035, T036, T037 can all run in parallel (Phase 8)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL -- blocks all stories)
3. Complete Phase 3: User Story 1 (Graph View)
4. **STOP and VALIDATE**: Switch to graph view, verify nodes and edges render, verify click navigation
5. Deploy/demo if ready -- the graph view alone is a major feature

### Incremental Delivery

1. Setup + Foundational -> Graph infrastructure ready
2. US1 (Graph View) -> Test independently -> Demo (MVP!)
3. US2 (Keyboard Nav) -> Test independently -> Demo
4. US3 (Optimistic UI) -> Test independently -> Demo
5. US4 (Loading States) -> Test independently -> Demo
6. US5 (Revalidation) -> Test independently -> Demo
7. Polish -> Final validation -> Ship

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach for transform/layout)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- This spec has **41 tasks** across 8 phases
