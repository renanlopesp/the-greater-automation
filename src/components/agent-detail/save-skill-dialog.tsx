'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { saveSkillFromExecution, type SaveSkillInput } from '@/lib/actions/agent-skills'

interface SaveSkillDialogProps {
  agentId: string
  toolExecutions: Array<{
    action: string
    appId: string
    inputs: Record<string, unknown>
  }>
  trigger: React.ReactNode
  onSaved?: () => void
}

export default function SaveSkillDialog({
  agentId,
  toolExecutions,
  trigger,
  onSaved,
}: SaveSkillDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    if (!name.trim()) {
      setError('Skill name is required')
      return
    }

    const input: SaveSkillInput = {
      agentId,
      name: name.trim(),
      description: description.trim() || undefined,
      toolExecutions,
    }

    startTransition(async () => {
      const result = await saveSkillFromExecution(input)

      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setName('')
        setDescription('')
        setError(null)
        onSaved?.()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save as Skill</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="skill-name">Skill Name</Label>
            <Input
              id="skill-name"
              placeholder="e.g., Create GitHub Issue"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-description">Description (optional)</Label>
            <Textarea
              id="skill-description"
              placeholder="What does this skill do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Actions to Save</Label>
            <div className="bg-muted/50 rounded-lg border p-3 text-sm">
              <ul className="list-disc space-y-1 pl-4">
                {toolExecutions.map((execution, index) => (
                  <li key={index} className="text-muted-foreground">
                    {execution.action.replace(/_/g, ' ').toLowerCase()}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {error && (
            <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Skill'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
