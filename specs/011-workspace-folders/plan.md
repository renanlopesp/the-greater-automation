# Implementation Plan: Workspace Folder System

**Branch**: `011-workspace-folders` | **Date**: 2026-02-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-workspace-folders/spec.md`

## Summary

Implement a complete folder system for the /workspace page, enabling users to create folders, move workflows into them, navigate a folder hierarchy with breadcrumbs, rename and delete folders, and support up to 3 levels of nesting. The `folders` table and `workflows.folder_id` column already exist in the database. Implementation requires server actions for CRUD operations, query functions for fetching folder trees, UI components for the create/move/delete dialogs, inline rename editing, folder-grouped table rendering, and breadcrumb navigation.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19.2.3, shadcn/ui (new-york), @tanstack/react-table, Zod, nuqs
**Storage**: Supabase PostgreSQL (tables: `folders`, `workflows`)
**Testing**: Vitest + @testing-library/react (unit), Playwright (e2e)
**Target Platform**: Web (modern browsers)
**Project Type**: Single Next.js application
**Performance Goals**: Server actions < 500ms, tree picker renders < 100ms for 50 folders
**Constraints**: Max 3 levels of folder nesting, all mutations via server actions
**Scale/Scope**: Teams with up to 100 folders and 500 workflows

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                            | Status | Notes                                                                                                                                                              |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Next.js App Router First          | PASS   | Server actions for mutations. Data fetched in server components. `revalidatePath` for cache invalidation.                                                          |
| II. shadcn/ui Component System       | PASS   | Dialog (create folder, move to folder), AlertDialog (delete folder), Breadcrumb (navigation), Input, Button all from shadcn/ui. AlertDialog needs to be installed. |
| III. Tailwind CSS v4 + OKLCH Theming | PASS   | All styling via Tailwind utility classes. No hex/rgb colors.                                                                                                       |
| IV. TypeScript Strict Mode           | PASS   | Zod schemas for folder name validation. Generated DB types from `database.types.ts`. No `any` types.                                                               |
| V. Simplicity and YAGNI              | PASS   | Simple server actions following existing patterns. No premature abstractions. Tree picker uses basic recursive rendering. Max depth hardcoded as constant.         |
| VI. Supabase as Backend              | PASS   | All CRUD via Supabase client. RLS already on `folders` table. No custom API routes.                                                                                |

## Project Structure

### Documentation (this feature)

```text
specs/011-workspace-folders/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Research decisions
├── data-model.md        # Data model documentation
├── quickstart.md        # Implementation quickstart
├── checklists/
│   └── requirements.md  # Requirements checklist
├── contracts/
│   └── server-actions.md # Server action contracts
└── tasks.md             # Task list
```

### Source Code (repository root)

```text
src/
├── app/
│   └── (dashboard)/
│       └── workspace/
│           └── page.tsx                      # MODIFY - pass folders to client
├── components/
│   ├── ui/
│   │   └── alert-dialog.tsx                  # ADD - install via shadcn
│   └── workspace/
│       ├── workspace-client.tsx              # MODIFY - folder view mode, breadcrumbs, current folder state
│       ├── workspace-header.tsx              # MODIFY - wire "New folder" button to dialog
│       ├── workspace-table.tsx               # MODIFY - folder row rendering
│       ├── columns.tsx                       # MODIFY - folder row type, inline rename, folder actions
│       ├── create-folder-dialog.tsx          # ADD - Dialog with name input
│       ├── move-to-folder-dialog.tsx         # ADD - Dialog with tree picker
│       ├── delete-folder-dialog.tsx          # ADD - AlertDialog with two options
│       ├── folder-tree-picker.tsx            # ADD - Recursive tree component for folder selection
│       ├── folder-breadcrumb.tsx             # ADD - Breadcrumb navigation for folder path
│       └── inline-folder-name.tsx            # ADD - Inline editable folder name
├── lib/
│   ├── actions/
│   │   └── workspace.ts                     # ADD - server actions: createFolder, renameFolder, deleteFolder, moveToFolder
│   ├── queries/
│   │   └── workspace.ts                     # MODIFY - add fetchFolders query, add folder_id to workflow fetching
│   └── schemas/
│       └── workspace.ts                     # ADD - Zod schemas: folderNameSchema, moveToFolderSchema
```

**Structure Decision**: Single Next.js project following existing conventions. New files are colocated in `src/components/workspace/` alongside existing workspace components. Server actions go in `src/lib/actions/workspace.ts` following the pattern from `auth.ts` and `settings.ts`. Zod schemas go in `src/lib/schemas/workspace.ts` following existing schema patterns.

## Complexity Tracking

> No violations. All decisions follow existing patterns and constitution principles.
