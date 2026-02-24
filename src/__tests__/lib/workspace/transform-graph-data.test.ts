import { describe, it, expect } from 'vitest'
import { transformToGraphData } from '@/lib/workspace/transform-graph-data'
import type { WorkspaceAgent, WorkspaceWorkflow } from '@/lib/queries/workspace'

function makeWorkflow(overrides: Partial<WorkspaceWorkflow> = {}): WorkspaceWorkflow {
  return {
    type: 'workflow',
    id: 'wf-1',
    name: 'Test Workflow',
    emoji: null,
    status: 'draft',
    created_by: 'user-1',
    updated_at: null,
    created_at: '2026-01-01T00:00:00Z',
    published_at: null,
    last_run_at: null,
    created_by_name: null,
    step_count: 0,
    has_ai_steps: false,
    agent_id: null,
    folder_id: null,
    ...overrides,
  }
}

function makeAgent(overrides: Partial<WorkspaceAgent> = {}): WorkspaceAgent {
  return {
    type: 'agent',
    id: 'agent-1',
    name: 'Test Agent',
    avatar_url: null,
    palette: null,
    created_by: 'user-1',
    workflows: [],
    automation_count: 0,
    ...overrides,
  }
}

describe('transformToGraphData', () => {
  it('returns empty nodes and edges for empty input', () => {
    const result = transformToGraphData([])
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it('creates a workflow node for a standalone workflow', () => {
    const workflow = makeWorkflow({ id: 'wf-1', name: 'My Workflow', emoji: '📋' })
    const result = transformToGraphData([workflow])

    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].id).toBe('workflow-wf-1')
    expect(result.nodes[0].type).toBe('workflow')
    expect(result.nodes[0].data).toEqual({
      name: 'My Workflow',
      emoji: '📋',
      status: 'draft',
      agentId: null,
    })
    expect(result.edges).toHaveLength(0)
  })

  it('creates agent node with child workflow nodes and edges', () => {
    const childWorkflow = makeWorkflow({
      id: 'wf-child',
      name: 'Child',
      agent_id: 'agent-1',
    })
    const agent = makeAgent({
      id: 'agent-1',
      name: 'My Agent',
      workflows: [childWorkflow],
    })

    const result = transformToGraphData([agent])

    expect(result.nodes).toHaveLength(2) // agent + workflow
    expect(result.edges).toHaveLength(1)

    const agentNode = result.nodes.find((n) => n.type === 'agent')
    expect(agentNode?.id).toBe('agent-agent-1')
    expect(agentNode?.data).toEqual({
      name: 'My Agent',
      avatarUrl: null,
      palette: null,
      workflowCount: 1,
    })

    const wfNode = result.nodes.find((n) => n.type === 'workflow')
    expect(wfNode?.id).toBe('workflow-wf-child')

    expect(result.edges[0]).toEqual({
      id: 'edge-agent-agent-1-workflow-wf-child',
      source: 'agent-agent-1',
      target: 'workflow-wf-child',
    })
  })

  it('skips folder items', () => {
    const folder = {
      type: 'folder' as const,
      id: 'folder-1',
      name: 'My Folder',
      team_id: 'team-1',
      parent_id: null,
      created_by: '',
      workflow_count: 0,
      subfolder_count: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const result = transformToGraphData([folder])
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it('handles mix of agents and standalone workflows', () => {
    const standalone = makeWorkflow({ id: 'wf-standalone', name: 'Standalone' })
    const child = makeWorkflow({ id: 'wf-child', agent_id: 'agent-1' })
    const agent = makeAgent({ id: 'agent-1', workflows: [child] })

    const result = transformToGraphData([agent, standalone])

    expect(result.nodes).toHaveLength(3) // agent + child + standalone
    expect(result.edges).toHaveLength(1) // only agent -> child
  })
})
