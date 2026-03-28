import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { safeDbError } from '@/lib/safe-error'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { cost_price?: number }
  if (body.cost_price == null || typeof body.cost_price !== 'number' || body.cost_price < 0) {
    return NextResponse.json({ error: 'Invalid cost_price' }, { status: 400 })
  }

  // Verify user has access to the product's store via team membership
  const { data: product } = await supabase
    .from('store_products')
    .select('id, store_id')
    .eq('id', id)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const { data: store } = await supabase
    .from('stores')
    .select('team_id')
    .eq('id', product.store_id)
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

  const { error } = await supabase
    .from('store_products')
    .update({ cost_price: body.cost_price })
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: safeDbError('store/products/[id]', error, 'Failed to update product') },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
