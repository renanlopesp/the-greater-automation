'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from '@/lib/data/workflow-templates'
import { createWorkflowFromTemplate } from '@/lib/actions/workspace'
import { cn } from '@/lib/utils'

interface TemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  userId: string
}

export function TemplateDialog({ open, onOpenChange, teamId, userId }: TemplateDialogProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleSelect(template: WorkflowTemplate) {
    if (loadingId) return

    setLoadingId(template.id)
    try {
      const result = await createWorkflowFromTemplate(teamId, userId, template.id)

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.id) {
        onOpenChange(false)
        router.push(`/workflows/${result.id}/edit`)
      }
    } catch {
      toast.error('Failed to create workflow from template')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create from template</DialogTitle>
          <DialogDescription>
            Choose a template to get started quickly with a pre-configured workflow.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {WORKFLOW_TEMPLATES.map((template) => {
            const isLoading = loadingId === template.id
            const isDisabled = loadingId !== null

            return (
              <button
                key={template.id}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelect(template)}
                className={cn(
                  'bg-background hover:bg-accent flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                  'disabled:pointer-events-none disabled:opacity-50'
                )}
              >
                <span className="text-2xl leading-none" role="img" aria-label={template.name}>
                  {template.emoji}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {template.name}
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  </span>
                  <span className="text-muted-foreground text-xs leading-relaxed">
                    {template.description}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
