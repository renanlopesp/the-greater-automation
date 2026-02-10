'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import { useWorkflowData, useSaveWorkflow } from '@/hooks/use-workflow-data'
import EditorShell from '@/components/editor/editor-shell'
import KeyboardShortcutsDialog from '@/components/workflow-editor/keyboard-shortcuts-dialog'

export default function WorkflowEditorPage() {
  const params = useParams<{ id: string }>()
  const {
    initializeWorkflow,
    resetStore,
    isDirty,
    selectStep,
    selectedStepId,
    deleteStep,
    undo,
    redo,
    workflowName,
    workflowEmoji,
    isStarred,
    trigger,
    steps,
    clearDirty,
  } = useWorkflowEditorStore()
  const { data, isLoading } = useWorkflowData(params.id)
  const saveWorkflow = useSaveWorkflow(params.id)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => {
    if (data) {
      initializeWorkflow(data)
    } else if (!isLoading) {
      // No data found or still loading — initialize with just the ID
      initializeWorkflow({ workflowId: params.id })
    }
    return () => resetStore()
  }, [data, isLoading, params.id, initializeWorkflow, resetStore])

  // Beforeunload warning for unsaved changes
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Auto-save debounced
  useEffect(() => {
    if (!isDirty || !params.id) return

    const timeoutId = setTimeout(async () => {
      try {
        await saveWorkflow.mutateAsync({
          name: workflowName,
          emoji: workflowEmoji,
          isStarred,
          trigger,
          steps,
        })
        clearDirty()
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }, 3000)

    return () => clearTimeout(timeoutId)
  }, [
    isDirty,
    params.id,
    workflowName,
    workflowEmoji,
    isStarred,
    trigger,
    steps,
    saveWorkflow,
    clearDirty,
  ])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Question mark for shortcuts help
      if (e.key === '?' && !isInput) {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        selectStep(null)
        return
      }

      // Don't handle other shortcuts in input fields
      if (isInput) return

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      // Ctrl/Cmd + Z for undo
      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Ctrl/Cmd + Shift + Z for redo
      if (cmdOrCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
        return
      }

      // Ctrl/Cmd + S for save
      if (cmdOrCtrl && e.key === 's') {
        e.preventDefault()
        if (isDirty && params.id) {
          saveWorkflow
            .mutateAsync({
              name: workflowName,
              emoji: workflowEmoji,
              isStarred,
              trigger,
              steps,
            })
            .then(() => clearDirty())
            .catch(console.error)
        }
        return
      }

      // Delete or Backspace to delete selected step
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedStepId) {
        e.preventDefault()
        deleteStep(selectedStepId)
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    selectStep,
    selectedStepId,
    deleteStep,
    undo,
    redo,
    isDirty,
    params.id,
    workflowName,
    workflowEmoji,
    isStarred,
    trigger,
    steps,
    saveWorkflow,
    clearDirty,
  ])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading workflow...</div>
      </div>
    )
  }

  return (
    <>
      <EditorShell />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  )
}
