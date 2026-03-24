import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import AskBarNew from '@/components/home/ask-bar-new'
import QuickSuggestions from '@/components/home/quick-suggestions'
import ActivityFeed from '@/components/home/activity-feed'
import ActiveSkillsRow from '@/components/home/active-skills-row'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">
          Nenhuma equipe encontrada. Entre em contato com o suporte.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto flex max-w-[720px] flex-col gap-12 px-6 py-12">
        <div>
          <AskBarNew />
          <QuickSuggestions />
        </div>
        <ActivityFeed />
        <ActiveSkillsRow />
      </div>
    </div>
  )
}
