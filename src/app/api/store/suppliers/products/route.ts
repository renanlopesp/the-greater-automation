import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'

const createLinkSchema = z.object({
  supplier_id: z.string().uuid(),
  product_id: z.string().uuid(),
  cost_price: z.number().min(0).optional(),
  is_preferred: z.boolean().optional().default(false),
})

const updateLinkSchema = z.object({
  id: z.string().uuid(),
  cost_price: z.number().min(0).nullable().optional(),
  is_preferred: z.boolean().optional(),
  last_order_at: z.string().optional(),
  last_order_qty: z.number().int().min(1).optional(),
})

const deleteLinkSchema = z.object({
  id: z.string().uuid(),
})

async function getStoreForUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 } as const

  const { data: member } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!member) return { error: 'No team', status: 400 } as const

  const serviceClient = createServiceRoleClient()
  const { data: store } = await serviceClient
    .from('stores')
    .select('id')
    .eq('team_id', member.team_id)
    .single()
  if (!store) return { error: 'No store', status: 404 } as const

  return { store, serviceClient } as const
}

export async function GET(request: NextRequest) {
  const result = await getStoreForUser()
  if ('error' in result)
    return NextResponse.json({ error: result.error }, { status: result.status })
  const { store, serviceClient } = result

  const { searchParams } = request.nextUrl
  const supplierId = searchParams.get('supplier_id')
  const productId = searchParams.get('product_id')

  let query = serviceClient.from('store_product_suppliers').select('*').eq('store_id', store.id)

  if (supplierId) query = query.eq('supplier_id', supplierId)
  if (productId) query = query.eq('product_id', productId)

  const { data: links, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with supplier and product names
  const supplierIds = [...new Set((links ?? []).map((l) => l.supplier_id))]
  const productIds = [...new Set((links ?? []).map((l) => l.product_id))]

  const [suppliersResult, productsResult] = await Promise.all([
    supplierIds.length > 0
      ? serviceClient
          .from('store_suppliers')
          .select('id, name, lead_time_days, min_order_value')
          .in('id', supplierIds)
      : { data: [] },
    productIds.length > 0
      ? serviceClient
          .from('store_products')
          .select('id, name, price, stock_quantity')
          .in('id', productIds)
      : { data: [] },
  ])

  const suppliersMap = new Map((suppliersResult.data ?? []).map((s) => [s.id, s]))
  const productsMap = new Map((productsResult.data ?? []).map((p) => [p.id, p]))

  const enriched = (links ?? []).map((l) => ({
    ...l,
    supplier: suppliersMap.get(l.supplier_id) ?? null,
    product: productsMap.get(l.product_id) ?? null,
  }))

  return NextResponse.json({ links: enriched })
}

export async function POST(request: NextRequest) {
  const result = await getStoreForUser()
  if ('error' in result)
    return NextResponse.json({ error: result.error }, { status: result.status })
  const { store, serviceClient } = result

  const body = await request.json()
  const parsed = createLinkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  // Upsert: if link exists, update cost_price and is_preferred
  const { data: existing } = await serviceClient
    .from('store_product_suppliers')
    .select('id')
    .eq('supplier_id', parsed.data.supplier_id)
    .eq('product_id', parsed.data.product_id)
    .limit(1)
    .single()

  if (existing) {
    const { data: updated, error } = await serviceClient
      .from('store_product_suppliers')
      .update({
        cost_price: parsed.data.cost_price ?? null,
        is_preferred: parsed.data.is_preferred,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If setting as preferred, unset others for the same product
    if (parsed.data.is_preferred) {
      await serviceClient
        .from('store_product_suppliers')
        .update({ is_preferred: false })
        .eq('product_id', parsed.data.product_id)
        .eq('store_id', store.id)
        .neq('id', existing.id)
    }

    return NextResponse.json(updated, { status: 200 })
  }

  const { data: link, error } = await serviceClient
    .from('store_product_suppliers')
    .insert({
      store_id: store.id,
      supplier_id: parsed.data.supplier_id,
      product_id: parsed.data.product_id,
      cost_price: parsed.data.cost_price ?? null,
      is_preferred: parsed.data.is_preferred,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If setting as preferred, unset others for the same product
  if (parsed.data.is_preferred && link) {
    await serviceClient
      .from('store_product_suppliers')
      .update({ is_preferred: false })
      .eq('product_id', parsed.data.product_id)
      .eq('store_id', store.id)
      .neq('id', link.id)
  }

  return NextResponse.json(link, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const result = await getStoreForUser()
  if ('error' in result)
    return NextResponse.json({ error: result.error }, { status: result.status })
  const { store, serviceClient } = result

  const body = await request.json()
  const parsed = updateLinkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { id, ...updateData } = parsed.data
  const { data: link, error } = await serviceClient
    .from('store_product_suppliers')
    .update(updateData)
    .eq('id', id)
    .eq('store_id', store.id)
    .select()
    .single()

  if (error || !link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }

  // If setting as preferred, unset others for the same product
  if (parsed.data.is_preferred) {
    await serviceClient
      .from('store_product_suppliers')
      .update({ is_preferred: false })
      .eq('product_id', link.product_id)
      .eq('store_id', store.id)
      .neq('id', link.id)
  }

  return NextResponse.json(link)
}

export async function DELETE(request: NextRequest) {
  const result = await getStoreForUser()
  if ('error' in result)
    return NextResponse.json({ error: result.error }, { status: result.status })
  const { store, serviceClient } = result

  const body = await request.json()
  const parsed = deleteLinkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { error } = await serviceClient
    .from('store_product_suppliers')
    .delete()
    .eq('id', parsed.data.id)
    .eq('store_id', store.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
