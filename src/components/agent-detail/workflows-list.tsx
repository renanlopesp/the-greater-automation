'use client'

import { useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Webhook, Clock, MessageSquare, Play, Zap, X } from 'lucide-react'
import { removeWorkflow } from '@/lib/actions/agent-workflows'
import { useInvalidateAgentWorkflows } from '@/hooks/use-agent-workflows'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Workflow {
  id: string
  name: string
  description: string | null
  source: string | null
  last_run_at: string | null
  workflow_id?: string | null
  workflow: { name: string; emoji: string } | null
  action_template?: Record<string, unknown> | null
  trigger_config?: Record<string, unknown> | null
  conditions?: unknown[]
  actions?: unknown[]
  is_enabled?: boolean
  execution_mode?: string
  run_count?: number
}

interface TriggerSubscription {
  id: string
  agent_workflow_id: string
  trigger_slug: string
  app_id: string
  is_enabled: boolean
  last_event_at: string | null
  event_count: number
}

interface WorkflowsListProps {
  workflows: Workflow[]
  agentId: string
  teamId: string
  triggerSubscriptions?: TriggerSubscription[]
}

const EMPTY_SUBSCRIPTIONS: TriggerSubscription[] = []

export default function WorkflowsList({
  workflows,
  agentId,
  triggerSubscriptions = EMPTY_SUBSCRIPTIONS,
}: WorkflowsListProps) {
  const invalidateWorkflows = useInvalidateAgentWorkflows(agentId)
  const [isPending, startTransition] = useTransition()
  const [executingWorkflows, setExecutingWorkflows] = useState<Set<string>>(new Set())

  function handleRemove(workflowId: string) {
    startTransition(async () => {
      const result = await removeWorkflow(workflowId, agentId)
      if (!result.error) {
        invalidateWorkflows()
      }
    })
  }

  async function handleToggleEnabled(workflowId: string, currentEnabled: boolean) {
    // TODO: Implement toggle enabled action
    console.log('Toggle workflow', workflowId, !currentEnabled)
  }

  async function handleExecute(workflowId: string) {
    setExecutingWorkflows((prev) => new Set(prev).add(workflowId))
    try {
      const response = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_data: {} }),
      })
      const result = await response.json()
      if (result.success) {
        invalidateWorkflows()
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error)
    } finally {
      setExecutingWorkflows((prev) => {
        const next = new Set(prev)
        next.delete(workflowId)
        return next
      })
    }
  }

  function getTriggerIcon(triggerConfig: Record<string, unknown> | null | undefined) {
    const type = triggerConfig?.type as string | undefined
    switch (type) {
      case 'webhook':
        return <Webhook className="h-4 w-4" />
      case 'scheduled':
        return <Clock className="h-4 w-4" />
      case 'chat_command':
        return <MessageSquare className="h-4 w-4" />
      case 'manual':
        return <Play className="h-4 w-4" />
      case 'app_event':
        return <Zap className="h-4 w-4 text-amber-500" />
      default:
        return <Zap className="h-4 w-4" />
    }
  }

  function TriggerStatusIndicator({ workflowId }: { workflowId: string }) {
    const sub = triggerSubscriptions.find((ts) => ts.agent_workflow_id === workflowId)
    if (!sub) return null
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
          sub.is_enabled
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
            : 'bg-muted text-muted-foreground'
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            sub.is_enabled ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground'
          )}
        />
        {sub.is_enabled ? 'Escutando' : 'Pausado'}
      </span>
    )
  }

  // Separate legacy and rule workflows
  const legacyWorkflows = workflows.filter(
    (w) => w.source === 'manual' || w.source === 'dynamic' || w.source === 'provision'
  )
  const ruleWorkflows = workflows.filter((w) => w.source === 'rule')

  return (
    <div className="space-y-3">
      <div className="bg-background overflow-hidden rounded-2xl border shadow-sm">
        <div className="divide-y">
          {/* Rule-based workflows */}
          {ruleWorkflows.map((workflow) => {
            const conditionCount = Array.isArray(workflow.conditions)
              ? workflow.conditions.length
              : 0
            const isManualTrigger =
              (workflow.trigger_config as Record<string, unknown> | null)?.type === 'manual'

            return (
              <div
                key={workflow.id}
                className="hover:bg-muted/40 group flex items-center gap-3 px-4 py-3 transition-colors"
              >
                <div className="bg-background text-muted-foreground relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border shadow-sm">
                  {getTriggerIcon(workflow.trigger_config)}
                  {conditionCount > 0 && (
                    <span className="bg-primary text-primary-foreground absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] leading-none font-bold">
                      {conditionCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{workflow.name}</p>
                    <TriggerStatusIndicator workflowId={workflow.id} />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {workflow.last_run_at
                      ? `Executado ${formatDistanceToNow(new Date(workflow.last_run_at), { addSuffix: true })}`
                      : 'Nunca executou'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isManualTrigger && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExecute(workflow.id)}
                      disabled={executingWorkflows.has(workflow.id)}
                      className="h-8 px-2"
                    >
                      {executingWorkflows.has(workflow.id) ? 'Executando...' : 'Executar'}
                    </Button>
                  )}
                  <Switch
                    checked={workflow.is_enabled ?? false}
                    onCheckedChange={() =>
                      handleToggleEnabled(workflow.id, workflow.is_enabled ?? false)
                    }
                    aria-label="Toggle workflow"
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRemove(workflow.id)}
                    className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Legacy workflows (manual/dynamic) */}
          {legacyWorkflows.map((workflow) => {
            const isDynamic = workflow.source === 'dynamic'
            const emoji = isDynamic ? '⚡' : (workflow.workflow?.emoji ?? '🔧')

            return (
              <div
                key={workflow.id}
                className="hover:bg-muted/40 group flex items-center gap-3 px-4 py-3 transition-colors"
              >
                <div className="bg-background relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border shadow-sm">
                  <span className="text-xl">{emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{workflow.name}</p>
                    {isDynamic && (
                      <Badge variant="secondary" className={cn('text-xs')}>
                        Dynamic
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {workflow.description
                      ? workflow.description
                      : workflow.last_run_at
                        ? `Executado ${formatDistanceToNow(new Date(workflow.last_run_at), { addSuffix: true })}`
                        : 'Nunca executou'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRemove(workflow.id)}
                  className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}

          {/* Help text for creating new workflows */}
          {workflows.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-muted-foreground text-sm">Nenhuma automação ainda</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Converse com seu agente para criar novas automações
              </p>
            </div>
          ) : (
            <div className="bg-muted/20 px-4 py-3">
              <p className="text-muted-foreground text-center text-xs">
                Converse com seu agente para criar novas automações
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
