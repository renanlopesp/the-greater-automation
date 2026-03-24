import { redirect } from 'next/navigation'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { type SkillRow } from '@/lib/queries/skills'
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

  const serviceClient = createServiceRoleClient()
  let skills: SkillRow[] = []
  try {
    const { data, error } = await (
      serviceClient as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (
              k: string,
              v: string
            ) => {
              order: (
                k: string,
                o: { ascending: boolean }
              ) => Promise<{ data: SkillRow[] | null; error: unknown }>
            }
          }
        }
      }
    )
      .from('skills')
      .select('*')
      .eq('team_id', teamId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Skills query error:', error)
    }
    skills = (data ?? []) as SkillRow[]
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
        status: 'available',
        is_native: s.isNative ?? false,
        requires_connections: s.requiredConnections,
        icon: s.icon,
        color: s.color,
        emoji: null,
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

  return <SkillLibrary teamId={teamId} initialSkills={skills} />
}
