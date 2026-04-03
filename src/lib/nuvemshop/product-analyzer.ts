import type { NuvemshopClient } from './client'
import type { NuvemshopProduct, NuvemshopOrder } from './types'

// ---------------------------------------------------------------------------
// Types
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

function extractProductName(name: NuvemshopProduct['name']): string {
  if (typeof name === 'object') {
    return (
      (name as Record<string, string>).pt ?? Object.values(name as Record<string, string>)[0] ?? ''
    )
  }
  return String(name)
}

/** Paginated fetch of paid orders from the last N days. Max 1000 orders. */
async function fetchRecentOrders(
  client: NuvemshopClient,
  days: number = 90
): Promise<NuvemshopOrder[]> {
  const minDate = new Date()
  minDate.setDate(minDate.getDate() - days)
  const created_at_min = minDate.toISOString()
  const created_at_max = new Date().toISOString()

  const allOrders: NuvemshopOrder[] = []
  let page = 1
  const maxPages = 3 // 3 pages × 200 = 600 orders max (enough for tag accuracy)

  while (page <= maxPages) {
    const orders = await client.getOrders(page, 200, {
      created_at_min,
      created_at_max,
      payment_status: 'paid',
    })
    allOrders.push(...orders)
    if (orders.length < 200) break
    page++
  }

  return allOrders
}

/** Count how many times each product_id appears in order line items. */
function computeSalesCount(orders: NuvemshopOrder[]): Map<number, number> {
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
function computeMargins(products: NuvemshopProduct[]): Map<number, number> {
  const margins = new Map<number, number>()
  for (const product of products) {
    const variant = product.variants[0]
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
function computeCoOccurrence(orders: NuvemshopOrder[]): Map<number, number[]> {
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

  // Extract top 3 co-purchased products per product
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
  // Top 20% by sales → best-seller
  if (avgSales > 0 && salesCount >= avgSales * 2) return 'best-seller'
  // High margin → alta-margem
  if (marginPct != null && marginPct > 50) return 'alta-margem'
  // Low stock → liberar-estoque
  if (stock > 0 && stock < 10) return 'liberar-estoque'
  // Recent product (created in last 30 days) → lancamento
  if (isRecent) return 'lancamento'
  // Frequently bought with other products → cross-sell
  if (coOccurrenceCount >= 3) return 'cross-sell'
  return undefined
}

// ---------------------------------------------------------------------------
// Main: analyzeProducts
// ---------------------------------------------------------------------------

/**
 * Analyze store products with real sales, margin, and stock data.
 * Returns enriched products sorted by relevance (best-sellers first).
 * Timeout/fallback: returns basic products if analysis fails.
 */
export async function analyzeProducts(client: NuvemshopClient): Promise<EnrichedProduct[]> {
  const startTime = Date.now()

  // Fetch products and orders in parallel
  const [rawProducts, orders] = await Promise.all([
    client.getProducts(1, 200),
    fetchRecentOrders(client, 90),
  ])

  const salesCounts = computeSalesCount(orders)
  const margins = computeMargins(rawProducts)
  const coOccurrence = computeCoOccurrence(orders)

  // Calculate average sales for tag thresholds
  const allSales = [...salesCounts.values()]
  const avgSales = allSales.length > 0 ? allSales.reduce((a, b) => a + b, 0) / allSales.length : 0

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const enriched: EnrichedProduct[] = rawProducts
    .filter((p) => p.published)
    .map((product) => {
      const productId = product.id
      const name = extractProductName(product.name)
      const variant = product.variants[0]
      const price = variant?.price ? Number(variant.price) : 0
      const imageUrl = product.images[0]?.src ?? undefined
      const category = product.categories[0]?.name
        ? ((product.categories[0].name as Record<string, string>).pt ??
          Object.values(product.categories[0].name as Record<string, string>)[0])
        : undefined
      const desc = product.description
        ? ((product.description as Record<string, string>).pt ??
          Object.values(product.description as Record<string, string>)[0] ??
          undefined)
        : undefined
      // Strip HTML tags and truncate description
      const description = desc ? desc.replace(/<[^>]*>/g, '').slice(0, 120) : undefined
      const totalStock = product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
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

  // Sort by relevance: best-sellers first, then margin, then stock
  enriched.sort((a, b) => {
    // Primary: sales count (descending)
    if (b.sales_count !== a.sales_count) return b.sales_count - a.sales_count
    // Secondary: margin (descending, undefined last)
    const mA = a.margin_pct ?? -1
    const mB = b.margin_pct ?? -1
    if (mB !== mA) return mB - mA
    // Tertiary: stock (ascending — low stock = more urgent)
    return a.stock_quantity - b.stock_quantity
  })

  const durationMs = Date.now() - startTime
  console.log(
    `[product-analyzer] ${enriched.length} products, ${orders.length} orders, ${durationMs}ms`
  )

  // Limit to top 50 to avoid overwhelming AI context
  return enriched.slice(0, 50)
}

/**
 * Safe wrapper: returns enriched products or falls back to basic product list.
 */
export async function analyzeProductsSafe(client: NuvemshopClient): Promise<EnrichedProduct[]> {
  try {
    const result = await Promise.race([
      analyzeProducts(client),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 45_000)),
    ])
    if (result) return result
    console.warn('[product-analyzer] Timed out after 45s, falling back to basic products')
  } catch (err) {
    console.error('[product-analyzer] Analysis failed, falling back:', err)
  }

  // Fallback: basic product list without enrichment
  try {
    const products = await client.getProducts(1, 200)
    return products
      .filter((p) => p.published)
      .slice(0, 50)
      .map((p) => ({
        product_id: String(p.id),
        name: extractProductName(p.name),
        price: p.variants[0]?.price ? Number(p.variants[0].price) : 0,
        image_url: p.images[0]?.src ?? undefined,
        category: p.categories[0]?.name
          ? ((p.categories[0].name as Record<string, string>).pt ??
            Object.values(p.categories[0].name as Record<string, string>)[0])
          : undefined,
        description: p.description
          ? (
              (p.description as Record<string, string>).pt ??
              Object.values(p.description as Record<string, string>)[0] ??
              ''
            )
              .replace(/<[^>]*>/g, '')
              .slice(0, 120) || undefined
          : undefined,
        cost_price: undefined,
        stock_quantity: p.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0),
        sales_count: 0,
        margin_pct: undefined,
        frequently_bought_with: [],
        suggested_tag: undefined,
      }))
  } catch {
    return []
  }
}
