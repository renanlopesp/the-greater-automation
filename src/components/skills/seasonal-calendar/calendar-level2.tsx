'use client'

import {
  RefreshCw,
  ChevronRight,
  ClipboardList,
  Mail,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type SeasonalDate, type FullCampaign } from '@/data/campaign-data'
import { StatusBadge, ProductThumb, ProductTagBadge } from './shared'
import { Skeleton } from '@/components/ui/skeleton'

interface CalendarLevel2Props {
  date: SeasonalDate
  campaign: FullCampaign | null
  onSelectSection: (sectionType: string) => void
  onGenerateCampaign?: () => void
  onRegenerateConcept?: () => void
  isGenerating?: boolean
  isRegeneratingConcept?: boolean
  generationError?: boolean
}

const SECTION_DEFS = [
  { type: 'products', icon: <ClipboardList size={18} />, label: 'Produtos' },
  { type: 'email', icon: <Mail size={18} />, label: 'E-mail' },
  { type: 'copies', icon: <MessageSquare size={18} />, label: 'Copies' },
  { type: 'assets', icon: <ImageIcon size={18} />, label: 'Assets' },
  { type: 'video', icon: <Video size={18} />, label: 'Script' },
  { type: 'timeline', icon: <Clock size={18} />, label: 'Timeline' },
] as const

export function CalendarLevel2({
  date,
  campaign,
  onSelectSection,
  onGenerateCampaign,
  onRegenerateConcept,
  isGenerating = false,
  isRegeneratingConcept = false,
  generationError = false,
}: CalendarLevel2Props) {
  const monthLabel = date.month.charAt(0) + date.month.slice(1).toLowerCase()

  function sectionMeta(type: string): string {
    if (!campaign) return '—'
    switch (type) {
      case 'products':
        return `${campaign.selectedProducts.length} selecionados`
      case 'email':
        return '1 template'
      case 'copies':
        return `${campaign.copies.length} canais`
      case 'assets':
        return `${campaign.assets.length} formatos`
      case 'video':
        return `${campaign.videoScripts.length} roteiros`
      case 'timeline':
        return `${campaign.timeline.length} fases`
      default:
        return '—'
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header section */}
      <div className="border-border border-b px-5 pt-5 pb-4">
        <p className="mb-1" style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
          {monthLabel} · {date.date}
        </p>
        <h2 className="text-foreground mb-2 text-xl font-medium">{date.name}</h2>
        <div className="flex items-center gap-2">
          <StatusBadge status={date.status} />
          <span style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
            {date.potentialValue}
          </span>
        </div>
      </div>

      {/* Skeleton loading state */}
      {isGenerating && (
        <div className="flex flex-col gap-4 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-4 w-48" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="mt-1 h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {generationError && !isGenerating && (
        <div className="border-destructive/30 bg-destructive/10 mx-5 mt-4 rounded-lg border p-4">
          <p className="text-destructive text-sm">Erro ao gerar campanha. Tente novamente.</p>
          <button onClick={onGenerateCampaign} className="text-destructive mt-2 text-sm underline">
            Tentar novamente
          </button>
        </div>
      )}

      {/* No campaign state */}
      {!campaign && !isGenerating && !generationError && (
        <div className="flex flex-col items-center gap-4 px-5 py-8 text-center">
          <span className="text-3xl">✨</span>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
            Campanha ainda não gerada para esta data
          </p>
          <button
            onClick={onGenerateCampaign}
            disabled={isGenerating}
            className={cn(
              'rounded-lg px-6 py-2.5 text-sm font-medium transition-colors',
              'bg-foreground text-background hover:opacity-90',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            Gerar Campanha
          </button>
        </div>
      )}

      {/* Campaign content */}
      {campaign && !isGenerating && (
        <>
          {/* Concept card */}
          <div className="border-border border-b px-5 py-4">
            {/* Section label row */}
            <div className="mb-3 flex items-center justify-between">
              <span
                className="tracking-[0.08em] uppercase"
                style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)' }}
              >
                Conceito da Campanha
              </span>
              <button
                onClick={onRegenerateConcept}
                disabled={isRegeneratingConcept}
                className="hover:text-foreground flex items-center gap-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
              >
                <RefreshCw size={13} className={isRegeneratingConcept ? 'animate-spin' : ''} />
                Regenerar
              </button>
            </div>

            {/* Card */}
            {isRegeneratingConcept ? (
              <div className="border-border flex flex-col gap-3 rounded-xl border p-5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-3 w-24" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="mt-1 h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-border flex flex-col gap-3 rounded-xl border p-5">
                {/* Slogan */}
                <p className="text-foreground italic" style={{ fontSize: 15 }}>
                  &ldquo;{campaign.concept.slogan}&rdquo;
                </p>

                {/* Description */}
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                  {campaign.concept.description}
                </p>

                {/* Products sub-header */}
                <p
                  className="mt-1 tracking-[0.08em] uppercase"
                  style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)' }}
                >
                  Produtos Sugeridos
                </p>

                {/* Product rows — up to 3 */}
                <div className="flex flex-col gap-2">
                  {campaign.concept.products.slice(0, 3).map((product, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <ProductThumb />
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm leading-snug font-medium">
                          {product.name}
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                          R$ {product.price}
                        </p>
                      </div>
                      <ProductTagBadge tag={product.tag} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section navigation */}
          <div className="flex flex-col">
            {SECTION_DEFS.map((section, index) => {
              const isLast = index === SECTION_DEFS.length - 1
              return (
                <button
                  key={section.type}
                  onClick={() => onSelectSection(section.type)}
                  className={cn(
                    'flex w-full items-center gap-3 px-5 py-3.5 text-left',
                    'hover:bg-muted/50 cursor-pointer transition-colors duration-100',
                    !isLast && 'border-border border-b'
                  )}
                >
                  <span style={{ color: 'var(--muted-foreground)' }}>{section.icon}</span>
                  <span className="text-foreground flex-1 text-sm font-medium">
                    {section.label}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                    {sectionMeta(section.type)}
                  </span>
                  <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
