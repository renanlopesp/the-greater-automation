# Contract: Graph Types

**Branch**: `012-workspace-polish` | **Date**: 2026-02-10
**Target File**: `src/lib/workspace/graph-types.ts`

## TypeScript Type Definitions

These types define the contract for the graph visualization system. All graph components, transformation functions, and layout utilities must conform to these types.

### Node Data Types

```typescript
import type { Node, Edge } from '@xyflow/react'

/**
 * Data payload for agent nodes in the graph.
 * Agent nodes are rendered as large cards with avatar and metadata.
 */
export interface AgentNodeData {
  entityType: 'agent'
  name: string
  avatarUrl: string | null
  palette: string | null
  workflowCount: number
}

/**
 * Data payload for workflow nodes in the graph.
 * Workflow nodes are rendered as smaller cards with emoji and status.
 */
export interface WorkflowNodeData {
  entityType: 'workflow'
  name: string
  emoji: string | null
  status: 'draft' | 'published'
  agentId: string | null
}

/**
 * Union of all node data types used in the workspace graph.
 */
export type WorkspaceNodeData = AgentNodeData | WorkflowNodeData

/**
 * Typed node for the workspace graph.
 * Uses @xyflow/react Node generic with our custom data types.
 */
export type AgentNode = Node<AgentNodeData, 'agent'>
export type WorkflowNode = Node<WorkflowNodeData, 'workflow'>
export type WorkspaceNode = AgentNode | WorkflowNode

/**
 * Typed edge for the workspace graph.
 * Connects an agent node to a workflow node.
 */
export type WorkspaceEdge = Edge
```

### Node Type Registry

```typescript
/**
 * Custom node type identifiers used in the ReactFlow nodeTypes registry.
 * Maps to the custom React components for each node type.
 */
export const GRAPH_NODE_TYPES = {
  agent: 'agent',
  workflow: 'workflow',
} as const

export type GraphNodeType = (typeof GRAPH_NODE_TYPES)[keyof typeof GRAPH_NODE_TYPES]
```

### Node ID Conventions

```typescript
/**
 * Node ID generation utilities.
 * Ensures consistent ID format across transformation and layout.
 */
export function agentNodeId(agentId: string): string {
  return `agent-${agentId}`
}

export function workflowNodeId(workflowId: string): string {
  return `workflow-${workflowId}`
}

export function edgeId(agentId: string, workflowId: string): string {
  return `edge-${agentId}-${workflowId}`
}
```

### Node Dimensions

```typescript
/**
 * Fixed dimensions for each node type.
 * Used by dagre layout to compute positions without overlap.
 */
export const NODE_DIMENSIONS = {
  agent: { width: 220, height: 80 },
  workflow: { width: 180, height: 60 },
} as const
```

### Layout Configuration

```typescript
/**
 * Configuration for the dagre auto-layout.
 */
export interface LayoutConfig {
  /** Layout direction: top-to-bottom or left-to-right */
  direction: 'TB' | 'LR'
  /** Horizontal spacing between nodes at the same rank */
  nodesep: number
  /** Vertical spacing between ranks (layers) */
  ranksep: number
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  direction: 'TB',
  nodesep: 80,
  ranksep: 120,
}
```

### Transformation Function Signature

```typescript
import type { WorkspaceItem } from '@/lib/queries/workspace'

/**
 * Transforms workspace items into graph-ready nodes and edges.
 *
 * @param items - Array of WorkspaceItem (agents and workflows)
 * @returns Object with positioned nodes and edges ready for ReactFlow
 */
export interface TransformResult {
  nodes: WorkspaceNode[]
  edges: WorkspaceEdge[]
}
```

### Optimistic Action Types

```typescript
/**
 * Actions dispatched to the optimistic reducer for workspace mutations.
 */
export type OptimisticAction =
  | { type: 'delete'; itemId: string }
  | { type: 'updateStatus'; itemId: string; newStatus: 'draft' | 'published' }
```

### Keyboard Navigation Types

```typescript
/**
 * Configuration for the keyboard navigation hook.
 */
export interface KeyboardNavigationConfig {
  /** Total number of navigable rows */
  rowCount: number
  /** Called when Enter is pressed on a focused row */
  onOpen: (index: number) => void
  /** Called when Delete is pressed on a focused row */
  onDelete: (index: number) => void
  /** Called when Space is pressed on a focused row */
  onSelect: (index: number) => void
}

/**
 * Return value from the keyboard navigation hook.
 */
export interface KeyboardNavigationResult {
  /** Index of the currently focused row, or null */
  focusedIndex: number | null
  /** Set focused index programmatically */
  setFocusedIndex: (index: number | null) => void
  /** Keyboard event handler to attach to the table container */
  onKeyDown: (e: React.KeyboardEvent) => void
}
```
