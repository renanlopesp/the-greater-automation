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
  const search = searchParams.get('search') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  let query = serviceClient
    .from('store_products')
    .select('id, name, price, cost_price, stock_quantity')
    .eq('store_id', store.id)
    .eq('is_published', true)

  if (search) query = query.ilike('name', `%${search}%`)

  const { data: products, error } = await query.order('name').limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ products: products ?? [] })
}
