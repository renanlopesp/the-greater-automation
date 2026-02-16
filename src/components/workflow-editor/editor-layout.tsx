'use client'

import { useSyncExternalStore } from 'react'
import { Sparkles } from 'lucide-react'
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
  const { isAssistantOpen, selectedStepId, toggleAssistant, selectStep } = useWorkflowEditorStore()
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
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleAssistant}>
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Open Assistant</TooltipContent>
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
