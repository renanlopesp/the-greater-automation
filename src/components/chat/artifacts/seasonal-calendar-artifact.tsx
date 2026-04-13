'use client'

import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
  Pencil,
  Check,
  Search,
  Download,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  CheckCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
// Inlined from deleted seasonal-campaign-generator.ts (spec 064 T016)
export type PersonalizedDate = {
  id: string
  name: string
  emoji: string
  date: string
  displayDate: string
  month: string
  day: string
  type: 'universal' | 'niche'
  relevanceReason: string
  estimatedRevenue: number
  potentialValue: string
  priority: 'high' | 'medium' | 'low'
}
export type PersonalizedCalendar = {
  year: number
  generatedAt: string
  dates: PersonalizedDate[]
  summary: {
    totalDates: number
    totalPotentialRevenue: number
    nextActionableDate: string | null
  }
  nextYearSuggested: boolean
}
import type {
  FullCampaign,
  ProductTag,
  CampaignProduct,
  DeliverableStatus,
} from '@/data/campaign-data'
import { productTagConfig } from '@/data/campaign-data'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionType = 'products' | 'email' | 'copies' | 'assets' | 'video' | 'timeline'

type ArtifactView =
  | { level: 1 }
  | { level: 2; dateId: string; dateName: string }
  | { level: 3; dateId: string; dateName: string; sectionType: SectionType }
  | { level: 'curation'; dateId: string; dateName: string }

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
  isPast = false,
}: {
  date: PersonalizedDate
  onClick: () => void
  hasCampaign: boolean
  isPast?: boolean
}) {
  const monthMatch = date.displayDate?.match(/de\s+(\w+)/i)
  const monthLabel = monthMatch ? monthMatch[1].substring(0, 3).toUpperCase() : ''
  const dayMatch = date.displayDate?.match(/^(\d+)/)
  const dayNumber = dayMatch ? dayMatch[1] : ''

  return (
    <button
      onClick={onClick}
      className={cn(
        'hover:bg-accent/60 group flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left transition-colors',
        isPast && 'opacity-40'
      )}
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
          {date.displayDate}
          {date.date ? `, ${new Date(date.date).getFullYear()}` : ''} ·{' '}
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
  onToggleCuration,
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
  onToggleCuration: () => void
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
      {!campaign?.concept && !isGenerating && !generationError && (
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
      {campaign?.concept && !isGenerating && (
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
                  &ldquo;{campaign.concept?.slogan ?? '—'}&rdquo;
                </p>
                <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
                  {campaign.concept?.description ?? '—'}
                </p>
              </div>
            )}
          </div>

          {/* Products with curation */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <SectionHeading>Produtos</SectionHeading>
              <button
                onClick={onToggleCuration}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              >
                <Pencil size={12} />
                Editar
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {(campaign?.curatedProducts ?? campaign?.selectedProducts ?? [])
                .slice(0, 5)
                .map((product) => (
                  <div
                    key={product.product_id ?? product.name}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                    style={{ background: 'color-mix(in srgb, var(--foreground) 3%, transparent)' }}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-8 w-8 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        className="text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
                        style={{
                          background: 'color-mix(in srgb, var(--foreground) 7%, transparent)',
                        }}
                      >
                        {product.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-[13px] font-medium">
                        {product.name}
                      </p>
                      <p className="text-muted-foreground text-xs">R$ {product.price}</p>
                    </div>
                    <ProductTagBadge tag={product.tag} />
                  </div>
                ))}
              {(campaign?.curatedProducts ?? campaign?.selectedProducts ?? []).length > 5 && (
                <p className="text-muted-foreground px-3 text-xs">
                  +{(campaign?.curatedProducts ?? campaign?.selectedProducts ?? []).length - 5}{' '}
                  produtos
                </p>
              )}
            </div>
          </div>

          {/* Sections grid */}
          <div>
            <SectionHeading>Seções</SectionHeading>
            <div className="grid grid-cols-2 gap-2">
              {SECTION_DEFS.map((section) => {
                const delivStatus =
                  campaign.deliverables?.[section.type as keyof typeof campaign.deliverables]
                    ?.status
                const isNotGenerated = delivStatus === 'not_generated'
                const isStale = delivStatus === 'stale'
                return (
                  <button
                    key={section.type}
                    onClick={() => onSelectSection(section.type)}
                    className="border-border hover:bg-accent/60 group flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{section.icon}</span>
                      <span className="text-foreground text-[13px] font-medium">
                        {section.label}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {isNotGenerated ? (
                        <span className="text-amber-500">Gerar</span>
                      ) : isStale ? (
                        <span className="text-amber-500">Desatualizado</span>
                      ) : (
                        sectionMeta(section.type, campaign)
                      )}
                    </span>
                  </button>
                )
              })}
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

function detectPlatform(channel: string): 'whatsapp' | 'instagram' | 'meta' | 'sms' | 'unknown' {
  const lower = channel.toLowerCase()
  if (lower.includes('whatsapp')) return 'whatsapp'
  if (lower.includes('instagram')) return 'instagram'
  if (lower.includes('meta')) return 'meta'
  if (lower.includes('sms')) return 'sms'
  return 'unknown'
}

function CopyHeader({ channel, timing, text }: { channel: string; timing: string; text: string }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-foreground text-sm font-medium">{channel}</span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px]"
          style={{
            background: 'color-mix(in srgb, var(--foreground) 5%, transparent)',
            color: 'var(--muted-foreground)',
          }}
        >
          {timing}
        </span>
      </div>
      <button
        onClick={() => navigator.clipboard.writeText(text).catch(() => null)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
      >
        <Copy size={12} />
        Copiar
      </button>
    </div>
  )
}

function WhatsAppMockup({ text }: { text: string }) {
  return (
    <div className="overflow-hidden rounded-xl" style={{ background: '#e5ddd5' }}>
      {/* WhatsApp header */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#075e54' }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
          L
        </div>
        <span className="text-sm font-medium text-white">Sua Loja</span>
      </div>
      {/* Chat area */}
      <div className="px-4 py-4">
        <div className="ml-auto max-w-[85%]">
          <div className="rounded-lg rounded-tr-none px-3 py-2" style={{ background: '#dcf8c6' }}>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-gray-800">{text}</p>
            <div className="mt-1 flex items-center justify-end gap-1">
              <span className="text-[10px] text-gray-500">10:42</span>
              <CheckCheck size={14} className="text-blue-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InstagramMockup({ text }: { text: string }) {
  // Highlight hashtags
  const parts = text.split(/(#\w+)/g)
  return (
    <div className="border-border overflow-hidden rounded-xl border bg-white dark:bg-gray-950">
      {/* Post header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-xs font-bold text-white">
          L
        </div>
        <span className="text-foreground text-[13px] font-semibold">sua_loja</span>
      </div>
      {/* Image placeholder */}
      <div
        className="flex items-center justify-center"
        style={{
          height: 200,
          background: 'color-mix(in srgb, var(--foreground) 5%, transparent)',
        }}
      >
        <ImageIcon size={32} className="text-muted-foreground/30" />
      </div>
      {/* Action icons */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-4">
          <Heart size={22} className="text-foreground" />
          <MessageCircle size={22} className="text-foreground" />
          <Send size={22} className="text-foreground" />
        </div>
        <Bookmark size={22} className="text-foreground" />
      </div>
      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-foreground text-[13px] leading-relaxed">
          <span className="font-semibold">sua_loja </span>
          {parts.map((part, i) =>
            part.startsWith('#') ? (
              <span key={i} className="text-blue-500">
                {part}
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
      </div>
    </div>
  )
}

function MetaAdMockup({ text }: { text: string }) {
  return (
    <div className="border-border overflow-hidden rounded-xl border bg-white dark:bg-gray-950">
      {/* Ad header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
          L
        </div>
        <div>
          <p className="text-foreground text-[13px] font-semibold">Sua Loja</p>
          <p className="text-muted-foreground text-[11px]">Patrocinado</p>
        </div>
      </div>
      {/* Ad text */}
      <div className="px-3 pb-3">
        <p className="text-foreground text-[13px] leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
      {/* CTA bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: 'color-mix(in srgb, var(--foreground) 4%, transparent)' }}
      >
        <div>
          <p className="text-muted-foreground text-[11px]">sua-loja.com.br</p>
          <p className="text-foreground text-xs font-medium">Conheça a coleção</p>
        </div>
        <div
          className="rounded-md px-3 py-1.5 text-xs font-semibold"
          style={{ background: 'color-mix(in srgb, var(--foreground) 8%, transparent)' }}
        >
          Saiba Mais
        </div>
      </div>
    </div>
  )
}

function SmsMockup({ text }: { text: string }) {
  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ background: 'color-mix(in srgb, var(--foreground) 3%, transparent)' }}
    >
      {/* Phone header */}
      <div className="flex items-center justify-center py-2">
        <span className="text-muted-foreground text-[11px]">Mensagem de Texto</span>
      </div>
      {/* Message area */}
      <div className="px-4 pb-4">
        <div className="max-w-[85%]">
          <div
            className="rounded-2xl rounded-tl-sm px-3.5 py-2.5"
            style={{ background: 'color-mix(in srgb, var(--foreground) 8%, transparent)' }}
          >
            <p className="text-foreground text-[13px] leading-relaxed whitespace-pre-wrap">
              {text}
            </p>
          </div>
          <span className="text-muted-foreground mt-1 block text-[10px]">09:15</span>
        </div>
      </div>
    </div>
  )
}

function CopiesSection({ campaign }: { campaign: FullCampaign }) {
  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      {campaign.copies.map((copy) => {
        const platform = detectPlatform(copy.channel)
        return (
          <div key={`${copy.channel}-${copy.timing}`}>
            <CopyHeader channel={copy.channel} timing={copy.timing} text={copy.text} />
            {platform === 'whatsapp' && <WhatsAppMockup text={copy.text} />}
            {platform === 'instagram' && <InstagramMockup text={copy.text} />}
            {platform === 'meta' && <MetaAdMockup text={copy.text} />}
            {platform === 'sms' && <SmsMockup text={copy.text} />}
            {platform === 'unknown' && (
              <div className="border-border rounded-xl border p-4">
                <p className="text-foreground text-sm leading-relaxed">{copy.text}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ProductsSection({ campaign }: { campaign: FullCampaign }) {
  return (
    <div className="flex flex-col gap-2 px-6 py-5">
      {campaign.selectedProducts.map((product) => (
        <div
          key={product.name}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
          style={{ background: 'color-mix(in srgb, var(--foreground) 3%, transparent)' }}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-9 w-9 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div
              className="text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
              style={{ background: 'color-mix(in srgb, var(--foreground) 7%, transparent)' }}
            >
              {product.name.charAt(0).toUpperCase()}
            </div>
          )}
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
  const emailData = campaign.deliverables?.email?.data as
    | { subject: string; preview: string; html?: string }
    | undefined
  const html = emailData?.html
  const subject = emailData?.subject ?? campaign.emailSubject
  const preview = emailData?.preview ?? campaign.emailPreview

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      {/* Subject + Preview */}
      <div className="border-border rounded-xl border p-4">
        <div className="mb-3">
          <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wider uppercase">
            Assunto
          </p>
          <p className="text-foreground text-sm font-medium">{subject}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wider uppercase">
            Preview
          </p>
          <p className="text-muted-foreground text-[13px] leading-relaxed">{preview}</p>
        </div>
      </div>

      {/* HTML Preview + Copy */}
      {html && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
              Template
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'email-template.html'
                  a.style.display = 'none'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                }}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              >
                <Download size={12} />
                Download
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(html).catch(() => null)
                  toast.success('HTML copiado!')
                }}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              >
                <Copy size={12} />
                Copiar
              </button>
            </div>
          </div>
          <div className="border-border overflow-hidden rounded-xl border">
            <iframe
              srcDoc={html}
              title="Email preview"
              sandbox=""
              className="h-[800px] w-full border-0"
            />
          </div>
        </>
      )}
    </div>
  )
}

function AssetsSection({ campaign }: { campaign: FullCampaign }) {
  const downloadAsImage = async (
    assetHtml: string,
    fileName: string,
    width: number,
    height: number
  ) => {
    try {
      const html2canvas = (await import('html2canvas')).default
      // Create offscreen container at exact native resolution
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-99999px'
      container.style.top = '0'
      container.style.width = `${width}px`
      container.style.height = `${height}px`
      container.style.overflow = 'hidden'
      container.innerHTML = assetHtml
      document.body.appendChild(container)
      const target = container.firstElementChild as HTMLElement
      if (!target) {
        document.body.removeChild(container)
        return
      }
      // Ensure target matches native dimensions
      target.style.width = `${width}px`
      target.style.height = `${height}px`

      // Wait for background images to load via a hidden img preload
      const bgMatch = assetHtml.match(/url\(['"]?(https?:\/\/[^'")\s]+)['"]?\)/)
      if (bgMatch?.[1]) {
        await new Promise<void>((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = bgMatch[1]
          if (img.complete) resolve()
        })
      }

      // Fix html2canvas bug #2829: Tailwind's global `img { display: block }` corrupts
      // text metrics. Temporarily override to `inline` during capture.
      const fixStyle = document.createElement('style')
      fixStyle.textContent = 'img { display: inline !important; }'
      document.head.appendChild(fixStyle)

      const canvas = await html2canvas(target, {
        width,
        height,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      })

      document.head.removeChild(fixStyle)
      document.body.removeChild(container)

      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${fileName}.png`
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 'image/png')
    } catch {
      toast.error('Erro ao baixar imagem.')
    }
  }

  // Group assets by format label
  const grouped = useMemo(() => {
    const map = new Map<string, typeof campaign.assets>()
    for (const asset of campaign.assets) {
      const existing = map.get(asset.label) ?? []
      existing.push(asset)
      map.set(asset.label, existing)
    }
    return map
  }, [campaign.assets])

  if (campaign.assets.length === 0) {
    return (
      <div className="px-6 py-8 text-center">
        <ImageIcon size={32} className="text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">
          Nenhum produto com imagem disponível para gerar assets.
          <br />
          Adicione imagens aos seus produtos.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-5">
      {Array.from(grouped.entries()).map(([formatLabel, assets]) => {
        const firstAsset = assets[0]
        const ratio = firstAsset.ratio
        // Card dimensions for preview
        const cardWidth = ratio === '3:1' ? 280 : ratio === '1:1' ? 180 : 150
        const previewHeight = ratio === '9:16' ? 260 : ratio === '3:1' ? 90 : 180

        return (
          <div key={formatLabel}>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-foreground text-sm font-medium">{formatLabel}</h4>
              <span className="text-muted-foreground text-xs">
                {assets.length} {assets.length === 1 ? 'variante' : 'variantes'}
              </span>
            </div>
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {assets.map((asset, idx) => {
                const hasHtml = !!asset.html
                const fileName = `${formatLabel}-${asset.product_name ?? idx}`
                  .replace(/\s+/g, '-')
                  .toLowerCase()
                return (
                  <div
                    key={`${asset.label}-${asset.product_name ?? idx}`}
                    className="border-border flex-none overflow-hidden rounded-xl border"
                    style={{ width: cardWidth, scrollSnapAlign: 'start' }}
                  >
                    {hasHtml ? (
                      <div className="w-full overflow-hidden" style={{ height: previewHeight }}>
                        <div
                          dangerouslySetInnerHTML={{ __html: asset.html! }}
                          style={{
                            transform: `scale(${cardWidth / (asset.width ?? 1080)})`,
                            transformOrigin: 'top left',
                            width: asset.width ?? 1080,
                            height: asset.height ?? 1080,
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{ height: previewHeight, background: asset.bg || 'var(--muted)' }}
                      />
                    )}
                    <div className="p-2">
                      {asset.product_name && (
                        <p className="text-foreground mb-1 truncate text-xs font-medium">
                          {asset.product_name}
                        </p>
                      )}
                      {hasHtml && (
                        <button
                          onClick={() =>
                            void downloadAsImage(
                              asset.html!,
                              fileName,
                              asset.width ?? 1080,
                              asset.height ?? 1080
                            )
                          }
                          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] transition-colors"
                        >
                          <Download size={12} />
                          Baixar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function VideoSection({ campaign }: { campaign: FullCampaign }) {
  return (
    <div className="flex flex-col gap-3 px-6 py-5">
      {campaign.videoScripts.map((script) => (
        <div key={script.title} className="border-border rounded-xl border p-4">
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
        <div key={item.day} className="flex gap-4">
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
  deliverableStatus,
  onBack,
  onRegenerate,
  onGenerate,
}: {
  dateName: string
  sectionType: SectionType
  campaign: FullCampaign
  isRegenerating: boolean
  deliverableStatus?: DeliverableStatus
  onBack: () => void
  onRegenerate: () => void
  onGenerate: () => void
}) {
  const sectionLabel: Record<SectionType, string> = {
    products: 'Produtos',
    email: 'E-mail',
    copies: 'Copies',
    assets: 'Assets',
    video: 'Script de Vídeo',
    timeline: 'Timeline',
  }

  const needsGeneration =
    sectionType !== 'products' &&
    (deliverableStatus === 'not_generated' || deliverableStatus === 'stale')

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-4 pb-3">
        <BackButton label={dateName} onClick={onBack} />
        {!needsGeneration && (
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={isRegenerating ? 'animate-spin' : ''} />
            Regenerar
          </button>
        )}
      </div>

      {/* Section title */}
      <div className="border-border border-b px-6 py-2.5">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
          {sectionLabel[sectionType]}
        </p>
      </div>

      {/* Not generated — show Generate button */}
      {needsGeneration && !isRegenerating ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <div
            className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'color-mix(in srgb, var(--foreground) 4%, transparent)' }}
          >
            <Sparkles className="text-muted-foreground h-6 w-6" />
          </div>
          <p className="text-foreground text-[15px] font-semibold">
            {sectionLabel[sectionType]} não gerado
          </p>
          <p className="text-muted-foreground mt-2 max-w-[240px] text-[13px] leading-relaxed">
            {deliverableStatus === 'stale'
              ? 'O conceito ou produtos mudaram. Gere novamente.'
              : 'Gere o conteúdo sob demanda.'}
          </p>
          <button
            onClick={onGenerate}
            className="bg-foreground text-background mt-6 rounded-xl px-7 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            Gerar {sectionLabel[sectionType]}
          </button>
        </div>
      ) : isRegenerating ? (
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
// Product Curation view
// ---------------------------------------------------------------------------

function ProductCuration({
  dateName,
  allProducts,
  selectedIds,
  onSave,
  onBack,
}: {
  dateName: string
  allProducts: CampaignProduct[]
  selectedIds: Set<string>
  onSave: (selected: CampaignProduct[]) => void
  onBack: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(selectedIds))
  const [search, setSearch] = useState('')

  const filtered = search
    ? allProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : allProducts

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = () => {
    const selectedProducts = allProducts.filter((p) => selected.has(p.product_id ?? p.name))
    if (selectedProducts.length === 0) {
      toast.error('Selecione pelo menos 1 produto.')
      return
    }
    onSave(selectedProducts)
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-6 pt-4 pb-3">
        <BackButton label={dateName} onClick={onBack} />
        <button
          onClick={handleSave}
          className="bg-foreground text-background flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
        >
          <Check size={12} />
          Salvar ({selected.size})
        </button>
      </div>

      <div className="border-border border-b px-6 py-2.5">
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: 'color-mix(in srgb, var(--foreground) 4%, transparent)' }}
        >
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="text-foreground placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-0.5 px-6 py-3">
        {filtered.map((product) => {
          const id = product.product_id ?? product.name
          const isSelected = selected.has(id)
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                isSelected ? 'bg-foreground/5' : 'hover:bg-foreground/3'
              )}
            >
              <div
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                  isSelected ? 'border-foreground bg-foreground' : 'border-border'
                )}
              >
                {isSelected && <Check size={12} className="text-background" />}
              </div>
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-8 w-8 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
                  style={{ background: 'color-mix(in srgb, var(--foreground) 7%, transparent)' }}
                >
                  {product.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-[13px] font-medium">{product.name}</p>
                <p className="text-muted-foreground text-xs">R$ {product.price}</p>
              </div>
              {product.tag && <ProductTagBadge tag={product.tag} />}
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Nenhum produto encontrado.
          </p>
        )}
      </div>
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
  const queryClient = useQueryClient()

  // Navigation state
  const [view, setView] = useState<ArtifactView>({ level: 1 })

  // Campaigns derived from parent data (source of truth is useTask → data.campaigns)
  const campaigns = useMemo(() => data.campaigns ?? {}, [data.campaigns])

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
        body: JSON.stringify({ dateId, dateName, taskId }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error ?? 'generation failed')
      }
      const body = await res.json()
      // Route returns { ok, dateId, executionId } (async).
      // The Edge Function updates task.artifact_data.campaigns directly.
      if (!body.ok) throw new Error(body.error ?? 'generation failed')
      if (taskId) queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      // Poll for up to 180s until the campaign appears in task data
      const start = Date.now()
      while (Date.now() - start < 180_000) {
        await new Promise((r) => setTimeout(r, 3000))
        await queryClient.refetchQueries({ queryKey: ['task', taskId] })
        const state = queryClient.getQueryState(['task', taskId])
        // queryFn returns { task }, so artifact_data lives under .task
        const raw = state?.data as { task?: { artifact_data?: unknown } } | undefined
        const artifact = raw?.task?.artifact_data as
          | { campaigns?: Record<string, { concept?: { slogan?: string } }> }
          | undefined
        if (artifact?.campaigns?.[dateId]?.concept?.slogan) break
      }
    } catch {
      setGenerationError((prev) => ({ ...prev, [dateId]: true }))
    } finally {
      setGenerating((prev) => ({ ...prev, [dateId]: false }))
    }
  }

  // --- Regenerate concept ---
  async function regenerateConcept(dateId: string) {
    setRegeneratingConcept((prev) => ({ ...prev, [dateId]: true }))
    try {
      const res = await fetch('/api/skills/seasonal-calendar/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateId, sectionType: 'concept' }),
      })
      if (!res.ok) throw new Error('regeneration failed')
      const body = await res.json()
      const updatedCampaign = (body.campaign ?? body) as FullCampaign
      const updatedCampaigns = {
        ...campaigns,
        [dateId]: { ...campaigns[dateId]!, ...updatedCampaign },
      }
      await saveCampaignsToTask(updatedCampaigns)
      if (taskId) queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    } catch {
      toast.error('Erro ao regenerar. Tente novamente.')
    } finally {
      setRegeneratingConcept((prev) => ({ ...prev, [dateId]: false }))
    }
  }

  // --- Regenerate section (uses generate-deliverable to regenerate + update status) ---
  async function regenerateSection(dateId: string, sectionType: string) {
    await generateDeliverable(dateId, sectionType)
  }

  // --- Save curated products ---
  async function saveCuratedProducts(dateId: string, curatedProducts: CampaignProduct[]) {
    const campaign = campaigns[dateId]
    if (!campaign) return
    const updated = { ...campaign, curatedProducts }
    // Mark deliverables as stale if they were generated
    if (updated.deliverables) {
      const d = updated.deliverables
      const stale = (s: { status: string }) =>
        s.status === 'generated' ? { ...s, status: 'stale' as const } : s
      updated.deliverables = {
        copies: stale(d.copies) as typeof d.copies,
        email: stale(d.email) as typeof d.email,
        assets: stale(d.assets) as typeof d.assets,
        video: stale(d.video) as typeof d.video,
        timeline: stale(d.timeline) as typeof d.timeline,
      }
    }
    const updatedCampaigns = { ...campaigns, [dateId]: updated }
    await saveCampaignsToTask(updatedCampaigns)
    if (taskId) queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    toast.success(`${curatedProducts.length} produtos selecionados.`)
  }

  // --- Generate deliverable on demand ---
  async function generateDeliverable(dateId: string, sectionType: string) {
    const key = `${dateId}:${sectionType}`
    setRegeneratingSection((prev) => ({ ...prev, [key]: true }))
    try {
      const res = await fetch('/api/skills/seasonal-calendar/generate-deliverable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, dateId, sectionType }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error ?? 'generation failed')
      }
      if (!taskId) return
      // Poll task until deliverable status flips to generated (or 120s timeout)
      const start = Date.now()
      while (Date.now() - start < 120_000) {
        await new Promise((r) => setTimeout(r, 3000))
        await queryClient.refetchQueries({ queryKey: ['task', taskId] })
        const state = queryClient.getQueryState(['task', taskId])
        const raw = state?.data as { task?: { artifact_data?: unknown } } | undefined
        const artifact = raw?.task?.artifact_data as
          | { campaigns?: Record<string, { deliverables?: Record<string, { status?: string }> }> }
          | undefined
        const status = artifact?.campaigns?.[dateId]?.deliverables?.[sectionType]?.status
        if (status === 'generated') break
        if (status === 'failed') throw new Error('generation failed')
      }
    } catch {
      toast.error('Erro ao gerar seção. Tente novamente.')
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
          {[...dates]
            .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
            .map((date) => {
              const isPast = date.date ? new Date(date.date) < new Date() : false
              return (
                <CalendarRow
                  key={date.id}
                  date={date}
                  onClick={() => handleDateClick(date)}
                  hasCampaign={!!campaigns[date.id]}
                  isPast={isPast}
                />
              )
            })}
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
        onRegenerateConcept={() => void regenerateConcept(dateId)}
        onSelectSection={(sectionType) => setView({ level: 3, dateId, dateName, sectionType })}
        onToggleCuration={() => setView({ level: 'curation', dateId, dateName })}
      />
    )
  }

  // ---------------------------------------------------------------------------
  // Curation
  // ---------------------------------------------------------------------------
  if (view.level === 'curation') {
    const { dateId, dateName } = view
    const campaign = campaigns[dateId]
    if (!campaign) {
      setView({ level: 2, dateId, dateName })
      return null
    }
    const allProducts = campaign.curatedProducts ?? campaign.selectedProducts
    const selectedIds = new Set(allProducts.map((p) => p.product_id ?? p.name))
    return (
      <ProductCuration
        dateName={dateName}
        allProducts={campaign.selectedProducts}
        selectedIds={selectedIds}
        onSave={(selected) => {
          void saveCuratedProducts(dateId, selected)
          setView({ level: 2, dateId, dateName })
        }}
        onBack={() => setView({ level: 2, dateId, dateName })}
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
        deliverableStatus={
          campaign.deliverables?.[sectionType as keyof typeof campaign.deliverables]?.status
        }
        onBack={() => setView({ level: 2, dateId, dateName })}
        onRegenerate={() => void regenerateSection(dateId, sectionType)}
        onGenerate={() => void generateDeliverable(dateId, sectionType)}
      />
    )
  }

  return null
}
