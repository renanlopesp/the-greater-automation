# Server Action Contracts: Workspace Folder System

**Feature**: 011-workspace-folders
**Date**: 2026-02-10
**File**: `src/lib/actions/workspace.ts`

All server actions follow the existing pattern from `src/lib/actions/auth.ts` and `src/lib/actions/settings.ts`:

- Marked with `'use server'` directive
- Accept `FormData` parameter
- Validate with Zod via `.safeParse()`
- Authenticate via `supabase.auth.getUser()`
- Return `WorkspaceActionResult` type
- Call `revalidatePath('/workspace')` on success

## Common Types

```typescript
export type WorkspaceActionResult = { error?: string; success?: boolean }
```

## Zod Schemas (in `src/lib/schemas/workspace.ts`)

```typescript
import { z } from 'zod'

export const folderNameSchema = z.object({
  name: z
    .string()
    .min(1, 'Folder name is required')
    .max(100, 'Folder name must be 100 characters or less'),
})

export const createFolderSchema = z.object({
  teamId: z.string().uuid(),
  name: z
    .string()
    .min(1, 'Folder name is required')
    .max(100, 'Folder name must be 100 characters or less'),
  parentId: z.string().uuid().nullable().optional(),
})

export const renameFolderSchema = z.object({
  folderId: z.string().uuid(),
  name: z
    .string()
    .min(1, 'Folder name is required')
    .max(100, 'Folder name must be 100 characters or less'),
})

export const deleteFolderSchema = z.object({
  folderId: z.string().uuid(),
  mode: z.enum(['move-to-root', 'delete-all']),
})

export const moveToFolderSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1, 'At least one item must be selected'),
  folderId: z.string().uuid().nullable(),
})
```

---

## createFolder

**Purpose**: Create a new folder in the team workspace.

**FormData fields**:
| Field | Type | Required | Description |
|-----------|----------|----------|------------------------------------------|
| `teamId` | `string` | Yes | UUID of the team |
| `name` | `string` | Yes | Folder name (1-100 chars) |
| `parentId`| `string` | No | UUID of parent folder (null for root) |

**Validation**:

- Parse with `createFolderSchema`
- If `parentId` is provided, verify depth does not exceed 3 levels

**Logic**:

1. Authenticate user
2. Validate input
3. If `parentId` provided, compute depth of parent folder (walk `parent_id` chain). If parent is at depth 3, return error.
4. Insert into `folders` table: `{ team_id, name, parent_id }`
5. `revalidatePath('/workspace')`
6. Return `{ success: true }`

**Error cases**:

- Empty or too-long name: `"Folder name is required"` / `"Folder name must be 100 characters or less"`
- Max depth exceeded: `"Maximum folder depth reached (3 levels)"`
- Not authenticated: `"Not authenticated"`
- DB error: `"Failed to create folder"`

---

## renameFolder

**Purpose**: Rename an existing folder.

**FormData fields**:
| Field | Type | Required | Description |
|-----------|----------|----------|---------------------------------|
| `folderId`| `string` | Yes | UUID of the folder to rename |
| `name` | `string` | Yes | New folder name (1-100 chars) |

**Validation**:

- Parse with `renameFolderSchema`

**Logic**:

1. Authenticate user
2. Validate input
3. Update `folders` table: `SET name = $name WHERE id = $folderId`
4. `revalidatePath('/workspace')`
5. Return `{ success: true }`

**Error cases**:

- Empty or too-long name: Zod validation error
- Folder not found: `"Folder not found"`
- Not authenticated: `"Not authenticated"`
- DB error: `"Failed to rename folder"`

---

## deleteFolder

**Purpose**: Delete a folder with explicit handling of its contents.

**FormData fields**:
| Field | Type | Required | Description |
|-----------|----------|----------|------------------------------------------------------|
| `folderId`| `string` | Yes | UUID of the folder to delete |
| `mode` | `string` | Yes | `"move-to-root"` or `"delete-all"` |

**Validation**:

- Parse with `deleteFolderSchema`

**Logic (mode: "move-to-root")**:

1. Authenticate user
2. Validate input
3. Update all workflows where `folder_id = $folderId`: SET `folder_id = null`
4. Update all child folders where `parent_id = $folderId`: SET `parent_id = null` (move subfolders to root)
5. Delete the folder from `folders` table
6. `revalidatePath('/workspace')`
7. Return `{ success: true }`

**Logic (mode: "delete-all")**:

1. Authenticate user
2. Validate input
3. Recursively collect all descendant folder IDs (walk `parent_id` chain downward)
4. Delete all workflows where `folder_id` IN (folder + descendant IDs)
5. Delete all descendant folders (deepest first to respect FK constraints)
6. Delete the target folder
7. `revalidatePath('/workspace')`
8. Return `{ success: true }`

**Error cases**:

- Invalid mode: Zod validation error
- Folder not found: `"Folder not found"`
- Not authenticated: `"Not authenticated"`
- DB error: `"Failed to delete folder"`

---

## moveToFolder

**Purpose**: Move one or more workflows into a folder (or back to root).

**FormData fields**:
| Field | Type | Required | Description |
|-----------|----------|----------|----------------------------------------------------------|
| `itemIds` | `string` | Yes | JSON-encoded array of workflow UUIDs |
| `folderId`| `string` | No | UUID of target folder, or `"null"` string for root level |

**Validation**:

- Parse `itemIds` as JSON, then validate with `moveToFolderSchema`
- `folderId` of `null` or `"null"` means move to root (set `folder_id = null`)

**Logic**:

1. Authenticate user
2. Validate input
3. If `folderId` is not null, verify the target folder exists
4. Update all workflows where `id` IN `$itemIds`: SET `folder_id = $folderId`
5. `revalidatePath('/workspace')`
6. Return `{ success: true }`

**Error cases**:

- Empty item list: `"At least one item must be selected"`
- Target folder not found: `"Target folder not found"`
- Not authenticated: `"Not authenticated"`
- DB error: `"Failed to move items"`

---

## fetchFolders (Query Function, not a server action)

**Purpose**: Fetch all folders for a team. Used by the workspace page server component.

**File**: `src/lib/queries/workspace.ts`

**Signature**:

```typescript
export async function fetchFolders(supabase: Client, teamId: string): Promise<WorkspaceFolder[]>
```

**Logic**:

1. Query `folders` table: `SELECT id, name, parent_id, created_at, updated_at WHERE team_id = $teamId ORDER BY name ASC`
2. Query workflow counts: `SELECT folder_id, COUNT(*) FROM workflows WHERE team_id = $teamId AND folder_id IS NOT NULL GROUP BY folder_id`
3. Query subfolder counts: `SELECT parent_id, COUNT(*) FROM folders WHERE team_id = $teamId AND parent_id IS NOT NULL GROUP BY parent_id`
4. Merge counts into folder objects
5. Return array of `WorkspaceFolder` items

**Return type**: `WorkspaceFolder[]` (see data-model.md)

---

## buildFolderTree (Utility Function)

**Purpose**: Build a tree structure from a flat array of folders for the tree picker.

**File**: `src/lib/queries/workspace.ts`

**Signature**:

```typescript
export function buildFolderTree(folders: WorkspaceFolder[]): FolderTreeNode[]
```

**Logic**:

1. Create a map of `id -> FolderTreeNode`
2. For each folder, if `parent_id` is null, add to root nodes. Otherwise, add as child of parent.
3. Compute depth for each node (root = 1, child = parent.depth + 1)
4. Return root-level nodes (each with `children` arrays populated)

This is a pure function (no async, no DB access) used by the tree picker component.
