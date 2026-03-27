'use client'

import React from 'react'
import { X, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useArtifactNav } from './artifact-nav-context'

interface SkillArtifactPanelProps {
  children: React.ReactNode
  onClose: () => void
}

export function SkillArtifactPanel({ children, onClose }: SkillArtifactPanelProps) {
  const { stack, depth, pop, reset } = useArtifactNav()

  const backLabel = depth <= 1 ? 'Voltar' : (stack[depth - 2]?.label ?? 'Voltar')

  const handleBack = () => {
    if (depth > 0) {
      pop()
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <div className={cn('border-border flex h-full flex-col border-l')}>
      {/* Top bar */}
      <div className="border-border flex h-[48px] shrink-0 items-center justify-between border-b px-3">
        <button
          onClick={handleBack}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>← {backLabel}</span>
        </button>
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
