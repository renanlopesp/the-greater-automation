'use client'

import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ClipboardList,
  Mail,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Clock,
  Sparkles,
  Copy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PersonalizedCalendar, PersonalizedDate } from '@/lib/ai/seasonal-campaign-generator'
import type { FullCampaign, ProductTag } from '@/data/campaign-data'
import { productTagConfig } from '@/data/campaign-data'

// ---------------------------------------------------------------------------
// Navigation state
// ---------------------------------------------------------------------------

type SectionType = 'products' | 'email' | 'copies' | 'assets' | 'video' | 'timeline'

type ArtifactView =
  | { level: 1 }
  | { level: 2; dateId: string; dateName: string }
  | { level: 3; dateId: string; dateName: string; sectionType: SectionType }

// ---------------------------------------------------------------------------
// Priority dot colors
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Record<PersonalizedDate['priority'], string> = {
  high: '#EF4444',
  medium: '#3B82F6',
  low: '#9CA3AF',
}

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

const SECTION_DEFS: { type: SectionType; icon: React.ReactNode; label: string }[] = [
  { type: 'products', icon: <ClipboardList size={18} />, label: 'Produtos' },
  { type: 'email', icon: <Mail size={18} />, label: 'E-mail' },
  { type: 'copies', icon: <MessageSquare size={18} />, label: 'Copies' },
  { type: 'assets', icon: <ImageIcon size={18} />, label: 'Assets' },
  { type: 'video', icon: <Video size={18} />, label: 'Script' },
  { type: 'timeline', icon: <Clock size={18} />, label: 'Timeline' },
]

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatRevenue(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace('.0', '')}M`
  if (value >= 1_000) return `R$ ${Math.round(value / 1_000)}k`
  return `R$ ${value.toLocaleString('pt-BR')}`
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function ProductThumb() {
  return <div className="bg-muted h-10 w-10 flex-shrink-0 rounded-lg" />
}

function ProductTagBadge({ tag }: { tag: ProductTag }) {
  const config = productTagConfig(tag)
  return (
    <span
      className="rounded-full px-2 py-0.5"
      style={{ fontSize: 11, fontWeight: 500, background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      className="border-border border-b px-5 py-3 tracking-[0.08em] uppercase"
      style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)' }}
    >
      {label}
    </p>
  )
}

function RegenerateButton({
  onClick,
  isLoading = false,
}: {
  onClick?: () => void
  isLoading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="hover:text-foreground flex items-center gap-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
    >
      <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
      Regenerar
    </button>
  )
}

function ActionButtons({ onRegenerate }: { onRegenerate?: () => void }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        className="border-border text-foreground hover:bg-muted rounded-lg border px-3 py-1.5 transition-colors"
        style={{ fontSize: 13 }}
      >
        Editar
      </button>
      <button
        onClick={onRegenerate}
        className="border-border text-foreground hover:bg-muted flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors"
        style={{ fontSize: 13 }}
      >
        <RefreshCw size={13} />
        Regenerar
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function SkeletonBox({ className }: { className?: string }) {
  return <div className={cn('bg-muted animate-pulse rounded', className)} />
}

function Level2Skeleton() {
  return (
    <div className="flex flex-col" style={{ background: 'var(--muted)' }}>
      {/* Header skeleton */}
      <div
        className="px-6 pt-5 pb-6"
        style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
      >
        <SkeletonBox className="mb-4 h-3 w-20" />
        <SkeletonBox className="mb-3 h-6 w-48" />
        <div className="flex items-center gap-3">
          <SkeletonBox className="h-5 w-16 rounded-full" />
          <SkeletonBox className="h-4 w-24" />
        </div>
      </div>

      {/* Concept card skeleton */}
      <div className="px-4 pt-5 pb-2">
        <SkeletonBox className="mb-3 h-3 w-36" />
        <div
          className="flex flex-col gap-3 rounded-2xl p-5"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <SkeletonBox className="h-5 w-4/5" />
          <SkeletonBox className="h-4 w-full" />
          <SkeletonBox className="h-4 w-3/4" />
          <div
            className="mt-2 flex flex-col gap-3 pt-2"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <SkeletonBox className="h-3 w-28" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonBox className="h-10 w-10 flex-shrink-0 rounded-xl" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <SkeletonBox className="h-3.5 w-36" />
                  <SkeletonBox className="h-3 w-20" />
                </div>
                <SkeletonBox className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section nav skeleton */}
      <div className="px-4 pt-4 pb-5">
        <SkeletonBox className="mb-3 h-3 w-24" />
        <div
          className="overflow-hidden rounded-2xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {[0, 1, 2, 3, 4, 5].map((i, idx, arr) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <SkeletonBox className="h-8 w-8 flex-shrink-0 rounded-xl" />
              <SkeletonBox className="h-4 w-24 flex-1" />
              <SkeletonBox className="h-3 w-20" />
              <SkeletonBox className="h-3 w-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Level3Skeleton() {
  return (
    <div className="flex flex-col gap-4 p-5">
      <SkeletonBox className="h-4 w-24" />
      {[0, 1, 2].map((i) => (
        <SkeletonBox key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

function Breadcrumb({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="hover:text-foreground flex items-center gap-1 transition-colors"
      style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
    >
      <ChevronLeft size={14} />
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Level 1 — Date list row
// ---------------------------------------------------------------------------

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5"
      style={{
        fontSize: 11,
        fontWeight: 500,
        background: isActive
          ? 'color-mix(in srgb, var(--green, #22c55e) 12%, transparent)'
          : 'color-mix(in srgb, #f97316 12%, transparent)',
        color: isActive ? 'var(--green, #22c55e)' : '#f97316',
      }}
    >
      {isActive ? 'Ativo' : 'Pendente'}
    </span>
  )
}

function CalendarRow({
  date,
  isLast,
  onClick,
  hasCampaign,
}: {
  date: PersonalizedDate
  isLast: boolean
  onClick: () => void
  hasCampaign: boolean
}) {
  // Extract month abbreviation from displayDate (e.g., "10 de Maio" → "MAI")
  const monthMatch = date.displayDate?.match(/de\s+(\w+)/i)
  const monthLabel = monthMatch ? monthMatch[1].substring(0, 3).toUpperCase() : ''
  const dayMatch = date.displayDate?.match(/^(\d+)/)
  const dayNumber = dayMatch ? dayMatch[1] : ''

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center justify-between transition-colors hover:bg-[var(--accent)]'
      )}
      style={{
        padding: '16px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      {/* Left: month/day + name + revenue */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex w-10 shrink-0 flex-col items-center">
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: 'var(--muted-foreground)',
              letterSpacing: '0.05em',
            }}
          >
            {monthLabel}
          </span>
          <span
            style={{ fontSize: 22, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1 }}
          >
            {dayNumber}
          </span>
        </div>
        <div className="min-w-0">
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
            {date.name}
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0, marginTop: 2 }}>
            R$ {date.estimatedRevenue?.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Right: status badge + chevron */}
      <div className="flex shrink-0 items-center gap-2 pl-3">
        <StatusBadge isActive={hasCampaign} />
        <ChevronRight size={16} style={{ color: 'var(--muted-foreground)' }} />
      </div>
    </div>
  )
}

/* Keep old PRIORITY_COLORS reference for potential future use */
function _CalendarRowOld({
  date,
  isLast,
  onClick,
}: {
  date: PersonalizedDate
  isLast: boolean
  onClick: () => void
}) {
  const dotColor = PRIORITY_COLORS[date.priority]

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center justify-between transition-colors hover:bg-[var(--accent)]'
      )}
      style={{
        padding: '14px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="shrink-0 rounded-full"
          style={{ width: 8, height: 8, backgroundColor: dotColor }}
        />
        <div className="min-w-0">
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
            {date.name}
          </span>
          <span style={{ fontSize: 14, color: 'var(--muted-foreground)', marginLeft: 6 }}>
            &middot; {date.displayDate}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 pl-3">
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--foreground)',
            whiteSpace: 'nowrap',
          }}
        >
          {formatRevenue(date.estimatedRevenue)}
        </span>
        <ChevronRight style={{ width: 14, height: 14, color: 'var(--muted-foreground)' }} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Level 2 — Campaign detail
// ---------------------------------------------------------------------------

function sectionMeta(type: SectionType, campaign: FullCampaign): string {
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
  }
}

function Level2({
  dateId,
  dateName,
  displayDate,
  estimatedRevenue,
  campaign,
  isGenerating,
  isRegeneratingConcept,
  generationError,
  onBack,
  onGenerate,
  onRegenerateConcept,
  onSelectSection,
}: {
  dateId: string
  dateName: string
  displayDate?: string
  estimatedRevenue?: number
  campaign: FullCampaign | null
  isGenerating: boolean
  isRegeneratingConcept: boolean
  generationError: boolean
  onBack: () => void
  onGenerate: () => void
  onRegenerateConcept: () => void
  onSelectSection: (sectionType: SectionType) => void
}) {
  const hasCampaign = !!campaign

  return (
    <div className="flex flex-col" style={{ background: 'var(--muted)', minHeight: '100%' }}>
      {/* Header — white card surface */}
      <div
        className="px-6 pt-5 pb-6"
        style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="mb-4">
          <Breadcrumb label="Calendario Sazonal 2026" onClick={onBack} />
        </div>

        {displayDate && (
          <p
            className="mb-1 tracking-[0.06em] uppercase"
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--muted-foreground)',
              letterSpacing: '0.08em',
            }}
          >
            {displayDate}
          </p>
        )}

        <div className="flex items-start justify-between gap-4">
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--foreground)',
              margin: 0,
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
            }}
          >
            {dateName}
          </h2>
          {campaign && (
            <RegenerateButton onClick={onRegenerateConcept} isLoading={isRegeneratingConcept} />
          )}
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <StatusBadge isActive={hasCampaign} />
          <span
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: 'var(--border)',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--muted-foreground)', fontWeight: 500 }}>
            {formatRevenue(estimatedRevenue ?? 0)}
          </span>
        </div>
      </div>

      {/* Loading */}
      {isGenerating && (
        <div style={{ background: 'var(--muted)' }}>
          <Level2Skeleton />
        </div>
      )}

      {/* Error */}
      {generationError && !isGenerating && (
        <div className="mx-4 mt-5">
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'color-mix(in srgb, #ef4444 8%, var(--card))',
              border: '1px solid color-mix(in srgb, #ef4444 20%, transparent)',
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>
              Erro ao gerar campanha
            </p>
            <p style={{ fontSize: 13, color: '#ef4444', lineHeight: 1.5 }}>
              Verifique se o Brand DNA está configurado e tente novamente.
            </p>
            <button
              onClick={onGenerate}
              className="mt-4 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: '#dc2626', fontSize: 13 }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* No campaign — empty state */}
      {!campaign && !isGenerating && !generationError && (
        <div className="flex flex-col items-center px-6 py-20 text-center">
          <div
            className="mb-6 flex items-center justify-center rounded-2xl"
            style={{
              width: 64,
              height: 64,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Sparkles style={{ width: 28, height: 28, color: 'var(--muted-foreground)' }} />
          </div>

          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--foreground)',
              marginBottom: 8,
              letterSpacing: '-0.01em',
            }}
          >
            Campanha ainda não gerada
          </p>
          <p
            style={{
              fontSize: 13,
              color: 'var(--muted-foreground)',
              maxWidth: 260,
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            Gere uma campanha completa com conceito, copies, assets e timeline.
          </p>

          <button
            onClick={onGenerate}
            className="rounded-xl font-medium transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: 'var(--foreground)',
              color: 'var(--background)',
              fontSize: 14,
              padding: '12px 32px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            Gerar Campanha
          </button>

          <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 16 }}>
            ou peça ao Snew:{' '}
            <em style={{ fontStyle: 'italic' }}>&ldquo;Gera a campanha de {dateName}&rdquo;</em>
          </p>
        </div>
      )}

      {/* Campaign content */}
      {campaign && !isGenerating && (
        <>
          {/* Concept card */}
          <div className="px-4 pt-5 pb-2">
            <p
              className="mb-3 tracking-[0.08em] uppercase"
              style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-foreground)' }}
            >
              Conceito da Campanha
            </p>

            {isRegeneratingConcept ? (
              <div
                className="flex flex-col gap-3 rounded-2xl p-5"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <SkeletonBox className="h-5 w-3/4" />
                <SkeletonBox className="h-4 w-full" />
                <SkeletonBox className="h-4 w-2/3" />
                <SkeletonBox className="mt-1 h-3 w-28" />
              </div>
            ) : (
              <div
                className="flex flex-col rounded-2xl"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                  overflow: 'hidden',
                }}
              >
                {/* Slogan + description */}
                <div className="flex flex-col gap-3 p-5">
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      lineHeight: 1.4,
                      fontStyle: 'italic',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    &ldquo;{campaign.concept.slogan}&rdquo;
                  </p>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted-foreground)' }}>
                    {campaign.concept.description}
                  </p>
                </div>

                {/* Products — separated by a hairline */}
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="px-5 pt-4 pb-2">
                    <p
                      className="mb-3 tracking-[0.08em] uppercase"
                      style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-foreground)' }}
                    >
                      Produtos Sugeridos
                    </p>
                    <div className="flex flex-col gap-3 pb-3">
                      {campaign.concept.products.slice(0, 3).map((product, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-xl p-2.5 transition-colors"
                          style={{
                            background: 'color-mix(in srgb, var(--foreground) 3%, transparent)',
                          }}
                        >
                          <div
                            className="flex-shrink-0 rounded-xl"
                            style={{
                              width: 40,
                              height: 40,
                              background: 'color-mix(in srgb, var(--foreground) 8%, transparent)',
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate"
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--foreground)',
                                lineHeight: 1.3,
                              }}
                            >
                              {product.name}
                            </p>
                            <p
                              style={{
                                fontSize: 12,
                                color: 'var(--muted-foreground)',
                                marginTop: 1,
                              }}
                            >
                              R$ {product.price}
                            </p>
                          </div>
                          <ProductTagBadge tag={product.tag} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section navigation */}
          <div className="px-4 pt-3 pb-6">
            <p
              className="mb-3 tracking-[0.08em] uppercase"
              style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-foreground)' }}
            >
              Seções
            </p>
            <div
              className="overflow-hidden rounded-2xl"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {SECTION_DEFS.map((section, index) => {
                const isLast = index === SECTION_DEFS.length - 1
                return (
                  <button
                    key={section.type}
                    onClick={() => onSelectSection(section.type)}
                    className="group flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--accent)]"
                    style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}
                  >
                    {/* Icon container */}
                    <span
                      className="flex flex-shrink-0 items-center justify-center rounded-xl transition-colors"
                      style={{
                        width: 34,
                        height: 34,
                        background: 'color-mix(in srgb, var(--foreground) 6%, transparent)',
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      {section.icon}
                    </span>

                    {/* Label */}
                    <span
                      className="flex-1"
                      style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}
                    >
                      {section.label}
                    </span>

                    {/* Count */}
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--muted-foreground)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sectionMeta(section.type, campaign)}
                    </span>

                    <ChevronRight
                      size={15}
                      className="flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                      style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Level 3 — Section content
// ---------------------------------------------------------------------------

function CopiesSection({
  campaign,
  onRegenerate,
}: {
  campaign: FullCampaign
  onRegenerate?: () => void
}) {
  const firstProduct = campaign.selectedProducts[0]
  return (
    <div className="flex flex-col gap-4 p-5">
      {campaign.copies.map((copy, i) => (
        <div key={i} className="border-border flex flex-col rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-sm font-medium">{copy.channel}</span>
              <span
                className="rounded-full px-2 py-0.5"
                style={{
                  fontSize: 11,
                  background: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                }}
              >
                {copy.timing}
              </span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(copy.text).catch(() => null)}
              className="hover:text-foreground flex items-center gap-1 transition-colors"
              style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
            >
              <Copy size={12} />
              Copiar
            </button>
          </div>
          <p className="text-foreground leading-relaxed" style={{ fontSize: 14 }}>
            {copy.text}
          </p>
          {i === 0 && firstProduct && (
            <div className="border-border mt-3 flex items-center gap-3 rounded-lg border p-3">
              <ProductThumb />
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">{firstProduct.name}</p>
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                  R$ {firstProduct.price}
                </p>
              </div>
            </div>
          )}
          <ActionButtons onRegenerate={onRegenerate} />
        </div>
      ))}
    </div>
  )
}

function ProductsSection({ campaign }: { campaign: FullCampaign }) {
  return (
    <div className="flex flex-col gap-3 p-5">
      {campaign.selectedProducts.map((product, i) => (
        <div key={i} className="border-border flex items-center gap-3 rounded-xl border p-4">
          <ProductThumb />
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm leading-snug font-medium">
              {product.name}
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>R$ {product.price}</p>
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-1">
            <ProductTagBadge tag={product.tag} />
            {product.stock !== undefined && (
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                {product.stock} em estoque
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function EmailSection({
  campaign,
  onRegenerate,
}: {
  campaign: FullCampaign
  onRegenerate?: () => void
}) {
  return (
    <div className="p-5">
      <div className="border-border flex flex-col gap-3 rounded-xl border p-5">
        <div>
          <p
            className="mb-1 tracking-[0.08em] uppercase"
            style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)' }}
          >
            Assunto
          </p>
          <p className="text-foreground text-sm font-medium">{campaign.emailSubject}</p>
        </div>
        <div>
          <p
            className="mb-1 tracking-[0.08em] uppercase"
            style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)' }}
          >
            Preview
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{campaign.emailPreview}</p>
        </div>
        <ActionButtons onRegenerate={onRegenerate} />
      </div>
    </div>
  )
}

function AssetsSection({
  campaign,
  onRegenerate,
}: {
  campaign: FullCampaign
  onRegenerate?: () => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 p-5">
      {campaign.assets.map((asset, i) => (
        <div key={i} className="border-border flex flex-col overflow-hidden rounded-xl border">
          <div className="h-24 w-full" style={{ background: asset.bg }} />
          <div className="flex flex-col gap-1 p-3">
            <p className="text-foreground text-sm font-medium">{asset.label}</p>
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{asset.ratio}</p>
            <ActionButtons onRegenerate={onRegenerate} />
          </div>
        </div>
      ))}
    </div>
  )
}

function VideoSection({
  campaign,
  onRegenerate,
}: {
  campaign: FullCampaign
  onRegenerate?: () => void
}) {
  return (
    <div className="flex flex-col gap-4 p-5">
      {campaign.videoScripts.map((script, i) => (
        <div key={i} className="border-border flex flex-col gap-2 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <span className="text-foreground text-sm font-medium">{script.title}</span>
            <span
              className="rounded-full px-2 py-0.5"
              style={{ fontSize: 11, background: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              {script.duration}
            </span>
          </div>
          <p
            className="leading-relaxed whitespace-pre-line"
            style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
          >
            {script.content}
          </p>
          <ActionButtons onRegenerate={onRegenerate} />
        </div>
      ))}
    </div>
  )
}

function TimelineSection({ campaign }: { campaign: FullCampaign }) {
  return (
    <div className="flex flex-col gap-4 p-5">
      {campaign.timeline.map((item, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-shrink-0 flex-col items-center gap-1.5">
            <span
              className="rounded-full px-3 py-1 font-medium"
              style={{
                fontSize: 12,
                background: 'var(--muted)',
                color: 'var(--muted-foreground)',
                whiteSpace: 'nowrap',
              }}
            >
              {item.day}
            </span>
            {i < campaign.timeline.length - 1 && (
              <div className="bg-border w-px flex-1" style={{ minHeight: 16 }} />
            )}
          </div>
          <div className="flex flex-col gap-1.5 pb-4">
            {item.actions.map((action, j) => (
              <p key={j} className="text-foreground text-sm leading-snug">
                {action}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Level3({
  dateId,
  dateName,
  sectionType,
  campaign,
  isRegenerating,
  onBack,
  onRegenerate,
}: {
  dateId: string
  dateName: string
  sectionType: SectionType
  campaign: FullCampaign
  isRegenerating: boolean
  onBack: () => void
  onRegenerate: () => void
}) {
  const sectionLabel: Record<SectionType, string> = {
    products: 'Produtos',
    email: 'E-mail',
    copies: 'Copies',
    assets: 'Assets',
    video: 'Script de Vídeo',
    timeline: 'Timeline',
  }

  return (
    <div className="flex flex-col">
      {/* Breadcrumb */}
      <div className="border-border flex items-center justify-between border-b px-5 py-3">
        <Breadcrumb label={dateName} onClick={onBack} />
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="hover:text-foreground flex items-center gap-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
        >
          <RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} />
          Regenerar
        </button>
      </div>

      {/* Section label */}
      <SectionLabel label={sectionLabel[sectionType]} />

      {/* Content */}
      {isRegenerating ? (
        <Level3Skeleton />
      ) : (
        <>
          {sectionType === 'copies' && (
            <CopiesSection campaign={campaign} onRegenerate={onRegenerate} />
          )}
          {sectionType === 'products' && <ProductsSection campaign={campaign} />}
          {sectionType === 'email' && (
            <EmailSection campaign={campaign} onRegenerate={onRegenerate} />
          )}
          {sectionType === 'assets' && (
            <AssetsSection campaign={campaign} onRegenerate={onRegenerate} />
          )}
          {sectionType === 'video' && (
            <VideoSection campaign={campaign} onRegenerate={onRegenerate} />
          )}
          {sectionType === 'timeline' && <TimelineSection campaign={campaign} />}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SeasonalCalendarArtifactProps {
  data: PersonalizedCalendar & { campaigns?: Record<string, FullCampaign> }
  taskId?: string
}

export function SeasonalCalendarArtifact({ data, taskId }: SeasonalCalendarArtifactProps) {
  const { dates, year, summary } = data
  const highCount = dates.filter((d) => d.priority === 'high').length

  // Navigation state
  const [view, setView] = useState<ArtifactView>({ level: 1 })

  // Campaign store (keyed by dateId)
  const [campaigns, setCampaigns] = useState<Record<string, FullCampaign>>(data.campaigns ?? {})

  // Loading/error state per dateId
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
  const [generationError, setGenerationError] = useState<Record<string, boolean>>({})
  const [regeneratingConcept, setRegeneratingConcept] = useState<Record<string, boolean>>({})
  const [regeneratingSection, setRegeneratingSection] = useState<Record<string, boolean>>({})

  // --- Save campaigns to task artifact_data ---
  async function saveCampaignsToTask(updatedCampaigns: Record<string, FullCampaign>) {
    if (!taskId) return
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifact_data: { ...data, campaigns: updatedCampaigns },
        }),
      })
    } catch {
      // best-effort save
    }
  }

  // --- Generate campaign ---
  async function generateCampaign(dateId: string, dateName: string) {
    if (generating[dateId]) return // prevent duplicate calls
    setGenerating((prev) => ({ ...prev, [dateId]: true }))
    setGenerationError((prev) => ({ ...prev, [dateId]: false }))
    try {
      const res = await fetch('/api/skills/seasonal-calendar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateId, dateName }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error ?? 'generation failed')
      }
      const body = await res.json()
      // API returns { executionId, campaign, durationMs } — extract campaign
      const campaign = (body.campaign ?? body) as FullCampaign
      const updated = { ...campaigns, [dateId]: campaign }
      setCampaigns(updated)
      void saveCampaignsToTask(updated)
    } catch {
      setGenerationError((prev) => ({ ...prev, [dateId]: true }))
    } finally {
      setGenerating((prev) => ({ ...prev, [dateId]: false }))
    }
  }

  // --- Regenerate concept ---
  async function regenerateConcept(dateId: string, dateName: string) {
    setRegeneratingConcept((prev) => ({ ...prev, [dateId]: true }))
    try {
      const res = await fetch('/api/skills/seasonal-calendar/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateId, sectionType: 'concept' }),
      })
      if (!res.ok) throw new Error('regeneration failed')
      const body = await res.json()
      const updated = (body.campaign ?? body) as FullCampaign
      setCampaigns((prev) => ({
        ...prev,
        [dateId]: { ...prev[dateId]!, ...updated },
      }))
    } catch {
      // silently fail — user can retry
    } finally {
      setRegeneratingConcept((prev) => ({ ...prev, [dateId]: false }))
    }
  }

  // --- Regenerate section ---
  async function regenerateSection(dateId: string, sectionType: string) {
    const key = `${dateId}:${sectionType}`
    setRegeneratingSection((prev) => ({ ...prev, [key]: true }))
    try {
      const res = await fetch('/api/skills/seasonal-calendar/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateId, sectionType }),
      })
      if (!res.ok) throw new Error('regeneration failed')
      const body = await res.json()
      const updated = (body.campaign ?? body) as FullCampaign
      setCampaigns((prev) => ({
        ...prev,
        [dateId]: { ...prev[dateId]!, ...updated },
      }))
    } catch {
      // silently fail
    } finally {
      setRegeneratingSection((prev) => ({ ...prev, [key]: false }))
    }
  }

  // --- Handle date click ---
  function handleDateClick(date: PersonalizedDate) {
    setView({ level: 2, dateId: date.id, dateName: date.name })
    // Don't auto-generate — show empty state with "Gerar Campanha" button
  }

  // ---------------------------------------------------------------------------
  // Level 1
  // ---------------------------------------------------------------------------
  if (view.level === 1) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>
          Calendário Sazonal {year}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 24 }}>
          {dates.length} datas · {Object.keys(campaigns).length} geradas · R${' '}
          {Math.round(dates.reduce((sum, d) => sum + (d.estimatedRevenue ?? 0), 0) / 1000)}k
          potencial
        </p>
        <div>
          {dates.map((date, index) => (
            <CalendarRow
              key={date.id}
              date={date}
              isLast={index === dates.length - 1}
              onClick={() => handleDateClick(date)}
              hasCampaign={!!campaigns[date.id]}
            />
          ))}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Level 2
  // ---------------------------------------------------------------------------
  if (view.level === 2) {
    const { dateId, dateName } = view
    return (
      <Level2
        dateId={dateId}
        dateName={dateName}
        displayDate={dates.find((d) => d.id === dateId)?.displayDate}
        estimatedRevenue={dates.find((d) => d.id === dateId)?.estimatedRevenue}
        campaign={campaigns[dateId] ?? null}
        isGenerating={generating[dateId] ?? false}
        isRegeneratingConcept={regeneratingConcept[dateId] ?? false}
        generationError={generationError[dateId] ?? false}
        onBack={() => setView({ level: 1 })}
        onGenerate={() => void generateCampaign(dateId, dateName)}
        onRegenerateConcept={() => void regenerateConcept(dateId, dateName)}
        onSelectSection={(sectionType) => setView({ level: 3, dateId, dateName, sectionType })}
      />
    )
  }

  // ---------------------------------------------------------------------------
  // Level 3
  // ---------------------------------------------------------------------------
  if (view.level === 3) {
    const { dateId, dateName, sectionType } = view
    const campaign = campaigns[dateId]
    if (!campaign) {
      // Shouldn't happen, but guard anyway
      return (
        <div className="p-5 text-center" style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
          Campanha não encontrada.{' '}
          <button onClick={() => setView({ level: 2, dateId, dateName })} className="underline">
            Voltar
          </button>
        </div>
      )
    }
    const sectionKey = `${dateId}:${sectionType}`
    return (
      <Level3
        dateId={dateId}
        dateName={dateName}
        sectionType={sectionType}
        campaign={campaign}
        isRegenerating={regeneratingSection[sectionKey] ?? false}
        onBack={() => setView({ level: 2, dateId, dateName })}
        onRegenerate={() => void regenerateSection(dateId, sectionType)}
      />
    )
  }

  return null
}
