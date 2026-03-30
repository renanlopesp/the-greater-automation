'use client'

import type { ReactNode } from 'react'

interface ChatLayoutProps {
  chatContent: ReactNode
  artifactContent: ReactNode
}

export default function ChatLayout({ chatContent, artifactContent }: ChatLayoutProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Chat panel — 50% */}
      <div className="flex h-full w-1/2 shrink-0 flex-col overflow-hidden">{chatContent}</div>

      {/* Artifact panel — 50% */}
      <div
        className="flex h-full min-w-0 flex-1 flex-col overflow-hidden border-l"
        style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
      >
        {artifactContent}
      </div>
    </div>
  )
}
