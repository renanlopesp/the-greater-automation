'use client'

// ═══════════════════════════════════════════════════════════════════════════════
// SNEW — DESIGN SYSTEM UNIFICADO
// Brand DNA v4 · Soft Gradient · Bubble Avatars sincronizados
// Um único arquivo para o Lovable
//
// Exports:
//   BRAND          → tokens de cor, gradientes, categoria→gradiente
//   BubbleAvatar   → avatar esférico holográfico por skill
//   SVGFilters     → injetar uma vez no App.tsx / Layout.tsx
//   SnewCard       → card da home com gradiente animado
//   SkillCard      → card de skill com bubble sincronizado
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// BRAND DNA — fonte única de verdade para todas as cores
// ═══════════════════════════════════════════════════════════════════════════════

export const BRAND = {
  // ── 5 famílias de gradiente ─────────────────────────────────────────────────
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
  },

  // ── Categoria → família de gradiente ────────────────────────────────────────
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
    Campaign: 'duskRose',
    Analytics: 'blueDusk',
    Ads: 'sageHaze',
    WhatsApp: 'aurora',
    'Email / CRM': 'mist',
  } as Record<string, string>,

  // ── Base UI ──────────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  surface: '#F8F8F6',
  border: '#E8E6E0',
  borderHov: '#D0CEC8',
  ink: '#1A1916',
  inkMuted: '#6B6860',
  inkDim: '#A8A49C',
}

export type BrandGradientKey = keyof typeof BRAND.gradients

// ── Alias map: legacy short skillIds → full category name ────────────────────
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
  campaign: 'Campaign',
  ads: 'Ads',
  whatsapp: 'WhatsApp',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveCategory(input: string): string {
  if (BRAND.categoryGradient[input]) return input
  if (SKILL_ID_ALIAS[input]) return SKILL_ID_ALIAS[input]
  const match = Object.keys(BRAND.categoryGradient).find(
    (k) => normalizeSkillId(k) === normalizeSkillId(input)
  )
  return match ?? input
}

export function getGradient(category: string) {
  const resolved = resolveCategory(category)
  const key = BRAND.categoryGradient[resolved] ?? 'mist'
  return BRAND.gradients[key as BrandGradientKey] ?? BRAND.gradients.mist
}

export function normalizeSkillId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export function getBubbleForSkill(skillName: string) {
  const resolved = resolveCategory(skillName)
  const gradKey = BRAND.categoryGradient[resolved] ?? 'mist'
  return BRAND.gradients[gradKey as BrandGradientKey] ?? BRAND.gradients.mist
}

export const FLOAT_DURATION: Record<string, string> = {
  sageHaze: '3.2s',
  duskRose: '3.7s',
  aurora: '2.9s',
  mist: '3.5s',
  blueDusk: '3.1s',
}

export function resolveGradientKey(input: string): BrandGradientKey {
  const resolved = resolveCategory(input)
  return (BRAND.categoryGradient[resolved] ?? 'mist') as BrandGradientKey
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG FILTERS — textura orgânica para bubble avatars
// Injete <SVGFilters /> uma única vez no topo do App.tsx / Layout.tsx
// ═══════════════════════════════════════════════════════════════════════════════

const SVG_FILTERS_HTML = `<svg width="0" height="0" style="position:absolute">
  <filter id="snew-f-sageHaze"><feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="3" seed="2"/><feDisplacementMap in="SourceGraphic" scale="12"/></filter>
  <filter id="snew-f-duskRose"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="7"/><feDisplacementMap in="SourceGraphic" scale="10"/></filter>
  <filter id="snew-f-aurora"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="14"/><feDisplacementMap in="SourceGraphic" scale="14"/></filter>
  <filter id="snew-f-mist"><feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="21"/><feDisplacementMap in="SourceGraphic" scale="11"/></filter>
  <filter id="snew-f-blueDusk"><feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed="33"/><feDisplacementMap in="SourceGraphic" scale="13"/></filter>
</svg>`

export function SVGFilters() {
  return (
    <div
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: SVG_FILTERS_HTML }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUBBLE AVATAR — esfera holográfica sincronizada com Brand DNA
// ═══════════════════════════════════════════════════════════════════════════════

interface BubbleAvatarProps {
  /** Nome exato da skill (ex: "Seasonal Calendar") OU chave normalizada (ex: "seasonal-calendar") */
  skillName: string
  size?: number
  animated?: boolean
}

export function BubbleAvatar({ skillName, size = 44, animated = true }: BubbleAvatarProps) {
  const gradKey = resolveGradientKey(skillName)
  const grad = BRAND.gradients[gradKey]
  const filterId = `snew-f-${gradKey}`
  const duration = FLOAT_DURATION[gradKey] ?? '3.2s'

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        flexShrink: 0,
        animation: animated ? `snew-float ${duration} ease-in-out infinite` : undefined,
      }}
    >
      {/* textura orgânica */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: grad.bubble,
          filter: `url(#${filterId})`,
          opacity: 0.35,
        }}
      />

      {/* highlight especular */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: grad.bubble,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '12%',
            left: '20%',
            width: '45%',
            height: '35%',
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 60%, transparent 100%)',
            transform: 'rotate(-15deg)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* borda iridescente */}
      <div
        style={{
          position: 'absolute',
          inset: -1,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.25)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SNEW CARD — card da home sincronizado com Brand DNA
// ═══════════════════════════════════════════════════════════════════════════════

interface SnewCardProps {
  title: string
  category: string
}

export function SnewCard({ title, category }: SnewCardProps) {
  const grad = getGradient(category)
  const [hov, setHov] = useState(false)

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        background: grad.card,
        backgroundSize: '200% 200%',
        backgroundPosition: hov ? '100% 100%' : '0% 0%',
        display: 'flex',
        flexDirection: 'column' as const,
        minHeight: 220,
        cursor: 'pointer',
        transition: 'background-position 0.9s ease',
      }}
    >
      <div style={{ padding: '28px 24px 0', flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: grad.ink,
            opacity: 0.6,
            marginBottom: 10,
            fontFamily: 'system-ui',
          }}
        >
          {category}
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 500,
            lineHeight: 1.3,
            color: grad.ink,
            fontFamily: 'system-ui',
          }}
        >
          {title}
        </div>
      </div>

      {/* área decorativa inferior */}
      <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
        <BubbleAvatar skillName={category} size={36} animated={false} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKILL CARD — card de skill com bubble sincronizado
// ═══════════════════════════════════════════════════════════════════════════════

interface SkillCardProps {
  name: string
  desc: string
  active?: boolean
}

export function SkillCard({ name, desc, active = false }: SkillCardProps) {
  const [hov, setHov] = useState(false)

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '16px',
        background: BRAND.white,
        border: `1px solid ${hov ? BRAND.borderHov : BRAND.border}`,
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 12,
        transition: 'border-color 0.15s',
        cursor: 'pointer',
      }}
    >
      {/* top row: bubble + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BubbleAvatar skillName={name} size={38} />
        {active && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              color: '#5A8A5A',
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7AC07A' }} />
            Ativo
          </div>
        )}
      </div>

      {/* text */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: BRAND.ink, fontFamily: 'system-ui' }}>
          {name}
        </div>
        <div style={{ fontSize: 12, color: BRAND.inkMuted, fontFamily: 'system-ui', marginTop: 4 }}>
          {desc}
        </div>
      </div>
    </div>
  )
}
