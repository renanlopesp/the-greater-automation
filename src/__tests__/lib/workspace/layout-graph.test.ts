import { describe, it, expect } from 'vitest'
import { layoutGraph } from '@/lib/workspace/layout-graph'
import type { WorkspaceNode, WorkspaceEdge } from '@/lib/workspace/graph-types'

function makeNode(id: string, type: 'agent' | 'workflow' = 'workflow'): WorkspaceNode {
  if (type === 'agent') {
    return {
      id,
      type: 'agent',
      position: { x: 0, y: 0 },
      data: {
        name: 'Agent',
        avatarUrl: null,
        palette: null,
        workflowCount: 0,
      },
    }
  }
  return {
    id,
    type: 'workflow',
    position: { x: 0, y: 0 },
    data: {
      name: 'Workflow',
      emoji: null,
      status: 'draft',
      agentId: null,
    },
  }
}

describe('layoutGraph', () => {
  it('returns empty array for empty input', () => {
    const result = layoutGraph([], [])
    expect(result).toEqual([])
  })

  it('positions a single node', () => {
    const nodes: WorkspaceNode[] = [makeNode('n1')]
    const result = layoutGraph(nodes, [])

    expect(result).toHaveLength(1)
    expect(typeof result[0].position.x).toBe('number')
    expect(typeof result[0].position.y).toBe('number')
  })

  it('positions all nodes with coordinates', () => {
    const nodes: WorkspaceNode[] = [
      makeNode('agent-1', 'agent'),
      makeNode('wf-1'),
      makeNode('wf-2'),
    ]
    const edges: WorkspaceEdge[] = [
      { id: 'e1', source: 'agent-1', target: 'wf-1' },
      { id: 'e2', source: 'agent-1', target: 'wf-2' },
    ]

    const result = layoutGraph(nodes, edges)

    expect(result).toHaveLength(3)
    for (const node of result) {
      expect(typeof node.position.x).toBe('number')
      expect(typeof node.position.y).toBe('number')
      expect(Number.isFinite(node.position.x)).toBe(true)
      expect(Number.isFinite(node.position.y)).toBe(true)
    }
  })

  it('gives different positions to different nodes', () => {
    const nodes: WorkspaceNode[] = [
      makeNode('agent-1', 'agent'),
      makeNode('wf-1'),
      makeNode('wf-2'),
    ]
    const edges: WorkspaceEdge[] = [
      { id: 'e1', source: 'agent-1', target: 'wf-1' },
      { id: 'e2', source: 'agent-1', target: 'wf-2' },
    ]

    const result = layoutGraph(nodes, edges)

    // At least some nodes should have different positions
    const positions = result.map((n) => `${n.position.x},${n.position.y}`)
    const uniquePositions = new Set(positions)
    expect(uniquePositions.size).toBeGreaterThan(1)
  })

  it('preserves node data after layout', () => {
    const nodes: WorkspaceNode[] = [makeNode('agent-1', 'agent')]
    const result = layoutGraph(nodes, [])

    expect(result[0].id).toBe('agent-1')
    expect(result[0].type).toBe('agent')
    expect(result[0].data.name).toBe('Agent')
  })
})
