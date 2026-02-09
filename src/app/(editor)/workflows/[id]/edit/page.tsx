'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import { useWorkflowData } from '@/hooks/use-workflow-data'
import EditorShell from '@/components/editor/editor-shell'

export default function WorkflowEditorPage() {
  const params = useParams<{ id: string }>()
  const { initializeWorkflow, resetStore, isDirty, selectStep } = useWorkflowEditorStore()
  const { data, isLoading } = useWorkflowData(params.id)

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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (isInput) return

      if (e.key === 'Escape') {
        selectStep(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectStep])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading workflow...</div>
      </div>
    )
  }

  return <EditorShell />
}
