# Data Model: Workspace Folder System

**Feature**: 011-workspace-folders
**Date**: 2026-02-10

## Existing Tables (No Migration Required)

The database schema already includes the `folders` table and the `workflows.folder_id` foreign key. No DDL changes are needed.

### `folders` Table

| Column       | Type          | Nullable | Default             | Description                                       |
| ------------ | ------------- | -------- | ------------------- | ------------------------------------------------- |
| `id`         | `uuid`        | NO       | `gen_random_uuid()` | Primary key                                       |
| `team_id`    | `uuid`        | NO       |                     | Foreign key to `teams.id`                         |
| `name`       | `text`        | NO       |                     | Folder display name (max 100 chars, app-enforced) |
| `parent_id`  | `uuid`        | YES      | `null`              | Self-referencing FK to `folders.id` for nesting   |
| `created_at` | `timestamptz` | NO       | `now()`             | Row creation timestamp                            |
| `updated_at` | `timestamptz` | NO       | `now()`             | Last update timestamp                             |

**Relationships**:

- `folders.team_id` -> `teams.id` (many-to-one)
- `folders.parent_id` -> `folders.id` (self-referencing, many-to-one)
- `workflows.folder_id` -> `folders.id` (many-to-one)

**RLS**: Row Level Security is enabled. Users can only access folders belonging to teams they are members of.

**Indexes**: Primary key on `id`. Foreign key indexes on `team_id` and `parent_id`.

### `workflows` Table (Relevant Columns)

| Column      | Type   | Nullable | Description                            |
| ----------- | ------ | -------- | -------------------------------------- |
| `folder_id` | `uuid` | YES      | FK to `folders.id`. Null = root level. |

**Foreign key**: `workflows_folder_id_fkey` references `folders.id`.

## TypeScript Types (from `database.types.ts`)

### Folder Row Type

```typescript
{
  id: string
  team_id: string
  name: string
  parent_id: string | null
  created_at: string
  updated_at: string
}
```

### Folder Insert Type

```typescript
{
  id?: string          // auto-generated
  team_id: string      // required
  name: string         // required
  parent_id?: string | null  // optional, default null
  created_at?: string  // auto-generated
  updated_at?: string  // auto-generated
}
```

### Folder Update Type

```typescript
{
  id?: string
  team_id?: string
  name?: string
  parent_id?: string | null
  created_at?: string
  updated_at?: string
}
```

## Application-Level Types

### WorkspaceFolder (new type in `src/lib/queries/workspace.ts`)

```typescript
export interface WorkspaceFolder {
  type: 'folder'
  id: string
  name: string
  parent_id: string | null
  workflow_count: number // computed: count of workflows in this folder
  subfolder_count: number // computed: count of direct child folders
  created_at: string
  updated_at: string
}
```

This type extends the `WorkspaceItem` union:

```typescript
export type WorkspaceItem = WorkspaceAgent | WorkspaceWorkflow | WorkspaceFolder
```

### FolderTreeNode (for tree picker)

```typescript
export interface FolderTreeNode {
  id: string
  name: string
  parent_id: string | null
  depth: number
  children: FolderTreeNode[]
}
```

## Entity Relationships Diagram

```
teams (1) ──── (*) folders
                    │
                    ├── parent_id ──── folders (self-ref, 0..1)
                    │
                    └── (1) ──── (*) workflows (via folder_id)
```

## Query Patterns

### Fetch All Folders for a Team

```sql
SELECT id, name, parent_id, created_at, updated_at
FROM folders
WHERE team_id = $1
ORDER BY name ASC;
```

### Count Workflows per Folder

```sql
SELECT folder_id, COUNT(*) as count
FROM workflows
WHERE team_id = $1 AND folder_id IS NOT NULL
GROUP BY folder_id;
```

### Compute Folder Depth (for nesting validation)

Walk the `parent_id` chain from the target folder to root. Maximum 3 iterations.

```
depth(folder) = 1 + depth(parent)    if parent_id IS NOT NULL
depth(folder) = 1                    if parent_id IS NULL
```

## Constraints

- **Max folder depth**: 3 levels (enforced at application level)
- **Folder name**: Non-empty, max 100 characters (enforced via Zod schema)
- **No circular references**: A folder cannot be its own ancestor (enforced at application level during move/nest operations)
- **Cascade behavior**: Folder deletion requires explicit handling - either move contents to root or delete all contents. No automatic cascade at the DB level.
