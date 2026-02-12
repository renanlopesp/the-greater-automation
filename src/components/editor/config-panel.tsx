'use client'

import { useSyncExternalStore } from 'react'
import { ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import StepConfigPanel from '@/components/workflow-editor/step-config-panel'
import TriggerConfigPanel from '@/components/workflow-editor/trigger-config-panel'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'

function useIsMobile() {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia('(max-width: 1023px)')
      mq.addEventListener('change', callback)
      return () => mq.removeEventListener('change', callback)
    },
    () => window.matchMedia('(max-width: 1023px)').matches,
    () => false
  )
}

export default function ConfigPanel() {
  const { selectedStepId, selectStep, isTriggerConfigOpen, closeTriggerConfig } =
    useWorkflowEditorStore()
  const isMobile = useIsMobile()

  const isOpen = !!selectedStepId || isTriggerConfigOpen

  if (!isOpen && !isMobile) return null

  const panelContent = selectedStepId ? <StepConfigPanel /> : <TriggerConfigPanel />

  const handleClose = () => {
    if (selectedStepId) selectStep(null)
    if (isTriggerConfigOpen) closeTriggerConfig()
  }

  return (
    <>
      {isOpen && !isMobile && (
        <>
          <ResizableHandle />
          <ResizablePanel defaultSize={30} minSize={25}>
            <div className="h-full overflow-hidden">{panelContent}</div>
          </ResizablePanel>
        </>
      )}

      {isMobile && (
        <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
          <SheetContent
            side="right"
            className="w-full p-0 sm:max-w-[400px]"
            showCloseButton={false}
          >
            {panelContent}
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
