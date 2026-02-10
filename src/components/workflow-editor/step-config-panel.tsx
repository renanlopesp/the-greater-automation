'use client'

import { Trash2, Settings } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import { getStepMeta } from '@/lib/workflow-editor/step-metadata'
import type {
  AIStepConfig,
  HTTPStepConfig,
  AppStepConfig,
  FlowControlStepConfig,
  WebScrapingStepConfig,
  HumanInLoopStepConfig,
  UtilityStepConfig,
  SequenceStepConfig,
} from '@/lib/workflow-editor/step-defaults'
import AIStepConfigForm from './step-config/ai-step-config'
import HTTPStepConfigForm from './step-config/http-step-config'
import AppStepConfigForm from './step-config/app-step-config'
import FlowControlStepConfigForm from './step-config/flow-control-step-config'
import WebScrapingStepConfigForm from './step-config/web-scraping-step-config'
import HumanInLoopStepConfigForm from './step-config/human-in-loop-step-config'
import UtilityStepConfigForm from './step-config/utility-step-config'
import SequenceStepConfigForm from './step-config/sequence-step-config'

export default function StepConfigPanel() {
  const { steps, selectedStepId, updateStep, deleteStep, selectStep } = useWorkflowEditorStore()

  const selectedStep = steps.find((s) => s.id === selectedStepId)
  if (!selectedStep) return null

  const meta = getStepMeta(selectedStep.type)
  const IconComponent = meta
    ? (LucideIcons[meta.icon as keyof typeof LucideIcons] as React.ComponentType<{
        className?: string
      }>)
    : null

  return (
    <div className="flex h-full w-full flex-col border-l sm:w-[400px]">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
          {IconComponent && <IconComponent className="text-primary h-4 w-4" />}
        </div>
        <Input
          value={selectedStep.name}
          onChange={(e) => updateStep(selectedStep.id, { name: e.target.value })}
          className="h-8 flex-1 border-none bg-transparent text-sm font-medium shadow-none focus-visible:ring-0"
        />
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs">U</AvatarFallback>
        </Avatar>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            deleteStep(selectedStep.id)
            selectStep(null)
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          <p className="text-muted-foreground text-sm">{meta?.description}</p>
          <Separator />

          {selectedStep.type === 'ai' && (
            <AIStepConfigForm
              config={selectedStep.config as AIStepConfig}
              onUpdate={(config) => updateStep(selectedStep.id, { config })}
            />
          )}

          {selectedStep.type === 'http' && (
            <HTTPStepConfigForm
              config={selectedStep.config as HTTPStepConfig}
              onUpdate={(config) => updateStep(selectedStep.id, { config })}
            />
          )}

          {selectedStep.type === 'app' && (
            <AppStepConfigForm
              config={selectedStep.config as AppStepConfig}
              onUpdate={(config) => updateStep(selectedStep.id, { config })}
            />
          )}

          {selectedStep.type === 'flow_control' && (
            <FlowControlStepConfigForm
              config={selectedStep.config as FlowControlStepConfig}
              onUpdate={(config) => updateStep(selectedStep.id, { config })}
            />
          )}

          {selectedStep.type === 'web_scraping' && (
            <WebScrapingStepConfigForm
              config={selectedStep.config as WebScrapingStepConfig}
              onUpdate={(config) => updateStep(selectedStep.id, { config })}
            />
          )}

          {selectedStep.type === 'human_in_loop' && (
            <HumanInLoopStepConfigForm
              config={selectedStep.config as HumanInLoopStepConfig}
              onUpdate={(config) => updateStep(selectedStep.id, { config })}
            />
          )}

          {selectedStep.type === 'utility' && (
            <UtilityStepConfigForm
              config={selectedStep.config as UtilityStepConfig}
              onUpdate={(config) => updateStep(selectedStep.id, { config })}
            />
          )}

          {selectedStep.type === 'sequence' && (
            <SequenceStepConfigForm
              config={selectedStep.config as SequenceStepConfig}
              onUpdate={(config) => updateStep(selectedStep.id, { config })}
            />
          )}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between border-t px-4 py-3">
        <Badge variant="secondary">step_{selectedStep.position + 1}.output</Badge>
        <Button size="sm" onClick={() => selectStep(null)}>
          Done
        </Button>
      </div>
    </div>
  )
}
