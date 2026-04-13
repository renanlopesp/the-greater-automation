'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

interface StyleCardProps {
  name: string
  thumbnailUrl: string
  hoverImages: string[]
  onClick: () => void
}

/**
 * Style template card with hover slideshow (dual-layer crossfade).
 * Uses Next.js <Image> with fill + sizes="216px" for optimal loading.
 *
 * 1:1 port from snew-ai-core SnewStudioHomePage.tsx StyleCard (lines 16-138).
 * - Cycles slides every 650ms while hovered
 * - Dual-layer opacity crossfade (250ms ease)
 * - Dot indicators: active 14×5, inactive 5×5, 200ms width transition
 */
export function StyleCard({ name, thumbnailUrl, hoverImages, onClick }: StyleCardProps) {
  const slides = [thumbnailUrl, ...hoverImages].filter(Boolean)
  const [isHovered, setIsHovered] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [activeLayer, setActiveLayer] = useState<0 | 1>(0)
  const [layerSrc, setLayerSrc] = useState<[string, string]>(['', ''])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isFirstRender = useRef(true)

  // Init both layers with first slide
  useEffect(() => {
    if (slides.length > 0) {
      setLayerSrc([slides[0], slides[0]])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When slideIndex changes, load new src on the back layer and flip
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const newSrc = slides[slideIndex] ?? ''
    const backLayer = activeLayer === 0 ? 1 : 0
    setLayerSrc((prev) => {
      const next: [string, string] = [...prev] as [string, string]
      next[backLayer] = newSrc
      return next
    })
    const t = setTimeout(() => setActiveLayer(backLayer as 0 | 1), 30)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex])

  // Interval control
  useEffect(() => {
    if (isHovered && slides.length > 1) {
      intervalRef.current = setInterval(() => {
        setSlideIndex((i) => (i + 1) % slides.length)
      }, 650)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (!isHovered) {
        setSlideIndex(0)
        setActiveLayer(0)
        if (slides.length > 0) setLayerSrc([slides[0], slides[0]])
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHovered, slides.length])

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        border: 'none',
        padding: 0,
        background: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        flexShrink: 0,
        width: 216,
      }}
    >
      <div
        style={{
          width: '100%',
          height: 384,
          borderRadius: 14,
          overflow: 'hidden',
          background: '#E8E6E2',
          position: 'relative',
        }}
      >
        {/* Layer 0 */}
        {layerSrc[0] && (
          <Image
            src={layerSrc[0]}
            alt=""
            fill
            sizes="216px"
            quality={85}
            style={{
              objectFit: 'cover',
              display: 'block',
              opacity: activeLayer === 0 ? 1 : 0,
              transition: 'opacity 0.25s ease',
              willChange: 'opacity',
            }}
            priority={false}
          />
        )}
        {/* Layer 1 */}
        {layerSrc[1] && (
          <Image
            src={layerSrc[1]}
            alt=""
            fill
            sizes="216px"
            quality={85}
            style={{
              objectFit: 'cover',
              display: 'block',
              opacity: activeLayer === 1 ? 1 : 0,
              transition: 'opacity 0.25s ease',
              willChange: 'opacity',
            }}
            priority={false}
          />
        )}
        {slides.length === 0 && (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#BBB',
              fontSize: 12,
              fontWeight: 500,
              position: 'relative',
              zIndex: 2,
            }}
          >
            {name}
          </div>
        )}

        {/* Dot indicators */}
        {isHovered && slides.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 4,
              zIndex: 2,
            }}
          >
            {slides.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === slideIndex ? 14 : 5,
                  height: 5,
                  borderRadius: 99,
                  background: 'rgba(255,255,255,0.9)',
                  transition: 'width 0.2s ease',
                  opacity: i === slideIndex ? 1 : 0.5,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </button>
  )
}
