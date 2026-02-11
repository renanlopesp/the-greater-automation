'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useTestResults } from '@/hooks/use-workflow-runs'
import { cn } from '@/lib/utils'

interface TestsTabProps {
  workflowId: string
}

export default function TestsTab({ workflowId }: TestsTabProps) {
  const { data: results = [], isLoading } = useTestResults(workflowId)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="bg-muted flex h-20 w-20 items-center justify-center rounded-full">
          <FlaskConical className="text-muted-foreground h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">No test results yet</h3>
          <p className="text-muted-foreground text-sm">
            Test individual steps from the editor to see results here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Test results</h2>
            <p className="text-muted-foreground text-sm">
              {results.length} result{results.length !== 1 ? 's' : ''} &middot; auto-expire after
              24h
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 px-6 py-4">
          {results.map((result) => (
            <Collapsible
              key={result.id}
              open={expandedIds.has(result.id)}
              onOpenChange={() => toggleExpand(result.id)}
            >
              <div
                className={cn(
                  'bg-card rounded-lg border',
                  result.status === 'failed' && 'border-red-300 bg-red-50 dark:bg-red-950/20',
                  result.status === 'running' && 'border-blue-300 bg-blue-50 dark:bg-blue-950/20'
                )}
              >
                <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center gap-3 p-4 text-left transition-colors">
                  {result.status === 'running' ? (
                    <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-blue-600" />
                  ) : result.status === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.step_name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {result.step_type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Step {result.step_position + 1}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
                      </span>
                      <span>{formatDuration(result.duration_ms)}</span>
                      <span>
                        Expires{' '}
                        {formatDistanceToNow(new Date(result.expires_at), { addSuffix: true })}
                      </span>
                    </div>
                    {result.error && (
                      <div className="mt-2 text-sm font-medium text-red-700 dark:text-red-400">
                        {result.error}
                      </div>
                    )}
                  </div>
                  {expandedIds.has(result.id) ? (
                    <ChevronUp className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 border-t px-4 py-3">
                    {result.step_config &&
                      typeof result.step_config === 'object' &&
                      Object.keys(result.step_config as Record<string, unknown>).length > 0 && (
                        <div>
                          <div className="text-muted-foreground mb-1 text-xs font-medium">
                            Step config
                          </div>
                          <pre className="bg-muted max-h-[400px] overflow-auto rounded-md p-3 text-xs break-all whitespace-pre-wrap">
                            {JSON.stringify(result.step_config, null, 2)}
                          </pre>
                        </div>
                      )}
                    {result.output != null && (
                      <div>
                        <div className="text-muted-foreground mb-1 text-xs font-medium">Output</div>
                        <pre className="bg-muted max-h-[400px] overflow-auto rounded-md p-3 text-xs break-all whitespace-pre-wrap">
                          {typeof result.output === 'string'
                            ? result.output
                            : JSON.stringify(result.output, null, 2)}
                        </pre>
                      </div>
                    )}
                    {!result.output && !result.error && (
                      <div className="text-muted-foreground text-xs italic">
                        No output data available
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}
