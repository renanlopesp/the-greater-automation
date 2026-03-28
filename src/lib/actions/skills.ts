'use server'

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { skills as skillRegistry } from '@/data/skills'
import type { SkillRow } from '@/lib/queries/skills'

/** Fetch all skills for the current user's team, with static fallback */
export async function fetchSkillsAction(): Promise<SkillRow[]> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) return []

  const serviceClient = createServiceRoleClient()

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
    .select(
      'id, team_id, slug, name, description, category, phase, system_prompt, tools, knowledge, input_schema, output_schema, dependencies, status, is_native, requires_connections, icon, color, emoji, stats, what_it_does, expected_results, config_schema, connected_skills, outputs, created_at, updated_at'
    )
    .eq('team_id', teamId)
    .order('name', { ascending: true })

  if (error) {
    console.error('[fetchSkillsAction] error:', JSON.stringify(error))
  }

  return (data ?? []) as SkillRow[]
}

/** Resolve teamId from session — used by all mutating server actions */
async function getAuthenticatedTeamId(): Promise<string> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) throw new Error('No team found')

  return teamId
}

/** Activate a skill for the current user's team (available → active) */
export async function activateSkill(slug: string): Promise<void> {
  const teamId = await getAuthenticatedTeamId()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any

  const { error } = await supabase
    .from('skills')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .eq('slug', slug)

  if (error) throw error
}

/** Deactivate a skill for the current user's team (active → available) */
export async function deactivateSkill(slug: string): Promise<void> {
  const teamId = await getAuthenticatedTeamId()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any

  const { error } = await supabase
    .from('skills')
    .update({ status: 'available', updated_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .eq('slug', slug)

  if (error) throw error
}

/** Update skill configuration for the current user's team */
export async function updateSkillConfig(
  slug: string,
  config: Record<string, unknown>
): Promise<void> {
  const teamId = await getAuthenticatedTeamId()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any

  await supabase
    .from('skills')
    .update({ config_schema: config, updated_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .eq('slug', slug)
}

/** Seed the Seasonal Calendar as the first real skill for the current user's team */
export async function seedSeasonalCalendar(): Promise<void> {
  const teamId = await getAuthenticatedTeamId()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any

  const now = new Date().toISOString()
  const { error } = await supabase.from('skills').upsert(
    {
      team_id: teamId,
      slug: 'seasonal-calendar',
      name: 'Seasonal Calendar',
      description: 'Mapeia 30+ datas priorizadas por potencial de receita histórico',
      category: 'marketing-campanhas',
      phase: 1,
      icon: '📅',
      color: 'hsl(38 92% 40%)',
      emoji: '📅',
      dependencies: [],
      status: 'active',
      is_native: true,
      requires_connections: [],
      system_prompt: null,
      tools: [],
      knowledge: [],
      input_schema: null,
      output_schema: null,
      config_schema: null,
      connected_skills: [],
      outputs: [],
      stats: [],
      what_it_does: [],
      expected_results: [],
      created_at: now,
      updated_at: now,
    },
    { onConflict: 'team_id,slug' }
  )

  if (error) throw error
}

/** Seed skills from code registry for the current user's team */
export async function seedTeamSkills(): Promise<void> {
  const teamId = await getAuthenticatedTeamId()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any

  const rows = skillRegistry.map((skill) => ({
    team_id: teamId,
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    phase: skill.phase,
    icon: skill.icon,
    color: skill.color,
    dependencies: skill.dependencies,
    status: 'available',
    is_native: skill.isNative ?? false,
    requires_connections: skill.requiredConnections,
  }))

  const { error } = await supabase
    .from('skills')
    .upsert(rows, { onConflict: 'team_id,slug', ignoreDuplicates: true })

  if (error) throw error
}
