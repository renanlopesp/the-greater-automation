'use client'

import { useState, useEffect, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/client'
import { addSkill } from '@/lib/actions/agent-skills'

interface Workflow {
  id: string
  name: string
  emoji: string | null
}

interface AddSkillDialogProps {
  agentId: string
  teamId: string
  existingSkillWorkflowIds: string[]
  trigger: ReactNode
}

export default function AddSkillDialog({
  agentId,
  teamId,
  existingSkillWorkflowIds,
  trigger,
}: AddSkillDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return

    async function fetchWorkflows() {
      setLoading(true)
      const supabase = createBrowserClient()

      const { data } = await supabase
        .from('workflows')
        .select('id, name, emoji')
        .eq('team_id', teamId)
        .order('name', { ascending: true })

      const available = (data ?? []).filter((w) => !existingSkillWorkflowIds.includes(w.id))
      setWorkflows(available)
      setLoading(false)
    }

    fetchWorkflows()
  }, [open, teamId, existingSkillWorkflowIds])

  function handleAdd(workflowId: string) {
    startTransition(async () => {
      const result = await addSkill(agentId, workflowId)
      if (!result.error) {
        router.refresh()
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add skill</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : workflows.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No available workflows to add.
          </p>
        ) : (
          <div className="max-h-[300px] divide-y overflow-y-auto">
            {workflows.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 px-1 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-base">{w.emoji ?? '📋'}</span>
                  <span className="truncate text-sm font-medium">{w.name}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleAdd(w.id)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
