import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import ProductsClient from '@/components/products/products-client'

export default async function ProductsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user's active team (respects workspace switcher cookie)
  const activeTeamId = await getActiveTeamId(supabase, user.id)
  if (!activeTeamId) redirect('/dashboard')

  // Get store + orchestrator in parallel
  const [{ data: store }, { data: orchestrator }] = await Promise.all([
    supabase.from('stores').select('id, name').eq('team_id', activeTeamId).single(),
    supabase
      .from('agents')
      .select('id')
      .eq('team_id', activeTeamId)
      .eq('is_orchestrator', true)
      .limit(1)
      .single(),
  ])

  if (!store) redirect('/dashboard')

  // Get products with cost data
  const { data: products } = await supabase
    .from('store_products')
    .select('id, name, sku, price, cost_price, stock_quantity, is_published, images')
    .eq('store_id', store.id)
    .eq('is_published', true)
    .order('name')

  return (
    <ProductsClient
      products={products ?? []}
      storeId={store.id}
      storeName={store.name}
      chatAgentId={orchestrator?.id ?? null}
    />
  )
}
