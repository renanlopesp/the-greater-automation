'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  FileText,
  Star,
  ChevronDown,
  Bell,
  UserPlus,
  MoreHorizontal,
  Play,
  Download,
  Trash2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import {
  useSaveWorkflow,
  usePublishWorkflow,
  useDuplicateWorkflow,
} from '@/hooks/use-workflow-data'
import { useStartWorkflowRun } from '@/hooks/use-workflow-runs'
import SharingDialog from '@/components/workflow-editor/sharing-dialog'
import NotificationsPopover from '@/components/workflow-editor/notifications-popover'
import { cn } from '@/lib/utils'

export default function EditorHeader() {
  const router = useRouter()
  const {
    workflowId,
    workflowName,
    workflowEmoji,
    isStarred,
    trigger,
    steps,
    workflowStatus,
    isDirty,
    setWorkflowName,
    toggleStar,
    setWorkflowStatus,
    setActiveTab,
    setPendingRunId,
    clearDirty,
  } = useWorkflowEditorStore()

  const [sharingOpen, setSharingOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const saveWorkflow = useSaveWorkflow(workflowId)
  const publishWorkflow = usePublishWorkflow(workflowId)
  const duplicateWorkflow = useDuplicateWorkflow()
  const startRun = useStartWorkflowRun(workflowId)

  const handleSave = async () => {
    if (!isDirty || !workflowId) return

    setSaveStatus('saving')
    try {
      await saveWorkflow.mutateAsync({
        name: workflowName,
        emoji: workflowEmoji,
        isStarred,
        trigger,
        steps,
      })
      clearDirty()
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      toast.error('Save failed', {
        description: error instanceof Error ? error.message : 'Could not save workflow',
      })
      setSaveStatus('idle')
    }
  }

  const handlePublishToggle = async () => {
    const newStatus = workflowStatus === 'published' ? 'draft' : 'published'
    try {
      await publishWorkflow.mutateAsync(newStatus)
      setWorkflowStatus(newStatus)
      toast.success(newStatus === 'published' ? 'Workflow published' : 'Workflow unpublished')
    } catch (error) {
      toast.error('Publish failed', {
        description: error instanceof Error ? error.message : 'Could not publish workflow',
      })
    }
  }

  const handleDuplicate = async () => {
    try {
      const result = await duplicateWorkflow.mutateAsync(workflowId)
      if (result.id) {
        router.push(`/workflows/${result.id}/edit`)
      }
    } catch (error) {
      toast.error('Duplicate failed', {
        description: error instanceof Error ? error.message : 'Could not duplicate workflow',
      })
    }
  }

  const handleRun = async () => {
    if (workflowStatus !== 'published') {
      toast.error('Cannot run workflow', {
        description: 'Publish the workflow before running it.',
      })
      return
    }
    try {
      const result = await startRun.mutateAsync()
      setActiveTab('runs')
      setPendingRunId(result.runId)
      toast.success('Workflow run started')
    } catch (error) {
      toast.error('Run failed', {
        description: error instanceof Error ? error.message : 'Could not start workflow run',
      })
    }
  }

  const handleExportJSON = () => {
    const data = {
      name: workflowName,
      emoji: workflowEmoji,
      isStarred,
      trigger,
      steps,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflowName.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete workflow')
      }
      router.push('/workflows')
    } catch (error) {
      toast.error('Delete failed', {
        description: error instanceof Error ? error.message : 'Could not delete workflow',
      })
    }
  }

  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        {/* App mark (prod has a fixed icon here, not the workflow emoji) */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground h-8 w-8 rounded-md"
          aria-label="Snew"
        >
          <span className="text-sm leading-none font-semibold select-none">t</span>
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          className="border-primary/25 text-primary h-8 w-8 rounded-md"
          aria-label="Workflow"
        >
          <FileText className="h-4 w-4" />
        </Button>

        <Input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="h-8 max-w-[240px] border-none bg-transparent text-sm font-medium shadow-none focus-visible:ring-0"
        />

        <Button variant="ghost" size="icon-sm" className="h-8 w-8" onClick={toggleStar}>
          <Star className={cn('h-4 w-4', isStarred && 'fill-yellow-400 text-yellow-400')} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-8 w-8">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => {
                const input = document.querySelector('input[value="' + workflowName + '"]')
                if (input instanceof HTMLInputElement) {
                  input.focus()
                  input.select()
                }
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate}>Duplicate</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        {isDirty && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
          </Button>
        )}

        <Button
          variant={workflowStatus === 'published' ? 'default' : 'outline'}
          size="sm"
          onClick={handlePublishToggle}
          className="gap-2"
        >
          {workflowStatus === 'published' && <span className="h-2 w-2 rounded-full bg-green-500" />}
          {workflowStatus === 'published' ? 'Published' : 'Publish'}
        </Button>

        <Button variant="outline" size="sm" onClick={handleRun} className="gap-2">
          <Play className="h-3 w-3" />
          Run
        </Button>

        <NotificationsPopover>
          <Button variant="ghost" size="icon-sm" className="h-8 w-8">
            <Bell className="h-4 w-4" />
          </Button>
        </NotificationsPopover>

        <Button variant="ghost" size="icon-sm" className="h-8 w-8">
          <UserPlus className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={() => setSharingOpen(true)}>
          Sharing
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportJSON} className="gap-2">
              <Download className="h-4 w-4" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete workflow
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SharingDialog open={sharingOpen} onOpenChange={setSharingOpen} workflowId={workflowId} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the workflow &ldquo;
              {workflowName}
              &rdquo; and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
