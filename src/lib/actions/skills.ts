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
    .select('*')
    .eq('team_id', teamId)
    .order('name', { ascending: true })

  if (error) {
    console.error('[fetchSkillsAction] error:', JSON.stringify(error))
  }

  return (data ?? []) as SkillRow[]
}

/** Activate a skill for a team (available → active) */
export async function activateSkill(teamId: string, slug: string): Promise<void> {
  const supabase = createServiceRoleClient()

  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        update: (d: unknown) => {
          eq: (
            k: string,
            v: string
          ) => {
            eq: (k: string, v: string) => Promise<{ error: unknown }>
          }
        }
      }
    }
  )
    .from('skills')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .eq('slug', slug)

  if (error) throw error
}

/** Deactivate a skill for a team (active → available) */
export async function deactivateSkill(teamId: string, slug: string): Promise<void> {
  const supabase = createServiceRoleClient()

  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        update: (d: unknown) => {
          eq: (
            k: string,
            v: string
          ) => {
            eq: (k: string, v: string) => Promise<{ error: unknown }>
          }
        }
      }
    }
  )
    .from('skills')
    .update({ status: 'available', updated_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .eq('slug', slug)

  if (error) throw error
}

/** Update skill configuration for a team */
export async function updateSkillConfig(
  teamId: string,
  slug: string,
  config: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceRoleClient()

  await (
    supabase as unknown as {
      from: (t: string) => {
        update: (d: unknown) => {
          eq: (
            k: string,
            v: string
          ) => {
            eq: (k: string, v: string) => Promise<{ error: unknown }>
          }
        }
      }
    }
  )
    .from('skills')
    .update({ config_schema: config, updated_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .eq('slug', slug)
}

/** Seed the Seasonal Calendar as the first real skill for a team */
export async function seedSeasonalCalendar(teamId: string): Promise<void> {
  const supabase = createServiceRoleClient()

  const now = new Date().toISOString()
  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        upsert: (d: unknown, o: { onConflict: string }) => Promise<{ error: unknown }>
      }
    }
  )
    .from('skills')
    .upsert(
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

/** Seed skills from code registry for a team (called on team creation or migration) */
export async function seedTeamSkills(teamId: string): Promise<void> {
  const supabase = createServiceRoleClient()

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

  // Upsert to avoid conflicts on re-seed
  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        upsert: (
          d: unknown,
          o: { onConflict: string; ignoreDuplicates: boolean }
        ) => Promise<{ error: unknown }>
      }
    }
  )
    .from('skills')
    .upsert(rows, { onConflict: 'team_id,slug', ignoreDuplicates: true })

  if (error) throw error
}
