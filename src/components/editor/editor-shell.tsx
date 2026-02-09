'use client'

import { useSyncExternalStore } from 'react'
import { PencilLine, Layers, Sparkles } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResizablePanelGroup, ResizablePanel } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import EditorHeader from '@/components/editor/editor-header'
import TriggerPanel from '@/components/editor/trigger-panel'
import StepsPanel from '@/components/editor/steps-panel'
import ConfigPanel from '@/components/editor/config-panel'
import ConnectorLine from '@/components/workflow-editor/connector-line'
import AIAssistantPanel from '@/components/workflow-editor/ai-assistant-panel'
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

export default function EditorShell() {
  const { isAssistantOpen, toggleAssistant } = useWorkflowEditorStore()
  const isMobile = useIsMobile()

  return (
    <div className="flex h-full flex-col">
      <EditorHeader />

      <Tabs defaultValue="editor" className="flex flex-1 flex-col overflow-hidden">
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
                  isMobile ? 'h-[80dvh] w-full sm:h-[70dvh]' : 'w-full sm:max-w-[360px]'
                )}
                showCloseButton={false}
              >
                <AIAssistantPanel />
              </SheetContent>
            </Sheet>

            <Button
              type="button"
              onClick={toggleAssistant}
              size="icon"
              className="fixed bottom-6 left-6 z-50 h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white shadow-[0_24px_48px_-24px_rgba(37,99,235,0.9)] ring-1 ring-white/30 hover:opacity-95"
              aria-label="Open assistant"
            >
              <Sparkles className="h-7 w-7" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="runs" className="mt-0 flex-1">
          <div className="text-muted-foreground p-8">Runs tab coming soon</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
