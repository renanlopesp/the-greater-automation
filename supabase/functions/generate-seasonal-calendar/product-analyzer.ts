// Deno-compatible product analyzer — ported from src/lib/nuvemshop/product-analyzer.ts
// Approach (b): accepts pre-fetched products + optional order rows; no SupabaseClient needed.

import type { NuvemProduct } from '../_shared/nuvemshop.ts'

// ---------------------------------------------------------------------------
// Extended product shape (superset of the shared NuvemProduct)
// The shared type is minimal; real API responses include these extra fields.
// ---------------------------------------------------------------------------

export interface NuvemProductFull extends NuvemProduct {
  published?: boolean
  created_at?: string
  categories?: Array<{ name: { pt?: string } | string | Record<string, string> }>
  images?: Array<{ src: string }>
  variants?: Array<{
    price?: string
    stock?: number
    cost?: string
  }>
  description?: { pt?: string } | string | Record<string, string>
}

export interface OrderLineItem {
  product_id: number | null
  quantity: string
}

export interface NuvemOrderRaw {
  products: OrderLineItem[]
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface EnrichedProduct {
  product_id: string
  name: string
  price: number
  image_url: string | undefined
  category: string | undefined
  description: string | undefined
  cost_price: number | undefined
  stock_quantity: number
  sales_count: number
  margin_pct: number | undefined
  frequently_bought_with: string[]
  suggested_tag: string | undefined
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractProductName(name: NuvemProductFull['name']): string {
  if (typeof name === 'object' && name !== null) {
    const obj = name as Record<string, string>
    return obj['pt'] ?? Object.values(obj)[0] ?? ''
  }
  return String(name ?? '')
}

function extractLocalized(
  val: { pt?: string } | string | Record<string, string> | undefined
): string | undefined {
  if (val == null) return undefined
  if (typeof val === 'string') return val || undefined
  const obj = val as Record<string, string>
  return obj['pt'] ?? Object.values(obj)[0] ?? undefined
}

/** Count how many times each product_id appears in order line items. */
function computeSalesCount(orders: NuvemOrderRaw[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const order of orders) {
    for (const item of order.products) {
      if (item.product_id == null) continue
      const qty = parseInt(item.quantity, 10) || 1
      counts.set(item.product_id, (counts.get(item.product_id) ?? 0) + qty)
    }
  }
  return counts
}

/** Calculate margin % for products that have cost data in their variants. */
function computeMargins(products: NuvemProductFull[]): Map<number, number> {
  const margins = new Map<number, number>()
  for (const product of products) {
    const variant = product.variants?.[0]
    if (!variant?.price) continue
    const price = Number(variant.price)
    const cost = variant.cost
    if (cost == null || cost === '' || cost === '0.00') continue
    const costNum = Number(cost)
    if (costNum > 0 && price > 0) {
      margins.set(product.id, ((price - costNum) / price) * 100)
    }
  }
  return margins
}

/** Find products frequently bought together (co-occurrence in orders). */
function computeCoOccurrence(orders: NuvemOrderRaw[]): Map<number, number[]> {
  const coMap = new Map<number, Map<number, number>>()

  for (const order of orders) {
    const productIds = [
      ...new Set(
        order.products.map((item) => item.product_id).filter((id): id is number => id != null)
      ),
    ]

    for (const pid of productIds) {
      if (!coMap.has(pid)) coMap.set(pid, new Map())
      const pairCounts = coMap.get(pid)!
      for (const otherId of productIds) {
        if (otherId === pid) continue
        pairCounts.set(otherId, (pairCounts.get(otherId) ?? 0) + 1)
      }
    }
  }

  const result = new Map<number, number[]>()
  for (const [pid, pairCounts] of coMap) {
    const sorted = [...pairCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id)
    result.set(pid, sorted)
  }

  return result
}

/** Suggest a tag based on real data. */
function suggestTag(
  salesCount: number,
  marginPct: number | undefined,
  stock: number,
  avgSales: number,
  isRecent: boolean,
  coOccurrenceCount: number
): string | undefined {
  if (avgSales > 0 && salesCount >= avgSales * 2) return 'best-seller'
  if (marginPct != null && marginPct > 50) return 'alta-margem'
  if (stock > 0 && stock < 10) return 'liberar-estoque'
  if (isRecent) return 'lancamento'
  if (coOccurrenceCount >= 3) return 'cross-sell'
  return undefined
}

// ---------------------------------------------------------------------------
// Main: analyzeProducts
// ---------------------------------------------------------------------------

/**
 * Analyze store products with sales, margin, and stock data.
 * Returns enriched products sorted by relevance (best-sellers first), capped at 50.
 *
 * @param rawProducts  Products from Nuvemshop /products endpoint
 * @param orders       Recent paid orders (pass [] to skip sales analysis)
 */
export function analyzeProducts(
  rawProducts: NuvemProductFull[],
  orders: NuvemOrderRaw[]
): EnrichedProduct[] {
  const salesCounts = computeSalesCount(orders)
  const margins = computeMargins(rawProducts)
  const coOccurrence = computeCoOccurrence(orders)

  const allSales = [...salesCounts.values()]
  const avgSales = allSales.length > 0 ? allSales.reduce((a, b) => a + b, 0) / allSales.length : 0

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const enriched: EnrichedProduct[] = rawProducts
    .filter((p) => p.published !== false)
    .map((product) => {
      const productId = product.id
      const name = extractProductName(product.name)
      const variant = product.variants?.[0]
      const price = variant?.price ? Number(variant.price) : 0
      const imageUrl = product.images?.[0]?.src ?? undefined

      const rawCategory = product.categories?.[0]?.name
      const category = rawCategory ? extractLocalized(rawCategory) : undefined

      const rawDesc = product.description
      const desc = rawDesc ? extractLocalized(rawDesc) : undefined
      const description = desc ? desc.replace(/<[^>]*>/g, '').slice(0, 120) : undefined

      const totalStock = (product.variants ?? []).reduce((sum, v) => sum + (v.stock ?? 0), 0)
      const salesCount = salesCounts.get(productId) ?? 0
      const marginPct = margins.get(productId)
      const costPrice = variant?.cost ? Number(variant.cost) : undefined
      const isRecent = product.created_at ? new Date(product.created_at) > thirtyDaysAgo : false

      const coProducts = coOccurrence.get(productId) ?? []
      const tag = suggestTag(
        salesCount,
        marginPct,
        totalStock,
        avgSales,
        isRecent,
        coProducts.length
      )

      return {
        product_id: String(productId),
        name,
        price,
        image_url: imageUrl,
        category,
        description,
        cost_price: costPrice && costPrice > 0 ? costPrice : undefined,
        stock_quantity: totalStock,
        sales_count: salesCount,
        margin_pct: marginPct != null ? Math.round(marginPct * 10) / 10 : undefined,
        frequently_bought_with: coProducts.map(String),
        suggested_tag: tag,
      }
    })

  enriched.sort((a, b) => {
    if (b.sales_count !== a.sales_count) return b.sales_count - a.sales_count
    const mA = a.margin_pct ?? -1
    const mB = b.margin_pct ?? -1
    if (mB !== mA) return mB - mA
    return a.stock_quantity - b.stock_quantity
  })

  console.log(
    `[product-analyzer] ${enriched.length} products enriched from ${orders.length} orders`
  )

  return enriched.slice(0, 50)
}
