import type { Node, Edge } from '@xyflow/react'

export interface AgentNodeData extends Record<string, unknown> {
  name: string
  avatarUrl: string | null
  palette: string | null
  workflowCount: number
}

export interface WorkflowNodeData extends Record<string, unknown> {
  name: string
  emoji: string | null
  status: string
  agentId: string | null
}

export type AgentNode = Node<AgentNodeData, 'agent'>
export type WorkflowNode = Node<WorkflowNodeData, 'workflow'>
export type WorkspaceNode = AgentNode | WorkflowNode
export type WorkspaceEdge = Edge

export const GRAPH_NODE_TYPES = {
  agent: 'agent',
  workflow: 'workflow',
} as const

export const NODE_DIMENSIONS = {
  agent: { width: 220, height: 80 },
  workflow: { width: 180, height: 60 },
} as const

export interface LayoutConfig {
  direction: 'TB' | 'LR'
  nodesep: number
  ranksep: number
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  direction: 'TB',
  nodesep: 80,
  ranksep: 120,
}

export interface TransformResult {
  nodes: WorkspaceNode[]
  edges: WorkspaceEdge[]
}

export function agentNodeId(agentId: string): string {
  return `agent-${agentId}`
}

export function workflowNodeId(workflowId: string): string {
  return `workflow-${workflowId}`
}

export function edgeId(sourceId: string, targetId: string): string {
  return `edge-${sourceId}-${targetId}`
}
