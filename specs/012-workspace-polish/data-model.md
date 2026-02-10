# Data Model: Workspace Graph View & Polish

**Branch**: `012-workspace-polish` | **Date**: 2026-02-10
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This feature does **not** introduce any new database tables or schema changes. All graph data is derived from existing tables and transformed at the application level. The data model documented here covers the application-level types used for graph rendering, keyboard navigation state, and optimistic UI state.

## Existing Database Tables (Referenced, Not Modified)

The graph visualization reads data from these existing tables via the `fetchWorkspaceItems()` query in `src/lib/queries/workspace.ts`:

| Table          | Role in Graph             | Key Fields                            |
| -------------- | ------------------------- | ------------------------------------- |
| `agents`       | Agent nodes               | `id`, `name`, `avatar_url`, `palette` |
| `workflows`    | Workflow nodes            | `id`, `name`, `emoji`, `status`       |
| `agent_skills` | Edges (agent -> workflow) | `agent_id`, `workflow_id`             |

The existing `WorkspaceItem` union type (`WorkspaceAgent | WorkspaceWorkflow`) already includes the `agent_skills` relationship (agents contain a `workflows[]` array of their assigned workflows, and each workflow has an `agent_id` field).

## Application-Level Types

### Graph Node Types

These types define the data attached to each node in the `@xyflow/react` graph:

```typescript
// Agent node data (large node)
interface AgentNodeData {
  entityType: 'agent'
  name: string
  avatarUrl: string | null
  palette: string | null
  workflowCount: number
}

// Workflow node data (small node)
interface WorkflowNodeData {
  entityType: 'workflow'
  name: string
  emoji: string | null
  status: 'draft' | 'published'
  agentId: string | null
}
```

### Graph Edge Type

Edges connect agent nodes to their workflow nodes:

```typescript
interface WorkspaceGraphEdge {
  id: string // Format: `edge-{agentId}-{workflowId}`
  source: string // Agent node ID (format: `agent-{agentId}`)
  target: string // Workflow node ID (format: `workflow-{workflowId}`)
}
```

### Node Dimensions

| Node Type | Width | Height | Notes                                       |
| --------- | ----- | ------ | ------------------------------------------- |
| Agent     | 220px | 80px   | Displays avatar, name, workflow count badge |
| Workflow  | 180px | 60px   | Displays emoji, name, status badge          |

### Keyboard Navigation State

```typescript
interface KeyboardNavigationState {
  focusedIndex: number | null // Index of the focused row, or null if no row is focused
  isActive: boolean // Whether keyboard navigation mode is active
}
```

### Optimistic UI State

The optimistic state is managed by React 19's `useOptimistic` hook. The reducer handles two action types:

```typescript
type OptimisticAction =
  | { type: 'delete'; itemId: string }
  | { type: 'updateStatus'; itemId: string; newStatus: 'draft' | 'published' }
```

The optimistic reducer produces a new `WorkspaceItem[]` by:

- **Delete**: Filtering out the item with the given ID (and removing it from any parent agent's `workflows[]` array if it is a nested workflow)
- **Status change**: Mapping over items and updating the `status` field of the matching workflow

## Data Flow

```
Server Component (page.tsx)
  |
  |-- fetchWorkspaceItems(supabase, teamId) --> WorkspaceItem[]
  |
  +-- <WorkspaceClient initialItems={items} />
        |
        |-- useOptimistic(initialItems, reducer) --> optimisticItems
        |
        |-- [Table View] flatData = flatten(optimisticItems)
        |     +-- useKeyboardNavigation(flatData.length, ...)
        |
        +-- [Graph View] { nodes, edges } = transformToGraphData(optimisticItems)
              +-- layoutGraph(nodes, edges, 'TB') --> positioned nodes
                    +-- <ReactFlow nodes={positioned} edges={edges} />
```

## Relationships

```
agents (1) ---- (N) agent_skills ---- (1) workflows
  |                                        |
  v                                        v
AgentNode --- edge --- WorkflowNode     WorkflowNode (standalone)
(large)                (small)           (small, no incoming edges)
```
