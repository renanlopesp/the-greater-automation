'use client'

import { AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  buildCapCards,
  CAP_FILTER_TABS,
  INITIAL_VISIBLE,
  type FilterTab,
} from '@/lib/snew-home/default-capabilities'
import type { StoreContext } from '@/lib/snew-home/load-store-context'
import { CapabilityCardView } from './capability-card'

interface CapabilitiesSectionProps {
  storeCtx: StoreContext | null
}

/**
 * "What Snew can do for you" — filterable capabilities grid.
 *
 * 1:1 port from snew-ai-core SnewStudioHomePage.tsx CapabilitiesSection
 * (lines 276-381).
 */
export function CapabilitiesSection({ storeCtx }: CapabilitiesSectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [showAll, setShowAll] = useState(false)

  const cards = useMemo(() => buildCapCards(storeCtx), [storeCtx])
  const filtered = cards.filter((c) => activeFilter === 'all' || c.category.includes(activeFilter))
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_VISIBLE)
  const hasMore = filtered.length > INITIAL_VISIBLE && !showAll

  return (
    <div style={{ marginBottom: 52 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p
          style={{ fontSize: 16, fontWeight: 500, color: '#1A1A1A', margin: '0 0 16px' }}
          className="dark:text-foreground"
        >
          What Snew can do for you
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {CAP_FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.id
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => {
                  setActiveFilter(tab.id)
                  setShowAll(false)
                }}
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? '#FFFFFF' : '#888',
                  background: isActive ? '#1A1A1A' : 'transparent',
                  border: `1px solid ${isActive ? '#1A1A1A' : '#E0E0DC'}`,
                  borderRadius: 100,
                  padding: '6px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#999'
                    e.currentTarget.style.color = '#1A1A1A'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#E0E0DC'
                    e.currentTarget.style.color = '#888'
                  }
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}
      >
        <AnimatePresence mode="popLayout">
          {visible.map((card) => (
            <CapabilityCardView key={card.id} card={card} />
          ))}
        </AnimatePresence>
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            style={{
              padding: '8px 24px',
              borderRadius: 10,
              border: '1px solid #E0E0DC',
              background: '#FFFFFF',
              color: '#555',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1A1A1A'
              e.currentTarget.style.color = '#FFF'
              e.currentTarget.style.borderColor = '#1A1A1A'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF'
              e.currentTarget.style.color = '#555'
              e.currentTarget.style.borderColor = '#E0E0DC'
            }}
          >
            Ver mais ({filtered.length - INITIAL_VISIBLE})
          </button>
        </div>
      )}
    </div>
  )
}
