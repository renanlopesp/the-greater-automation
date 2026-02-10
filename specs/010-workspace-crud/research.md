# Research: Workspace CRUD Actions

**Feature**: 010-workspace-crud
**Date**: 2026-02-10

## R-001: Server Actions Pattern for Workspace CRUD

**Decision**: Use Next.js `'use server'` functions in `src/lib/actions/workspace.ts`, following the existing pattern in `src/lib/actions/auth.ts`.

**Rationale**: The project already uses this pattern for auth actions (login, signup, signout). Server actions provide type-safe, form-compatible mutations with automatic POST handling. They work seamlessly with `revalidatePath` for cache invalidation.

**Alternatives considered**:

- Route Handlers (API routes): Would work but adds unnecessary boilerplate. Constitution principle VI says "No custom API routes for CRUD operations that Supabase handles directly." Server actions are the leaner option.
- Client-side Supabase calls: Would bypass RLS patterns and create inconsistent auth handling.

## R-002: Delete Cascade Strategy

**Decision**: Use Supabase cascade deletes where FK constraints support it. For workflows, the database has `workflow_steps_workflow_id_fkey`, `workflow_triggers_workflow_id_fkey`, and `workflow_runs_workflow_id_fkey` — all referencing `workflows.id`. If ON DELETE CASCADE is set, a single `DELETE FROM workflows WHERE id = ?` handles everything. If not, delete children first then parent.

**Rationale**: Supabase/PostgreSQL cascade deletes are atomic and handled at the DB level, which is simpler and safer than multi-step application deletions.

**Alternatives considered**:

- Application-level cascade: More code, risk of partial deletions on failure, not atomic.
- Soft delete (status flag): Over-engineering for current needs; YAGNI (Constitution V).

## R-003: Duplicate Workflow — Deep Copy Strategy

**Decision**: Server action fetches the source workflow, its steps, and trigger, then inserts a new workflow + copies of each step + copy of trigger in sequence. Use a single Supabase transaction if possible, or sequential inserts with rollback logic.

**Rationale**: Workflow duplication requires copying across 3 tables (workflows, workflow_steps, workflow_triggers). Each needs new UUIDs and updated workflow_id references. Sequential inserts are simplest.

**Alternatives considered**:

- PostgreSQL function (stored procedure): More complex to maintain, harder to debug, violates simplicity principle.
- Client-side copy: Would require exposing raw data to client and multiple round trips.

## R-004: Template System — Hardcoded vs Database

**Decision**: Hardcoded TypeScript array of template definitions in a `src/lib/data/workflow-templates.ts` file. Each template contains: name, description, emoji, steps array, trigger config.

**Rationale**: Constitution V (YAGNI) — 3-5 templates don't justify a database table, admin UI, or CRUD system. A simple TypeScript file is type-safe, easy to modify, and requires zero infrastructure.

**Alternatives considered**:

- Database table for templates: Over-engineering for 3-5 items; would need an admin UI.
- JSON file: Less type-safe than TypeScript, no IDE autocomplete.

## R-005: Bulk Actions — Selection and Mutation Pattern

**Decision**: The workspace table already tracks `rowSelection` state via TanStack React Table. The bulk action bar reads selected row IDs, calls a server action that accepts an array of IDs, and performs the mutation. Use `Promise.all` for parallel deletes or a single Supabase `IN` query.

**Rationale**: TanStack Table's built-in selection model already works (checkboxes function). The missing piece is the UI bar and the batch server action.

**Alternatives considered**:

- Individual mutations per item: Slower, more network round-trips.
- WebSocket-based updates: Over-engineering; `revalidatePath` is sufficient.

## R-006: Inline Rename — UX Pattern

**Decision**: Double-click on workflow name cell triggers edit mode. Renders an `<input>` pre-filled with current name. Enter saves, Escape cancels, blur saves. Uses a local state in the cell component plus a server action for persistence.

**Rationale**: Common table editing pattern. Keeps logic contained in the cell renderer. No need for a modal or separate edit page.

**Alternatives considered**:

- Modal dialog for rename: Too heavy for a single field edit.
- Content-editable div: Harder to control, browser inconsistencies.

## R-007: Confirmation Dialog — Reusable Component

**Decision**: Create a single `DeleteDialog` component using shadcn/ui `AlertDialog`. It accepts: title, description, onConfirm callback, and loading state. Used for both single and bulk deletes for workflows and agents.

**Rationale**: Constitution II requires composing shadcn primitives. AlertDialog is already available in shadcn/ui and provides the correct accessible pattern.

**Alternatives considered**:

- Window.confirm(): Not accessible, not customizable, breaks design system.
- Custom modal from scratch: Violates Constitution II (must compose shadcn primitives).
