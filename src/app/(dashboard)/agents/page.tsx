import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import DiscoverClient from '@/components/discover/discover-client'
import type { Agent, AgentCategory } from '@/data/agents'

export default async function AgentsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const teamId = await getActiveTeamId(supabase, user.id)

  if (!teamId) {
    return <DiscoverClient />
  }

  const { data: rows } = await supabase
    .from('agents')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true })

  if (!rows || rows.length === 0) {
    return (
      <div className="bg-background h-full overflow-y-auto">
        <div className="mx-auto flex min-h-[60vh] max-w-5xl flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <p className="text-foreground text-2xl font-semibold tracking-tight">
            Nenhum co-worker ainda
          </p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Adicione seu primeiro co-worker para começar a automatizar tarefas com agentes de IA.
          </p>
          <Link
            href="/agents/new"
            className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Adicionar co-worker
          </Link>
        </div>
      </div>
    )
  }

  const agents: Agent[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: 'Productivity' as AgentCategory,
    description: row.description ?? '',
    detailedDescription: row.description ?? '',
    tools: [],
    tags: [],
  }))

  return <DiscoverClient agents={agents} />
}
