export interface CatalogSummary {
  totalProducts: number
  categoryBreakdown: Array<{ category: string; count: number; percentage: number }>
  priceStats: { min: number; max: number; avg: number; median: number }
  topProducts: Array<{ name: string; description: string; price: number; category: string }>
  hasDescriptions: boolean
}

type ProductInput = {
  name: string
  description: string | null
  price: number | null
  category: string | null
}

/**
 * Takes an array of store products and produces a compact summary for LLM input (~4000 tokens max).
 *
 * Edge cases:
 * - 0 products → returns empty summary with totalProducts=0
 * - Products without prices → excluded from price stats
 * - >5000 products → samples 100 (top 50 by price + random 50)
 */
export function summarizeCatalog(products: ProductInput[]): CatalogSummary {
  if (products.length === 0) {
    return {
      totalProducts: 0,
      categoryBreakdown: [],
      priceStats: { min: 0, max: 0, avg: 0, median: 0 },
      topProducts: [],
      hasDescriptions: false,
    }
  }

  // Sample if too large
  let workingSet = products
  if (products.length > 5000) {
    const sorted = [...products].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    const top50 = sorted.slice(0, 50)
    const rest = sorted.slice(50)
    const random50: ProductInput[] = []
    const indices = new Set<number>()
    while (indices.size < Math.min(50, rest.length)) {
      indices.add(Math.floor(Math.random() * rest.length))
    }
    for (const i of indices) random50.push(rest[i])
    workingSet = [...top50, ...random50]
  }

  // Category breakdown
  const categoryMap = new Map<string, number>()
  for (const p of workingSet) {
    const cat = p.category ?? 'Sem categoria'
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1)
  }
  const total = workingSet.length
  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / total) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count)

  // Price stats (exclude nulls)
  const prices = workingSet.map((p) => p.price).filter((p): p is number => p !== null)
  let priceStats = { min: 0, max: 0, avg: 0, median: 0 }
  if (prices.length > 0) {
    const sorted = [...prices].sort((a, b) => a - b)
    const sum = sorted.reduce((acc, v) => acc + v, 0)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    priceStats = {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round((sum / sorted.length) * 100) / 100,
      median: Math.round(median * 100) / 100,
    }
  }

  // Top 20 products by price desc
  const topProducts = [...workingSet]
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    .slice(0, 20)
    .map((p) => ({
      name: p.name,
      description: p.description ? p.description.slice(0, 100) : '',
      price: p.price ?? 0,
      category: p.category ?? 'Sem categoria',
    }))

  // Check if descriptions exist
  const hasDescriptions = workingSet.some(
    (p) => p.description !== null && p.description.trim().length > 0
  )

  return {
    totalProducts: products.length,
    categoryBreakdown,
    priceStats,
    topProducts,
    hasDescriptions,
  }
}

/**
 * Formats a CatalogSummary as a readable text block for the LLM prompt.
 */
export function formatCatalogForLLM(summary: CatalogSummary): string {
  if (summary.totalProducts === 0) {
    return 'Catálogo: sem produtos cadastrados.'
  }

  const lines: string[] = []

  lines.push(`=== RESUMO DO CATÁLOGO ===`)
  lines.push(`Total de produtos: ${summary.totalProducts}`)
  lines.push(`Descrições disponíveis: ${summary.hasDescriptions ? 'Sim' : 'Não'}`)
  lines.push('')

  lines.push(`--- CATEGORIAS ---`)
  for (const cat of summary.categoryBreakdown) {
    lines.push(`${cat.category}: ${cat.count} produtos (${cat.percentage}%)`)
  }
  lines.push('')

  lines.push(`--- PREÇOS ---`)
  lines.push(`Mínimo: R$ ${summary.priceStats.min.toFixed(2)}`)
  lines.push(`Máximo: R$ ${summary.priceStats.max.toFixed(2)}`)
  lines.push(`Média: R$ ${summary.priceStats.avg.toFixed(2)}`)
  lines.push(`Mediana: R$ ${summary.priceStats.median.toFixed(2)}`)
  lines.push('')

  lines.push(`--- TOP 20 PRODUTOS (por preço) ---`)
  for (const p of summary.topProducts) {
    const desc = p.description ? ` — ${p.description}` : ''
    lines.push(`• [${p.category}] ${p.name} — R$ ${p.price.toFixed(2)}${desc}`)
  }

  return lines.join('\n')
}
