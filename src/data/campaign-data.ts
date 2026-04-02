/**
 * Campaign Data — Seasonal Calendar Skill
 *
 * Type definitions for campaigns and seasonal dates.
 * Static data removed in 044-seasonal-calendar-ai — all data is now AI-generated
 * and stored in skill_executions. See src/lib/ai/seasonal-campaign-generator.ts.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProductTag =
  | 'best-seller'
  | 'liberar-estoque'
  | 'cross-sell'
  | 'lancamento'
  | 'alta-margem'

export interface CampaignProduct {
  name: string
  price: number
  tag: ProductTag
  stock?: number
  image_url?: string
}

export interface CampaignConcept {
  slogan: string
  description: string
  products: CampaignProduct[]
  alternates: { slogan: string; description: string }[]
}

export interface CampaignCopy {
  channel: string
  timing: string
  text: string
}

export interface CampaignAsset {
  label: string
  ratio: string
  bg: string
}

export interface CampaignVideoScript {
  title: string
  duration: string
  content: string
}

export interface CampaignTimelineItem {
  day: string
  actions: string[]
}

export interface FullCampaign {
  intro: string
  concept: CampaignConcept
  selectedProducts: CampaignProduct[]
  emailSubject: string
  emailPreview: string
  copies: CampaignCopy[]
  assets: CampaignAsset[]
  videoScripts: CampaignVideoScript[]
  timeline: CampaignTimelineItem[]
}

export interface SeasonalDate {
  id: string
  name: string
  month: string
  day: number
  date: string
  potentialValue: string
  status: 'done' | 'active' | 'ready' | 'pending'
}

// ---------------------------------------------------------------------------
// productTagConfig
// ---------------------------------------------------------------------------

export function productTagConfig(tag: ProductTag): {
  label: string
  bg: string
  color: string
} {
  switch (tag) {
    case 'best-seller':
      return {
        label: 'Best-seller',
        bg: 'var(--green-bg)',
        color: 'var(--green)',
      }
    case 'liberar-estoque':
      return {
        label: 'Liberar estoque',
        bg: 'var(--amber-bg)',
        color: 'var(--amber)',
      }
    case 'cross-sell':
      return {
        label: 'Cross-sell',
        bg: 'var(--blue-bg, oklch(0.93 0.03 250))',
        color: 'var(--blue, oklch(0.5 0.12 250))',
      }
    case 'lancamento':
      return {
        label: 'Lançamento',
        bg: 'var(--purple-bg, oklch(0.93 0.04 300))',
        color: 'var(--purple, oklch(0.5 0.15 300))',
      }
    case 'alta-margem':
      return {
        label: 'Alta margem',
        bg: 'var(--green-bg)',
        color: 'var(--green)',
      }
  }
}
