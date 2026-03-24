import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

export type SkillRow = {
  id: string
  team_id: string
  slug: string
  name: string
  description: string | null
  category: string
  phase: number
  system_prompt: string | null
  tools: unknown
  knowledge: unknown
  input_schema: unknown
  output_schema: unknown
  dependencies: string[]
  status: string
  is_native: boolean
  requires_connections: string[]
  icon: string | null
  color: string | null
  emoji: string | null
  stats: unknown
  what_it_does: unknown
  expected_results: string[]
  config_schema: unknown
  connected_skills: unknown
  outputs: unknown
  created_at: string
  updated_at: string
}

export type SkillExecutionRow = {
  id: string
  skill_id: string
  team_id: string
  conversation_id: string | null
  input: unknown
  output: unknown
  status: string
  error_message: string | null
  duration_ms: number | null
  triggered_by: string
  parent_execution_id: string | null
  created_at: string
  completed_at: string | null
}

/** Fetch all skills for a team */
export async function fetchTeamSkills(supabase: Client, teamId: string): Promise<SkillRow[]> {
  try {
    const { data, error } = await (
      supabase as unknown as {
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
      console.error('[fetchTeamSkills] error:', JSON.stringify(error))
      return []
    }
    return data ?? []
  } catch (e) {
    console.error('[fetchTeamSkills] catch:', e)
    return []
  }
}

/** Fetch a single skill by slug */
export async function fetchSkillBySlug(
  supabase: Client,
  teamId: string,
  slug: string
): Promise<SkillRow | null> {
  const { data, error } = await (
    supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (
            k: string,
            v: string
          ) => {
            eq: (
              k: string,
              v: string
            ) => {
              single: () => Promise<{ data: SkillRow | null; error: unknown }>
            }
          }
        }
      }
    }
  )
    .from('skills')
    .select('*')
    .eq('team_id', teamId)
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}

/** Fetch recent executions for a skill */
export async function fetchSkillExecutions(
  supabase: Client,
  skillId: string,
  limit = 20
): Promise<SkillExecutionRow[]> {
  const { data, error } = await (
    supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (
            k: string,
            v: string
          ) => {
            order: (
              k: string,
              o: { ascending: boolean }
            ) => {
              limit: (n: number) => Promise<{ data: SkillExecutionRow[] | null; error: unknown }>
            }
          }
        }
      }
    }
  )
    .from('skill_executions')
    .select('*')
    .eq('skill_id', skillId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

/** Fetch active skills for a team (for orchestrator system prompt) */
export async function fetchActiveSkills(supabase: Client, teamId: string): Promise<SkillRow[]> {
  try {
    const { data, error } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (
              k: string,
              v: string
            ) => {
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
      }
    )
      .from('skills')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('name', { ascending: true })

    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}
