'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { PanelRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ArtifactNavProvider, useArtifactNav } from './artifact-nav-context'
import { DraggableDivider } from './draggable-divider'
import { SkillChatPanel } from './skill-chat-panel'
import { SkillArtifactPanel } from './skill-artifact-panel'
import type { ChatMessage } from './types'

interface SkillWorkspaceProps {
  skill: { name: string; emoji: string; status: 'active' | 'available' }
  heroCard?: ReactNode
  quickActions?: Array<{ label: string; message: string }>
  artifactContent?: ReactNode
  inputPlaceholder?: string
  onSendMessage?: (message: string) => void

  // Chat integration (optional - if provided, overrides internal state)
  chatMessages?: import('ai').UIMessage[]
  chatIsLoading?: boolean
  chatIsStreaming?: boolean
  onChatSendMessage?: (text: string) => void
  onChatStop?: () => void
}

function SkillWorkspaceInner({
  skill,
  heroCard,
  quickActions,
  artifactContent,
  inputPlaceholder,
  onSendMessage,
  chatMessages,
  onChatSendMessage,
}: SkillWorkspaceProps) {
  const { depth, push, reset } = useArtifactNav()
  const [artifactOpen, setArtifactOpen] = useState(false)
  const [leftPercent, setLeftPercent] = useState(50)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const showArtifact = artifactOpen || depth > 0

  const handleSendMessage = useCallback(
    (message: string) => {
      const userMsg: ChatMessage = {
        id: `${Date.now()}-user`,
        role: 'user',
        content: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, userMsg])
      onSendMessage?.(message)
    },
    [onSendMessage]
  )

  // Convert UIMessage[] (AI SDK) to ChatMessage[] for the chat panel
  const convertedMessages: ChatMessage[] = (chatMessages ?? []).map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; text: string }).text)
      .join(''),
  }))

  const effectiveMessages = chatMessages !== undefined ? convertedMessages : messages
  const effectiveSendMessage = onChatSendMessage ?? handleSendMessage

  const toggleArtifact = useCallback(() => {
    if (showArtifact) {
      reset()
      setArtifactOpen(false)
    } else {
      setArtifactOpen(true)
      if (depth === 0) {
        push('Artifact')
      }
    }
  }, [showArtifact, reset, depth, push])

  const handleArtifactClose = useCallback(() => {
    setArtifactOpen(false)
  }, [])

  // Keyboard shortcut: Cmd+\ or Ctrl+\
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '\\' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggleArtifact()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleArtifact])

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="border-border flex h-[48px] shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{skill.emoji}</span>
          <span className="text-sm font-medium">{skill.name}</span>
          {skill.status === 'active' && (
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--green)' }} />
          )}
        </div>
        <button
          onClick={toggleArtifact}
          title="Open files (⌘\)"
          className={cn(
            'flex items-center rounded-md p-1.5 transition-colors',
            showArtifact
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>

      {/* Panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel */}
        <div
          className="h-full overflow-hidden"
          style={{ width: showArtifact ? `${leftPercent}%` : '100%' }}
        >
          <SkillChatPanel
            messages={effectiveMessages}
            quickActions={quickActions}
            inputPlaceholder={inputPlaceholder}
            onSendMessage={effectiveSendMessage}
            heroCard={heroCard}
          />
        </div>

        {/* Divider + Artifact panel */}
        {showArtifact && (
          <>
            <DraggableDivider onResize={setLeftPercent} />
            <div className="h-full flex-1 overflow-hidden">
              <SkillArtifactPanel onClose={handleArtifactClose}>
                {artifactContent}
              </SkillArtifactPanel>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function SkillWorkspace(props: SkillWorkspaceProps) {
  return (
    <ArtifactNavProvider>
      <SkillWorkspaceInner {...props} />
    </ArtifactNavProvider>
  )
}
