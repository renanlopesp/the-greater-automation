'use client'

import { RefreshCw } from 'lucide-react'
import { type FullCampaign } from '@/data/campaign-data'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductThumb, ProductTagBadge } from './shared'

interface CalendarLevel3Props {
  sectionType: string
  campaign: FullCampaign
  onRegenerate?: () => void
  isRegenerating?: boolean
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p
      className="border-border border-b px-5 py-3 tracking-[0.08em] uppercase"
      style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)' }}
    >
      {label}
    </p>
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

// --- Copies section ---
function CopiesSection({
  campaign,
  onRegenerate,
}: {
  campaign: FullCampaign
  onRegenerate?: () => void
}) {
  const firstProduct = campaign.selectedProducts[0]

  return (
    <div className="flex flex-col">
      <SectionHeader label="Copies" />
      <div className="flex flex-col gap-4 p-5">
        {campaign.copies.map((copy, i) => (
          <div key={i} className="border-border flex flex-col rounded-xl border p-4">
            {/* Header */}
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
                className="hover:text-foreground transition-colors"
                style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
              >
                Copiar
              </button>
            </div>

            {/* Copy text */}
            <p className="text-foreground leading-relaxed" style={{ fontSize: 14 }}>
              {copy.text}
            </p>

            {/* Product reference on first copy */}
            {i === 0 && firstProduct && (
              <div className="border-border mt-3 flex items-center gap-3 rounded-lg border p-3">
                <ProductThumb />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">
                    {firstProduct.name}
                  </p>
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
    </div>
  )
}

// --- Products section ---
function ProductsSection({ campaign }: { campaign: FullCampaign }) {
  return (
    <div className="flex flex-col">
      <SectionHeader label="Produtos" />
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
    </div>
  )
}

// --- Email section ---
function EmailSection({
  campaign,
  onRegenerate,
}: {
  campaign: FullCampaign
  onRegenerate?: () => void
}) {
  return (
    <div className="flex flex-col">
      <SectionHeader label="E-mail" />
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
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
              {campaign.emailPreview}
            </p>
          </div>
          <ActionButtons onRegenerate={onRegenerate} />
        </div>
      </div>
    </div>
  )
}

// --- Assets section ---
function AssetsSection({
  campaign,
  onRegenerate,
}: {
  campaign: FullCampaign
  onRegenerate?: () => void
}) {
  return (
    <div className="flex flex-col">
      <SectionHeader label="Assets" />
      <div className="grid grid-cols-2 gap-3 p-5">
        {campaign.assets.map((asset, i) => (
          <div key={i} className="border-border flex flex-col overflow-hidden rounded-xl border">
            {/* Preview */}
            <div className="h-24 w-full" style={{ background: asset.bg }} />
            <div className="flex flex-col gap-1 p-3">
              <p className="text-foreground text-sm font-medium">{asset.label}</p>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{asset.ratio}</p>
              <ActionButtons onRegenerate={onRegenerate} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Video scripts section ---
function VideoSection({
  campaign,
  onRegenerate,
}: {
  campaign: FullCampaign
  onRegenerate?: () => void
}) {
  return (
    <div className="flex flex-col">
      <SectionHeader label="Script de Vídeo" />
      <div className="flex flex-col gap-4 p-5">
        {campaign.videoScripts.map((script, i) => (
          <div key={i} className="border-border flex flex-col gap-2 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-foreground text-sm font-medium">{script.title}</span>
              <span
                className="rounded-full px-2 py-0.5"
                style={{
                  fontSize: 11,
                  background: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                }}
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
    </div>
  )
}

// --- Timeline section ---
function TimelineSection({ campaign }: { campaign: FullCampaign }) {
  return (
    <div className="flex flex-col">
      <SectionHeader label="Timeline" />
      <div className="flex flex-col gap-4 p-5">
        {campaign.timeline.map((item, i) => (
          <div key={i} className="flex gap-4">
            {/* Day badge */}
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

            {/* Actions */}
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
    </div>
  )
}

// --- Skeleton overlay ---
function RegeneratingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-5">
      <Skeleton className="h-4 w-24" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}

// --- Main component ---
export function CalendarLevel3({
  sectionType,
  campaign,
  onRegenerate,
  isRegenerating = false,
}: CalendarLevel3Props) {
  if (isRegenerating) {
    return <RegeneratingSkeleton />
  }

  switch (sectionType) {
    case 'copies':
      return <CopiesSection campaign={campaign} onRegenerate={onRegenerate} />
    case 'products':
      return <ProductsSection campaign={campaign} />
    case 'email':
      return <EmailSection campaign={campaign} onRegenerate={onRegenerate} />
    case 'assets':
      return <AssetsSection campaign={campaign} onRegenerate={onRegenerate} />
    case 'video':
      return <VideoSection campaign={campaign} onRegenerate={onRegenerate} />
    case 'timeline':
      return <TimelineSection campaign={campaign} />
    default:
      return (
        <div className="p-5 text-center" style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
          Seção não encontrada
        </div>
      )
  }
}
