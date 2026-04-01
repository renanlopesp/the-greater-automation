'use client'

import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Clock,
  Sparkles,
  Copy,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PersonalizedCalendar, PersonalizedDate } from '@/lib/ai/seasonal-campaign-generator'
import type { FullCampaign, ProductTag } from '@/data/campaign-data'
import { productTagConfig } from '@/data/campaign-data'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionType = 'products' | 'email' | 'copies' | 'assets' | 'video' | 'timeline'

type ArtifactView =
  | { level: 1 }
  | { level: 2; dateId: string; dateName: string }
  | { level: 3; dateId: string; dateName: string; sectionType: SectionType }

// ---------------------------------------------------------------------------
// Section config
// ---------------------------------------------------------------------------

const SECTION_DEFS: { type: SectionType; icon: React.ReactNode; label: string }[] = [
  { type: 'products', icon: <Package size={16} />, label: 'Produtos' },
  { type: 'email', icon: <Mail size={16} />, label: 'E-mail' },
  { type: 'copies', icon: <MessageSquare size={16} />, label: 'Copies' },
  { type: 'assets', icon: <ImageIcon size={16} />, label: 'Assets' },
  { type: 'video', icon: <Video size={16} />, label: 'Script' },
  { type: 'timeline', icon: <Clock size={16} />, label: 'Timeline' },
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
// Sub-components
// ---------------------------------------------------------------------------

function ProductTagBadge({ tag }: { tag: ProductTag }) {
  const config = productTagConfig(tag)
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-medium',
        isActive
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-foreground/5 text-muted-foreground'
      )}
    >
      {isActive ? 'Gerada' : 'Pendente'}
    </span>
  )
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground -ml-1 flex items-center gap-0.5 text-[13px] transition-colors"
    >
      <ChevronLeft size={16} />
      {label}
    </button>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.08em] uppercase">
      {children}
    </p>
  )
}

function SkeletonBox({ className }: { className?: string }) {
  return <div className={cn('bg-foreground/5 animate-pulse rounded-lg', className)} />
}

// ---------------------------------------------------------------------------
// Level 1 — Date list
// ---------------------------------------------------------------------------

function CalendarRow({
  date,
  onClick,
  hasCampaign,
}: {
  date: PersonalizedDate
  onClick: () => void
  hasCampaign: boolean
}) {
  const monthMatch = date.displayDate?.match(/de\s+(\w+)/i)
  const monthLabel = monthMatch ? monthMatch[1].substring(0, 3).toUpperCase() : ''
  const dayMatch = date.displayDate?.match(/^(\d+)/)
  const dayNumber = dayMatch ? dayMatch[1] : ''

  return (
    <button
      onClick={onClick}
      className="hover:bg-accent/60 group flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left transition-colors"
    >
      <div className="flex w-10 shrink-0 flex-col items-center">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {monthLabel}
        </span>
        <span className="text-foreground text-lg leading-tight font-semibold">{dayNumber}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-[13px] leading-snug font-medium">{date.name}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatRevenue(date.estimatedRevenue ?? 0)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge isActive={hasCampaign} />
        <ChevronRight
          size={14}
          className="text-muted-foreground/40 transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </button>
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

function Level2Skeleton() {
  return (
    <div className="flex flex-col gap-6 pt-5">
      <div>
        <SkeletonBox className="mb-3 h-3 w-20" />
        <div className="border-border flex flex-col gap-2.5 rounded-xl border p-4">
          <SkeletonBox className="h-4 w-3/4" />
          <SkeletonBox className="h-3.5 w-full" />
          <SkeletonBox className="h-3.5 w-2/3" />
        </div>
      </div>
      <div>
        <SkeletonBox className="mb-3 h-3 w-16" />
        {[0, 1, 2].map((i) => (
          <SkeletonBox key={i} className="mb-2 h-12 w-full" />
        ))}
      </div>
      <div>
        <SkeletonBox className="mb-3 h-3 w-14" />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonBox key={i} className="h-16" />
          ))}
        </div>
      </div>
    </div>
  )
}

function Level2({
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
  return (
    <div className="flex flex-col">
      {/* Back nav */}
      <div className="px-6 pt-4 pb-2">
        <BackButton label="Calendário" onClick={onBack} />
      </div>

      {/* Date header */}
      <div className="px-6 pb-4">
        {displayDate && <p className="text-muted-foreground mb-0.5 text-xs">{displayDate}</p>}
        <h2 className="text-foreground text-xl font-semibold tracking-tight">{dateName}</h2>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge isActive={!!campaign} />
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-muted-foreground text-[13px]">
            {formatRevenue(estimatedRevenue ?? 0)}
          </span>
        </div>
      </div>

      <div className="border-border mx-6 border-t" />

      {/* Loading */}
      {isGenerating && (
        <div className="px-6">
          <Level2Skeleton />
        </div>
      )}

      {/* Error */}
      {generationError && !isGenerating && (
        <div className="px-6 pt-5">
          <div
            className="rounded-xl p-4"
            style={{
              background: 'color-mix(in srgb, #ef4444 6%, var(--background))',
              border: '1px solid color-mix(in srgb, #ef4444 15%, transparent)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: '#dc2626' }}>
              Erro ao gerar campanha
            </p>
            <p className="mt-1 text-[13px]" style={{ color: '#ef4444' }}>
              Verifique o Brand DNA e tente novamente.
            </p>
            <button
              onClick={onGenerate}
              className="mt-3 rounded-lg px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: '#dc2626' }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!campaign && !isGenerating && !generationError && (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <div
            className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'color-mix(in srgb, var(--foreground) 4%, transparent)' }}
          >
            <Sparkles className="text-muted-foreground h-6 w-6" />
          </div>
          <p className="text-foreground text-[15px] font-semibold">Campanha não gerada</p>
          <p className="text-muted-foreground mt-2 max-w-[240px] text-[13px] leading-relaxed">
            Gere conceito, copies, assets e timeline automaticamente.
          </p>
          <button
            onClick={onGenerate}
            className="bg-foreground text-background mt-6 rounded-xl px-7 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            Gerar Campanha
          </button>
          <p className="text-muted-foreground mt-4 text-[11px]">
            ou peça: <em>&ldquo;Gera campanha de {dateName}&rdquo;</em>
          </p>
        </div>
      )}

      {/* Campaign content */}
      {campaign && !isGenerating && (
        <div className="flex flex-col gap-6 px-6 pt-5 pb-8">
          {/* Concept */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <SectionHeading>Conceito</SectionHeading>
              <button
                onClick={onRegenerateConcept}
                disabled={isRegeneratingConcept}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={isRegeneratingConcept ? 'animate-spin' : ''} />
                Regenerar
              </button>
            </div>
            {isRegeneratingConcept ? (
              <div className="border-border flex flex-col gap-2.5 rounded-xl border p-4">
                <SkeletonBox className="h-4 w-3/4" />
                <SkeletonBox className="h-3.5 w-full" />
                <SkeletonBox className="h-3.5 w-2/3" />
              </div>
            ) : (
              <div className="border-border rounded-xl border p-4">
                <p className="text-foreground text-sm leading-relaxed font-medium italic">
                  &ldquo;{campaign.concept.slogan}&rdquo;
                </p>
                <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
                  {campaign.concept.description}
                </p>
              </div>
            )}
          </div>

          {/* Products */}
          <div>
            <SectionHeading>Produtos</SectionHeading>
            <div className="flex flex-col gap-1.5">
              {campaign.concept.products.slice(0, 3).map((product, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                  style={{ background: 'color-mix(in srgb, var(--foreground) 3%, transparent)' }}
                >
                  <div
                    className="text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
                    style={{ background: 'color-mix(in srgb, var(--foreground) 7%, transparent)' }}
                  >
                    {product.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-[13px] font-medium">
                      {product.name}
                    </p>
                    <p className="text-muted-foreground text-xs">R$ {product.price}</p>
                  </div>
                  <ProductTagBadge tag={product.tag} />
                </div>
              ))}
            </div>
          </div>

          {/* Sections grid */}
          <div>
            <SectionHeading>Seções</SectionHeading>
            <div className="grid grid-cols-2 gap-2">
              {SECTION_DEFS.map((section) => (
                <button
                  key={section.type}
                  onClick={() => onSelectSection(section.type)}
                  className="border-border hover:bg-accent/60 group flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{section.icon}</span>
                    <span className="text-foreground text-[13px] font-medium">{section.label}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {sectionMeta(section.type, campaign)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Level 3 — Section content
// ---------------------------------------------------------------------------

function CopiesSection({ campaign }: { campaign: FullCampaign }) {
  return (
    <div className="flex flex-col gap-3 px-6 py-5">
      {campaign.copies.map((copy, i) => (
        <div key={i} className="border-border rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-sm font-medium">{copy.channel}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[11px]"
                style={{
                  background: 'color-mix(in srgb, var(--foreground) 5%, transparent)',
                  color: 'var(--muted-foreground)',
                }}
              >
                {copy.timing}
              </span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(copy.text).catch(() => null)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
            >
              <Copy size={12} />
              Copiar
            </button>
          </div>
          <p className="text-foreground text-sm leading-relaxed">{copy.text}</p>
        </div>
      ))}
    </div>
  )
}

function ProductsSection({ campaign }: { campaign: FullCampaign }) {
  return (
    <div className="flex flex-col gap-2 px-6 py-5">
      {campaign.selectedProducts.map((product, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
          style={{ background: 'color-mix(in srgb, var(--foreground) 3%, transparent)' }}
        >
          <div
            className="text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
            style={{ background: 'color-mix(in srgb, var(--foreground) 7%, transparent)' }}
          >
            {product.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-[13px] font-medium">{product.name}</p>
            <p className="text-muted-foreground text-xs">R$ {product.price}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <ProductTagBadge tag={product.tag} />
            {product.stock !== undefined && (
              <span className="text-muted-foreground text-[11px]">{product.stock} em estoque</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function EmailSection({ campaign }: { campaign: FullCampaign }) {
  return (
    <div className="px-6 py-5">
      <div className="border-border rounded-xl border p-4">
        <div className="mb-3">
          <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wider uppercase">
            Assunto
          </p>
          <p className="text-foreground text-sm font-medium">{campaign.emailSubject}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wider uppercase">
            Preview
          </p>
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            {campaign.emailPreview}
          </p>
        </div>
      </div>
    </div>
  )
}

function AssetsSection({ campaign }: { campaign: FullCampaign }) {
  return (
    <div className="grid grid-cols-2 gap-2 px-6 py-5">
      {campaign.assets.map((asset, i) => (
        <div key={i} className="border-border overflow-hidden rounded-xl border">
          <div className="h-20 w-full" style={{ background: asset.bg }} />
          <div className="p-3">
            <p className="text-foreground text-[13px] font-medium">{asset.label}</p>
            <p className="text-muted-foreground text-xs">{asset.ratio}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function VideoSection({ campaign }: { campaign: FullCampaign }) {
  return (
    <div className="flex flex-col gap-3 px-6 py-5">
      {campaign.videoScripts.map((script, i) => (
        <div key={i} className="border-border rounded-xl border p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-foreground text-sm font-medium">{script.title}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px]"
              style={{
                background: 'color-mix(in srgb, var(--foreground) 5%, transparent)',
                color: 'var(--muted-foreground)',
              }}
            >
              {script.duration}
            </span>
          </div>
          <p className="text-muted-foreground text-[13px] leading-relaxed whitespace-pre-line">
            {script.content}
          </p>
        </div>
      ))}
    </div>
  )
}

function TimelineSection({ campaign }: { campaign: FullCampaign }) {
  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      {campaign.timeline.map((item, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <span
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: 'color-mix(in srgb, var(--foreground) 5%, transparent)',
                color: 'var(--muted-foreground)',
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

function Level3Skeleton() {
  return (
    <div className="flex flex-col gap-3 px-6 py-5">
      {[0, 1, 2].map((i) => (
        <SkeletonBox key={i} className="h-20 w-full" />
      ))}
    </div>
  )
}

function Level3({
  dateName,
  sectionType,
  campaign,
  isRegenerating,
  onBack,
  onRegenerate,
}: {
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
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-4 pb-3">
        <BackButton label={dateName} onClick={onBack} />
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={isRegenerating ? 'animate-spin' : ''} />
          Regenerar
        </button>
      </div>

      {/* Section title */}
      <div className="border-border border-b px-6 py-2.5">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
          {sectionLabel[sectionType]}
        </p>
      </div>

      {/* Content */}
      {isRegenerating ? (
        <Level3Skeleton />
      ) : (
        <>
          {sectionType === 'copies' && <CopiesSection campaign={campaign} />}
          {sectionType === 'products' && <ProductsSection campaign={campaign} />}
          {sectionType === 'email' && <EmailSection campaign={campaign} />}
          {sectionType === 'assets' && <AssetsSection campaign={campaign} />}
          {sectionType === 'video' && <VideoSection campaign={campaign} />}
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
  const { dates, year } = data

  // Navigation state
  const [view, setView] = useState<ArtifactView>({ level: 1 })

  // Campaign store (keyed by dateId)
  const [campaigns, setCampaigns] = useState<Record<string, FullCampaign>>(data.campaigns ?? {})

  // Sync campaigns from parent data (e.g., after SNEW_MODIFY_ARTIFACT updates the DB and useTask refetches)
  useEffect(() => {
    if (data.campaigns) {
      setCampaigns(data.campaigns)
    }
  }, [data.campaigns])

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
    if (generating[dateId]) return
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
      // silently fail
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
  }

  // ---------------------------------------------------------------------------
  // Level 1
  // ---------------------------------------------------------------------------
  if (view.level === 1) {
    const generatedCount = Object.keys(campaigns).length
    const totalRevenue = dates.reduce((sum, d) => sum + (d.estimatedRevenue ?? 0), 0)

    return (
      <div className="px-6 pt-6 pb-8">
        <h1 className="text-foreground text-xl font-semibold tracking-tight">
          Calendário Sazonal {year}
        </h1>
        <p className="text-muted-foreground mt-1 text-[13px]">
          {dates.length} datas · {generatedCount} campanhas · {formatRevenue(totalRevenue)}{' '}
          potencial
        </p>

        <div className="-mx-3 mt-4">
          {dates.map((date) => (
            <CalendarRow
              key={date.id}
              date={date}
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
    const dateObj = dates.find((d) => d.id === dateId)
    return (
      <Level2
        dateName={dateName}
        displayDate={dateObj?.displayDate}
        estimatedRevenue={dateObj?.estimatedRevenue}
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
      return (
        <div className="text-muted-foreground p-6 text-center text-sm">
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
