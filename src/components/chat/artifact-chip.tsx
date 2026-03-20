'use client'

import { cn } from '@/lib/utils'
import { Table2, FileText, BarChart3, Megaphone, CheckCircle } from 'lucide-react'
import type { ArtifactType } from '@/types/artifacts'

interface ArtifactChipProps {
  id: string
  title: string
  type: ArtifactType
  isActive?: boolean
  onClick: () => void
  className?: string
}

const ICONS: Record<ArtifactType, React.ElementType> = {
  data: BarChart3,
  table: Table2,
  document: FileText,
  'campaign-table': Megaphone,
  approval: CheckCircle,
}

export default function ArtifactChip({
  id: _id,
  title,
  type,
  isActive = false,
  onClick,
  className,
}: ArtifactChipProps) {
  const Icon = ICONS[type] ?? FileText

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        isActive
          ? 'bg-foreground text-background border-foreground'
          : 'border-border text-muted-foreground hover:bg-accent',
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{title}</span>
    </button>
  )
}
