import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import SuppliersClient from '@/components/suppliers/suppliers-client'

export default async function SuppliersPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeTeamId = await getActiveTeamId(supabase, user.id)
  if (!activeTeamId) redirect('/dashboard')

  const { data: store } = await supabase
    .from('stores')
    .select('id, name')
    .eq('team_id', activeTeamId)
    .single()

  if (!store) redirect('/dashboard')

  return <SuppliersClient storeId={store.id} storeName={store.name} />
}
