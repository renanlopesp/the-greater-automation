import dagre from 'dagre'
import {
  NODE_DIMENSIONS,
  DEFAULT_LAYOUT_CONFIG,
  type WorkspaceNode,
  type WorkspaceEdge,
  type LayoutConfig,
} from './graph-types'

export function layoutGraph(
  nodes: WorkspaceNode[],
  edges: WorkspaceEdge[],
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): WorkspaceNode[] {
  if (nodes.length === 0) return []

  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: config.direction,
    nodesep: config.nodesep,
    ranksep: config.ranksep,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    const dims = node.type === 'agent' ? NODE_DIMENSIONS.agent : NODE_DIMENSIONS.workflow
    g.setNode(node.id, { width: dims.width, height: dims.height })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map((node) => {
    const nodeWithPosition = g.node(node.id)
    const dims = node.type === 'agent' ? NODE_DIMENSIONS.agent : NODE_DIMENSIONS.workflow

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - dims.width / 2,
        y: nodeWithPosition.y - dims.height / 2,
      },
    }
  })
}
