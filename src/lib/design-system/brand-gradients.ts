/**
 * Snew Design System — 5 gradient families
 *
 * Exact color stops ported from snew-ai-core designSystem.tsx.
 * Each family has a `card` gradient (for pastel cards), a `bubble` radial
 * (for holographic avatars), an `ink` color (for card text), and a `seed`
 * used by SVG feTurbulence filters.
 *
 * DO NOT modify values without approval — this is the brand reference.
 */

export type BrandGradientKey = 'sageHaze' | 'duskRose' | 'aurora' | 'mist' | 'blueDusk'

export interface BrandGradient {
  name: string
  card: string
  bubble: string
  ink: string
  seed: number
}

export const BRAND_GRADIENTS: Record<BrandGradientKey, BrandGradient> = {
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
}

export const CATEGORY_GRADIENT: Record<string, BrandGradientKey> = {
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
  'Brand DNA': 'blueDusk',
}

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
  'brand-dna': 'Brand DNA',
}

export function normalizeSkillId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function resolveCategory(input: string): string {
  if (CATEGORY_GRADIENT[input]) return input
  if (SKILL_ID_ALIAS[input]) return SKILL_ID_ALIAS[input]
  const match = Object.keys(CATEGORY_GRADIENT).find(
    (k) => normalizeSkillId(k) === normalizeSkillId(input)
  )
  return match ?? input
}

export function resolveGradientKey(input: string): BrandGradientKey {
  const resolved = resolveCategory(input)
  return (CATEGORY_GRADIENT[resolved] ?? 'mist') as BrandGradientKey
}

export function getGradient(category: string): BrandGradient {
  const key = resolveGradientKey(category)
  return BRAND_GRADIENTS[key]
}

export const FLOAT_DURATION: Record<BrandGradientKey, string> = {
  sageHaze: '3.2s',
  duskRose: '3.7s',
  aurora: '2.9s',
  mist: '3.5s',
  blueDusk: '3.1s',
}
