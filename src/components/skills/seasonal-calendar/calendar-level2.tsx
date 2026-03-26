'use client'

import {
  RefreshCw,
  ChevronRight,
  ClipboardList,
  Mail,
  MessageSquare,
  Image,
  Video,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type SeasonalDate, type FullCampaign, productTagConfig } from '@/data/campaign-data'

interface SectionItem {
  type: string
  icon: React.ReactNode
  label: string
  meta: string
}

interface CalendarLevel2Props {
  date: SeasonalDate
  campaign: FullCampaign | null
  onSelectSection: (sectionType: string) => void
}

function StatusBadge({ status }: { status: SeasonalDate['status'] }) {
  const config = {
    done: { label: 'Concluído', bg: 'var(--muted)', color: 'var(--muted-foreground)' },
    active: { label: 'Ativo', bg: 'var(--green-bg)', color: 'var(--green)' },
    ready: { label: 'Pronto', bg: 'var(--green-bg)', color: 'var(--green)' },
    pending: { label: 'Pendente', bg: 'var(--amber-bg)', color: 'var(--amber)' },
  }[status]

  return (
    <span
      className="rounded-full px-2.5 py-0.5"
      style={{ fontSize: 11, fontWeight: 500, background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  )
}

function ProductThumb({ gradient }: { gradient?: string }) {
  return (
    <div
      className="h-10 w-10 flex-shrink-0 rounded-lg"
      style={{
        background: gradient ?? 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
      }}
    />
  )
}

export function CalendarLevel2({ date, campaign, onSelectSection }: CalendarLevel2Props) {
  const monthLabel = date.month.charAt(0) + date.month.slice(1).toLowerCase()

  const sections: SectionItem[] = [
    {
      type: 'products',
      icon: <ClipboardList size={18} />,
      label: 'Produtos',
      meta: campaign ? `${campaign.selectedProducts.length} selecionados` : '—',
    },
    {
      type: 'email',
      icon: <Mail size={18} />,
      label: 'E-mail',
      meta: campaign ? '1 template' : '—',
    },
    {
      type: 'copies',
      icon: <MessageSquare size={18} />,
      label: 'Copies',
      meta: campaign ? `${campaign.copies.length} canais` : '—',
    },
    {
      type: 'assets',
      icon: <Image size={18} />,
      label: 'Assets',
      meta: campaign ? `${campaign.assets.length} formatos` : '—',
    },
    {
      type: 'video',
      icon: <Video size={18} />,
      label: 'Script',
      meta: campaign ? `${campaign.videoScripts.length} roteiros` : '—',
    },
    {
      type: 'timeline',
      icon: <Clock size={18} />,
      label: 'Timeline',
      meta: campaign ? `${campaign.timeline.length} fases` : '—',
    },
  ]

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

      {/* No campaign state */}
      {!campaign && (
        <div
          className="px-5 py-8 text-center"
          style={{ color: 'var(--muted-foreground)', fontSize: 14 }}
        >
          Campanha ainda não gerada
        </div>
      )}

      {/* Campaign content */}
      {campaign && (
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
                className="hover:text-foreground flex items-center gap-1 transition-colors"
                style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
              >
                <RefreshCw size={13} />
                Regenerar
              </button>
            </div>

            {/* Card */}
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
                {campaign.concept.products.slice(0, 3).map((product, i) => {
                  const tag = productTagConfig(product.tag)
                  return (
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
                      <span
                        className="flex-shrink-0 rounded-full px-2 py-0.5"
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          background: tag.bg,
                          color: tag.color,
                        }}
                      >
                        {tag.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Section navigation */}
          <div className="flex flex-col">
            {sections.map((section, index) => {
              const isLast = index === sections.length - 1
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
                    {section.meta}
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
