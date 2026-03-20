'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useCoworkerAvatars } from '@/hooks/use-coworker-avatars'
import CoworkerAvatar from '@/components/coworker-avatar'

interface OpportunityItem {
  id: string
  agent: string
  avatarId: string
  summary: string
  value: string
  impact: string
  confidence: string
  detectedAt: string
  findings: string[]
  reasoning: string
  sources: string[]
  suggestedAction: string
}

const opportunities: OpportunityItem[] = [
  {
    id: '1',
    agent: 'Sales Analyst',
    avatarId: 'revenue-intelligence',
    summary:
      'Taxa de abandono no checkout mobile 34% maior que desktop, com 89 sessões afetadas hoje. Ação imediata pode recuperar ~R$3.200.',
    value: '~R$3.200',
    impact: 'Alta',
    confidence: '92%',
    detectedAt: 'Hoje, 06:41',
    findings: [
      '89 sessões móveis abandonadas no checkout nas últimas 8h',
      'Taxa de abandono mobile: 74% vs. 40% desktop',
      'Etapa crítica: formulário de endereço — 68% dos abandonos',
      'Tempo médio até abandono: 1min 42s',
    ],
    reasoning:
      'A discrepância de 34pp entre mobile e desktop indica um problema de UX específico para mobile, não de intenção de compra. Corrigir o formulário de endereço na jornada mobile tem potencial de recuperação imediato.',
    sources: [
      'Shopify Checkout Analytics',
      'GA4 – Funil de Conversão',
      'Hotjar Session Recordings',
    ],
    suggestedAction:
      'Simplificar o formulário de endereço mobile para autocompletar e reduzir o número de campos obrigatórios.',
  },
  {
    id: '2',
    agent: 'Competitors',
    avatarId: 'competitor-watch',
    summary:
      'Concorrente reduziu preço em 3 SKUs core, identificado às 03:14. Pode afetar diretamente a conversão no segmento de eletrônicos.',
    value: 'Risco alto',
    impact: 'Média',
    confidence: '87%',
    detectedAt: 'Hoje, 03:14',
    findings: [
      'Concorrente X reduziu preço em 3 SKUs do segmento eletrônicos',
      'Redução média de 12% nos preços monitorados',
      'SKUs afetados representam 18% da receita do segmento',
      'Histórico: reduções similares causaram queda de 8% na conversão',
    ],
    reasoning:
      'A redução de preço é agressiva e focada em SKUs de alta rotação. O timing (madrugada) sugere uma estratégia planejada, não uma liquidação. Recomenda-se monitorar a conversão nas próximas 24h antes de reagir com preço.',
    sources: [
      'Monitor de Preços Automático',
      'Histórico de Vendas Internas',
      'Google Shopping Feed',
    ],
    suggestedAction:
      'Monitorar conversão por 24h. Se queda > 5%, considerar match de preço seletivo nos 2 SKUs de maior volume.',
  },
  {
    id: '3',
    agent: 'Analytics',
    avatarId: 'revenue-intelligence',
    summary:
      'Tráfego orgânico 18% maior nos finais de semana — oportunidade de alta confiança para campanhas direcionadas.',
    value: '+R$1.800',
    impact: 'Média',
    confidence: '89%',
    detectedAt: 'Hoje, 08:00',
    findings: [
      'Tráfego orgânico sobe 18% sáb-dom vs. dias úteis (média 4 semanas)',
      'Taxa de conversão orgânica 22% maior nos finais de semana',
      'Categorias mais buscadas: moda casual e acessórios',
      'Pico de tráfego: sábado 10h-14h',
    ],
    reasoning:
      'O padrão de tráfego é consistente há 4 semanas, indicando comportamento sazonal estável. Campanhas direcionadas para sáb-dom podem capturar demanda incremental com ROI superior à média semanal.',
    sources: ['GA4 – Relatório de Tráfego', 'Search Console', 'Dados de Conversão Internos'],
    suggestedAction:
      'Criar campanha de Google Ads focada em finais de semana para categorias moda casual e acessórios.',
  },
]

function OpportunityDrawer({
  opp,
  avatarUrl,
  onClose,
}: {
  opp: OpportunityItem
  avatarUrl: string | undefined
  onClose: () => void
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className="border-border bg-background fixed inset-0 z-50 flex flex-col overflow-hidden border shadow-xl transition-transform duration-300 ease-out sm:inset-auto sm:top-4 sm:right-4 sm:bottom-4 sm:w-[520px] sm:rounded-2xl"
        style={{ transform: visible ? 'translateX(0)' : 'translateX(calc(100% + 1rem))' }}
      >
        {/* Header */}
        <div className="border-border flex shrink-0 items-start justify-between border-b px-8 pt-8 pb-5">
          <div className="flex items-center gap-3">
            <CoworkerAvatar src={avatarUrl} name={opp.agent} size="sm" />
            <div>
              <h2 className="text-foreground/70 text-lg leading-tight font-medium">{opp.agent}</h2>
              <p className="text-muted-foreground text-xs">Detectado: {opp.detectedAt}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground mt-0.5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-8 py-7">
          {/* Summary */}
          <p className="text-foreground/70 text-sm leading-relaxed">{opp.summary}</p>

          {/* Meta chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="border-border text-foreground/80 rounded-full border px-2.5 py-1 text-xs font-medium">
              {opp.value}
            </span>
            <span className="border-border text-muted-foreground rounded-full border px-2.5 py-1 text-xs">
              Impacto {opp.impact}
            </span>
            <span className="border-border text-muted-foreground rounded-full border px-2.5 py-1 text-xs">
              Confiança {opp.confidence}
            </span>
          </div>

          <div className="border-border border-t" />

          {/* Findings */}
          <div>
            <p className="text-muted-foreground mb-3 text-xs">Dados identificados</p>
            <div className="space-y-2">
              {opp.findings.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="bg-foreground/30 mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" />
                  <p className="text-foreground/70 text-sm leading-snug">{f}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-border border-t" />

          {/* Reasoning */}
          <div>
            <p className="text-muted-foreground mb-2 text-xs">Raciocínio do co-worker</p>
            <p className="text-foreground/70 text-sm leading-relaxed">{opp.reasoning}</p>
          </div>

          <div className="border-border border-t" />

          {/* Sources */}
          <div>
            <p className="text-muted-foreground mb-2 text-xs">Fontes</p>
            <div className="flex flex-wrap gap-1.5">
              {opp.sources.map((s) => (
                <span
                  key={s}
                  className="border-border bg-muted/40 text-muted-foreground rounded-lg border px-2 py-1 text-xs"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="border-border border-t" />

          {/* Suggested Action */}
          <div>
            <p className="text-muted-foreground mb-2 text-xs">Ação sugerida</p>
            <p className="text-foreground/70 text-sm leading-relaxed">{opp.suggestedAction}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-border border-t px-8 py-6">
          <button
            onClick={handleClose}
            className="bg-foreground text-background hover:bg-foreground/80 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm transition-colors"
          >
            Ativar co-worker
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

interface OpportunitiesSectionProps {
  opportunities?: OpportunityItem[]
}

const FALLBACK_OPPORTUNITIES = opportunities

export default function OpportunitiesSection({
  opportunities: opportunitiesProp,
}: OpportunitiesSectionProps = {}) {
  const { avatars } = useCoworkerAvatars()
  const [selectedOpp, setSelectedOpp] = useState<OpportunityItem | null>(null)

  // Use prop if provided (even if empty array), otherwise fall back to hardcoded data
  const items = opportunitiesProp !== undefined ? opportunitiesProp : FALLBACK_OPPORTUNITIES

  if (items.length === 0) return null

  return (
    <div>
      <h2 className="text-foreground mb-4 text-lg font-medium">Oportunidades detectadas</h2>

      <div className="border-border bg-background overflow-hidden rounded-2xl border">
        {items.map((opp, i) => {
          const avatarUrl = avatars[opp.avatarId]
          return (
            <div
              key={opp.id}
              onClick={() => setSelectedOpp(opp)}
              className={`hover:bg-muted/40 cursor-pointer p-5 transition-colors ${i > 0 ? 'border-border border-t' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <div className="bg-muted flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={opp.agent} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-medium">{opp.agent.charAt(0)}</span>
                  )}
                </div>
                <p className="text-foreground text-sm font-medium">{opp.agent}</p>
              </div>
              <p className="text-muted-foreground mt-2.5 text-[13px] leading-relaxed">
                {opp.summary}
              </p>
              <span className="text-foreground mt-1.5 inline-block text-xs font-medium">
                {opp.value}
              </span>
            </div>
          )
        })}
      </div>

      {/* Opportunity detail drawer */}
      {selectedOpp && (
        <OpportunityDrawer
          opp={selectedOpp}
          avatarUrl={avatars[selectedOpp.avatarId]}
          onClose={() => setSelectedOpp(null)}
        />
      )}
    </div>
  )
}
