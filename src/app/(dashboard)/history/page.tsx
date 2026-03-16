import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import HistoryClient from '@/components/history/history-client'

export default async function HistoryPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: conversations } = await supabase
    .from('agent_conversations')
    .select('id, title, is_active, created_at, updated_at, agent_id, agents(name, palette)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  return <HistoryClient conversations={conversations ?? []} />
}
