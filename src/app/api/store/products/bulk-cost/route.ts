import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

const BulkCostSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        cost_price: z.number().nonnegative(),
      })
    )
    .min(1)
    .max(500),
})

export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawBody = await request.json().catch(() => null)
  if (!rawBody) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const parsed = BulkCostSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: Object.keys(parsed.error.flatten().fieldErrors) },
      { status: 400 }
    )
  }
  const body = parsed.data

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

  // Apply updates in parallel batches (avoid N+1 sequential writes)
  let updated = 0
  let errors = 0
  const BATCH_SIZE = 50
  for (let i = 0; i < body.updates.length; i += BATCH_SIZE) {
    const batch = body.updates.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map((update) =>
        supabase
          .from('store_products')
          .update({ cost_price: update.cost_price })
          .eq('id', update.id)
      )
    )
    for (const { error } of results) {
      if (error) errors++
      else updated++
    }
  }

  return NextResponse.json({ success: true, updated, errors })
}
