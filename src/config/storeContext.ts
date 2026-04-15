'use client'

import type { StoreContext } from '@/lib/studio/store-context'

/**
 * Monta o bloco de contexto da loja para injeção em prompts.
 * Retorna string vazia se KB não estiver configurado.
 */
export function buildKBContext(ctx: StoreContext | null | undefined): string {
  if (!ctx?.name) return ''

  const brand: string[] = [
    `Brand: ${ctx.name}.`,
    ctx.niche && `Niche: ${ctx.niche}.`,
    ctx.audience && `Audience: ${ctx.audience}.`,
    ctx.tone && `Tone: ${ctx.tone}.`,
    ctx.description && `Description: ${ctx.description}.`,
    ctx.productTypes?.length ? `Products: ${ctx.productTypes.join(', ')}.` : '',
    ctx.keywords?.length ? `Keywords: ${ctx.keywords.slice(0, 5).join(', ')}.` : '',
    ctx.colors?.length ? `Colors: ${ctx.colors.slice(0, 3).join(', ')}.` : '',
  ].filter(Boolean) as string[]

  const visual: string[] = [
    ctx.visualConcept && `Visual concept: ${ctx.visualConcept}.`,
    ctx.modelProfile?.gender && `Model type: ${ctx.modelProfile.gender}.`,
    ctx.modelProfile?.ageRange && `Model age: ${ctx.modelProfile.ageRange}.`,
    ctx.modelProfile?.pose && `Pose/attitude: ${ctx.modelProfile.pose}.`,
    ctx.shootingStyle && `Shooting style: ${ctx.shootingStyle}.`,
    ctx.lightingMood && `Lighting: ${ctx.lightingMood}.`,
    ctx.colorMood && `Color mood: ${ctx.colorMood}.`,
    ctx.backgroundStyle && `Background: ${ctx.backgroundStyle}.`,
  ].filter(Boolean) as string[]

  const parts = [...brand]
  if (visual.length) parts.push(`\n[Visual Direction] ${visual.join(' ')}`)

  return `\n\n[Brand Context]\n${parts.join(' ')}`
}

/**
 * Versão curta para injeção inline em prompts de imagem.
 */
export function buildKBInline(ctx: StoreContext | null | undefined): string {
  if (!ctx?.name) return ''
  const parts = [
    `Brand: ${ctx.name}`,
    ctx.niche && `niche: ${ctx.niche}`,
    ctx.tone && `tone: ${ctx.tone}`,
    ctx.audience && `audience: ${ctx.audience}`,
  ].filter(Boolean) as string[]

  const vis: string[] = []
  if (ctx.visualConcept) vis.push(`visual-concept: ${ctx.visualConcept}`)
  if (ctx.modelProfile?.gender) vis.push(`model-type: ${ctx.modelProfile.gender}`)
  if (ctx.modelProfile?.ageRange) vis.push(`model-age: ${ctx.modelProfile.ageRange}`)
  if (ctx.modelProfile?.pose) vis.push(`pose: ${ctx.modelProfile.pose}`)
  if (ctx.shootingStyle) vis.push(`shooting: ${ctx.shootingStyle}`)
  if (ctx.lightingMood) vis.push(`lighting: ${ctx.lightingMood}`)
  if (ctx.colorMood) vis.push(`color-mood: ${ctx.colorMood}`)
  if (ctx.backgroundStyle) vis.push(`background: ${ctx.backgroundStyle}`)

  if (vis.length) parts.push(...vis)

  return ` (${parts.join(', ')})`
}

/**
 * Objeto brandContext para injeção em bodies de edge functions.
 */
export function buildBrandContextBody(ctx: StoreContext | null | undefined) {
  if (!ctx?.name) return undefined
  return {
    name: ctx.name,
    niche: ctx.niche ?? '',
    audience: ctx.audience ?? '',
    tone: ctx.tone ?? '',
    keywords: ctx.keywords ?? [],
    colors: ctx.colors ?? [],
  }
}
