'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import BoringAvatar from 'boring-avatars'
import { getAgentPalette } from '@/lib/agent-palettes'
import type { AgentNode } from '@/lib/workspace/graph-types'

function GraphNodeAgent({ data }: NodeProps<AgentNode>) {
  const { name, avatarUrl, palette, workflowCount } = data

  return (
    <div className="bg-card flex items-center gap-3 rounded-xl border-2 px-4 py-3 shadow-sm">
      <div className="overflow-hidden rounded-md">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-10 w-10 rounded-md" />
        ) : (
          <BoringAvatar name={name} variant="bauhaus" size={40} colors={getAgentPalette(palette)} />
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{name}</span>
        <span className="text-muted-foreground text-xs">
          {workflowCount} workflow{workflowCount !== 1 ? 's' : ''}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-border !h-2 !w-2" />
    </div>
  )
}

export default memo(GraphNodeAgent)
