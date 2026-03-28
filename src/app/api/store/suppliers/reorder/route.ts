import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!member) return NextResponse.json({ error: 'No team' }, { status: 400 })

  const serviceClient = createServiceRoleClient()
  const { data: store } = await serviceClient
    .from('stores')
    .select('id')
    .eq('team_id', member.team_id)
    .single()
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { searchParams } = request.nextUrl
  const urgencyFilter = searchParams.get('urgency') || 'all'
  const supplierIdFilter = searchParams.get('supplier_id')
  const days = parseInt(searchParams.get('days') || '30')

  // Fetch links with supplier info
  let linksQuery = serviceClient
    .from('store_product_suppliers')
    .select(
      'id, product_id, supplier_id, cost_price, is_preferred, store_id, last_order_at, last_order_qty'
    )
    .eq('store_id', store.id)

  if (supplierIdFilter) linksQuery = linksQuery.eq('supplier_id', supplierIdFilter)

  const { data: links } = await linksQuery

  if (!links?.length) {
    return NextResponse.json({
      summary: { total_products: 0, critical: 0, warning: 0, healthy: 0, no_supplier: 0 },
      items: [],
      no_supplier: [],
    })
  }

  // Fetch all related data in parallel
  const productIds = [...new Set(links.map((l) => l.product_id))]
  const supplierIds = [...new Set(links.map((l) => l.supplier_id))]

  const [productsResult, suppliersResult, ordersResult, allProductsResult] = await Promise.all([
    serviceClient
      .from('store_products')
      .select('id, name, price, stock_quantity, cost_price')
      .in('id', productIds),
    serviceClient
      .from('store_suppliers')
      .select('id, name, lead_time_days, min_order_value, is_active')
      .in('id', supplierIds),
    serviceClient
      .from('store_orders')
      .select('items')
      .eq('store_id', store.id)
      .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
      .order('created_at', { ascending: false })
      .limit(500),
    // Get all products with stock to find ones without suppliers
    serviceClient
      .from('store_products')
      .select('id, name, stock_quantity')
      .eq('store_id', store.id)
      .eq('is_published', true),
  ])

  const productsMap = new Map((productsResult.data ?? []).map((p) => [p.id, p]))
  const suppliersMap = new Map((suppliersResult.data ?? []).map((s) => [s.id, s]))

  // Calculate sales velocity per product from orders
  const salesByProductId: Record<string, number> = {}
  for (const order of ordersResult.data ?? []) {
    const items = order.items as Array<{ product_id?: string; quantity?: number }> | null
    if (!items) continue
    for (const item of items) {
      if (item.product_id) {
        const pid = String(item.product_id)
        salesByProductId[pid] = (salesByProductId[pid] || 0) + (Number(item.quantity) || 1)
      }
    }
  }
  const avgDailyDivisor = Math.max(days, 1)

  // Build preferred supplier map (product_id -> best link)
  const preferredLinks = new Map<string, (typeof links)[number]>()
  for (const link of links) {
    const existing = preferredLinks.get(link.product_id)
    if (!existing || link.is_preferred) {
      preferredLinks.set(link.product_id, link)
    }
  }

  // Count suppliers per product for has_other_suppliers
  const supplierCountByProduct: Record<string, number> = {}
  for (const link of links) {
    supplierCountByProduct[link.product_id] = (supplierCountByProduct[link.product_id] || 0) + 1
  }

  // Build reorder items
  type ReorderItem = {
    product: { id: string; name: string; stock_quantity: number; price: number | null }
    supplier: { id: string; name: string; lead_time_days: number; min_order_value: number | null }
    link_id: string
    cost_price: number | null
    metrics: {
      avg_daily_sales: number
      days_of_stock: number
      reorder_point: number
      suggested_qty: number
      suggested_value: number
    }
    urgency: 'critical' | 'warning' | 'healthy'
    order_by_date: string
    has_other_suppliers: boolean
  }

  const items: ReorderItem[] = []
  const processedProductIds = new Set<string>()

  for (const [productId, link] of preferredLinks) {
    const product = productsMap.get(productId)
    const supplier = suppliersMap.get(link.supplier_id)
    if (!product || !supplier || !supplier.is_active) continue

    processedProductIds.add(productId)

    // Match sales by store_products.id — orders may use external_id or product name
    const totalSales = salesByProductId[productId] || 0
    const avgDailySales = totalSales / avgDailyDivisor
    const daysOfStock = avgDailySales > 0 ? product.stock_quantity / avgDailySales : 999
    const reorderPoint = Math.ceil(avgDailySales * supplier.lead_time_days * 1.2)
    const suggestedQty = Math.max(Math.ceil(avgDailySales * 30), 1)
    const costUnit = link.cost_price ?? product.cost_price ?? product.price ?? 0
    const suggestedValue = suggestedQty * costUnit

    let urgency: 'critical' | 'warning' | 'healthy' = 'healthy'
    if (daysOfStock <= supplier.lead_time_days) {
      urgency = 'critical'
    } else if (daysOfStock <= supplier.lead_time_days * 2) {
      urgency = 'warning'
    }

    const orderByDate = new Date(
      Date.now() + Math.max(0, daysOfStock - supplier.lead_time_days) * 86400000
    )
      .toISOString()
      .split('T')[0]

    items.push({
      product: {
        id: product.id,
        name: product.name,
        stock_quantity: product.stock_quantity,
        price: product.price,
      },
      supplier: {
        id: supplier.id,
        name: supplier.name,
        lead_time_days: supplier.lead_time_days,
        min_order_value: supplier.min_order_value,
      },
      link_id: link.id,
      cost_price: link.cost_price,
      metrics: {
        avg_daily_sales: Math.round(avgDailySales * 100) / 100,
        days_of_stock: Math.round(daysOfStock),
        reorder_point: reorderPoint,
        suggested_qty: suggestedQty,
        suggested_value: Math.round(suggestedValue * 100) / 100,
      },
      urgency,
      order_by_date: orderByDate,
      has_other_suppliers: (supplierCountByProduct[productId] || 0) > 1,
    })
  }

  // Sort by urgency (critical first, then warning, then healthy), then by days_of_stock
  const urgencyOrder = { critical: 0, warning: 1, healthy: 2 }
  items.sort((a, b) => {
    const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    if (diff !== 0) return diff
    return a.metrics.days_of_stock - b.metrics.days_of_stock
  })

  // Filter by urgency if requested
  const filteredItems =
    urgencyFilter === 'all' ? items : items.filter((i) => i.urgency === urgencyFilter)

  // Find products without any supplier
  const linkedProductIds = new Set(links.map((l) => l.product_id))
  const noSupplier = (allProductsResult.data ?? [])
    .filter((p) => !linkedProductIds.has(p.id))
    .slice(0, 20)
    .map((p) => {
      const totalSales = salesByProductId[p.id] || 0
      const avgDailySales = totalSales / avgDailyDivisor
      const daysOfStock = avgDailySales > 0 ? p.stock_quantity / avgDailySales : 999
      return {
        product_id: p.id,
        product_name: p.name,
        stock_quantity: p.stock_quantity,
        avg_daily_sales: Math.round(avgDailySales * 100) / 100,
        days_of_stock: Math.round(daysOfStock),
      }
    })
    .sort((a, b) => a.days_of_stock - b.days_of_stock)

  const summary = {
    total_products: processedProductIds.size,
    critical: items.filter((i) => i.urgency === 'critical').length,
    warning: items.filter((i) => i.urgency === 'warning').length,
    healthy: items.filter((i) => i.urgency === 'healthy').length,
    no_supplier: noSupplier.length,
  }

  return NextResponse.json({ summary, items: filteredItems, no_supplier: noSupplier })
}
