import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { safeDbError } from '@/lib/safe-error'

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) return NextResponse.json({ error: 'No team' }, { status: 400 })

  const serviceClient = createServiceRoleClient()
  const { data: store } = await serviceClient
    .from('stores')
    .select('id')
    .eq('team_id', teamId)
    .single()
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  let query = serviceClient
    .from('store_products')
    .select('id, name, price, cost_price, stock_quantity')
    .eq('store_id', store.id)
    .eq('is_published', true)

  if (search) {
    const safeSearch = search.replace(/[%_]/g, '\\$&')
    query = query.ilike('name', `%${safeSearch}%`)
  }

  const { data: products, error } = await query.order('name').limit(limit)
  if (error)
    return NextResponse.json(
      { error: safeDbError('store/products', error, 'Failed to load products') },
      { status: 500 }
    )

  return NextResponse.json({ products: products ?? [] })
}
