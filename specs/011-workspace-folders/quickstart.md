# Quickstart: Workspace Folder System

**Feature**: 011-workspace-folders
**Date**: 2026-02-10

## Prerequisites

- `bun run build` passes on current `main` branch
- `bun run lint` passes with zero warnings
- Supabase project is running with `folders` table and `workflows.folder_id` column in place
- shadcn/ui `dialog`, `breadcrumb`, `input`, `button` components already installed

## Implementation Order

### Step 1: Install AlertDialog Component

```bash
npx shadcn@latest add alert-dialog
```

Verify: `src/components/ui/alert-dialog.tsx` exists.

### Step 2: Add Zod Schemas

Create `src/lib/schemas/workspace.ts` with:

- `createFolderSchema`
- `renameFolderSchema`
- `deleteFolderSchema`
- `moveToFolderSchema`

See [contracts/server-actions.md](./contracts/server-actions.md) for exact schema definitions.

### Step 3: Add Server Actions

Create `src/lib/actions/workspace.ts` with:

- `createFolder(formData: FormData)`
- `renameFolder(formData: FormData)`
- `deleteFolder(formData: FormData)`
- `moveToFolder(formData: FormData)`

All actions follow the pattern from `src/lib/actions/settings.ts`.

### Step 4: Add Query Function

Modify `src/lib/queries/workspace.ts`:

- Add `WorkspaceFolder` interface
- Add `FolderTreeNode` interface
- Add `fetchFolders(supabase, teamId)` function
- Add `buildFolderTree(folders)` utility function
- Update `WorkspaceItem` union to include `WorkspaceFolder`

### Step 5: Create Folder Dialog

Create `src/components/workspace/create-folder-dialog.tsx`:

- Dialog with name Input and Create/Cancel buttons
- Calls `createFolder` server action on submit
- Opened from the "New folder" button in `workspace-header.tsx`

### Step 6: Wire Workspace Page

Modify `src/app/(dashboard)/workspace/page.tsx`:

- Call `fetchFolders(supabase, teamId)` alongside existing fetch
- Pass `folders` to `WorkspaceClient`

### Step 7: Folder Table Rendering

Modify `src/components/workspace/columns.tsx`:

- Add folder row rendering (FolderOpen icon, name, type badge "folder")
- Add folder-specific action menu items (Rename, Delete)

Modify `src/components/workspace/workspace-client.tsx`:

- Add `currentFolderId` state via nuqs
- Implement folder view grouping in `flatData` computation
- Add folders to the workspace data flow

### Step 8: Move-to-Folder Dialog

Create `src/components/workspace/folder-tree-picker.tsx`:

- Recursive tree rendering component
- Radio selection for target folder

Create `src/components/workspace/move-to-folder-dialog.tsx`:

- Dialog wrapping tree picker
- Calls `moveToFolder` server action

Wire into `columns.tsx` dropdown menu "Move to folder" item.

### Step 9: Delete Folder Dialog

Create `src/components/workspace/delete-folder-dialog.tsx`:

- AlertDialog with two action buttons
- Calls `deleteFolder` server action with appropriate mode

### Step 10: Breadcrumb Navigation

Create `src/components/workspace/folder-breadcrumb.tsx`:

- Uses shadcn Breadcrumb component
- Computes path from current folder to root
- Each segment navigates to that folder level

Wire into `workspace-client.tsx`, rendered when `currentFolderId` is not null.

### Step 11: Inline Rename

Create `src/components/workspace/inline-folder-name.tsx`:

- Controlled input that appears on double-click
- Saves on Enter/blur, cancels on Escape
- Calls `renameFolder` server action

Wire into `columns.tsx` folder name cell.

### Step 12: Nested Folders

Update `create-folder-dialog.tsx`:

- Add optional parent folder selector
- Pass `parentId` when creating from within a folder view

Update `createFolder` server action:

- Add depth validation (max 3 levels)

### Step 13: Verification

```bash
bun run build   # must pass with zero errors
bun run lint    # must pass with zero warnings
```

Manual smoke test:

1. Create a folder
2. Move a workflow into the folder
3. Switch to folder view and verify grouping
4. Navigate into folder via click, verify breadcrumb
5. Rename the folder via double-click
6. Delete the folder (both modes)
7. Create nested folders (verify 3-level limit)
8. Bulk select and move multiple workflows

## Key Files Reference

| File                                                 | Action        |
| ---------------------------------------------------- | ------------- |
| `src/components/ui/alert-dialog.tsx`                 | ADD (install) |
| `src/lib/schemas/workspace.ts`                       | ADD           |
| `src/lib/actions/workspace.ts`                       | ADD           |
| `src/lib/queries/workspace.ts`                       | MODIFY        |
| `src/app/(dashboard)/workspace/page.tsx`             | MODIFY        |
| `src/components/workspace/workspace-client.tsx`      | MODIFY        |
| `src/components/workspace/workspace-header.tsx`      | MODIFY        |
| `src/components/workspace/columns.tsx`               | MODIFY        |
| `src/components/workspace/create-folder-dialog.tsx`  | ADD           |
| `src/components/workspace/move-to-folder-dialog.tsx` | ADD           |
| `src/components/workspace/delete-folder-dialog.tsx`  | ADD           |
| `src/components/workspace/folder-tree-picker.tsx`    | ADD           |
| `src/components/workspace/folder-breadcrumb.tsx`     | ADD           |
| `src/components/workspace/inline-folder-name.tsx`    | ADD           |
