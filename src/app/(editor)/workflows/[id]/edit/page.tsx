'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import TopBar from '@/components/workflow-editor/top-bar'
import EditorLayout from '@/components/workflow-editor/editor-layout'
import AIAssistantPanel from '@/components/workflow-editor/ai-assistant-panel'
import StepCanvas from '@/components/workflow-editor/step-canvas'
import StepConfigPanel from '@/components/workflow-editor/step-config-panel'

export default function WorkflowEditorPage() {
  const params = useParams<{ id: string }>()
  const { initializeWorkflow, resetStore, isDirty, selectStep } = useWorkflowEditorStore()

  useEffect(() => {
    initializeWorkflow({ workflowId: params.id })
    return () => resetStore()
  }, [params.id, initializeWorkflow, resetStore])

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

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <Tabs defaultValue="editor" className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b px-4">
          <TabsList className="h-10">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="editor" className="mt-0 flex flex-1 overflow-hidden">
          <EditorLayout
            assistantPanel={<AIAssistantPanel />}
            canvas={<StepCanvas />}
            configPanel={<StepConfigPanel />}
          />
        </TabsContent>
        <TabsContent value="runs" className="mt-0 flex-1">
          <div className="text-muted-foreground p-8">Runs tab coming soon</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
