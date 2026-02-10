# Feature Specification: Workspace Graph View & Polish

**Feature Branch**: `012-workspace-polish`
**Created**: 2026-02-10
**Status**: Draft
**Input**: User description: "Workspace Graph View & Polish -- Implement graph visualization and final UX improvements on the /workspace page."
**Depends On**: 010-workspace-crud, 011-workspace-folders

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Graph View Visualization (Priority: P1)

As a user viewing my workspace, I want to switch to a "Graph" view that shows a network visualization of agents and workflows so that I can understand the relationships between them at a glance. Agents appear as large nodes with their avatar and name. Workflows appear as smaller nodes with their emoji and name. Edges connect agents to the workflows they own (via the `agent_skills` join table). Standalone workflows (not assigned to any agent) appear as disconnected nodes. The graph uses automatic layout so nodes do not overlap. Clicking a workflow node navigates to its editor page. Clicking an agent node navigates to its detail page.

**Why this priority**: The graph view is the primary new feature in this spec. It transforms the workspace from a flat list into a visual map of agent-workflow relationships, giving users a fundamentally new way to understand their automation setup. The ViewToggle already has a "Graph" button that currently shows a "Coming soon" toast -- this story replaces that placeholder with the real feature.

**Independent Test**: Navigate to /workspace, click the Graph toggle, and verify that a network visualization renders with agents and workflows as nodes connected by edges. Click a workflow node and verify navigation to /workflows/[id]/edit. Click an agent node and verify navigation to /agents/[id].

**Acceptance Scenarios**:

1. **Given** the workspace has agents and workflows, **When** the user clicks the "Graph" toggle, **Then** a network visualization renders showing agents as large nodes and workflows as smaller nodes
2. **Given** the graph view is active, **When** an agent has 3 workflows assigned via agent_skills, **Then** 3 edges connect the agent node to its workflow nodes
3. **Given** the graph view is active, **When** a workflow is not assigned to any agent, **Then** it appears as a standalone node with no incoming edges
4. **Given** the graph view is active, **When** the user clicks a workflow node, **Then** they are navigated to /workflows/[id]/edit
5. **Given** the graph view is active, **When** the user clicks an agent node, **Then** they are navigated to /agents/[id]
6. **Given** the graph view is active with many nodes, **When** the graph renders, **Then** nodes are automatically laid out without overlapping
7. **Given** the graph view is active, **When** the user zooms or pans, **Then** the viewport updates smoothly

---

### User Story 2 - Keyboard Navigation in Table View (Priority: P2)

As a power user working in the table view, I want to navigate rows using the keyboard so that I can efficiently browse and act on items without reaching for the mouse. Arrow keys move the focus between rows, Enter opens the focused item, Delete triggers the delete confirmation dialog, Escape deselects the current row, and Space toggles row selection.

**Why this priority**: Keyboard navigation is an accessibility and efficiency requirement. It does not block the graph view but significantly improves the table experience for power users and meets accessibility guidelines.

**Independent Test**: Navigate to /workspace in table view, press the Down arrow key to focus the first row, continue pressing Down/Up to move focus, press Enter to open an item, press Delete to trigger the delete dialog, press Escape to deselect, and press Space to toggle selection.

**Acceptance Scenarios**:

1. **Given** the table view is active, **When** the user presses the Down arrow key, **Then** focus moves to the next row
2. **Given** a row is focused, **When** the user presses the Up arrow key, **Then** focus moves to the previous row
3. **Given** a workflow row is focused, **When** the user presses Enter, **Then** they are navigated to /workflows/[id]/edit
4. **Given** an agent row is focused, **When** the user presses Enter, **Then** the agent row expands (or navigates to /agents/[id])
5. **Given** a row is focused, **When** the user presses Delete, **Then** the delete confirmation dialog opens for that item
6. **Given** a row is focused, **When** the user presses Escape, **Then** the row is deselected and focus is removed
7. **Given** a row is focused, **When** the user presses Space, **Then** the row selection checkbox toggles

---

### User Story 3 - Optimistic UI for Mutations (Priority: P2)

As a user performing actions on workspace items (delete, status change), I want to see immediate visual feedback so that the interface feels responsive. When I delete an item, it should disappear from the table immediately. If the server action fails, the item should reappear with an error toast. When I change a workflow's status (draft to published or vice versa), the badge should update immediately.

**Why this priority**: Optimistic UI eliminates perceived latency and makes the application feel modern and responsive. It depends on the server action patterns from 010-workspace-crud being in place.

**Independent Test**: Delete a workflow and verify it disappears from the table within 100ms. Simulate a server error and verify the item reappears with an error toast. Toggle a workflow status and verify the badge updates immediately.

**Acceptance Scenarios**:

1. **Given** a workflow exists in the table, **When** the user confirms deletion, **Then** the row is removed from the table immediately (before the server response)
2. **Given** an optimistic delete was performed, **When** the server action fails, **Then** the row reappears in its original position and an error toast is shown
3. **Given** a workflow has "draft" status, **When** the user changes it to "published", **Then** the status badge updates to "Published" immediately
4. **Given** an optimistic status change was performed, **When** the server action fails, **Then** the badge reverts to the original status and an error toast is shown

---

### User Story 4 - Loading States During Mutations (Priority: P3)

As a user triggering server actions (create, delete, duplicate, move), I want to see loading indicators so I know the system is processing my request. Buttons should be disabled during mutations to prevent double-submission. Dialogs should show skeleton loading while server actions are in flight.

**Why this priority**: Loading states prevent user confusion and double-submission bugs. They are a polish item that improves confidence in the system's responsiveness.

**Independent Test**: Click the "Create workflow" button and verify it becomes disabled during the creation process. Open the delete dialog, confirm deletion, and verify the dialog shows a loading state while the server action processes.

**Acceptance Scenarios**:

1. **Given** the user clicks "Create workflow", **When** the server action is in flight, **Then** the create button is disabled and shows a loading spinner
2. **Given** the delete dialog is open, **When** the user clicks "Confirm", **Then** the confirm button shows a loading spinner and is disabled until the action completes
3. **Given** a duplicate action is in progress, **When** the server action is processing, **Then** the dropdown menu item shows a loading indicator
4. **Given** any mutation is in progress, **When** the user tries to trigger another mutation on the same item, **Then** the action is blocked until the first mutation completes

---

### User Story 5 - Real-time Revalidation After Mutations (Priority: P3)

As a user performing mutations on workspace items, I want the data to be refreshed after every successful action so that the table and graph views always reflect the current state. After creating, deleting, duplicating, or moving an item, the workspace data should be revalidated from the server.

**Why this priority**: Stale data after mutations leads to confusing discrepancies between what the user did and what the interface shows. This is a foundational data integrity concern that works in tandem with the optimistic UI story.

**Independent Test**: Create a new workflow, verify it appears in the table without a manual page refresh. Delete a workflow, verify it disappears and does not reappear on subsequent page loads. Move a workflow to a folder, verify it appears in the correct folder.

**Acceptance Scenarios**:

1. **Given** the user creates a new workflow, **When** the server action succeeds, **Then** the workspace data is revalidated and the new item appears in the table
2. **Given** the user deletes an item, **When** the server action succeeds, **Then** the workspace data is revalidated (confirming the optimistic removal)
3. **Given** the user duplicates a workflow, **When** the server action succeeds, **Then** the workspace data is revalidated and the duplicate appears in the table
4. **Given** the user moves a workflow to a different folder, **When** the server action succeeds, **Then** the workspace data is revalidated and the item appears in the target folder

---

### Edge Cases

- What happens when the workspace has zero items? The graph view should show an empty state with a message like "No items to display" and a call-to-action to create a workflow.
- What happens when an agent has no workflows assigned? The agent renders as a standalone node in the graph with no outgoing edges.
- What happens when the user rapidly switches between table and graph views? The active view should switch cleanly without flickering or stale render artifacts.
- What happens when a delete fails and the user has already navigated away? The optimistic removal should be reverted silently (no toast since the user is on a different page).
- What happens when two users delete the same item concurrently? The second user sees an error toast saying the item no longer exists, and the data is revalidated.
- What happens when there are 100+ nodes in the graph view? The auto-layout should still produce a readable arrangement, and the user should be able to zoom/pan to navigate.
- What happens when the user presses Delete on a row they do not have permission to delete? The delete dialog should still open but display an appropriate error if the server rejects the action.
- What happens when keyboard focus is in the graph view? Keyboard navigation (arrow keys) should not apply -- the graph uses its own pan/zoom controls.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST render a network graph visualization when the "Graph" view is selected in ViewToggle
- **FR-002**: Graph MUST display agents as large nodes (with avatar and name) and workflows as smaller nodes (with emoji and name)
- **FR-003**: Graph MUST draw edges between agent nodes and their associated workflow nodes based on the `agent_skills` join table
- **FR-004**: Graph MUST use automatic layout (dagre or elk) so that nodes do not overlap
- **FR-005**: Graph nodes MUST be clickable -- workflows navigate to `/workflows/[id]/edit` and agents navigate to `/agents/[id]`
- **FR-006**: Graph MUST support zoom (scroll wheel) and pan (click-drag on background)
- **FR-007**: Table view MUST support keyboard navigation: Arrow Up/Down to move focus, Enter to open, Delete to trigger delete dialog, Escape to deselect, Space to toggle selection
- **FR-008**: Delete operations MUST use optimistic UI -- remove the item immediately and revert if the server action fails
- **FR-009**: Status change operations MUST use optimistic UI -- update the badge immediately and revert if the server action fails
- **FR-010**: All mutation buttons MUST be disabled while a server action is in flight to prevent double-submission
- **FR-011**: Dialogs MUST show loading indicators (spinner or skeleton) while server actions are processing
- **FR-012**: After every successful mutation (create, delete, duplicate, move, status change), the workspace data MUST be revalidated via `revalidatePath` or `router.refresh()`
- **FR-013**: The "Coming soon" toast on the Graph toggle button MUST be removed and replaced with the actual graph view
- **FR-014**: Graph view MUST display an empty state when there are no workspace items

### Key Entities _(include if feature involves data)_

- **GraphNode**: Represents an agent or workflow in the graph view. Attributes: id, type (agent | workflow), label, metadata (avatar, emoji, palette, status). Application-level type, not stored in the database.
- **GraphEdge**: Represents the relationship between an agent and a workflow. Attributes: id, source (agent node id), target (workflow node id). Derived from the `agent_skills` database table.
- **WorkspaceItem**: Existing union type (WorkspaceAgent | WorkspaceWorkflow) from `src/lib/queries/workspace.ts`. Serves as the data source for both table and graph views.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Graph view renders within 2 seconds for workspaces with up to 50 agents and 200 workflows
- **SC-002**: All graph nodes are clickable and navigate to the correct detail/editor page
- **SC-003**: Keyboard navigation works in table view: users can traverse all rows using Arrow keys and perform actions with Enter, Delete, Escape, and Space
- **SC-004**: Optimistic delete removes an item from the table within 100ms of user confirmation
- **SC-005**: Failed mutations revert the optimistic UI change and display an error toast within 5 seconds
- **SC-006**: All mutation buttons are disabled during server action processing, preventing double-submission
- **SC-007**: Workspace data is revalidated after every successful mutation, confirmed by the new data appearing without manual page refresh
- **SC-008**: Zero "Coming soon" toasts remain in the workspace page
- **SC-009**: `bun run build` passes with zero errors
- **SC-010**: `bun run lint` passes with zero warnings

## Assumptions

- Specs 010-workspace-crud and 011-workspace-folders are completed before this spec is implemented, providing server actions for create, delete, duplicate, move, and folder management
- The `agent_skills` table is populated with data connecting agents to workflows
- The `@xyflow/react` library (React Flow) is suitable for the graph visualization and will be added as a new dependency
- The `dagre` library is suitable for automatic graph layout and will be added as a new dependency
- The workspace dataset is expected to stay under 500 items (agents + workflows) for typical teams, so client-side graph rendering is acceptable
