import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import SkillLibraryNew from '@/components/skills/skill-library-new'

export default async function SkillsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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

  return <SkillLibraryNew teamId={teamId} />
}
