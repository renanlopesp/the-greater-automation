# Implementation Plan: Workspace Graph View & Polish

**Branch**: `012-workspace-polish` | **Date**: 2026-02-10 | **Spec**: [specs/012-workspace-polish/spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-workspace-polish/spec.md`
**Depends On**: 010-workspace-crud, 011-workspace-folders

## Summary

Implement a network graph visualization for the /workspace page using `@xyflow/react` (React Flow) with `dagre` auto-layout, and add UX polish including keyboard navigation in the table view, optimistic UI for mutations, loading states during server actions, and real-time data revalidation. The graph view transforms the existing `WorkspaceItem[]` data into nodes (agents as large nodes, workflows as smaller nodes) connected by edges (derived from `agent_skills`). This replaces the "Coming soon" toast on the Graph toggle with a fully functional visualization. The UX polish stories layer on top of the server action patterns established in 010-workspace-crud.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19.2.3, shadcn/ui (new-york), Tailwind CSS v4, @xyflow/react, dagre, @tanstack/react-table
**Storage**: Supabase (PostgreSQL) -- reading existing `agents`, `workflows`, `agent_skills` tables via `fetchWorkspaceItems()`
**Testing**: Vitest + Testing Library (unit), Playwright (e2e), plus `bun run build` and `bun run lint`
**Target Platform**: Web (modern browsers)
**Project Type**: Next.js App Router web application
**Performance Goals**: Graph renders < 2s for 50 agents + 200 workflows; optimistic UI feedback < 100ms
**Constraints**: Server Components by default, all colors via CSS variables (OKLCH), no hex/rgb, `"use client"` only where interactivity is required

### Key Dependencies

- `@xyflow/react` (React Flow v12): Graph/network visualization library for React. Provides canvas with zoom/pan, custom node rendering, edge drawing, and event handling. This is a **new dependency**.
- `dagre`: Directed graph layout algorithm. Computes x/y positions for nodes in a hierarchical layout. This is a **new dependency**.
- `@types/dagre`: TypeScript type definitions for dagre. This is a **new dev dependency**.
- `@tanstack/react-table`: Already installed. Powers the table view; keyboard navigation hooks into the table instance.
- `nuqs`: Already installed. URL state management for view toggle, filters.
- `sonner`: Already installed. Toast notifications for optimistic UI error feedback.
- `boring-avatars`: Already installed. Agent avatar rendering in graph nodes.
- `lucide-react`: Already installed. Icons for node decorations and loading spinners.

## Constitution Check

_GATE: Must pass before implementation._

| Principle                            | Status | Notes                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. App Router First                  | PASS   | Graph view is a client component (`"use client"`) rendered inside the existing workspace Server Component page. Data fetching remains in the Server Component. No new pages or route changes.                                                                                          |
| II. shadcn/ui Component System       | PASS   | Custom graph nodes compose shadcn primitives (Badge, Button, Avatar). Loading spinners use shadcn Skeleton or Button's loading state. No parallel component implementations.                                                                                                           |
| III. Tailwind CSS v4 + OKLCH Theming | PASS   | Graph node styles use Tailwind utility classes with CSS variable-based colors. No hex/rgb. Agent node backgrounds use palette-derived OKLCH colors consistent with existing agent card styling.                                                                                        |
| IV. TypeScript Strict Mode           | PASS   | All new types (GraphNode, GraphEdge, layout params) are strictly typed. @xyflow/react has built-in TypeScript support. dagre types via @types/dagre.                                                                                                                                   |
| V. Simplicity and YAGNI              | PASS   | `@xyflow/react` is the standard React graph library -- no custom canvas rendering. `dagre` is the simplest auto-layout solution. Optimistic UI uses React 19's `useOptimistic` hook -- no external state management library. See Complexity Tracking for new dependency justification. |
| VI. Supabase as Backend              | PASS   | No new tables or schema changes. Graph data is derived from existing `agent_skills` join already fetched by `fetchWorkspaceItems()`. Mutations use existing server actions from 010-workspace-crud.                                                                                    |

## Project Structure

### Documentation (this feature)

```text
specs/012-workspace-polish/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Research decisions (graph lib, layout, optimistic UI, keyboard nav)
├── data-model.md        # Graph node/edge types (application-level)
├── quickstart.md        # Quick-start guide
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── contracts/
│   └── graph-types.md   # TypeScript type definitions for graph
└── tasks.md             # Task checklist
```

### Source Code Changes

```text
# NEW FILES
src/components/workspace/graph-view.tsx              # Main graph view component (ReactFlow canvas)
src/components/workspace/graph-node-agent.tsx         # Custom node renderer for agents
src/components/workspace/graph-node-workflow.tsx      # Custom node renderer for workflows
src/components/workspace/graph-empty-state.tsx        # Empty state for graph view
src/lib/workspace/transform-graph-data.ts            # Transforms WorkspaceItem[] -> nodes + edges
src/lib/workspace/layout-graph.ts                    # Dagre auto-layout computation
src/lib/workspace/graph-types.ts                     # TypeScript types for graph nodes/edges
src/hooks/use-keyboard-navigation.ts                 # Keyboard navigation hook for table
src/hooks/use-optimistic-workspace.ts                # Optimistic state management for workspace items

# MODIFIED FILES
src/components/workspace/view-toggle.tsx             # Remove "Coming soon" toast, enable graph view
src/components/workspace/workspace-client.tsx         # Add graph view rendering, keyboard nav, optimistic state
src/components/workspace/workspace-table.tsx          # Add keyboard event handlers, row focus state
src/components/workspace/columns.tsx                  # Add loading/disabled states to action buttons
```

## Implementation Details

### 1. Graph Data Transformation (Foundational)

Transform the existing `WorkspaceItem[]` into `@xyflow/react` Node and Edge arrays:

```typescript
// src/lib/workspace/transform-graph-data.ts
import type { WorkspaceItem, WorkspaceAgent } from '@/lib/queries/workspace'
import type { AgentNodeData, WorkflowNodeData } from '@/lib/workspace/graph-types'
import type { Node, Edge } from '@xyflow/react'

export function transformToGraphData(items: WorkspaceItem[]): {
  nodes: Node<AgentNodeData | WorkflowNodeData>[]
  edges: Edge[]
} {
  // Iterate items, create agent nodes (large) and workflow nodes (small)
  // For each agent, create edges to its child workflows
  // Standalone workflows become disconnected nodes
}
```

### 2. Auto-Layout with Dagre

```typescript
// src/lib/workspace/layout-graph.ts
import dagre from 'dagre'
import type { Node, Edge } from '@xyflow/react'

export function layoutGraph(nodes: Node[], edges: Edge[], direction: 'TB' | 'LR' = 'TB'): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120 })
  // Add nodes with dimensions, add edges, run dagre.layout(g)
  // Map computed positions back to React Flow nodes
}
```

### 3. Custom Node Components

Agent nodes render with BoringAvatar + name + workflow count badge. Workflow nodes render with emoji + name + status badge. Both are clickable via `useRouter().push()`.

### 4. Keyboard Navigation Hook

```typescript
// src/hooks/use-keyboard-navigation.ts
export function useKeyboardNavigation(opts: {
  rowCount: number
  onOpen: (index: number) => void
  onDelete: (index: number) => void
  onSelect: (index: number) => void
}): {
  focusedIndex: number | null
  handlers: { onKeyDown: (e: KeyboardEvent) => void }
}
```

### 5. Optimistic UI with useOptimistic

Use React 19's `useOptimistic` to manage optimistic state for delete and status change operations. On mutation, immediately update the displayed items. On server action failure, revert and show toast via `sonner`.

### 6. Revalidation Strategy

After each successful mutation, call `router.refresh()` from the client component to trigger Server Component re-render with fresh data from Supabase. This is the simplest approach that works with the App Router model.

## Complexity Tracking

| Item                             | Why Needed                                                                                                                                                 | Simpler Alternative Rejected Because                                                                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@xyflow/react` (new dependency) | Graph visualization is the core feature of this spec. It provides a production-ready React canvas with zoom, pan, custom nodes, edges, and event handling. | Building a custom SVG/Canvas graph renderer would require thousands of lines of code for zoom/pan/hit-testing alone. D3 is lower-level and requires more boilerplate for React integration. vis.js has weaker React support. |
| `dagre` (new dependency)         | Automatic layout prevents nodes from overlapping and produces readable hierarchical arrangements.                                                          | Manual layout (fixed positions) would not scale beyond trivial graphs. ELK is more powerful but significantly larger (200KB+) and overkill for our use case.                                                                 |
