'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { skills as skillRegistry } from '@/data/skills'

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
