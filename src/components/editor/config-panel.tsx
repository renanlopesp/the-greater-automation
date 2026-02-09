'use client'

import { useSyncExternalStore } from 'react'
import { ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import StepConfigPanel from '@/components/workflow-editor/step-config-panel'
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
  const { selectedStepId, selectStep } = useWorkflowEditorStore()
  const isMobile = useIsMobile()

  if (!selectedStepId && !isMobile) return null

  return (
    <>
      {selectedStepId && !isMobile && (
        <>
          <ResizableHandle />
          <ResizablePanel defaultSize={25} minSize={20}>
            <div className="h-full overflow-hidden">
              <StepConfigPanel />
            </div>
          </ResizablePanel>
        </>
      )}

      {isMobile && (
        <Sheet open={!!selectedStepId} onOpenChange={(open) => !open && selectStep(null)}>
          <SheetContent side="right" className="w-full p-0 sm:max-w-[400px]">
            <StepConfigPanel />
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
