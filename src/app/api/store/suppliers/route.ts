import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { safeDbError } from '@/lib/safe-error'

const createSchema = z.object({
  name: z.string().min(2).max(200),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional().or(z.literal('')),
  lead_time_days: z.number().int().min(1).max(365),
  min_order_value: z.number().min(0).optional(),
  payment_terms: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

async function getStoreForUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 } as const

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) return { error: 'No team', status: 400 } as const

  const serviceClient = createServiceRoleClient()
  const { data: store } = await serviceClient
    .from('stores')
    .select('id')
    .eq('team_id', teamId)
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
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || 'active'
  const sort = searchParams.get('sort') || 'name'
  const order = searchParams.get('order') || 'asc'

  let query = serviceClient
    .from('store_suppliers')
    .select(
      'id, name, contact_email, contact_phone, lead_time_days, min_order_value, payment_terms, notes, is_active, store_id, created_at, updated_at'
    )
    .eq('store_id', store.id)

  if (status === 'active') query = query.eq('is_active', true)
  else if (status === 'inactive') query = query.eq('is_active', false)

  if (search) {
    const safeSearch = search.replace(/[%_]/g, '\\$&')
    query = query.ilike('name', `%${safeSearch}%`)
  }

  const sortCol =
    sort === 'lead_time' ? 'lead_time_days' : sort === 'created' ? 'created_at' : 'name'
  query = query.order(sortCol, { ascending: order === 'asc' })

  const { data: suppliers, error } = await query
  if (error)
    return NextResponse.json(
      { error: safeDbError('store/suppliers GET', error, 'Failed to load suppliers') },
      { status: 500 }
    )

  // Get product counts per supplier
  const supplierIds = (suppliers ?? []).map((s) => s.id)
  let productCounts: Record<string, number> = {}
  if (supplierIds.length > 0) {
    const { data: links } = await serviceClient
      .from('store_product_suppliers')
      .select('supplier_id')
      .in('supplier_id', supplierIds)
    if (links) {
      productCounts = links.reduce(
        (acc, l) => {
          acc[l.supplier_id] = (acc[l.supplier_id] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )
    }
  }

  const enriched = (suppliers ?? []).map((s) => ({
    ...s,
    product_count: productCounts[s.id] || 0,
  }))

  return NextResponse.json({ suppliers: enriched })
}

export async function POST(request: NextRequest) {
  const result = await getStoreForUser()
  if ('error' in result)
    return NextResponse.json({ error: result.error }, { status: result.status })
  const { store, serviceClient } = result

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { data: existing } = await serviceClient
    .from('store_suppliers')
    .select('id')
    .eq('store_id', store.id)
    .ilike('name', parsed.data.name)
    .limit(1)
    .single()
  if (existing) {
    return NextResponse.json({ error: 'Supplier with this name already exists' }, { status: 409 })
  }

  const { data: supplier, error } = await serviceClient
    .from('store_suppliers')
    .insert({
      store_id: store.id,
      name: parsed.data.name,
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone || null,
      lead_time_days: parsed.data.lead_time_days,
      min_order_value: parsed.data.min_order_value ?? null,
      payment_terms: parsed.data.payment_terms || null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single()

  if (error)
    return NextResponse.json(
      { error: safeDbError('store/suppliers POST', error, 'Failed to create supplier') },
      { status: 500 }
    )

  return NextResponse.json(supplier, { status: 201 })
}
