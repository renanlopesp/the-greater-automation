'use client'

import { cn } from '@/lib/utils'
import CoworkerAvatar from '@/components/coworker-avatar'
import { useCoworkerAvatars } from '@/hooks/use-coworker-avatars'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import type { CoworkerReference } from '@/types/artifacts'
import { useLanguage } from '@/contexts/language-context'

interface CoworkerSuggestionCardProps {
  coworker: CoworkerReference
  onInstall?: (catalogId: string) => void
  onDismiss?: () => void
  className?: string
}

export default function CoworkerSuggestionCard({
  coworker,
  onInstall,
  onDismiss,
  className,
}: CoworkerSuggestionCardProps) {
  const router = useRouter()
  const { avatars } = useCoworkerAvatars()
  const { t } = useLanguage()
  // Try catalogId first, then derive from name (same pattern as sidebar)
  const avatarKey = avatars[coworker.catalogId]
    ? coworker.catalogId
    : coworker.name.toLowerCase().replace(/\s+/g, '-')
  const avatarSrc = avatars[avatarKey] ?? avatars[coworker.catalogId]
  const isEn = t('nav.home') === 'Home'

  const handleCardClick = () => {
    if (coworker.type === 'used') {
      router.push(`/agents/${coworker.catalogId}`)
    }
  }

  const label =
    coworker.type === 'used'
      ? isEn
        ? 'co-worker used'
        : 'co-worker utilizado'
      : isEn
        ? 'co-worker suggested'
        : 'co-worker sugerido'

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 rounded-lg border px-4 py-3',
        coworker.type === 'used' &&
          'hover:border-foreground/30 hover:bg-muted/20 cursor-pointer transition-colors',
        className
      )}
      onClick={coworker.type === 'used' ? handleCardClick : undefined}
    >
      {/* Top-right label */}
      <span className="text-muted-foreground absolute top-2.5 right-3 text-[11px]">{label}</span>

      {/* Avatar */}
      <CoworkerAvatar src={avatarSrc} name={coworker.name} size="sm" />

      {/* Text */}
      <div className="min-w-0 flex-1 pr-24">
        <p className="text-sm leading-snug font-semibold">{coworker.name}</p>
        {coworker.reason && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-relaxed">
            {coworker.reason}
          </p>
        )}
      </div>

      {/* Actions row */}
      <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
        {coworker.type === 'suggested' && onInstall && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onInstall(coworker.catalogId)
            }}
          >
            {isEn ? 'Install' : 'Instalar'}
          </Button>
        )}
        {onDismiss && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            className="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
            aria-label={isEn ? 'Dismiss' : 'Dispensar'}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
