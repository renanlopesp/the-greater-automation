'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useCallback, useMemo } from 'react'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import type { SuggestedWorkflow } from '@/lib/ai/workflow-assistant'

export function useWorkflowAssistant(workflowId: string) {
  // Read workflow context from Zustand store
  const workflowName = useWorkflowEditorStore((s) => s.workflowName)
  const trigger = useWorkflowEditorStore((s) => s.trigger)
  const steps = useWorkflowEditorStore((s) => s.steps)

  // Transport recreated when workflow context changes so body closure captures latest values
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/workflows/${workflowId}/assistant`,
        body: () => ({
          workflowContext: { workflowName, trigger, steps },
        }),
      }),
    [workflowId, workflowName, trigger, steps]
  )

  const {
    messages,
    status,
    error: chatError,
    sendMessage: aiSendMessage,
    setMessages,
    stop,
  } = useChat({ transport })

  const sendMessage = useCallback(
    async (text: string) => {
      await aiSendMessage({ text })
    },
    [aiSendMessage]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [setMessages])

  const isStreaming = status === 'streaming'
  const isLoading = status === 'submitted' || isStreaming

  return {
    messages,
    status,
    isLoading,
    isStreaming,
    error: chatError?.message ?? null,
    sendMessage,
    clearMessages,
    stop,
  }
}

/**
 * Extract a SuggestedWorkflow from a UIMessage's parts.
 * Handles both dynamic-tool (type: 'dynamic-tool', toolName: 'SUGGEST_WORKFLOW')
 * and named tool (type: 'tool-SUGGEST_WORKFLOW') formats from the AI SDK.
 */
export function extractSuggestion(message: UIMessage): SuggestedWorkflow | null {
  for (const part of message.parts ?? []) {
    let isSuggestWorkflow = false

    // Format 1: dynamic-tool with separate toolName property
    if (part.type === 'dynamic-tool') {
      const toolName = (part as { toolName?: string }).toolName
      isSuggestWorkflow = toolName === 'SUGGEST_WORKFLOW'
    }
    // Format 2: named tool type (tool-SUGGEST_WORKFLOW)
    else if (part.type === 'tool-SUGGEST_WORKFLOW') {
      isSuggestWorkflow = true
    }

    if (
      isSuggestWorkflow &&
      'state' in part &&
      part.state === 'output-available' &&
      'output' in part
    ) {
      const output = part.output as {
        trigger: SuggestedWorkflow['trigger']
        steps: SuggestedWorkflow['steps']
      }
      if (output?.trigger && output?.steps) {
        return { trigger: output.trigger, steps: output.steps }
      }
    }
  }
  return null
}
