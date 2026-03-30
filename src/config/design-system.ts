// ═══════════════════════════════════════════════════════════════════════════════
// SNEW — DESIGN SYSTEM
// Brand DNA v4 · Soft Gradient · Bubble Avatars
// Single source of truth for all gradient tokens, orb avatars, and SVG filters
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type BrandGradientKey = 'sageHaze' | 'duskRose' | 'aurora' | 'mist' | 'blueDusk'

export interface GradientFamily {
  name: string
  card: string
  bubble: string
  ink: string
  seed: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRAND DNA — single source of truth for all colors
// ═══════════════════════════════════════════════════════════════════════════════

export const BRAND = {
  gradients: {
    sageHaze: {
      name: 'Sage Haze',
      card: 'linear-gradient(158deg, #D0D8CC 0%, #E4ECD8 50%, #ECF0DC 100%)',
      bubble: 'radial-gradient(circle at 62% 38%, #E8F0DC, #B8CCA8 28%, #8CB898 55%, #A8C8B0 100%)',
      ink: '#3A4A3A',
      seed: 2,
    },
    duskRose: {
      name: 'Dusk Rose',
      card: 'linear-gradient(145deg, #E0D0E0 0%, #F4D0C4 50%, #E8D0D8 100%)',
      bubble: 'radial-gradient(circle at 38% 38%, #F8D8E8, #E898C0 28%, #C870A8 55%, #9868C8 100%)',
      ink: '#5A3A4A',
      seed: 7,
    },
    aurora: {
      name: 'Aurora',
      card: 'linear-gradient(150deg, #C8DCD8 0%, #E4D8E4 45%, #F0DDD0 100%)',
      bubble: 'radial-gradient(circle at 60% 35%, #D8F0EC, #70D8C0 28%, #88C0E8 58%, #C0A8F0 100%)',
      ink: '#3A5A58',
      seed: 14,
    },
    mist: {
      name: 'Mist',
      card: 'linear-gradient(155deg, #DCE8EC 0%, #F2EDE8 50%, #D8E4EA 100%)',
      bubble: 'radial-gradient(circle at 40% 62%, #E0EEF4, #98C8DC 32%, #B8D8EC 60%, #D8E8F4 100%)',
      ink: '#3A4A50',
      seed: 21,
    },
    blueDusk: {
      name: 'Blue Dusk',
      card: 'linear-gradient(160deg, #D4E0EA 0%, #F0E4D8 50%, #D8E0EA 100%)',
      bubble: 'radial-gradient(circle at 55% 35%, #E0ECF8, #90B8D8 30%, #A8C8E8 58%, #D8C8E0 100%)',
      ink: '#3A4A5A',
      seed: 33,
    },
  } satisfies Record<BrandGradientKey, GradientFamily>,

  categoryGradient: {
    'Seasonal Calendar': 'sageHaze',
    Copywriter: 'mist',
    'Image Generator': 'aurora',
    'Social Asset Creator': 'aurora',
    'Video Script Creator': 'duskRose',
    'Retention Engine': 'blueDusk',
    'Inventory Manager': 'sageHaze',
    'Post-Purchase': 'aurora',
    'Ops Pilot': 'mist',
    'Brand DNA': 'mist',
    Campaign: 'duskRose',
    Analytics: 'blueDusk',
    Ads: 'sageHaze',
    WhatsApp: 'aurora',
    'Email / CRM': 'mist',
  } as Record<string, BrandGradientKey>,

  white: '#FFFFFF',
  surface: '#F8F8F6',
  border: '#E8E6E0',
  borderHov: '#D0CEC8',
  ink: '#1A1916',
  inkMuted: '#6B6860',
  inkDim: '#A8A49C',
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const SKILL_ID_ALIAS: Record<string, string> = {
  'seasonal-calendar': 'Seasonal Calendar',
  copywriter: 'Copywriter',
  'image-generator': 'Image Generator',
  'social-content': 'Social Asset Creator',
  'video-script': 'Video Script Creator',
  'retention-engine': 'Retention Engine',
  inventory: 'Inventory Manager',
  'post-purchase': 'Post-Purchase',
  'ops-pilot': 'Ops Pilot',
  'brand-dna': 'Brand DNA',
}

function resolveCategory(input: string): string {
  if (BRAND.categoryGradient[input]) return input
  if (SKILL_ID_ALIAS[input]) return SKILL_ID_ALIAS[input]
  const normalized = input
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  const match = Object.keys(BRAND.categoryGradient).find(
    (k) =>
      k
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') === normalized
  )
  return match ?? input
}

export function getGradient(category: string): GradientFamily {
  const resolved = resolveCategory(category)
  const key = BRAND.categoryGradient[resolved] ?? 'mist'
  return BRAND.gradients[key] ?? BRAND.gradients.mist
}

export function resolveGradientKey(input: string): BrandGradientKey {
  const resolved = resolveCategory(input)
  return (BRAND.categoryGradient[resolved] ?? 'mist') as BrandGradientKey
}

export const FLOAT_DURATION: Record<BrandGradientKey, string> = {
  sageHaze: '3.2s',
  duskRose: '3.7s',
  aurora: '2.9s',
  mist: '3.5s',
  blueDusk: '3.1s',
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG FILTERS — organic texture for bubble avatars
// Inject <SVGFilters /> once at the top of your layout
// ═══════════════════════════════════════════════════════════════════════════════

const SVG_FILTERS_HTML = `<svg width="0" height="0" style="position:absolute">
  <filter id="snew-f-sageHaze"><feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="3" seed="2"/><feDisplacementMap in="SourceGraphic" scale="12"/></filter>
  <filter id="snew-f-duskRose"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="7"/><feDisplacementMap in="SourceGraphic" scale="10"/></filter>
  <filter id="snew-f-aurora"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="14"/><feDisplacementMap in="SourceGraphic" scale="14"/></filter>
  <filter id="snew-f-mist"><feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="21"/><feDisplacementMap in="SourceGraphic" scale="11"/></filter>
  <filter id="snew-f-blueDusk"><feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed="33"/><feDisplacementMap in="SourceGraphic" scale="13"/></filter>
</svg>`

export function SVGFilters() {
  return React.createElement('div', {
    style: { position: 'absolute' as const, width: 0, height: 0, overflow: 'hidden' as const },
    dangerouslySetInnerHTML: { __html: SVG_FILTERS_HTML },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUBBLE AVATAR — holographic sphere synced with Brand DNA
// ═══════════════════════════════════════════════════════════════════════════════

interface BubbleAvatarProps {
  skillName: string
  size?: number
  animated?: boolean
}

export function BubbleAvatar({ skillName, size = 44, animated = true }: BubbleAvatarProps) {
  const gradKey = resolveGradientKey(skillName)
  const grad = BRAND.gradients[gradKey]
  const filterId = `snew-f-${gradKey}`
  const duration = FLOAT_DURATION[gradKey]

  return React.createElement(
    'div',
    {
      style: {
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative' as const,
        flexShrink: 0,
        animation: animated ? `snew-float ${duration} ease-in-out infinite` : undefined,
      },
    },
    // Organic texture layer
    React.createElement('div', {
      style: {
        position: 'absolute' as const,
        inset: 0,
        borderRadius: '50%',
        background: grad.bubble,
        filter: `url(#${filterId})`,
        opacity: 0.35,
      },
    }),
    // Main gradient + specular highlight
    React.createElement(
      'div',
      {
        style: {
          position: 'absolute' as const,
          inset: 0,
          borderRadius: '50%',
          background: grad.bubble,
        },
      },
      React.createElement('div', {
        style: {
          position: 'absolute' as const,
          top: '12%',
          left: '20%',
          width: '45%',
          height: '35%',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 60%, transparent 100%)',
          transform: 'rotate(-15deg)',
          pointerEvents: 'none' as const,
        },
      })
    ),
    // Iridescent border
    React.createElement('div', {
      style: {
        position: 'absolute' as const,
        inset: -1,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.25)',
        pointerEvents: 'none' as const,
      },
    })
  )
}
