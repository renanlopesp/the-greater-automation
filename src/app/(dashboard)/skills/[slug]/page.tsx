import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { fetchSkillBySlug, fetchSkillExecutions } from '@/lib/queries/skills'
import SkillDetail from '@/components/skills/skill-detail'

interface SkillDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function SkillDetailPage({ params }: SkillDetailPageProps) {
  const { slug } = await params
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

  const skill = await fetchSkillBySlug(supabase, teamId, slug)
  if (!skill) notFound()

  const executions = await fetchSkillExecutions(supabase, skill.id, 10)

  return <SkillDetail teamId={teamId} skill={skill} executions={executions} />
}
