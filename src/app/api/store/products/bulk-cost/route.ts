import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    updates?: Array<{ id: string; cost_price: number }>
  }

  if (!body.updates || !Array.isArray(body.updates) || body.updates.length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  if (body.updates.length > 500) {
    return NextResponse.json({ error: 'Max 500 updates per request' }, { status: 400 })
  }

  // Validate all entries
  for (const update of body.updates) {
    if (!update.id || typeof update.cost_price !== 'number' || update.cost_price < 0) {
      return NextResponse.json(
        { error: `Invalid entry: ${JSON.stringify(update)}` },
        { status: 400 }
      )
    }
  }

  // Verify user has access to these products via team membership
  const productIds = body.updates.map((u) => u.id)
  const { data: products } = await supabase
    .from('store_products')
    .select('id, store_id')
    .in('id', productIds)

  if (!products || products.length === 0) {
    return NextResponse.json({ error: 'No products found' }, { status: 404 })
  }

  // All products should belong to the same store
  const storeIds = [...new Set(products.map((p) => p.store_id))]
  if (storeIds.length !== 1) {
    return NextResponse.json({ error: 'Products must belong to the same store' }, { status: 400 })
  }

  const { data: store } = await supabase
    .from('stores')
    .select('team_id')
    .eq('id', storeIds[0])
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', store.team_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Apply updates
  let updated = 0
  let errors = 0
  for (const update of body.updates) {
    const { error } = await supabase
      .from('store_products')
      .update({ cost_price: update.cost_price })
      .eq('id', update.id)

    if (error) errors++
    else updated++
  }

  return NextResponse.json({ success: true, updated, errors })
}
