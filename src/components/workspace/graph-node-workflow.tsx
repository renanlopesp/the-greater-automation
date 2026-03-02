'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Badge } from '@/components/ui/badge'
import type { WorkflowNode } from '@/lib/workspace/graph-types'

function GraphNodeWorkflow({ data }: NodeProps<WorkflowNode>) {
  const { name, emoji, status, agentId } = data
  const statusLabel = status === 'published' ? 'Publicado' : 'Rascunho'
  const statusVariant = status === 'published' ? 'default' : 'secondary'

  return (
    <div className="bg-card flex items-center gap-2 rounded-lg border px-3 py-2 shadow-sm">
      {agentId && <Handle type="target" position={Position.Top} className="!bg-border !h-2 !w-2" />}
      <span className="text-base">{emoji ?? '\uD83D\uDCCB'}</span>
      <span className="max-w-[120px] truncate text-sm font-medium">{name}</span>
      <Badge variant={statusVariant} className="ml-auto text-[10px]">
        {statusLabel}
      </Badge>
    </div>
  )
}

export default memo(GraphNodeWorkflow)
