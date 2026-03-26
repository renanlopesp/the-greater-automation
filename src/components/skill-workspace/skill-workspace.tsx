'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { PanelRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ArtifactNavProvider, useArtifactNav } from './artifact-nav-context'
import { DraggableDivider } from './draggable-divider'
import { SkillChatPanel } from './skill-chat-panel'
import { SkillArtifactPanel } from './skill-artifact-panel'

interface SkillWorkspaceProps {
  skill: { name: string; emoji: string; status: 'active' | 'available' }
  heroCard?: React.ReactNode
  quickActions?: Array<{ label: string; message: string }>
  artifactContent?: React.ReactNode
  inputPlaceholder?: string
  onSendMessage?: (message: string) => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

function SkillWorkspaceInner({
  skill,
  heroCard,
  quickActions,
  artifactContent,
  inputPlaceholder,
  onSendMessage,
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

  const handleQuickAction = useCallback(
    (message: string) => {
      handleSendMessage(message)
    },
    [handleSendMessage]
  )

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
          {skill.status === 'active' && <span className="h-2 w-2 rounded-full bg-green-500" />}
        </div>
        <button
          onClick={toggleArtifact}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
            showArtifact
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <PanelRight className="h-4 w-4" />
          <span>Arquivos</span>
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
            messages={messages}
            quickActions={quickActions}
            inputPlaceholder={inputPlaceholder}
            onSendMessage={handleSendMessage}
            heroCard={heroCard}
          />
        </div>

        {/* Divider + Artifact panel */}
        {showArtifact && (
          <>
            <DraggableDivider onResize={setLeftPercent} initialPercent={leftPercent} />
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
