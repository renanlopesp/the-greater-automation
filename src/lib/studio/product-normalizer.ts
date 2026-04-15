import { z } from 'zod/v4'

export const NormalizedProductSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  image: z.string().url().nullable(),
  price: z.string().nullable(),
  handle: z.string().optional(),
  source: z.enum(['nuvemshop', 'shopify-composio']),
})

export type NormalizedProduct = z.infer<typeof NormalizedProductSchema>

export type ProductPickerWarningCode = 'store_api_unavailable' | 'NUVEMSHOP_AUTH_EXPIRED'

function pickLocalizedName(v: unknown): string {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    const candidate = o.pt ?? o.es ?? Object.values(o).find((x) => typeof x === 'string')
    if (typeof candidate === 'string') return candidate
  }
  return ''
}

function toSafeUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  if (!/^https?:\/\//.test(trimmed)) return null
  return trimmed
}

export function fromNuvemshop(raw: unknown): NormalizedProduct | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = o.id !== undefined && o.id !== null ? String(o.id) : ''
  if (!id) return null

  const name = pickLocalizedName(o.name).trim() || 'Produto sem nome'

  const imagesRaw = Array.isArray(o.images) ? (o.images as Array<{ src?: unknown }>) : []
  const firstImageSrc = imagesRaw.find((img) => !!img?.src)?.src
  const image = toSafeUrl(firstImageSrc)

  const variants = Array.isArray(o.variants) ? (o.variants as Array<{ price?: unknown }>) : []
  const firstPrice = variants.find((v) => v?.price !== undefined && v?.price !== null)?.price
  const price = firstPrice === null || firstPrice === undefined ? null : String(firstPrice)

  const handle = typeof o.handle === 'string' ? o.handle : undefined

  return { id, name, image, price, handle, source: 'nuvemshop' }
}

export function fromShopifyComposio(raw: unknown): NormalizedProduct | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const rawId = o.id ?? o.gid
  const id = rawId !== undefined && rawId !== null ? String(rawId) : ''
  if (!id) return null

  const title = typeof o.title === 'string' ? o.title : ''
  const name = title.trim() || 'Produto sem nome'

  const singleImage = (o.image as { src?: unknown } | undefined)?.src
  const imagesArr = Array.isArray(o.images) ? (o.images as Array<{ src?: unknown }>) : []
  const fromArray = imagesArr.find((i) => !!i?.src)?.src
  const image = toSafeUrl(singleImage) ?? toSafeUrl(fromArray)

  const variants = Array.isArray(o.variants) ? (o.variants as Array<{ price?: unknown }>) : []
  const firstPrice = variants.find((v) => v?.price !== undefined && v?.price !== null)?.price
  const price = firstPrice === null || firstPrice === undefined ? null : String(firstPrice)

  const handle = typeof o.handle === 'string' ? o.handle : undefined

  return { id, name, image, price, handle, source: 'shopify-composio' }
}
