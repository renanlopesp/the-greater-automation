'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SkillRunHistoryProps {
  runs: Array<{
    id: string
    skill_id: string
    status: string
    trigger_data: Record<string, unknown> | null
    actions_executed: unknown[] | null
    error: string | null
    duration_ms: number | null
    created_at: string
    agent_skills: { name: string } | null
  }>
}

export default function SkillRunHistory({ runs }: SkillRunHistoryProps) {
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())

  function toggleExpanded(runId: string) {
    setExpandedRuns((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) {
        next.delete(runId)
      } else {
        next.add(runId)
      }
      return next
    })
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-700">
            Completed
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-700">
            Failed
          </Badge>
        )
      case 'pending':
        return (
          <Badge
            variant="outline"
            className="border-yellow-500/50 bg-yellow-500/10 text-yellow-700"
          >
            Pending
          </Badge>
        )
      case 'skipped':
        return (
          <Badge variant="outline" className="border-gray-500/50 bg-gray-500/10 text-gray-700">
            Skipped
          </Badge>
        )
      case 'running':
        return (
          <Badge variant="outline" className="border-blue-500/50 bg-blue-500/10 text-blue-700">
            Running
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (runs.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-foreground text-[15px] font-semibold">Skill run history</h2>
        <div className="bg-background overflow-hidden rounded-2xl border shadow-sm">
          <div className="px-4 py-8 text-center">
            <p className="text-muted-foreground text-sm">No skill runs yet</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-foreground text-[15px] font-semibold">Skill run history</h2>
      <div className="bg-background overflow-hidden rounded-2xl border shadow-sm">
        <div className="divide-y">
          {runs.map((run) => {
            const isExpanded = expandedRuns.has(run.id)
            const skillName = run.agent_skills?.name ?? 'Unknown skill'

            return (
              <div key={run.id}>
                <button
                  type="button"
                  onClick={() => toggleExpanded(run.id)}
                  className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{skillName}</p>
                      {getStatusBadge(run.status)}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                      {run.duration_ms && ` • ${(run.duration_ms / 1000).toFixed(1)}s`}
                    </p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="bg-muted/20 min-w-0 border-t px-4 py-3">
                    {run.error && (
                      <div className="mb-3">
                        <p className="text-destructive text-xs font-medium">Error</p>
                        <p className="text-muted-foreground mt-1 text-xs break-words">
                          {run.error}
                        </p>
                      </div>
                    )}
                    {run.trigger_data && (
                      <div className="mb-3">
                        <p className="text-foreground text-xs font-medium">Trigger data</p>
                        <pre className="bg-background text-muted-foreground mt-1 rounded border p-2 text-xs break-all whitespace-pre-wrap">
                          {JSON.stringify(run.trigger_data, null, 2)}
                        </pre>
                      </div>
                    )}
                    {run.actions_executed && Array.isArray(run.actions_executed) && (
                      <div>
                        <p className="text-foreground text-xs font-medium">
                          Actions executed ({run.actions_executed.length})
                        </p>
                        <div className="mt-1 space-y-1">
                          {run.actions_executed.map((action: unknown, idx: number) => (
                            <pre
                              key={idx}
                              className="bg-background text-muted-foreground rounded border p-2 text-xs break-all whitespace-pre-wrap"
                            >
                              {JSON.stringify(action, null, 2)}
                            </pre>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
