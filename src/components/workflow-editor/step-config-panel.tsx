'use client'

import { useState, lazy, Suspense } from 'react'
import { Trash2, Play, Loader2, CheckCircle2, FlaskConical } from 'lucide-react'
import { DynamicIcon } from '@/lib/workflow-editor/icon-registry'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import { getStepMeta } from '@/lib/workflow-editor/step-metadata'
import { isStepConfigComplete, TESTABLE_STEP_TYPES } from '@/lib/workflow-editor/step-defaults'
import { useTestStep } from '@/hooks/use-workflow-runs'
import { useCurrentUser, getInitials } from '@/hooks/use-current-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

const AIStepConfigForm = lazy(() => import('./step-config/ai-step-config'))
const HTTPStepConfigForm = lazy(() => import('./step-config/http-step-config'))
const AppStepConfigForm = lazy(() => import('./step-config/app-step-config'))
const FlowControlStepConfigForm = lazy(() => import('./step-config/flow-control-step-config'))
const WebScrapingStepConfigForm = lazy(() => import('./step-config/web-scraping-step-config'))
const HumanInLoopStepConfigForm = lazy(() => import('./step-config/human-in-loop-step-config'))
const UtilityStepConfigForm = lazy(() => import('./step-config/utility-step-config'))
const SequenceStepConfigForm = lazy(() => import('./step-config/sequence-step-config'))

export default function StepConfigPanel() {
  const selectedStep = useWorkflowEditorStore(
    (s) => s.steps.find((step) => step.id === s.selectedStepId) ?? null
  )
  const updateStep = useWorkflowEditorStore((s) => s.updateStep)
  const deleteStep = useWorkflowEditorStore((s) => s.deleteStep)
  const selectStep = useWorkflowEditorStore((s) => s.selectStep)
  const workflowId = useWorkflowEditorStore((s) => s.workflowId)
  const testStep = useTestStep(workflowId)
  const { data: currentUser } = useCurrentUser()
  const [testStarted, setTestStarted] = useState(false)

  if (!selectedStep) return null

  const meta = getStepMeta(selectedStep.type)

  const isTestable = TESTABLE_STEP_TYPES.includes(selectedStep.type)
  const canTest = isStepConfigComplete(selectedStep) && !testStep.isPending

  function handleTest() {
    setTestStarted(false)
    testStep.mutate(
      {
        type: selectedStep!.type,
        config: selectedStep!.config as unknown as Record<string, unknown>,
        workflowId,
        stepId: selectedStep!.id,
        stepName: selectedStep!.name,
        stepPosition: selectedStep!.position,
      },
      {
        onSuccess: () => setTestStarted(true),
      }
    )
  }

  return (
    <div className="flex h-full w-full flex-col border-l">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
          {meta && <DynamicIcon name={meta.icon} className="text-primary h-4 w-4" />}
        </div>
        <Input
          value={selectedStep.name}
          onChange={(e) => updateStep(selectedStep.id, { name: e.target.value })}
          className="h-8 flex-1 border-none bg-transparent text-sm font-medium shadow-none focus-visible:ring-0"
        />
        {currentUser && (
          <Avatar className="h-7 w-7">
            {currentUser.avatarUrl && <AvatarImage src={currentUser.avatarUrl} />}
            <AvatarFallback className="text-xs">
              {getInitials(currentUser.fullName, currentUser.email)}
            </AvatarFallback>
          </Avatar>
        )}
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
      </div>

      <div className="scrollbar-visible min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 p-4">
          <p className="text-muted-foreground text-sm">{meta?.description}</p>
          <Separator />

          <Suspense
            fallback={
              <div className="p-4">
                <Skeleton className="h-32 w-full" />
              </div>
            }
          >
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
          </Suspense>
        </div>
      </div>

      {testStarted && (
        <div className="flex items-center gap-2 border-t bg-blue-50 px-4 py-3 dark:bg-blue-950/20">
          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-medium">Teste iniciado</span>
          <button
            type="button"
            className="text-xs font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
            onClick={() => {
              setTestStarted(false)
              useWorkflowEditorStore.getState().setActiveTab('tests')
            }}
          >
            <FlaskConical className="mr-1 inline h-3 w-3" />
            Ver na aba Testes
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-t px-4 py-3">
        <Badge variant="secondary">step_{selectedStep.position + 2}.output</Badge>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={!canTest} onClick={handleTest}>
            {testStep.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Play className="mr-1 h-3 w-3" />
            )}
            {isTestable ? 'Testar' : 'Testar (simulado)'}
          </Button>
          <Button size="sm" onClick={() => selectStep(null)}>
            Concluído
          </Button>
        </div>
      </div>
    </div>
  )
}
