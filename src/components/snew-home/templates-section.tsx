'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { StyleCard } from './style-card'
import { DEFAULT_STYLES } from '@/lib/snew-home/default-styles'

const PAGE_BG = 'hsl(40, 7%, 96%)'
const SCROLL_STEP = 696

/**
 * "Comece agora" templates strip — horizontal scroll with style cards.
 *
 * 1:1 port from snew-ai-core SnewStudioHomePage.tsx lines 735-881.
 */
export function TemplatesSection() {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'right' ? SCROLL_STEP : -SCROLL_STEP, behavior: 'smooth' })
    setTimeout(checkScroll, 350)
  }

  useEffect(() => {
    checkScroll()
  }, [])

  const openStyle = (id: string, name: string, description: string, prompt: string) => {
    const params = new URLSearchParams()
    params.set('autoPrompt', prompt)
    params.set('styleId', id)
    params.set('styleName', name)
    params.set('styleDesc', description)
    router.push(`/studio/create?${params.toString()}`)
  }

  return (
    <div style={{ marginBottom: 40 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <p
          style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', margin: 0 }}
          className="dark:text-foreground"
        >
          Comece agora
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        {canScrollLeft && (
          <>
            <button
              type="button"
              onClick={() => scrollBy('left')}
              aria-label="Scroll left"
              style={{
                position: 'absolute',
                left: 0,
                top: '45%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid rgba(0,0,0,0.10)',
                background: '#FFFFFF',
                boxShadow: '0 2px 12px rgba(0,0,0,0.14)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#333',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1A1A1A'
                e.currentTarget.style.color = '#FFF'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFFFF'
                e.currentTarget.style.color = '#333'
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: 60,
                background: `linear-gradient(to left, transparent, ${PAGE_BG})`,
                pointerEvents: 'none',
                zIndex: 3,
              }}
            />
          </>
        )}

        {canScrollRight && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: 60,
                background: `linear-gradient(to right, transparent, ${PAGE_BG})`,
                pointerEvents: 'none',
                zIndex: 3,
              }}
            />
            <button
              type="button"
              onClick={() => scrollBy('right')}
              aria-label="Scroll right"
              style={{
                position: 'absolute',
                right: 0,
                top: '45%',
                transform: 'translate(50%, -50%)',
                zIndex: 10,
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid rgba(0,0,0,0.10)',
                background: '#FFFFFF',
                boxShadow: '0 2px 12px rgba(0,0,0,0.14)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#333',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1A1A1A'
                e.currentTarget.style.color = '#FFF'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFFFF'
                e.currentTarget.style.color = '#333'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        <div style={{ overflow: 'hidden', borderRadius: 14 }}>
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="hide-scrollbar"
            style={{
              display: 'flex',
              gap: 14,
              overflowX: 'auto',
              padding: '8px 4px 12px',
            }}
          >
            {DEFAULT_STYLES.map((tpl, idx) => (
              <div
                key={tpl.id}
                className="style-card-wrapper"
                style={{
                  flexShrink: 0,
                  width: 216,
                  animation: 'fadeSlideUp 0.35s ease both',
                  animationDelay: `${idx * 40}ms`,
                  position: 'relative',
                }}
              >
                <StyleCard
                  name={tpl.name}
                  thumbnailUrl={tpl.thumbnailUrl}
                  hoverImages={tpl.hoverImages}
                  onClick={() => openStyle(tpl.id, tpl.name, tpl.description, tpl.prompt)}
                />
                <div
                  className="style-card-caption"
                  style={{
                    padding: '10px 2px 0',
                    opacity: 0,
                    transform: 'translateY(4px)',
                    transition: 'opacity 0.18s ease, transform 0.18s ease',
                    pointerEvents: 'none',
                  }}
                >
                  <p
                    style={{
                      color: '#1A1A1A',
                      fontSize: 12,
                      fontWeight: 400,
                      margin: '0 0 3px',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.3,
                    }}
                    className="dark:text-foreground"
                  >
                    {tpl.name}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: '#999',
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {tpl.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
