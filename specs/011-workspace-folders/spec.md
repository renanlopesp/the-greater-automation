# Feature Specification: Workspace Folder System

**Feature Branch**: `011-workspace-folders`
**Created**: 2026-02-10
**Status**: Draft
**Input**: User description: "Implement the complete folder system on the /workspace page, including create, move, rename, delete, nested hierarchy, and folder view mode."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create Folder (Priority: P1)

As a team member, I want to create folders in my workspace so that I can organize my workflows into logical groups.

Clicking the "New folder" button in the workspace header opens a Dialog with a name input. On submit, a server action inserts a row into the `folders` table. The new folder appears as a row in the workspace table with a FolderOpen icon and an expand/collapse chevron (similar to agents).

**Why this priority**: Folders cannot be used for anything (move, rename, delete, view) until they can be created. This is the foundational operation that enables all other user stories.

**Independent Test**: Can be fully tested by clicking "New folder", entering a name, submitting, and verifying the folder row appears in the workspace table. Delivers organizational structure.

**Acceptance Scenarios**:

1. **Given** the workspace page is loaded, **When** the user clicks "New folder" in the header, **Then** a Dialog opens with a text input for the folder name and "Cancel"/"Create" buttons.
2. **Given** the create folder Dialog is open, **When** the user enters a valid name and clicks "Create", **Then** the dialog closes, the folder is created in the database, and the workspace table shows the new folder row with a FolderOpen icon.
3. **Given** the create folder Dialog is open, **When** the user enters an empty name and clicks "Create", **Then** a validation error message appears and the folder is not created.
4. **Given** the create folder Dialog is open, **When** the user clicks "Cancel" or presses Escape, **Then** the dialog closes without creating a folder.
5. **Given** the user creates a folder, **When** the table re-renders, **Then** the folder row displays with a FolderOpen icon, the folder name, a type badge "folder", and an expand/collapse chevron.

---

### User Story 2 - Move to Folder (Priority: P1)

As a team member, I want to move workflows into folders so that I can keep my workspace organized.

A "Move to folder" option exists in each workflow's row action menu (already stubbed as a DropdownMenuItem). Clicking it opens a Dialog with a tree picker showing all team folders. Selecting a folder and confirming updates `workflows.folder_id`. Bulk move is supported: when multiple rows are selected, a "Move to folder" bulk action button appears.

**Why this priority**: Moving items into folders is the core value proposition of the folder system. Without this, creating folders has no utility.

**Independent Test**: Can be fully tested by creating a folder (US1), then using "Move to folder" on a workflow, selecting the target folder, and verifying the workflow's `folder_id` is updated. Also test bulk selection and bulk move.

**Acceptance Scenarios**:

1. **Given** a workflow row in the workspace table, **When** the user opens the row action menu and clicks "Move to folder", **Then** a Dialog opens with a tree picker listing all team folders (including a "Root (no folder)" option).
2. **Given** the move-to-folder Dialog is open, **When** the user selects a folder and clicks "Move", **Then** the dialog closes, the workflow's `folder_id` is updated, and the table re-renders to reflect the change.
3. **Given** multiple rows are selected via checkboxes, **When** a bulk "Move to folder" button appears and is clicked, **Then** the same tree picker Dialog opens and all selected workflows are moved to the chosen folder.
4. **Given** a workflow is already inside a folder, **When** the user moves it to "Root (no folder)", **Then** the workflow's `folder_id` is set to null and it appears at root level.
5. **Given** the move-to-folder Dialog is open, **When** the user clicks "Cancel", **Then** no changes are made.

---

### User Story 3 - Folder View Mode (Priority: P2)

As a team member, I want a folder-organized view of my workspace so that I can navigate through my folder hierarchy and see items grouped by folder.

When the "Folder" view is active in the ViewToggle (already the default), items are grouped: folders appear first (expandable), followed by standalone workflows (those with no folder). Clicking a folder row navigates into the folder, showing its contents with a breadcrumb trail for navigation. The breadcrumb uses the existing shadcn Breadcrumb component.

**Why this priority**: This is the visual payoff of the folder system. While folders can be created and items moved (P1 stories), this story makes the organization visible and navigable.

**Independent Test**: Can be tested by creating folders, moving workflows into them, switching to folder view, and verifying the grouped rendering, folder navigation, and breadcrumb trail all work correctly.

**Acceptance Scenarios**:

1. **Given** the workspace is in "Folder" view mode, **When** folders and workflows exist, **Then** folders are rendered at the top of the table with FolderOpen icons, followed by standalone workflows.
2. **Given** the workspace is in "Folder" view mode, **When** the user clicks on a folder row, **Then** the view navigates "into" the folder, showing only its contents (child workflows and subfolders).
3. **Given** the user has navigated into a folder, **When** a Breadcrumb trail is displayed (e.g., "Workspace > Marketing > Campaigns"), **Then** clicking any breadcrumb segment navigates to that level.
4. **Given** the workspace is in "List" view mode, **When** the user views the table, **Then** all items are shown flat without folder grouping (existing behavior unchanged).
5. **Given** a folder contains no items, **When** the user navigates into it, **Then** an empty state message is displayed (e.g., "This folder is empty").

---

### User Story 4 - Delete Folder (Priority: P2)

As a team member, I want to delete folders I no longer need, with clear options for handling the folder's contents.

Clicking "Delete" in a folder's row action menu opens an AlertDialog with two options: "Move contents to root" (sets `folder_id = null` on all child workflows, deletes the folder) or "Delete folder and all contents" (deletes the folder and all its workflows). The AlertDialog clearly communicates the consequences of each option.

**Why this priority**: Deletion is essential for managing folder lifecycle, but is less frequently used than creation and moving. Ranked P2 because it requires the AlertDialog component and careful UX for destructive actions.

**Independent Test**: Can be tested by creating a folder with workflows, then deleting it with each option and verifying the correct outcome (workflows moved to root, or workflows deleted).

**Acceptance Scenarios**:

1. **Given** a folder row in the workspace table, **When** the user opens the action menu and clicks "Delete", **Then** an AlertDialog appears with the folder name and two action buttons: "Move contents to root" and "Delete all".
2. **Given** the delete folder AlertDialog is open, **When** the user clicks "Move contents to root", **Then** all child workflows have their `folder_id` set to null, the folder is deleted, and the table re-renders.
3. **Given** the delete folder AlertDialog is open, **When** the user clicks "Delete all", **Then** all child workflows are deleted, the folder is deleted, and the table re-renders.
4. **Given** an empty folder, **When** the user deletes it, **Then** the folder is deleted without showing the two-option dialog (since there are no contents to handle).
5. **Given** the delete AlertDialog is open, **When** the user clicks "Cancel", **Then** no changes are made.

---

### User Story 5 - Rename Folder (Priority: P3)

As a team member, I want to rename folders to keep my organizational structure up to date.

Double-clicking a folder name in the table switches it to an inline text input. Pressing Enter or clicking away saves the new name via a server action. Pressing Escape reverts to the original name.

**Why this priority**: Renaming is a convenience feature. Folders can be deleted and recreated with new names as a workaround, so inline rename is a polish item.

**Independent Test**: Can be tested by double-clicking a folder name, typing a new name, pressing Enter, and verifying the folder name is updated in the database and table.

**Acceptance Scenarios**:

1. **Given** a folder row in the workspace table, **When** the user double-clicks the folder name, **Then** the name text becomes an inline text input with the current name pre-filled and selected.
2. **Given** the folder name is in edit mode, **When** the user types a new name and presses Enter, **Then** the server action updates the folder name and the input reverts to static text showing the new name.
3. **Given** the folder name is in edit mode, **When** the user presses Escape, **Then** the input reverts to static text with the original name and no server action is called.
4. **Given** the folder name is in edit mode, **When** the user clicks outside the input (blur), **Then** the new name is saved (same as pressing Enter).
5. **Given** the folder name is in edit mode, **When** the user clears the input and presses Enter, **Then** a validation error prevents the save and the original name is restored.

---

### User Story 6 - Nested Folders (Priority: P3)

As a team member, I want to create folders inside other folders so that I can build a deeper organizational hierarchy.

The create folder Dialog gains an optional "Parent folder" selector. When creating a folder inside another folder (via the breadcrumb-navigated view or explicit parent selection), the `parent_id` is set. Nested folders render with visual indentation. A maximum depth of 3 levels is enforced.

**Why this priority**: Most users will start with a flat folder structure. Nesting is a power-user feature that can be added after the core folder system is stable.

**Independent Test**: Can be tested by creating a folder, navigating into it, creating a subfolder, verifying the `parent_id` is set, and confirming the 3-level depth limit.

**Acceptance Scenarios**:

1. **Given** the user is inside a folder (via breadcrumb navigation), **When** they click "New folder", **Then** the created folder has `parent_id` set to the current folder's ID.
2. **Given** the create folder Dialog, **When** a "Parent folder" dropdown is visible, **Then** the user can select a parent folder or "None (root level)".
3. **Given** a folder hierarchy of 3 levels deep (e.g., A > B > C), **When** the user tries to create a folder inside C, **Then** the system prevents it with a message "Maximum folder depth reached (3 levels)".
4. **Given** nested folders exist, **When** the workspace renders in folder view, **Then** subfolders are visually indented under their parent folder.
5. **Given** nested folders exist, **When** the breadcrumb trail is displayed, **Then** it shows the full path (e.g., "Workspace > A > B > C") and each segment is clickable.

---

### Edge Cases

- What happens when a folder name contains special characters (e.g., slashes, quotes, emoji)? The system should accept any valid UTF-8 string.
- What happens when two folders have the same name at the same level? The system should allow it (no unique constraint on name within a parent).
- What happens when the user tries to move a folder into itself or its own descendant? The server action must detect circular references and reject the operation.
- What happens when a folder is deleted while another user is viewing its contents? The view should gracefully fall back to the root level with a toast notification.
- What happens when the user moves a workflow that is part of a bulk selection but was already moved by a concurrent operation? The server action should handle partial failures gracefully.
- What happens when the folder tree is deeply nested and the tree picker Dialog needs to display many levels? The tree picker should support scrolling and collapse/expand for each level.
- What happens when the user rapidly double-clicks to rename and the server action is slow? Optimistic UI should show the new name immediately, reverting on failure.
- What happens when a folder has both subfolders and workflows? Both should be displayed, with subfolders listed first.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to create folders within a team workspace via a Dialog with name validation.
- **FR-002**: System MUST render folders as rows in the workspace table with a FolderOpen icon and expand/collapse capability.
- **FR-003**: System MUST allow users to move one or more workflows into a folder via a tree picker Dialog.
- **FR-004**: System MUST allow users to move workflows back to root level (set `folder_id` to null).
- **FR-005**: System MUST support bulk move operations when multiple rows are selected.
- **FR-006**: System MUST display items grouped by folder when the "Folder" view mode is active, with folders rendered first.
- **FR-007**: System MUST provide breadcrumb navigation when the user navigates into a folder.
- **FR-008**: System MUST allow users to delete a folder with two options: "Move contents to root" or "Delete folder and all contents".
- **FR-009**: System MUST allow users to rename a folder via inline editing (double-click).
- **FR-010**: System MUST support nested folders via `parent_id` with a maximum depth of 3 levels.
- **FR-011**: System MUST validate folder names (non-empty, max 100 characters) using Zod schemas.
- **FR-012**: System MUST use server actions for all folder CRUD operations, following existing patterns in `src/lib/actions/`.
- **FR-013**: System MUST use `revalidatePath` to refresh the workspace page after mutations.
- **FR-014**: System MUST prevent circular parent references when moving or nesting folders.

### Key Entities _(include if feature involves data)_

- **Folder**: Organizational container for workflows. Has `id`, `team_id`, `name`, `parent_id` (nullable, for nesting), `created_at`, `updated_at`. Belongs to a team. Can contain workflows and child folders.
- **Workflow**: Existing entity that gains folder association via nullable `folder_id` foreign key. A workflow belongs to zero or one folder.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create a folder, move a workflow into it, and see the grouped view in under 30 seconds on first use.
- **SC-002**: All server actions complete within 500ms for teams with up to 100 folders and 500 workflows.
- **SC-003**: The folder tree picker renders correctly for hierarchies up to 3 levels deep with up to 50 folders.
- **SC-004**: `bun run build` passes with zero errors after all folder system code is implemented.
- **SC-005**: `bun run lint` passes with zero warnings after all folder system code is implemented.
- **SC-006**: All 6 user stories are independently testable and functional when implemented in isolation (with their dependencies).
- **SC-007**: Breadcrumb navigation correctly reflects the current folder path and each segment is clickable.
- **SC-008**: Bulk move operations handle 20+ selected items without UI lag or timeout.
