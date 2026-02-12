'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase/client'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import type { SequenceStepConfig } from '@/lib/workflow-editor/step-defaults'

interface WorkflowOption {
  id: string
  name: string
  emoji: string | null
  status: string
}

export default function SequenceStepConfigForm({
  config,
  onUpdate,
}: {
  config: SequenceStepConfig
  onUpdate: (config: SequenceStepConfig) => void
}) {
  const currentWorkflowId = useWorkflowEditorStore((s) => s.workflowId)
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createBrowserClient()

      const { data: current } = await supabase
        .from('workflows')
        .select('team_id')
        .eq('id', currentWorkflowId)
        .single()

      if (cancelled || !current) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('workflows')
        .select('id, name, emoji, status')
        .eq('team_id', current.team_id)
        .eq('status', 'published')
        .neq('id', currentWorkflowId)
        .order('name', { ascending: true })
        .limit(50)

      if (!cancelled) {
        setWorkflows(data ?? [])
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [currentWorkflowId])

  const selected = workflows.find((w) => w.id === config.workflow_id)

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label className="text-sm font-medium">Sub-Workflow</Label>
        <p className="text-muted-foreground mt-1 text-xs">
          Select a published workflow to execute as a step in this workflow
        </p>
      </div>

      <div>
        <Label className="text-xs">Workflow</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="mt-1 w-full justify-between font-normal"
              disabled={loading}
            >
              {loading ? (
                <span className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading workflows...
                </span>
              ) : selected ? (
                <span className="truncate">
                  {selected.emoji} {selected.name}
                </span>
              ) : (
                <span className="text-muted-foreground">Search workflows...</span>
              )}
              <ChevronsUpDown className="text-muted-foreground ml-2 h-4 w-4 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search workflows..." />
              <CommandList>
                <CommandEmpty>No published workflows found.</CommandEmpty>
                <CommandGroup>
                  {workflows.map((w) => (
                    <CommandItem
                      key={w.id}
                      value={`${w.emoji ?? ''} ${w.name}`}
                      onSelect={() => {
                        onUpdate({
                          ...config,
                          workflow_id: w.id,
                          workflow_name: w.name,
                        })
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          config.workflow_id === w.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {w.emoji} {w.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {config.workflow_id && config.workflow_name && (
        <div className="bg-muted rounded-lg px-3 py-2">
          <p className="text-sm font-medium">{config.workflow_name}</p>
          <p className="text-muted-foreground text-xs">
            All steps from this workflow will be executed in sequence
          </p>
        </div>
      )}
    </div>
  )
}
