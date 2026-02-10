# Research: Workspace Folder System

**Feature**: 011-workspace-folders
**Date**: 2026-02-10

## R-001: Server Actions for Folder CRUD

**Decision**: Follow the existing server action patterns in `src/lib/actions/auth.ts` and `src/lib/actions/settings.ts`.

**Pattern**:

- File marked with `'use server'` at top
- Each action is an exported async function
- Returns a typed result object: `{ error?: string; success?: boolean }`
- Uses `createServerClient()` from `@/lib/supabase/server` for DB access
- Validates input with Zod schemas (via `.safeParse()`)
- Authenticates the user via `supabase.auth.getUser()`
- Calls `revalidatePath('/workspace')` after successful mutations

**Actions to implement**:

- `createFolder(formData: FormData)` - inserts into `folders` table
- `renameFolder(formData: FormData)` - updates `folders.name`
- `deleteFolder(formData: FormData)` - deletes folder with mode option
- `moveToFolder(formData: FormData)` - updates `workflows.folder_id`

**Alternative considered**: Using plain object parameters instead of FormData. Rejected because the existing codebase consistently uses FormData for server actions, enabling progressive enhancement.

**Update (design refinement)**: For actions that require structured data (e.g., arrays of IDs for bulk move, enum for delete mode), we will use JSON-serialized FormData fields rather than multiple form fields. This keeps the FormData pattern while supporting complex inputs. Example: `formData.get('itemIds')` returns a JSON string that is parsed and validated with Zod.

---

## R-002: Tree Picker Component for Move-to-Folder Dialog

**Decision**: Build a custom recursive tree component inside a shadcn Dialog.

**Design**:

- The tree picker receives a flat array of folders and builds the tree in-memory
- Each tree node shows: indent + FolderOpen icon + folder name + radio selection
- "Root (no folder)" option at the top for moving items out of folders
- Nodes are collapsible to manage deep hierarchies
- Selected folder is highlighted with a visual indicator

**Component**: `src/components/workspace/folder-tree-picker.tsx`

**Data flow**: The parent Dialog fetches folders and passes them as props. The tree picker is a controlled component that calls `onSelect(folderId: string | null)` when a folder is selected.

**Alternative considered**: Using a shadcn Select/Combobox with indented option text. Rejected because a visual tree better communicates hierarchy and is more intuitive for folder selection.

---

## R-003: Folder View Rendering (Grouped Table Rows)

**Decision**: Extend the existing `flatData` computation in `workspace-client.tsx` to support folder grouping.

**Design**:

- Add a `currentFolderId` state (nullable string) to `WorkspaceClient`
- When `activeView === 'folder'`:
  - If `currentFolderId` is null (root): show root-level folders first, then workflows with `folder_id === null`
  - If `currentFolderId` is set: show subfolders and workflows where `folder_id === currentFolderId`
- Clicking a folder row sets `currentFolderId` to that folder's ID
- Breadcrumb reflects the current path using `folder-breadcrumb.tsx`
- When `activeView === 'list'`: existing flat behavior unchanged

**State management**: `currentFolderId` is stored as URL search param via `nuqs` (e.g., `?folder=abc`) so folder navigation is shareable and works with browser back/forward.

**Alternative considered**: Rendering folders as expandable rows (like agents) without navigation. Rejected because breadcrumb navigation provides a cleaner UX for deeper hierarchies and matches common file manager patterns.

---

## R-004: Nested Folder Recursion Limits

**Decision**: Enforce a maximum depth of 3 levels.

**Rationale**: 3 levels (e.g., "Marketing > Campaigns > Q1 2026") covers the vast majority of organizational needs without introducing performance or UX complexity.

**Enforcement**:

- **Client-side**: The create folder Dialog checks the depth of the current folder path. If at depth 3, the "New folder" button is disabled or hidden with a tooltip.
- **Server-side**: The `createFolder` server action validates that the parent folder's depth is less than 3 by recursively querying `parent_id` up the chain. Maximum 3 queries (one per level).

**Depth calculation**: A root folder has depth 1. A child of a root folder has depth 2. A grandchild has depth 3. No folder at depth 4 is permitted.

**Alternative considered**: No depth limit. Rejected because deeply nested folders create performance issues (recursive queries) and poor UX (long breadcrumb trails, deep tree pickers).

---

## R-005: Breadcrumb Navigation Pattern

**Decision**: Use the existing shadcn `Breadcrumb` component from `src/components/ui/breadcrumb.tsx`.

**Design**:

- The breadcrumb shows the full path from root to the current folder
- Format: `Workspace > Folder A > Subfolder B`
- "Workspace" is always the first item and navigates to root (`currentFolderId = null`)
- Each intermediate segment navigates to that folder's ID
- The last segment (current folder) is not a link

**Data**: The breadcrumb path is computed from the folders list by walking `parent_id` references from the current folder back to root. This is a client-side computation since all folders are already fetched.

**Component**: `src/components/workspace/folder-breadcrumb.tsx`

**Placement**: Rendered between the filters row and the table, only when `currentFolderId` is not null.

**Alternative considered**: Storing the breadcrumb path in URL params. Rejected because it can be computed from `currentFolderId` and the folders list, avoiding URL bloat.
