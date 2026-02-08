'use client'

import { Trash2, Settings } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import { getStepMeta } from '@/lib/workflow-editor/step-metadata'
import type { AIStepConfig, HTTPStepConfig } from '@/lib/workflow-editor/step-defaults'

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

          {selectedStep.type !== 'ai' && selectedStep.type !== 'http' && (
            <p className="text-muted-foreground text-sm">
              Configuration for {meta?.name ?? selectedStep.type} coming soon
            </p>
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

function AIStepConfigForm({
  config,
  onUpdate,
}: {
  config: AIStepConfig
  onUpdate: (config: AIStepConfig) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium">Prompt template</label>
        <Textarea
          value={config.prompt_template}
          onChange={(e) => onUpdate({ ...config, prompt_template: e.target.value })}
          placeholder="Enter your prompt..."
          rows={4}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Output format</label>
        <Select
          value={config.output_format}
          onValueChange={(v) =>
            onUpdate({ ...config, output_format: v as AIStepConfig['output_format'] })
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="markdown">Markdown</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function HTTPStepConfigForm({
  config,
  onUpdate,
}: {
  config: HTTPStepConfig
  onUpdate: (config: HTTPStepConfig) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium">Method</label>
        <Select
          value={config.method}
          onValueChange={(v) => onUpdate({ ...config, method: v as HTTPStepConfig['method'] })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">URL</label>
        <Input
          value={config.url}
          onChange={(e) => onUpdate({ ...config, url: e.target.value })}
          placeholder="https://api.example.com/endpoint"
          className="mt-1"
        />
      </div>
    </div>
  )
}
