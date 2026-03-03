'use client'

import { useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import { cn } from '@/lib/utils'

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

interface EditorLayoutProps {
  assistantPanel: React.ReactNode
  canvas: React.ReactNode
  configPanel: React.ReactNode
}

export default function EditorLayout({ assistantPanel, canvas, configPanel }: EditorLayoutProps) {
  const isAssistantOpen = useWorkflowEditorStore((s) => s.isAssistantOpen)
  const selectedStepId = useWorkflowEditorStore((s) => s.selectedStepId)
  const toggleAssistant = useWorkflowEditorStore((s) => s.toggleAssistant)
  const selectStep = useWorkflowEditorStore((s) => s.selectStep)
  const isMobile = useIsMobile()

  return (
    <div className="flex flex-1 overflow-hidden" suppressHydrationWarning>
      {/* AI Assistant Panel */}
      <div
        className={cn(
          'flex-shrink-0 overflow-hidden border-r transition-[width] duration-300 ease-in-out',
          isAssistantOpen && !isMobile ? 'w-[440px] lg:w-[480px]' : 'w-0'
        )}
      >
        {isAssistantOpen && !isMobile && assistantPanel}
      </div>

      {/* Open Assistant button when collapsed */}
      {!isAssistantOpen && !isMobile && (
        <div className="flex w-10 flex-shrink-0 items-start justify-center border-r pt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary h-8 w-8"
                onClick={toggleAssistant}
              >
                <svg viewBox="0 0 535 323" fill="none" className="h-4 w-4">
                  <path
                    d="M400.165 220.285L354.779 323H0L94.3887 143.841L400.165 220.285Z"
                    fill="currentColor"
                  />
                  <path
                    d="M446.979 159.642L131.339 158.637L217.867 0H534.057L446.979 159.642Z"
                    fill="currentColor"
                  />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Abrir assistente</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Center Canvas */}
      <div className="flex flex-1 flex-col overflow-hidden">{canvas}</div>

      {/* Step Config Panel - side panel on desktop, sheet on mobile */}
      {selectedStepId && !isMobile && (
        <div className="w-[400px] flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out">
          {configPanel}
        </div>
      )}

      {isMobile && (
        <Sheet open={!!selectedStepId} onOpenChange={(open) => !open && selectStep(null)}>
          <SheetContent side="right" className="w-full p-0 sm:max-w-[400px]">
            {configPanel}
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
