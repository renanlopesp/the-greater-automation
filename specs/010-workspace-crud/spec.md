# Feature Specification: Workspace CRUD Actions

**Feature Branch**: `010-workspace-crud`
**Created**: 2026-02-10
**Status**: Draft
**Input**: User description: "Workspace CRUD Actions — Implement all create/read/update/delete actions on the /workspace page."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create Blank Workflow (Priority: P1)

A user navigates to the workspace page and clicks "New workflow" to create a new blank workflow. The system creates a new workflow record with default values (draft status, default emoji, default name) and redirects the user to the workflow editor where they can begin building their automation.

**Why this priority**: Creating new workflows is the primary action on the workspace page. Without this, users cannot start building automations — it is the core entry point for the entire product.

**Independent Test**: Can be fully tested by clicking "New workflow", verifying a workflow appears in the database, and confirming the user lands on the editor page for that workflow.

**Acceptance Scenarios**:

1. **Given** a user is on the workspace page, **When** they click "New workflow", **Then** a new workflow is created with status "draft" and a default name, and the user is redirected to `/workflows/[new-id]/edit`
2. **Given** a user creates a new workflow, **When** the workflow is created, **Then** it appears in the workspace table on next visit with the correct name, status, and creation date

---

### User Story 2 - Delete Workflow with Confirmation (Priority: P1)

A user selects a workflow's action menu and clicks "Delete". A confirmation dialog appears asking "Are you sure you want to delete this workflow? This action cannot be undone." If the user confirms, the workflow and all associated data (steps, triggers, runs) are removed. The workspace table updates to reflect the deletion.

**Why this priority**: Deleting unwanted items is essential for workspace hygiene. Without deletion, the workspace becomes cluttered with test and abandoned workflows, reducing usability.

**Independent Test**: Can be tested by creating a workflow, clicking Delete from the action menu, confirming in the dialog, and verifying the workflow no longer appears in the workspace.

**Acceptance Scenarios**:

1. **Given** a workflow exists in the workspace, **When** the user clicks "Delete" from the action menu, **Then** a confirmation dialog appears with a warning message
2. **Given** the delete confirmation dialog is open, **When** the user clicks "Cancel", **Then** the dialog closes and the workflow remains unchanged
3. **Given** the delete confirmation dialog is open, **When** the user clicks "Delete" to confirm, **Then** the workflow and all its associated steps, triggers, and runs are removed from the system
4. **Given** a workflow has been deleted, **When** the user views the workspace, **Then** the deleted workflow no longer appears in the table

---

### User Story 3 - Delete Agent with Confirmation (Priority: P1)

A user selects an agent's action menu and clicks "Delete". A confirmation dialog appears warning that deleting the agent will unassign all associated workflows (they become standalone). If the user confirms, the agent is deleted and its workflows remain as standalone items in the workspace.

**Why this priority**: Agents and workflows share the same workspace. Users need the ability to remove agents that are no longer needed, same as workflows.

**Independent Test**: Can be tested by creating an agent with assigned workflows, clicking Delete, confirming, and verifying the agent is removed while its workflows persist as standalone.

**Acceptance Scenarios**:

1. **Given** an agent with assigned workflows exists, **When** the user clicks "Delete" from the agent's action menu, **Then** a confirmation dialog appears warning that workflows will be unassigned
2. **Given** the delete confirmation is accepted, **When** the agent is deleted, **Then** the agent is removed and its formerly-assigned workflows appear as standalone workflows in the workspace

---

### User Story 4 - Duplicate Workflow (Priority: P2)

A user selects "Duplicate" from a workflow's action menu. The system creates an exact copy of the workflow including all steps and trigger configuration. The copy is named "[Original Name] (copy)" and has draft status. The user is redirected to the editor for the new copy.

**Why this priority**: Duplication accelerates workflow creation by allowing users to build on existing work. It is a significant productivity feature but not as fundamental as create/delete.

**Independent Test**: Can be tested by duplicating a multi-step workflow and verifying the copy has the same steps, trigger, and a modified name with "(copy)" suffix.

**Acceptance Scenarios**:

1. **Given** a workflow with steps and a trigger exists, **When** the user clicks "Duplicate", **Then** a new workflow is created with the name "[Original] (copy)", status "draft", and identical steps and trigger configuration
2. **Given** duplication succeeds, **When** the new workflow is created, **Then** the user is redirected to the editor for the duplicated workflow
3. **Given** a workflow named "My Workflow (copy)" already exists, **When** the user duplicates "My Workflow" again, **Then** the new copy is named "My Workflow (copy 2)"

---

### User Story 5 - Create Workflow from Template (Priority: P2)

A user clicks the dropdown on the "New workflow" button and selects "From template". A dialog appears showing 3-5 pre-defined templates (e.g., "Email Automation", "Data Sync", "Approval Flow"). Each template shows a brief description. Selecting a template creates a workflow pre-populated with relevant steps and trigger, then redirects to the editor.

**Why this priority**: Templates lower the barrier to entry for new users who may not know how to structure a workflow from scratch. Valuable for onboarding but not blocking for experienced users.

**Independent Test**: Can be tested by opening the template dialog, selecting a template, and verifying the created workflow contains the expected pre-populated steps and trigger.

**Acceptance Scenarios**:

1. **Given** a user is on the workspace page, **When** they click "From template" in the New workflow dropdown, **Then** a dialog appears showing available templates with names and descriptions
2. **Given** the template dialog is open, **When** the user selects a template, **Then** a new workflow is created with pre-populated steps and trigger matching the template, and the user is redirected to the editor
3. **Given** the template dialog is open, **When** the user clicks outside or presses Escape, **Then** the dialog closes without creating a workflow

---

### User Story 6 - Edit Agent Navigation (Priority: P2)

A user selects "Edit" from an agent's action menu. The system navigates to the agent detail page where the user can modify the agent's properties.

**Why this priority**: Essential for the agent management workflow but straightforward — it is a navigation action with no complex logic.

**Independent Test**: Can be tested by clicking "Edit" on an agent and verifying navigation to the correct agent detail page.

**Acceptance Scenarios**:

1. **Given** an agent exists in the workspace, **When** the user clicks "Edit" from the agent's action menu, **Then** the user is navigated to `/agents/[agent-id]`

---

### User Story 7 - Inline Rename Workflow (Priority: P3)

A user double-clicks on a workflow's name in the workspace table. The name becomes an editable text field. The user types a new name and presses Enter (or clicks away) to save. The rename is persisted immediately.

**Why this priority**: Convenient but not essential — users can rename workflows in the editor. This is a quality-of-life improvement.

**Independent Test**: Can be tested by double-clicking a workflow name, typing a new name, pressing Enter, and verifying the name is updated in the table and persisted.

**Acceptance Scenarios**:

1. **Given** a workflow appears in the workspace table, **When** the user double-clicks the workflow name, **Then** the name becomes an editable text input pre-filled with the current name
2. **Given** the name is being edited, **When** the user presses Enter or clicks outside, **Then** the new name is saved and displayed in the table
3. **Given** the name is being edited, **When** the user presses Escape, **Then** the edit is cancelled and the original name is restored
4. **Given** the user enters an empty name, **When** they try to save, **Then** the system prevents saving and shows a validation message

---

### User Story 8 - Bulk Delete and Status Change (Priority: P3)

A user selects multiple items using the checkboxes in the workspace table. A floating action bar appears above the table showing the count of selected items and available actions: "Delete selected" and "Change status". Clicking "Delete selected" shows a confirmation dialog for bulk deletion. Clicking "Change status" toggles between draft and published for all selected workflows.

**Why this priority**: Bulk actions are a power-user feature. They save time for users managing many items but are not required for basic workspace functionality.

**Independent Test**: Can be tested by selecting multiple workflows, clicking "Delete selected", confirming, and verifying all selected items are removed.

**Acceptance Scenarios**:

1. **Given** no rows are selected, **When** the user views the workspace, **Then** no action bar is visible
2. **Given** one or more rows are selected, **When** the selection changes, **Then** a floating action bar appears showing "[N] selected" and action buttons
3. **Given** multiple workflows are selected, **When** the user clicks "Delete selected", **Then** a confirmation dialog appears stating the number of items to be deleted
4. **Given** the bulk delete is confirmed, **When** deletion completes, **Then** all selected items are removed and the selection is cleared
5. **Given** multiple draft workflows are selected, **When** the user clicks "Change status", **Then** all selected workflows are toggled to published (and vice versa)

---

### User Story 9 - Additional Table Columns (Priority: P3)

The workspace table displays three additional columns: Published (showing the formatted date when a workflow was published), Steps (showing the count of steps in the workflow), and AI (showing a sparkle icon if the workflow contains AI-powered steps).

**Why this priority**: These columns provide useful at-a-glance information but do not enable any new actions. The data already exists — it just needs to be displayed.

**Independent Test**: Can be tested by verifying that workflows with known published dates, step counts, and AI steps display the correct values in each column.

**Acceptance Scenarios**:

1. **Given** a published workflow, **When** it appears in the workspace table, **Then** the "Published" column shows the formatted publication date
2. **Given** a draft workflow, **When** it appears in the workspace table, **Then** the "Published" column shows "--"
3. **Given** a workflow with 5 steps, **When** it appears in the table, **Then** the "Steps" column shows "5"
4. **Given** a workflow with AI-powered steps, **When** it appears in the table, **Then** the "AI" column shows a sparkle indicator
5. **Given** a workflow without AI steps, **When** it appears in the table, **Then** the "AI" column is empty

---

### Edge Cases

- What happens when a user tries to delete a workflow that is currently being executed (has an active run)? The system should prevent deletion and show a message indicating the workflow has an active run.
- What happens when two users try to delete the same workflow simultaneously? The second deletion attempt should fail gracefully with a "not found" message.
- What happens when a duplicate operation encounters a naming conflict with an existing "(copy)" workflow? The system appends an incrementing number: "(copy 2)", "(copy 3)", etc.
- What happens when a user tries to rename a workflow to a name that already exists in the team? The system allows duplicate names (names are not unique identifiers).
- What happens when a bulk action is performed on a mix of agents and workflows? "Change status" only applies to workflows; agents in the selection are skipped. "Delete selected" applies to both.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to create a new blank workflow with default values (draft status, auto-generated name) and redirect to the workflow editor
- **FR-002**: System MUST allow users to create workflows from pre-defined templates that include pre-populated steps and trigger configurations
- **FR-003**: System MUST allow users to duplicate an existing workflow, copying all steps and trigger configuration, with the name appended with "(copy)" and status set to draft
- **FR-004**: System MUST display a confirmation dialog before deleting a workflow, and upon confirmation, remove the workflow along with all associated steps, triggers, and runs
- **FR-005**: System MUST display a confirmation dialog before deleting an agent, and upon confirmation, remove the agent while preserving its previously-assigned workflows as standalone items
- **FR-006**: System MUST navigate to the agent detail page when users select "Edit" from an agent's action menu
- **FR-007**: System MUST allow users to rename workflows inline by double-clicking the workflow name in the table
- **FR-008**: System MUST display a floating action bar when one or more table rows are selected, offering "Delete selected" and "Change status" actions
- **FR-009**: System MUST support bulk deletion of selected items with a confirmation dialog
- **FR-010**: System MUST support bulk status toggling (draft/published) for selected workflows
- **FR-011**: System MUST display a "Published" column showing the formatted publication date for workflows (or "--" for drafts)
- **FR-012**: System MUST display a "Steps" column showing the count of steps in each workflow
- **FR-013**: System MUST display an "AI" column showing an indicator when a workflow contains AI-powered steps
- **FR-014**: System MUST refresh the workspace table data after any mutation (create, delete, duplicate, rename, status change)
- **FR-015**: System MUST prevent deletion of workflows that have an active (in-progress) run

### Key Entities

- **Workflow**: An automation sequence containing ordered steps and a trigger. Key attributes: name, emoji, status (draft/published), published date, step count, AI indicator. Belongs to a team, optionally assigned to an agent.
- **Agent**: A named entity that groups related workflows (skills). Key attributes: name, avatar, palette. Owns zero or more workflows.
- **Workflow Step**: An individual action within a workflow. Types include: app, ai, flow_control, web_scraping, human_in_loop, utility, http, sequence.
- **Workflow Run**: A record of a workflow execution. Has status, timestamps, and resource usage.
- **Template**: A pre-defined workflow blueprint with name, description, and pre-configured steps/trigger. Hardcoded set of 3-5 options.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create a new blank workflow and reach the editor in under 3 seconds
- **SC-002**: Users can create a workflow from a template and reach the editor in under 5 seconds
- **SC-003**: Users can duplicate a workflow (including all steps and trigger) and reach the editor for the copy in under 5 seconds
- **SC-004**: Users can delete a workflow (with confirmation) in under 3 seconds, with the workspace table updating immediately
- **SC-005**: Users can delete an agent (with confirmation) in under 3 seconds, with orphaned workflows becoming visible as standalone items
- **SC-006**: 100% of existing "Coming soon" stubs for CRUD actions are replaced with functional implementations
- **SC-007**: Users can rename a workflow inline with no more than 2 interactions (double-click + type + Enter)
- **SC-008**: Users can select 10+ items and perform a bulk delete in a single action, taking under 5 seconds total
- **SC-009**: All three new columns (Published, Steps, AI) display accurate data matching the underlying records
- **SC-010**: Zero data loss occurs during any CRUD operation — deletions are confirmed, duplications are complete, renames are atomic

## Assumptions

- Workflow names are not required to be unique within a team — duplicate names are allowed.
- The "New workflow" button currently navigates to `/workflows/new/edit` without creating a database record first. This will be changed to create the record server-side before redirecting.
- Template definitions (3-5 templates) will be hardcoded as configuration data, not stored in the database.
- Agents cannot be created from the workspace page — only deleted and edited. Agent creation happens elsewhere.
- The existing `revalidatePath('/workspace')` pattern will be used to refresh data after mutations.
- The workspace table already supports row selection via checkboxes — the bulk action bar is the missing piece.
- Published date, step count, and AI indicator data are already fetched by the existing `fetchWorkspaceItems` query — only the column rendering is missing.
