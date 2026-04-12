import type { UIMessage } from 'ai'

export interface HybridChatRequest {
  messages?: UIMessage[]
  message?: string
  conversationId?: string
  taskId?: string
  skill_slug?: string
  model?: string
}

export type ChatRouterDecision =
  | { mode: 'chat'; model?: string }
  | { mode: 'skill'; slug: string; input?: unknown }

export interface ToolInvocationContext {
  teamId: string
  userId: string
  storeId?: string
  taskId?: string
}

export interface ToolInvocation {
  name: string
  input: Record<string, unknown>
  context: ToolInvocationContext
}

export interface ToolResultArtifact {
  type: string
  title: string
  html?: string
  data?: unknown
}

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
  artifact?: ToolResultArtifact
}
