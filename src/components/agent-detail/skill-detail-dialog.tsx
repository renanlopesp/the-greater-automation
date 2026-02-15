'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Trash2, Webhook, Clock, MessageSquare, Play, Zap, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface SkillDetailDialogProps {
  skill: {
    id: string
    name: string
    description: string | null
    source: string | null
    trigger_config: Record<string, unknown> | null
    conditions: unknown[]
    actions: unknown[]
    is_enabled: boolean
    execution_mode: string
    run_count: number
    last_run_at: string | null
  }
  runs: Array<{
    id: string
    status: string
    error: string | null
    duration_ms: number | null
    created_at: string
  }>
  onToggle: (skillId: string, enabled: boolean) => void
  onDelete: (skillId: string) => void
  trigger: React.ReactNode
}

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  manual: Play,
  chat_command: MessageSquare,
  webhook: Webhook,
  scheduled: Clock,
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  skipped: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  waiting_confirmation: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
}

const OPERATOR_LABELS: Record<string, string> = {
  equals: '=',
  not_equals: '!=',
  contains: 'contains',
  not_contains: '!contains',
  matches: 'matches',
  exists: 'exists',
  not_exists: '!exists',
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
}

export default function SkillDetailDialog({
  skill,
  runs,
  onToggle,
  onDelete,
  trigger,
}: SkillDetailDialogProps) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const triggerType = (skill.trigger_config as { type?: string } | null)?.type ?? 'manual'
  const TriggerIcon = TRIGGER_ICONS[triggerType] ?? Zap
  const conditions = skill.conditions as Array<{
    field: string
    operator: string
    value?: unknown
  }>
  const actions = skill.actions as Array<{
    type: string
    action?: string
    prompt?: string
    message?: string
  }>

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDelete(skill.id)
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        setConfirmDelete(false)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriggerIcon className="h-4 w-4" />
            {skill.name}
          </DialogTitle>
          <DialogDescription>{skill.description || 'No description'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={skill.is_enabled}
                onCheckedChange={(checked) => onToggle(skill.id, checked)}
              />
              <span className="text-sm">{skill.is_enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            <Badge variant="outline">{skill.execution_mode}</Badge>
          </div>

          <Separator />

          {/* Trigger */}
          <section>
            <h3 className="mb-2 text-sm font-semibold">Trigger</h3>
            <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2">
              <TriggerIcon className="text-muted-foreground h-4 w-4" />
              <span className="text-sm capitalize">{triggerType.replace('_', ' ')}</span>
              {triggerType === 'webhook' && (
                <code className="bg-background ml-auto rounded px-1.5 py-0.5 text-xs">
                  /api/agent-workflows/webhook/
                  {(skill.trigger_config as { webhook_token?: string })?.webhook_token?.slice(0, 8)}
                  ...
                </code>
              )}
              {triggerType === 'scheduled' && (
                <code className="bg-background ml-auto rounded px-1.5 py-0.5 text-xs">
                  {(skill.trigger_config as { cron_expression?: string })?.cron_expression}
                </code>
              )}
              {triggerType === 'chat_command' && (
                <code className="bg-background ml-auto rounded px-1.5 py-0.5 text-xs">
                  /{(skill.trigger_config as { command?: string })?.command}
                </code>
              )}
            </div>
          </section>

          {/* Conditions */}
          {conditions.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Conditions ({conditions.length})</h3>
              <div className="space-y-1.5">
                {conditions.map((c, i) => (
                  <div
                    key={i}
                    className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  >
                    <code className="text-xs">{c.field}</code>
                    <Badge variant="secondary" className="text-xs">
                      {OPERATOR_LABELS[c.operator] ?? c.operator}
                    </Badge>
                    {c.value !== undefined && (
                      <span className="text-muted-foreground text-xs">{String(c.value)}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Actions */}
          <section>
            <h3 className="mb-2 text-sm font-semibold">Actions ({actions.length})</h3>
            <div className="space-y-1.5">
              {actions.map((a, i) => (
                <div
                  key={i}
                  className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                >
                  <Badge variant="outline" className="text-xs">
                    {i + 1}
                  </Badge>
                  {a.type === 'composio_action' && (
                    <span>
                      <Zap className="mr-1 inline h-3 w-3" />
                      {a.action}
                    </span>
                  )}
                  {a.type === 'ai_transform' && (
                    <span className="truncate">AI: {a.prompt?.slice(0, 60)}...</span>
                  )}
                  {a.type === 'notify' && (
                    <span className="truncate">Notify: {a.message?.slice(0, 60)}</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Run History */}
          <section>
            <h3 className="mb-2 text-sm font-semibold">Recent Runs ({skill.run_count} total)</h3>
            {runs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No runs yet</p>
            ) : (
              <div className="space-y-1.5">
                {runs.slice(0, 10).map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_STYLES[run.status] ?? STATUS_STYLES.pending
                        )}
                      >
                        {run.status}
                      </span>
                      {run.error && <AlertCircle className="h-3 w-3 text-red-500" />}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      {run.duration_ms != null && <span>{run.duration_ms}ms</span>}
                      <span>
                        {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Delete */}
          <div className="flex justify-end">
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {confirmDelete ? 'Confirm delete' : 'Delete skill'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
