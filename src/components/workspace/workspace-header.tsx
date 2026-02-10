'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderPlus, Network } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import SplitButton from '@/components/workspace/split-button'
import { TemplateDialog } from '@/components/workspace/template-dialog'
import { createWorkflow } from '@/lib/actions/workspace'

interface WorkspaceHeaderProps {
  teamId: string
  userId: string
}

export default function WorkspaceHeader({ teamId, userId }: WorkspaceHeaderProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)

  async function handleNewBlank() {
    if (isCreating) return
    setIsCreating(true)
    try {
      const result = await createWorkflow(teamId, userId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.id) {
        router.push(`/workflows/${result.id}/edit`)
      }
    } catch {
      toast.error('Failed to create workflow')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Network className="text-muted-foreground h-4 w-4" />
          <span>Workspace</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-background"
            disabled
            title="Coming in next update"
          >
            <FolderPlus className="h-4 w-4" />
            New folder
          </Button>
          <SplitButton
            onNewBlank={handleNewBlank}
            onNewFromTemplate={() => setTemplateOpen(true)}
          />
        </div>
      </div>
      <TemplateDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        teamId={teamId}
        userId={userId}
      />
    </>
  )
}
