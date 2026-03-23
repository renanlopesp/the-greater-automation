import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { fetchTeamSkills, type SkillRow } from '@/lib/queries/skills'
import { skills as skillRegistry } from '@/data/skills'
import SkillLibrary from '@/components/skills/skill-library'

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

  let skills = await fetchTeamSkills(supabase, teamId)

  // If DB returned nothing (table may not exist yet), fall back to static registry
  if (skills.length === 0) {
    const now = new Date().toISOString()
    skills = skillRegistry.map(
      (s): SkillRow => ({
        id: s.slug,
        team_id: teamId,
        slug: s.slug,
        name: s.name,
        description: s.description,
        category: s.category,
        phase: s.phase,
        system_prompt: s.detailedDescription,
        tools: [],
        knowledge: [],
        input_schema: null,
        output_schema: null,
        dependencies: s.dependencies,
        status: 'available',
        is_native: s.isNative ?? false,
        requires_connections: s.requiredConnections,
        icon: s.icon,
        color: s.color,
        created_at: now,
        updated_at: now,
      })
    )
  }

  return <SkillLibrary teamId={teamId} initialSkills={skills} />
}
