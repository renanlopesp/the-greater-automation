'use client'

import type { UIMessage } from 'ai'
import { isTextUIPart, isToolUIPart } from 'ai'
import { Diamond, PanelLeftClose, CopyIcon } from 'lucide-react'
import { useCallback, useMemo } from 'react'

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { Tool, ToolHeader, ToolContent, ToolOutput } from '@/components/ai-elements/tool'
import { Button } from '@/components/ui/button'
import UseCaseCard from '@/components/workflow-editor/use-case-card'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import { useWorkflowAssistant, extractSuggestion } from '@/hooks/use-workflow-assistant'
import { VALID_TRIGGER_TYPES, VALID_STEP_TYPES } from '@/lib/ai/workflow-assistant'
import { getTriggerDefaultConfig } from '@/lib/workflow-editor/trigger-defaults'
import { getStepDefaultConfig } from '@/lib/workflow-editor/step-defaults'
import type { SuggestedWorkflow } from '@/lib/ai/workflow-assistant'

const USE_CASE_CARDS = [
  {
    emoji: '\ud83d\udcc4',
    title: 'Resumos de reunião',
    description: 'Prepare-se para reuniões com contexto e resumos gerados por IA',
    prompt:
      'Crie uma automação para resumos diários de reunião que busca meus eventos do calendário e gera um resumo com IA',
  },
  {
    emoji: '\ud83d\udd0d',
    title: 'Análise de concorrentes',
    description: 'Monitore a atividade de concorrentes e obtenha insights com IA',
    prompt:
      'Crie uma automação para monitorar sites de concorrentes periodicamente e analisar mudanças com IA',
  },
  {
    emoji: '\ud83d\udce7',
    title: 'Assistente de e-mail',
    description: 'Rascunhe, resuma e categorize e-mails automaticamente',
    prompt:
      'Configure uma automação de e-mail que recebe e-mails via webhook, categoriza com IA e rascunha respostas',
  },
  {
    emoji: '\ud83c\udfa5',
    title: 'Resumo de YouTube',
    description: 'Obtenha resumos com IA de vídeos e canais do YouTube',
    prompt:
      'Crie uma automação que recebe uma URL do YouTube, extrai a transcrição e gera um resumo com IA',
  },
]

function formatToolName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function AssistantMessageItem({
  message,
  isStreaming,
  onApply,
}: {
  message: UIMessage
  isStreaming: boolean
  onApply: (suggestion: SuggestedWorkflow) => void
}) {
  const isUser = message.role === 'user'
  const parts = message.parts ?? []
  const textParts = parts.filter(isTextUIPart)
  const toolParts = parts.filter(isToolUIPart)
  const textContent = textParts.map((p) => p.text).join('')
  const suggestion = !isUser ? extractSuggestion(message) : null

  return (
    <Message from={message.role}>
      {!isUser && (
        <div className="mb-1 flex items-center gap-2">
          <Diamond className="text-primary h-4 w-4" />
          <span className="text-muted-foreground text-sm font-medium">Assistente</span>
        </div>
      )}

      <MessageContent>
        {isUser ? (
          <p className="whitespace-pre-wrap">{textContent}</p>
        ) : (
          <>
            {toolParts.map((part) => {
              const isDynamic = part.type === 'dynamic-tool'
              const toolName = isDynamic
                ? (part as { toolName: string }).toolName
                : part.type.replace(/^tool-/, '')

              return (
                <Tool key={part.toolCallId}>
                  {isDynamic ? (
                    <ToolHeader
                      type="dynamic-tool"
                      state={part.state}
                      toolName={toolName}
                      title={formatToolName(toolName)}
                    />
                  ) : (
                    <ToolHeader
                      type={part.type as `tool-${string}`}
                      state={part.state}
                      title={formatToolName(toolName)}
                    />
                  )}
                  <ToolContent>
                    {'output' in part || 'errorText' in part ? (
                      <ToolOutput
                        output={'output' in part ? part.output : undefined}
                        errorText={'errorText' in part ? part.errorText : undefined}
                      />
                    ) : null}
                  </ToolContent>
                </Tool>
              )
            })}

            {textContent && <MessageResponse>{textContent}</MessageResponse>}

            {isStreaming && !textContent && toolParts.length === 0 && (
              <Shimmer as="p">Pensando...</Shimmer>
            )}

            {suggestion && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onApply(suggestion)}
                className="mt-2"
              >
                Aplicar no editor
              </Button>
            )}
          </>
        )}
      </MessageContent>

      {!isUser && textContent && !isStreaming && (
        <MessageActions>
          <MessageAction
            tooltip="Copiar"
            onClick={() => navigator.clipboard.writeText(textContent)}
          >
            <CopyIcon className="size-3.5" />
          </MessageAction>
        </MessageActions>
      )}
    </Message>
  )
}

export default function AIAssistantPanel() {
  const toggleAssistant = useWorkflowEditorStore((s) => s.toggleAssistant)
  const workflowId = useWorkflowEditorStore((s) => s.workflowId)
  const setTrigger = useWorkflowEditorStore((s) => s.setTrigger)
  const addStep = useWorkflowEditorStore((s) => s.addStep)

  const { messages, status, isLoading, isStreaming, error, sendMessage, stop } =
    useWorkflowAssistant(workflowId)

  const hasMessages = messages.length > 0

  const handleApplySuggestion = useCallback(
    (suggestion: SuggestedWorkflow) => {
      const triggerType = suggestion.trigger.type as (typeof VALID_TRIGGER_TYPES)[number]
      if (!VALID_TRIGGER_TYPES.includes(triggerType)) {
        console.warn('Invalid trigger type:', suggestion.trigger.type)
        return
      }

      // Merge AI suggestion config with defaults to avoid missing required fields
      const triggerDefaults = getTriggerDefaultConfig(triggerType)
      setTrigger({
        type: triggerType,
        config: { ...triggerDefaults, ...suggestion.trigger.config },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      for (const step of suggestion.steps) {
        const stepType = step.type as (typeof VALID_STEP_TYPES)[number]
        if (!VALID_STEP_TYPES.includes(stepType)) {
          console.warn('Invalid step type:', step.type)
          continue
        }
        const stepDefaults = getStepDefaultConfig(stepType)
        addStep({
          id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: stepType,
          name: step.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config: { ...stepDefaults, ...step.config } as any,
        })
      }
    },
    [setTrigger, addStep]
  )

  const handleUseCaseClick = useCallback(
    (prompt: string) => {
      sendMessage(prompt)
    },
    [sendMessage]
  )

  const handleSubmit = useCallback(
    (msg: PromptInputMessage) => {
      if (msg.text.trim()) {
        sendMessage(msg.text.trim())
      }
    },
    [sendMessage]
  )

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].id
    }
    return null
  }, [messages])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Diamond className="text-primary h-5 w-5" />
        <span className="flex-1 text-sm font-medium">Assistente Snew</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleAssistant}>
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Conversation */}
      <Conversation className="flex-1">
        <ConversationContent>
          {!hasMessages ? (
            <>
              <ConversationEmptyState title="O que posso ajudar a construir?" />
              <div className="grid grid-cols-2 gap-3 px-4">
                {USE_CASE_CARDS.map((card) => (
                  <UseCaseCard
                    key={card.title}
                    emoji={card.emoji}
                    title={card.title}
                    description={card.description}
                    onClick={() => handleUseCaseClick(card.prompt)}
                  />
                ))}
              </div>
            </>
          ) : (
            messages
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((message) => (
                <AssistantMessageItem
                  key={message.id}
                  message={message}
                  isStreaming={isStreaming && message.id === lastAssistantId}
                  onApply={handleApplySuggestion}
                />
              ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Error banner */}
      {error && (
        <div className="border-destructive/20 bg-destructive/10 text-destructive mx-4 mb-2 rounded-lg border px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Prompt input */}
      <div className="border-t px-4 py-3">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            placeholder="Descreva uma automação ou faça uma pergunta"
            disabled={isLoading}
          />
          <PromptInputFooter>
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
