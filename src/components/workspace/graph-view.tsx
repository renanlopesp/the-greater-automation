'use client'

import { useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { ReactFlow, Controls, MiniMap, type NodeMouseHandler, type ColorMode } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import GraphNodeAgent from '@/components/workspace/graph-node-agent'
import { GraphEmptyState } from '@/components/workspace/graph-empty-state'
import { transformToGraphData } from '@/lib/workspace/transform-graph-data'
import { layoutGraph } from '@/lib/workspace/layout-graph'
import type { WorkspaceItem } from '@/lib/queries/workspace'

const nodeTypes = {
  agent: GraphNodeAgent,
}

interface GraphViewProps {
  items: WorkspaceItem[]
}

export default function GraphView({ items }: GraphViewProps) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const colorMode: ColorMode = resolvedTheme === 'dark' ? 'dark' : 'light'

  const { nodes, edges } = useMemo(() => {
    const { nodes: rawNodes, edges } = transformToGraphData(items)
    const nodes = layoutGraph(rawNodes, edges)
    return { nodes, edges }
  }, [items])

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === 'agent') {
        const agentId = node.id.replace('agent-', '')
        router.push(`/agents/${agentId}`)
      } else if (node.type === 'workflow') {
        const workflowId = node.id.replace('workflow-', '')
        router.push(`/workflows/${workflowId}/edit`)
      }
    },
    [router]
  )

  if (items.length === 0) {
    return <GraphEmptyState />
  }

  return (
    <div
      className="h-[500px] w-full rounded-lg border"
      role="img"
      aria-label="Workspace relationship graph"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        colorMode={colorMode}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <MiniMap zoomable pannable />
      </ReactFlow>
    </div>
  )
}
