# Requirements Checklist: Workspace Folder System

**Feature**: 011-workspace-folders
**Date**: 2026-02-10

## Functional Requirements

- [x] **FR-001**: System MUST allow users to create folders within a team workspace via a Dialog with name validation.
- [x] **FR-002**: System MUST render folders as rows in the workspace table with a FolderOpen icon and expand/collapse capability.
- [x] **FR-003**: System MUST allow users to move one or more workflows into a folder via a tree picker Dialog.
- [x] **FR-004**: System MUST allow users to move workflows back to root level (set `folder_id` to null).
- [x] **FR-005**: System MUST support bulk move operations when multiple rows are selected.
- [x] **FR-006**: System MUST display items grouped by folder when the "Folder" view mode is active, with folders rendered first.
- [x] **FR-007**: System MUST provide breadcrumb navigation when the user navigates into a folder.
- [x] **FR-008**: System MUST allow users to delete a folder with two options: "Move contents to root" or "Delete folder and all contents".
- [x] **FR-009**: System MUST allow users to rename a folder via inline editing (double-click).
- [x] **FR-010**: System MUST support nested folders via `parent_id` with a maximum depth of 3 levels.
- [x] **FR-011**: System MUST validate folder names (non-empty, max 100 characters) using Zod schemas.
- [x] **FR-012**: System MUST use server actions for all folder CRUD operations, following existing patterns in `src/lib/actions/`.
- [x] **FR-013**: System MUST use `revalidatePath` to refresh the workspace page after mutations.
- [x] **FR-014**: System MUST prevent circular parent references when moving or nesting folders.

## User Stories Coverage

- [x] **US-1** (P1): Create Folder - Covered by FR-001, FR-002, FR-011
- [x] **US-2** (P1): Move to Folder - Covered by FR-003, FR-004, FR-005
- [x] **US-3** (P2): Folder View Mode - Covered by FR-006, FR-007
- [x] **US-4** (P2): Delete Folder - Covered by FR-008
- [x] **US-5** (P3): Rename Folder - Covered by FR-009
- [x] **US-6** (P3): Nested Folders - Covered by FR-010, FR-014

## Constitution Compliance

- [x] **Principle I**: Next.js App Router First - Server actions for mutations, server component data fetching
- [x] **Principle II**: shadcn/ui Component System - Dialog, AlertDialog, Breadcrumb, Input, Button all from shadcn/ui
- [x] **Principle III**: Tailwind CSS v4 + OKLCH Theming - All styling via Tailwind classes and CSS variable tokens
- [x] **Principle IV**: TypeScript Strict Mode - Zod validation, generated DB types, no `any`
- [x] **Principle V**: Simplicity and YAGNI - No premature abstractions; simple server actions and query functions
- [x] **Principle VI**: Supabase as Backend - All CRUD via Supabase client, RLS on folders table
