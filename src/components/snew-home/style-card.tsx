'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react'

interface StyleCardProps {
  name: string
  thumbnailUrl: string
  hoverImages: string[]
  onClick: () => void
}

/**
 * Style template card with hover slideshow (dual-layer crossfade).
 *
 * Uses a raw <img> tag (not next/image) on purpose: Next.js would downsample
 * and recompress the source PNGs to 256–640w WebP, and the extra compression
 * pass visibly softens the detail. The source files are already sized for
 * this card (≤ 1080w), so we rely on the browser's native downsample which
 * matches the snew-ai-core prototype pixel-for-pixel.
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

  useEffect(() => {
    if (slides.length > 0) {
      setLayerSrc([slides[0], slides[0]])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  useEffect(() => {
    if (isHovered && slides.length > 1) {
      intervalRef.current = setInterval(() => {
        setSlideIndex((i) => (i + 1) % slides.length)
      }, 1100)
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
        {/* Preload — mounts every hover slide in the DOM so the browser fetches
            them eagerly. Hidden via opacity + zero dimensions; browsers still
            download <img src> elements even at 0×0. */}
        {slides.slice(1).map((src) => (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden
            decoding="async"
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        ))}
        {layerSrc[0] && (
          <img
            src={layerSrc[0]}
            alt=""
            decoding="async"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              opacity: activeLayer === 0 ? 1 : 0,
              transition: 'opacity 0.25s ease',
              willChange: 'opacity',
            }}
          />
        )}
        {layerSrc[1] && (
          <img
            src={layerSrc[1]}
            alt=""
            decoding="async"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              opacity: activeLayer === 1 ? 1 : 0,
              transition: 'opacity 0.25s ease',
              willChange: 'opacity',
            }}
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
