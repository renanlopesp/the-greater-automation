import type { WorkspaceItem, WorkspaceAgent, WorkspaceWorkflow } from '@/lib/queries/workspace'
import {
  agentNodeId,
  workflowNodeId,
  edgeId,
  type TransformResult,
  type WorkspaceNode,
  type WorkspaceEdge,
} from './graph-types'

export function transformToGraphData(items: WorkspaceItem[]): TransformResult {
  const nodes: WorkspaceNode[] = []
  const edges: WorkspaceEdge[] = []

  for (const item of items) {
    if (item.type === 'agent') {
      const agent = item as WorkspaceAgent
      const nodeId = agentNodeId(agent.id)

      nodes.push({
        id: nodeId,
        type: 'agent',
        position: { x: 0, y: 0 },
        data: {
          name: agent.name,
          avatarUrl: agent.avatar_url,
          palette: agent.palette,
          workflowCount: agent.workflows.length,
        },
      })

      // Create edges from agent to its child workflows
      for (const workflow of agent.workflows) {
        const wfNodeId = workflowNodeId(workflow.id)

        nodes.push({
          id: wfNodeId,
          type: 'workflow',
          position: { x: 0, y: 0 },
          data: {
            name: workflow.name,
            emoji: workflow.emoji,
            status: workflow.status,
            agentId: agent.id,
          },
        })

        edges.push({
          id: edgeId(nodeId, wfNodeId),
          source: nodeId,
          target: wfNodeId,
        })
      }
    } else if (item.type === 'workflow') {
      const workflow = item as WorkspaceWorkflow
      // Standalone workflow (not nested under agent)
      if (!workflow.agent_id) {
        nodes.push({
          id: workflowNodeId(workflow.id),
          type: 'workflow',
          position: { x: 0, y: 0 },
          data: {
            name: workflow.name,
            emoji: workflow.emoji,
            status: workflow.status,
            agentId: null,
          },
        })
      }
    }
    // Skip folders — they're not shown in graph view
  }

  return { nodes, edges }
}
