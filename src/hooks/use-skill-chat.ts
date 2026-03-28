'use client'

import { useOrchestratorChat } from './use-orchestrator-chat'

export function useSkillChat(skillSlug: string) {
  void skillSlug // passed for context; orchestrator detects skill from conversation
  const chat = useOrchestratorChat()

  return {
    messages: chat.messages,
    status: chat.status,
    isLoading: chat.isLoading,
    isStreaming: chat.isStreaming,
    error: chat.error,
    conversationId: chat.conversationId,
    sendMessage: chat.sendMessage,
    stop: chat.stop,
  }
}
