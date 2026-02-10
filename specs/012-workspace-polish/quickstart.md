# Quickstart: Workspace Graph View & Polish

**Branch**: `012-workspace-polish` | **Date**: 2026-02-10

## Prerequisites

Before starting implementation of this feature, ensure:

1. **Specs 010 and 011 are complete**: This feature depends on server actions from 010-workspace-crud (create, delete, duplicate, status change) and folder management from 011-workspace-folders. Verify by checking that the workspace page has functional CRUD operations.

2. **Development environment is running**:

   ```bash
   bun dev
   ```

3. **Database is seeded**: The workspace page should display agents and workflows. At least some agents should have workflows assigned via `agent_skills` so that graph edges can be visualized.

## Setup

### 1. Install new dependencies

```bash
bun add @xyflow/react dagre
bun add -d @types/dagre
```

### 2. Verify installation

```bash
# Check that @xyflow/react is importable
bun run build
```

### 3. Create the directory structure

```bash
mkdir -p src/lib/workspace
mkdir -p src/hooks
```

These directories may already exist from prior features.

## Implementation Order

Follow the task phases in [tasks.md](./tasks.md):

1. **Phase 1 (Setup)**: Install dependencies, create graph type definitions
2. **Phase 2 (Foundational)**: Graph data transformation, dagre layout, custom node components
3. **Phase 3 (US1 - Graph View)**: Wire up ReactFlow canvas, integrate with ViewToggle, add empty state
4. **Phase 4 (US2 - Keyboard Nav)**: Implement useKeyboardNavigation hook, integrate with workspace table
5. **Phase 5 (US3 - Optimistic UI)**: Implement useOptimistic for delete and status change
6. **Phase 6 (US4 - Loading States)**: Add disabled buttons, spinner feedback during mutations
7. **Phase 7 (US5 - Revalidation)**: Add router.refresh() after all successful mutations
8. **Phase 8 (Polish)**: Remove all "Coming soon" toasts, final build/lint/test pass

## Validation

After each phase, verify:

```bash
# Build check
bun run build

# Lint check
bun run lint

# Manual test
# - Navigate to /workspace
# - Switch to Graph view
# - Verify agents and workflows appear as nodes
# - Verify edges connect agents to their workflows
# - Click a workflow node to navigate to the editor
# - Click an agent node to navigate to agent detail
# - Switch back to table view
# - Use arrow keys to navigate rows
# - Press Enter on a workflow to open editor
# - Delete a workflow and verify optimistic removal
```

## Key Files Reference

| File                                               | Purpose                                                |
| -------------------------------------------------- | ------------------------------------------------------ |
| `src/lib/workspace/graph-types.ts`                 | TypeScript types for graph nodes, edges, layout config |
| `src/lib/workspace/transform-graph-data.ts`        | Converts WorkspaceItem[] to ReactFlow nodes + edges    |
| `src/lib/workspace/layout-graph.ts`                | Dagre auto-layout computation                          |
| `src/components/workspace/graph-view.tsx`          | Main graph view component (ReactFlow canvas)           |
| `src/components/workspace/graph-node-agent.tsx`    | Custom agent node renderer                             |
| `src/components/workspace/graph-node-workflow.tsx` | Custom workflow node renderer                          |
| `src/components/workspace/graph-empty-state.tsx`   | Empty state for graph view                             |
| `src/hooks/use-keyboard-navigation.ts`             | Keyboard navigation hook                               |
| `src/hooks/use-optimistic-workspace.ts`            | Optimistic state management                            |
| `src/components/workspace/view-toggle.tsx`         | Modified: remove "Coming soon" toast                   |
| `src/components/workspace/workspace-client.tsx`    | Modified: integrate graph, keyboard, optimistic        |
| `src/components/workspace/workspace-table.tsx`     | Modified: keyboard event handlers                      |
| `src/components/workspace/columns.tsx`             | Modified: loading/disabled states                      |

## Troubleshooting

- **ReactFlow not rendering**: Ensure the graph container has explicit height (e.g., `h-[600px]` or `flex-1` in a flex parent). ReactFlow requires a container with defined dimensions.
- **Dagre layout looks wrong**: Check that node dimensions in `NODE_DIMENSIONS` match the actual rendered size of custom node components. Mismatched dimensions cause overlapping.
- **"Coming soon" toast still appears**: Check `view-toggle.tsx` -- the `if (value === 'graph')` guard that calls `toast('Coming soon')` must be removed.
- **Optimistic revert not working**: Ensure `router.refresh()` is called after the server action completes (both success and failure paths). The refresh triggers a Server Component re-render that replaces optimistic state with real data.
