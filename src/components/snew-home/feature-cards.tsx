'use client'

import { useRouter } from 'next/navigation'
import {
  IconGerarImagem,
  IconCriarVideo,
  IconCarrossel,
  IconEscreverCopy,
  IconCampanha,
  IconRelatorio,
} from './feature-card-icons'

interface FeatureCardsProps {
  storeName?: string
  niche?: string | null
  tone?: string | null
  firstProduct?: string
}

interface CardDef {
  id: string
  label: string
  dest: 'studio' | 'agent'
  prompt: string
  Icon: React.ComponentType
}

/**
 * 6 feature cards below the hero. Stagger animates on mount via
 * `animation: fadeSlideUp 0.3s ease both` with `animationDelay: i * 40ms`.
 *
 * 1:1 port from snew-ai-core SnewStudioHomePage.tsx lines 594-732.
 */
export function FeatureCards({ storeName, niche, tone, firstProduct }: FeatureCardsProps) {
  const router = useRouter()
  const product = firstProduct ?? 'produto'

  const cards: CardDef[] = [
    {
      id: 'image',
      label: 'Gerar imagem',
      dest: 'studio',
      prompt: 'Gerar imagem com IA',
      Icon: IconGerarImagem,
    },
    {
      id: 'video',
      label: 'Criar vídeo',
      dest: 'studio',
      prompt: storeName
        ? `Criar vídeo cinematográfico do produto de ${storeName}, tom ${tone || 'premium'}`
        : 'Criar vídeo cinematográfico do produto principal',
      Icon: IconCriarVideo,
    },
    {
      id: 'carousel',
      label: 'Carrossel',
      dest: 'studio',
      prompt: storeName
        ? `Gerar carrossel de ${product} de ${storeName} com 5 slides`
        : 'Gerar carrossel de produto com 5 slides e copy automático',
      Icon: IconCarrossel,
    },
    {
      id: 'copy',
      label: 'Escrever copy',
      dest: 'agent',
      prompt: storeName
        ? `Escrever copy completa para ${storeName} com headline, descrição e CTA para 6 canais. Produto: ${product}`
        : 'Escrever copy completa com headline, descrição e CTA adaptada para 6 canais',
      Icon: IconEscreverCopy,
    },
    {
      id: 'campaign',
      label: 'Campanha',
      dest: 'agent',
      prompt: storeName
        ? `Criar campanha completa para ${storeName}: brief, calendário, copies para 6 canais e assets visuais. Nicho: ${niche ?? 'e-commerce'}`
        : 'Criar campanha completa: brief, calendário editorial e copies para 6 canais',
      Icon: IconCampanha,
    },
    {
      id: 'report',
      label: 'Relatório',
      dest: 'agent',
      prompt: storeName
        ? `Gerar relatório completo de performance para ${storeName}: vendas, conversão, top produtos e ações prioritárias`
        : 'Gerar relatório executivo semanal com KPIs, conversão e ações prioritárias',
      Icon: IconRelatorio,
    },
  ]

  const handleClick = (card: CardDef) => {
    const path = card.dest === 'agent' ? '/agent' : '/studio/create'
    router.push(`${path}?autoPrompt=${encodeURIComponent(card.prompt)}`)
  }

  return (
    <div style={{ margin: '32px 0 0' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {cards.map((card, i) => (
          <button
            key={card.id}
            type="button"
            onClick={() => handleClick(card)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 12,
              border: 'none',
              background: '#FFFFFF',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
              animation: 'fadeSlideUp 0.3s ease both',
              animationDelay: `${i * 40}ms`,
              minWidth: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F0F0EE'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF'
            }}
            className="dark:!bg-card dark:hover:!bg-accent"
          >
            <div style={{ flexShrink: 0 }}>
              <card.Icon />
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: '#1A1A1A',
                letterSpacing: '-0.01em',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
              }}
              className="dark:text-foreground"
            >
              {card.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
