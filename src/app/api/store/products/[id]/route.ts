import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { safeDbError } from '@/lib/safe-error'

const ProductPatchSchema = z.object({
  cost_price: z.number().nonnegative(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawBody = await request.json().catch(() => null)
  if (!rawBody) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const parsed = ProductPatchSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: Object.keys(parsed.error.flatten().fieldErrors) },
      { status: 400 }
    )
  }
  const body = parsed.data

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
