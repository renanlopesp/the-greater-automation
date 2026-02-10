# Quickstart: Workspace CRUD Actions

**Feature**: 010-workspace-crud
**Branch**: `010-workspace-crud`

## Prerequisites

- Supabase project running with existing schema (workflows, agents, workflow_steps, workflow_triggers, workflow_runs, agent_skills tables)
- Node/Bun environment with project dependencies installed
- shadcn/ui AlertDialog component installed

## Implementation Order

### Phase 1: Server Actions Foundation

1. Create `src/lib/actions/workspace.ts` with `'use server'` directive
2. Implement `createWorkflow` — simplest action, validates the pattern
3. Implement `deleteWorkflow` — introduces cascade delete pattern
4. Implement `deleteAgent` — similar to deleteWorkflow

### Phase 2: Wire Existing UI

5. Update `workspace-header.tsx` — connect "New workflow" to `createWorkflow` action
6. Update `columns.tsx` — wire Delete menu items to open DeleteDialog
7. Update `columns.tsx` — wire Edit agent to `Link` navigation

### Phase 3: New Components

8. Create `delete-dialog.tsx` — reusable AlertDialog for confirmations
9. Create `template-dialog.tsx` — template picker using Dialog
10. Create `bulk-action-bar.tsx` — floating bar for selected rows

### Phase 4: Advanced Actions

11. Implement `duplicateWorkflow` — deep copy with steps + trigger
12. Implement `createWorkflowFromTemplate` — template lookup + creation
13. Create `src/lib/data/workflow-templates.ts` — hardcoded template definitions

### Phase 5: Table Enhancements

14. Add Published, Steps, AI columns to `columns.tsx`
15. Implement inline rename in name column cell
16. Wire bulk actions bar to server actions

## Validation

```bash
bun run build   # Must pass
bun run lint    # Must pass
bun run test    # Must pass
```

## Key Files

| File                                            | Purpose                         |
| ----------------------------------------------- | ------------------------------- |
| `src/lib/actions/workspace.ts`                  | All workspace server actions    |
| `src/lib/data/workflow-templates.ts`            | Hardcoded template definitions  |
| `src/components/workspace/columns.tsx`          | Table columns + action handlers |
| `src/components/workspace/workspace-header.tsx` | Header buttons                  |
| `src/components/workspace/workspace-client.tsx` | Main client component           |
| `src/components/workspace/delete-dialog.tsx`    | Confirmation dialog             |
| `src/components/workspace/template-dialog.tsx`  | Template picker                 |
| `src/components/workspace/bulk-action-bar.tsx`  | Bulk actions bar                |
