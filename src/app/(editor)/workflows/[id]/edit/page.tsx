'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import { useWorkflowData, useSaveWorkflow } from '@/hooks/use-workflow-data'
import EditorShell from '@/components/editor/editor-shell'
import KeyboardShortcutsDialog from '@/components/workflow-editor/keyboard-shortcuts-dialog'

export default function WorkflowEditorPage() {
  const params = useParams<{ id: string }>()
  const { data, isLoading } = useWorkflowData(params.id)
  const saveWorkflow = useSaveWorkflow(params.id)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const isDirtyRef = useRef(false)

  // Subscribe to storeWorkflowId so the component re-renders if the store
  // is reset by a late cleanup from the previous page (React 18 transitions
  // can fire the old cleanup AFTER the new component renders).
  const storeWorkflowId = useWorkflowEditorStore((s) => s.workflowId)
  const needsInit = storeWorkflowId !== params.id

  // Initialize store in an effect to avoid "Cannot update a component while
  // rendering" warnings. The `needsInit` guard ensures this only fires when
  // the store doesn't match the current route — NOT on query refetches.
  useEffect(() => {
    if (data && needsInit) {
      useWorkflowEditorStore.getState().initializeWorkflow(data)
    } else if (!data && !isLoading && !storeWorkflowId) {
      useWorkflowEditorStore.getState().initializeWorkflow({ workflowId: params.id })
    }
  }, [data, isLoading, needsInit, storeWorkflowId, params.id])

  // Reset store on unmount
  useEffect(() => {
    return () => {
      useWorkflowEditorStore.getState().resetStore()
    }
  }, [params.id])

  // Keep isDirtyRef in sync via Zustand subscribe
  useEffect(() => {
    return useWorkflowEditorStore.subscribe((state) => {
      isDirtyRef.current = state.isDirty
    })
  }, [])

  // Beforeunload — stable handler using ref
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // Auto-save via Zustand subscribe + debounce
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const unsubscribe = useWorkflowEditorStore.subscribe((state, prevState) => {
      // Only trigger on dirty state transitions
      if (!state.isDirty || state.isDirty === prevState.isDirty) return
      if (!params.id) return

      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(async () => {
        const s = useWorkflowEditorStore.getState()
        if (!s.isDirty) return
        try {
          await saveWorkflow.mutateAsync({
            name: s.workflowName,
            emoji: s.workflowEmoji,
            isStarred: s.isStarred,
            trigger: s.trigger,
            steps: s.steps,
          })
          useWorkflowEditorStore.getState().clearDirty()
        } catch (error) {
          console.error('Auto-save failed:', error)
        }
      }, 3000)
    })

    return () => {
      unsubscribe()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [params.id, saveWorkflow])

  // Save function for keyboard shortcut
  const handleSave = useCallback(async () => {
    const s = useWorkflowEditorStore.getState()
    if (!s.isDirty || !params.id) return
    try {
      await saveWorkflow.mutateAsync({
        name: s.workflowName,
        emoji: s.workflowEmoji,
        isStarred: s.isStarred,
        trigger: s.trigger,
        steps: s.steps,
      })
      useWorkflowEditorStore.getState().clearDirty()
    } catch (error) {
      console.error('Save failed:', error)
    }
  }, [params.id, saveWorkflow])

  // Keyboard shortcuts — stable handler, reads state at call time via getState()
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if (e.key === '?' && !isInput) {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }

      if (e.key === 'Escape') {
        useWorkflowEditorStore.getState().selectStep(null)
        return
      }

      if (isInput) return

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        useWorkflowEditorStore.getState().undo()
        return
      }

      if (cmdOrCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        useWorkflowEditorStore.getState().redo()
        return
      }

      if (cmdOrCtrl && e.key === 's') {
        e.preventDefault()
        handleSave()
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedStepId, deleteStep } = useWorkflowEditorStore.getState()
        if (selectedStepId) {
          e.preventDefault()
          deleteStep(selectedStepId)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  if (isLoading || needsInit) {
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
