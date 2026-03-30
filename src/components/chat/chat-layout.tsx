'use client'

import { useCallback, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useChatContext } from '@/contexts/chat-context'

interface ChatLayoutProps {
  chatContent: ReactNode
  artifactContent: ReactNode
}

const MIN_CHAT_WIDTH = 400
const MIN_ARTIFACT_WIDTH = 300

export default function ChatLayout({ chatContent, artifactContent }: ChatLayoutProps) {
  const { chatWidthPx, setChatWidthPx } = useChatContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      draggingRef.current = true

      const onMouseMove = (ev: MouseEvent) => {
        if (!draggingRef.current || !containerRef.current) return
        const containerRect = containerRef.current.getBoundingClientRect()
        const containerWidth = containerRect.width
        const newChatWidth = ev.clientX - containerRect.left
        const maxChat = containerWidth - MIN_ARTIFACT_WIDTH - 8
        const clamped = Math.max(MIN_CHAT_WIDTH, Math.min(newChatWidth, maxChat))
        setChatWidthPx(clamped)
      }

      const onMouseUp = () => {
        draggingRef.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [setChatWidthPx]
  )

  const getChatWidth = () => {
    if (chatWidthPx > 0) return `${chatWidthPx}px`
    return '50%'
  }

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      {/* Chat panel */}
      <div
        className="flex h-full shrink-0 flex-col overflow-hidden"
        style={{ width: getChatWidth() }}
      >
        {chatContent}
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn('z-10 shrink-0 cursor-col-resize transition-colors', 'hover:bg-border')}
        style={{ width: 8 }}
      />

      {/* Artifact panel */}
      <div
        className="flex h-full min-w-0 flex-1 flex-col overflow-hidden"
        style={{ background: 'var(--muted)' }}
      >
        {artifactContent}
      </div>
    </div>
  )
}
