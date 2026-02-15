'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  FileText,
  Star,
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
import type { WebhookTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'
import {
  useSaveWorkflow,
  usePublishWorkflow,
  useDuplicateWorkflow,
} from '@/hooks/use-workflow-data'
import { useStartWorkflowRun } from '@/hooks/use-workflow-runs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import SharingDialog from '@/components/workflow-editor/sharing-dialog'
import NotificationsPopover from '@/components/workflow-editor/notifications-popover'
import { cn } from '@/lib/utils'

const WORKFLOW_EMOJIS = [
  '📄',
  '⚡',
  '🔄',
  '📧',
  '📊',
  '🤖',
  '🔔',
  '📅',
  '🎯',
  '🚀',
  '💬',
  '📝',
  '🔗',
  '⭐',
  '🛠️',
  '📦',
  '🔍',
  '💡',
  '🎨',
  '📱',
  '🌐',
  '💰',
  '🔒',
  '📈',
]

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
    isSaving,
    setWorkflowName,
    setWorkflowEmoji,
    toggleStar,
    setWorkflowStatus,
    setActiveTab,
    setPendingRunId,
    clearDirty,
    setSaving,
  } = useWorkflowEditorStore()

  const [sharingOpen, setSharingOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  const saveWorkflow = useSaveWorkflow(workflowId)
  const publishWorkflow = usePublishWorkflow(workflowId)
  const duplicateWorkflow = useDuplicateWorkflow()
  const startRun = useStartWorkflowRun(workflowId)

  const handleSave = async () => {
    if (!workflowId) return

    // Read latest state at call time (not from render closure) to avoid stale data
    const s = useWorkflowEditorStore.getState()
    setSaving(true)
    try {
      await saveWorkflow.mutateAsync({
        name: s.workflowName,
        emoji: s.workflowEmoji,
        isStarred: s.isStarred,
        trigger: s.trigger,
        steps: s.steps,
      })
      clearDirty()
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)
    } catch (error) {
      toast.error('Save failed', {
        description: error instanceof Error ? error.message : 'Could not save workflow',
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePublishToggle = async () => {
    const newStatus = workflowStatus === 'published' ? 'draft' : 'published'
    try {
      const result = await publishWorkflow.mutateAsync(newStatus)
      setWorkflowStatus(newStatus)

      // Update store with server-generated webhook token and secret
      if (newStatus === 'published' && trigger?.type === 'webhook') {
        const currentConfig = trigger.config as WebhookTriggerConfig
        const newConfig = { ...currentConfig }
        let updated = false
        if (result.webhookToken && !currentConfig.webhook_token) {
          newConfig.webhook_token = result.webhookToken
          updated = true
        }
        if (result.webhookSecret && !currentConfig.secret) {
          newConfig.secret = result.webhookSecret
          updated = true
        }
        if (updated) {
          useWorkflowEditorStore.getState().setTrigger({ ...trigger, config: newConfig })
          useWorkflowEditorStore.getState().clearDirty()
        }
      }

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
      if (result.newWorkflowId) {
        toast.success('Workflow duplicated')
        router.push(`/workflows/${result.newWorkflowId}/edit`)
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
      toast.success('Workflow deleted successfully')
      router.push('/workspace')
    } catch (error) {
      toast.error('Delete failed', {
        description: error instanceof Error ? error.message : 'Could not delete workflow',
      })
    }
  }

  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link
          href="/workspace"
          className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
          title="Back to workspace"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              className="border-primary/50 text-primary h-8 w-8 rounded-md"
              aria-label="Change workflow icon"
            >
              {workflowEmoji ? (
                <span className="text-sm leading-none">{workflowEmoji}</span>
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[232px] p-2" align="start">
            <div className="grid grid-cols-8 gap-1">
              {WORKFLOW_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={cn(
                    'hover:bg-muted flex h-7 w-7 items-center justify-center rounded text-sm transition-colors',
                    workflowEmoji === emoji && 'bg-primary/10 ring-primary ring-1'
                  )}
                  onClick={() => setWorkflowEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="h-8 max-w-[240px] border-none bg-transparent text-sm font-medium shadow-none focus-visible:ring-0"
        />

        <Button variant="ghost" size="icon-sm" className="h-8 w-8" onClick={toggleStar}>
          <Star className={cn('h-4 w-4', isStarred && 'fill-yellow-400 text-yellow-400')} />
        </Button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {isSaving && (
            <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
          )}
          {showSaved && !isSaving && <span className="text-muted-foreground text-xs">Saved</span>}
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
            Save
          </Button>
        </div>

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
            <DropdownMenuItem onClick={handleDuplicate} className="gap-2">
              <FileText className="h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
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
