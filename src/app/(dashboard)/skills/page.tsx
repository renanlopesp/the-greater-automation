import { redirect } from 'next/navigation'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { type SkillRow } from '@/lib/queries/skills'
import { skills as skillRegistry } from '@/data/skills'
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

  const serviceClient = createServiceRoleClient()
  let skills: SkillRow[] = []
  try {
    const { data, error } = await (
      serviceClient as unknown as {
        rpc: (
          fn: string,
          params: Record<string, unknown>
        ) => Promise<{ data: unknown; error: unknown }>
      }
    ).rpc('get_team_skills', {
      p_team_id: teamId,
    })

    if (error) {
      console.error('Skills RPC error:', error)
    }
    skills = ((data as unknown) ?? []) as SkillRow[]
  } catch (e) {
    console.error('Skills query catch:', e)
  }

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
        status: s.active ? 'active' : 'available',
        is_native: s.isNative ?? false,
        requires_connections: s.requiredConnections,
        icon: s.icon,
        color: s.color,
        emoji: s.emoji,
        stats: [],
        what_it_does: [],
        expected_results: [],
        config_schema: null,
        connected_skills: [],
        outputs: [],
        created_at: now,
        updated_at: now,
      })
    )
  }

  return <SkillLibraryNew teamId={teamId} initialSkills={skills} />
}
