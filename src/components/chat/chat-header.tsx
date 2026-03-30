'use client'

import {
  ChevronDown,
  MoreHorizontal,
  FileText,
  Zap,
  ListChecks,
  Share2,
  PanelRight,
  ExternalLink,
  Download,
  Maximize2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatContext } from '@/contexts/chat-context'

function ActionPill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'bg-secondary text-secondary-foreground'
      )}
      style={{ fontSize: 12 }}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function HeaderButton({
  icon: Icon,
  onClick,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors"
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export default function ChatHeader() {
  const { chatTitle, artifactOpen, setArtifactOpen } = useChatContext()

  const displayTitle = chatTitle || 'New task'

  return (
    <div
      className="border-border flex w-full shrink-0 items-center border-b px-4"
      style={{ height: 48 }}
    >
      {/* Left side: title + pills */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="truncate font-medium"
          style={{ fontSize: 14, fontWeight: 500, maxWidth: 240 }}
        >
          {displayTitle}
        </span>
        <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />

        <div className="bg-border mx-2 h-4 w-px shrink-0" />

        <MoreHorizontal className="text-muted-foreground h-4 w-4 shrink-0" />

        <div className="ml-2 flex items-center gap-1.5">
          <ActionPill icon={FileText} label="3" />
          <ActionPill icon={Zap} label="2.4k" />
          <ActionPill icon={ListChecks} label="Tarefa" />
        </div>

        <button
          type="button"
          className={cn(
            'ml-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors',
            'text-secondary-foreground hover:bg-secondary/80'
          )}
          style={{ fontSize: 13, fontWeight: 500 }}
        >
          <Share2 className="h-3.5 w-3.5" />
          Compartilhar
        </button>
      </div>

      {/* Right side — artifact always open, no toggle/close/expand */}
      <div className="flex items-center gap-0.5">
        <HeaderButton icon={ExternalLink} label="Open externally" />
        <HeaderButton icon={Download} label="Download" />
        <HeaderButton icon={MoreHorizontal} label="More options" />
      </div>
    </div>
  )
}
