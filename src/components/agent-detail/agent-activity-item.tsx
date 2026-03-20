'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAgentWorkspaceStore } from '@/stores/agent-workspace-store'
import type { ActionLogItem } from '@/lib/modules/types'

interface AgentActivityItemProps {
  item: ActionLogItem
  isSelected?: boolean
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60_000)

    if (diffMin < 2) return 'agora'
    if (diffMin < 60) return `${diffMin}min`

    const hours = date.getHours().toString().padStart(2, '0')
    const mins = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${mins}`
  } catch {
    return timestamp
  }
}

function isRecent(timestamp: string): boolean {
  try {
    const date = new Date(timestamp)
    const diffMs = Date.now() - date.getTime()
    return diffMs < 5 * 60_000
  } catch {
    return false
  }
}

export default function AgentActivityItem({ item, isSelected }: AgentActivityItemProps) {
  const setSelectedArtifact = useAgentWorkspaceStore((s) => s.setSelectedArtifact)

  const handleClick = () => {
    setSelectedArtifact(item.runOutputId)
  }

  const recent = item.status === 'in_progress' || isRecent(item.timestamp)

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
      )}
    >
      {/* Status dot */}
      <span className="shrink-0">
        {item.status === 'done' && (
          <span className="bg-muted-foreground/40 block h-2 w-2 rounded-full" />
        )}
        {item.status === 'in_progress' && (
          <span className="block h-2 w-2 animate-pulse rounded-full bg-red-500" />
        )}
        {item.status === 'scheduled' && (
          <span className="bg-muted-foreground/25 block h-2 w-2 rounded-full" />
        )}
        {item.status === 'pending' && (
          <span className="border-muted-foreground/40 block h-2 w-2 rounded-full border border-dashed" />
        )}
      </span>

      {/* Label */}
      <span className="text-foreground min-w-0 flex-1 truncate text-xs">{item.summaryText}</span>

      {/* Right side: timestamp + optional badge + chevron */}
      <span className="flex shrink-0 items-center gap-1.5">
        {recent && item.status === 'in_progress' && (
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            agora
          </span>
        )}
        <span className="text-muted-foreground text-[10px]">{formatTimestamp(item.timestamp)}</span>
        <ChevronRight className="text-muted-foreground/50 h-3 w-3" />
      </span>
    </button>
  )
}
