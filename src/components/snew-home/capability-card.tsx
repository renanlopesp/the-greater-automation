'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { getGradient } from '@/lib/design-system/brand-gradients'
import type { CapabilityCard as CardData } from '@/lib/snew-home/default-capabilities'

interface CapabilityCardProps {
  card: CardData
}

/**
 * Capability card with animated gradient background.
 *
 * - 5 gradient families from brand-gradients.ts (sageHaze/duskRose/aurora/mist/blueDusk)
 * - backgroundSize 200% + position 0/0 → 100%/100% on hover (900ms ease)
 * - Radial white glow at bottom (rgba(255,255,255,0.45) → transparent)
 * - AnimatePresence popLayout transitions (opacity + scale 0.97 → 1)
 *
 * 1:1 port from snew-ai-core SnewStudioHomePage.tsx lines 286-359.
 */
export function CapabilityCardView({ card }: CapabilityCardProps) {
  const router = useRouter()
  const grad = getGradient(card.skill)

  const handleClick = () => {
    if (card.autoPrompt) {
      router.push(`${card.route}?autoPrompt=${encodeURIComponent(card.autoPrompt)}`)
    } else {
      router.push(card.route)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      onClick={handleClick}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        background: grad.card,
        backgroundSize: '200% 200%',
        backgroundPosition: '0% 0%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 220,
        cursor: 'pointer',
        transition: 'background-position 0.9s ease',
      }}
      whileHover={{ backgroundPosition: '100% 100%' }}
    >
      <div style={{ padding: '28px 28px 0', position: 'relative', zIndex: 2 }}>
        <p
          style={{
            margin: '0 0 10px',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.02em',
            color: grad.ink,
            opacity: 0.5,
          }}
        >
          {card.skill}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 500,
            lineHeight: 1.25,
            color: grad.ink,
            letterSpacing: '-0.01em',
          }}
        >
          {card.title}
        </p>
      </div>
      <div
        style={{ flex: 1, marginTop: 20, position: 'relative', overflow: 'hidden', minHeight: 100 }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '-30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '120%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </motion.div>
  )
}
