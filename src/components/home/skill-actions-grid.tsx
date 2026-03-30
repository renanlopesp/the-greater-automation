'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getGradient } from '@/config/design-system'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'campaigns' | 'content' | 'analytics' | 'retention'

interface SkillCard {
  id: string
  title: string
  skill: string
  category: FilterTab[]
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const CARDS: SkillCard[] = [
  {
    id: 'c1',
    title: 'Gerar campanha completa de Dia das Mães',
    skill: 'Seasonal Calendar',
    category: ['campaigns'],
  },
  {
    id: 'c2',
    title: 'Criar assets visuais pra Páscoa',
    skill: 'Image Generator',
    category: ['campaigns', 'content'],
  },
  {
    id: 'c3',
    title: 'Escrever copies de Dia das Mães pra 6 canais',
    skill: 'Copywriter',
    category: ['content'],
  },
  {
    id: 'c4',
    title: 'Ver calendário sazonal 2026 com 10 datas',
    skill: 'Seasonal Calendar',
    category: ['campaigns'],
  },
  {
    id: 'c5',
    title: 'Ativar fluxo pós-venda automático',
    skill: 'Post-Purchase',
    category: ['retention'],
  },
  {
    id: 'c6',
    title: 'Ver relatório de performance semanal',
    skill: 'Ops Pilot',
    category: ['analytics'],
  },
  {
    id: 'c7',
    title: 'Gerar script de Reels: bastidores do bordado',
    skill: 'Video Script Creator',
    category: ['content'],
  },
  {
    id: 'c8',
    title: 'Preparar campanha de Dia dos Namorados',
    skill: 'Seasonal Calendar',
    category: ['campaigns'],
  },
  {
    id: 'c9',
    title: 'Reengajar 47 clientes em risco de churn',
    skill: 'Retention Engine',
    category: ['retention'],
  },
  {
    id: 'c10',
    title: 'Revisar identidade e tom de voz da marca',
    skill: 'Brand DNA',
    category: ['analytics'],
  },
  {
    id: 'c11',
    title: 'Planejar Black Friday com exclusividade',
    skill: 'Seasonal Calendar',
    category: ['campaigns'],
  },
  {
    id: 'c12',
    title: 'Verificar estoque antes da campanha',
    skill: 'Inventory Manager',
    category: ['analytics'],
  },
]

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'content', label: 'Content' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'retention', label: 'Retention' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function SkillActionsGrid() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const router = useRouter()

  const filteredCards = CARDS.filter(
    (c) => activeFilter === 'all' || c.category.includes(activeFilter)
  )

  return (
    <div>
      {/* Section title */}
      <p
        style={{
          fontSize: 16,
          fontWeight: 500,
          textAlign: 'center',
          marginBottom: 20,
          color: 'hsl(var(--foreground))',
        }}
      >
        What Snew can do for you
      </p>

      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 20,
        }}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                'transition-colors',
                isActive
                  ? 'bg-foreground text-background border-foreground'
                  : 'text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
              )}
              style={{
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                borderRadius: 100,
                padding: '6px 16px',
                borderWidth: 1,
                borderStyle: 'solid',
                background: isActive ? undefined : 'transparent',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}
      >
        <AnimatePresence mode="popLayout">
          {filteredCards.map((card) => {
            const grad = getGradient(card.skill)
            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                onClick={() => router.push(`/chat?q=${encodeURIComponent(card.title)}`)}
                style={{
                  borderRadius: 20,
                  overflow: 'hidden',
                  minHeight: 220,
                  background: grad.card,
                  backgroundSize: '200% 200%',
                  backgroundPosition: '0% 0%',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'background-position 0.9s ease',
                }}
                whileHover={{ backgroundPosition: '100% 100%' }}
              >
                {/* Top content */}
                <div style={{ padding: '28px 28px 0' }}>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      color: grad.ink,
                      opacity: 0.5,
                      marginBottom: 10,
                      margin: 0,
                      marginBlockEnd: 10,
                      textTransform: 'none',
                    }}
                  >
                    {card.skill}
                  </p>
                  <p
                    style={{
                      fontSize: 17,
                      fontWeight: 500,
                      lineHeight: 1.25,
                      letterSpacing: '-0.01em',
                      color: grad.ink,
                      margin: 0,
                    }}
                  >
                    {card.title}
                  </p>
                </div>

                {/* Decorative glow area */}
                <div
                  style={{
                    flex: 1,
                    marginTop: 20,
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 100,
                  }}
                >
                  {/* Glow 1 */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-30%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '80%',
                      height: '120%',
                      borderRadius: '50%',
                      background:
                        'radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* Glow 2 */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10%',
                      right: '-10%',
                      width: '60%',
                      height: '60%',
                      borderRadius: '50%',
                      background:
                        'radial-gradient(ellipse, rgba(255,255,255,0.25) 0%, transparent 65%)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <p
        style={{
          fontSize: 12,
          color: 'hsl(var(--muted-foreground))',
          textAlign: 'center',
          marginTop: 24,
        }}
      >
        Mostrando {filteredCards.length} ações disponíveis
      </p>
    </div>
  )
}
