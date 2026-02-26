'use client'

import { useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import { PencilLine, Layers, FlaskConical } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResizablePanelGroup, ResizablePanel } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import EditorHeader from '@/components/editor/editor-header'
import TriggerPanel from '@/components/editor/trigger-panel'
import StepsPanel from '@/components/editor/steps-panel'
import ConfigPanel from '@/components/editor/config-panel'
import ConnectorLine from '@/components/workflow-editor/connector-line'
import { cn } from '@/lib/utils'

const RunsTab = dynamic(() => import('@/components/workflow-editor/runs-tab'))
const TestsTab = dynamic(() => import('@/components/workflow-editor/tests-tab'))

// Lazy-load assistant panel - only shown when toggled open
const AIAssistantPanel = dynamic(() => import('@/components/workflow-editor/ai-assistant-panel'))

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

const ASSISTANT_ICON_STYLE = { width: '43%', height: '43%' } as const

export default function EditorShell() {
  const workflowId = useWorkflowEditorStore((s) => s.workflowId)
  const isAssistantOpen = useWorkflowEditorStore((s) => s.isAssistantOpen)
  const toggleAssistant = useWorkflowEditorStore((s) => s.toggleAssistant)
  const activeTab = useWorkflowEditorStore((s) => s.activeTab)
  const setActiveTab = useWorkflowEditorStore((s) => s.setActiveTab)
  const isMobile = useIsMobile()

  return (
    <div className="flex h-full flex-col">
      <EditorHeader />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'editor' | 'runs' | 'tests')}
        className="flex flex-1 flex-col overflow-hidden"
      >
        {/* Centered segmented control (prod style) */}
        <div className="flex h-12 items-center justify-center border-b px-4">
          <TabsList className="bg-muted h-9 rounded-lg p-1">
            <TabsTrigger value="editor" className="gap-2">
              <PencilLine className="h-4 w-4" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="runs" className="gap-2">
              <Layers className="h-4 w-4" />
              Runs
            </TabsTrigger>
            <TabsTrigger value="tests" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              Tests
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="editor" className="mt-0 flex flex-1 overflow-hidden">
          <div className="bg-background relative flex flex-1 overflow-hidden">
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel defaultSize={75} minSize={40}>
                <ScrollArea className="h-full">
                  <div className="flex flex-col items-center px-4 pt-12 pb-24">
                    <div className="flex w-full max-w-[520px] flex-col items-center">
                      <TriggerPanel />
                      <ConnectorLine />
                      <StepsPanel />
                    </div>
                  </div>
                </ScrollArea>
              </ResizablePanel>

              <ConfigPanel />
            </ResizablePanelGroup>

            {/* Floating assistant button + sheet (prod uses a bottom-left launcher) */}
            <Sheet
              open={isAssistantOpen}
              onOpenChange={(open) => {
                if (open !== isAssistantOpen) toggleAssistant()
              }}
            >
              <SheetContent
                side={isMobile ? 'bottom' : 'left'}
                className={cn(
                  'p-0',
                  isMobile ? 'h-[80dvh] w-full' : 'w-full sm:max-w-[440px] lg:max-w-[480px]'
                )}
                showCloseButton={false}
              >
                <AIAssistantPanel />
              </SheetContent>
            </Sheet>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleAssistant}
                  className="bg-primary text-primary-foreground ring-primary/20 fixed bottom-6 left-6 z-50 flex h-16 w-16 items-center justify-center rounded-full shadow-lg ring-1 transition-all hover:scale-105 hover:shadow-xl"
                  aria-label="Open assistant"
                >
                  <svg viewBox="0 0 535 323" fill="none" style={ASSISTANT_ICON_STYLE}>
                    <path
                      d="M400.165 220.285L354.779 323H0L94.3887 143.841L400.165 220.285Z"
                      fill="currentColor"
                    />
                    <path
                      d="M446.979 159.642L131.339 158.637L217.867 0H534.057L446.979 159.642Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">AI Assistant</TooltipContent>
            </Tooltip>
          </div>
        </TabsContent>

        <TabsContent value="runs" className="mt-0 flex flex-1 flex-col overflow-hidden">
          <RunsTab workflowId={workflowId} />
        </TabsContent>

        <TabsContent value="tests" className="mt-0 flex flex-1 flex-col overflow-hidden">
          <TestsTab workflowId={workflowId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
