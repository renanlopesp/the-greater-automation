'use server'

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import type { FullCampaign } from '@/data/campaign-data'

async function getAuthContext() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceClient = createServiceRoleClient() as any
  return { user, teamId, serviceClient }
}

/** Get the seasonal-calendar skill id for a team. */
export async function getSkillId(teamId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceClient = createServiceRoleClient() as any

  const { data } = await serviceClient
    .from('skills')
    .select('id')
    .eq('slug', 'seasonal-calendar')
    .eq('team_id', teamId)
    .limit(1)
    .single()

  return (data as { id: string } | null)?.id ?? null
}

/** Load the most recent completed calendar execution for a given year. */
export async function loadCalendar(year?: number): Promise<unknown | null> {
  const ctx = await getAuthContext()
  if (!ctx) return null

  const { teamId, serviceClient } = ctx
  const targetYear = (year ?? new Date().getFullYear()).toString()

  const { data } = await serviceClient
    .from('skill_executions')
    .select('output, input')
    .eq('team_id', teamId)
    .eq('status', 'completed')
    .filter('input->>type', 'eq', 'calendar')
    .filter('input->>year', 'eq', targetYear)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!data || (data as unknown[]).length === 0) return null
  return (data as Array<{ output: unknown }>)[0].output ?? null
}

/** Load all completed campaign executions for a team, keyed by dateId. */
export async function loadTeamCampaigns(): Promise<Record<string, FullCampaign>> {
  const ctx = await getAuthContext()
  if (!ctx) return {}

  const { teamId, serviceClient } = ctx

  const { data } = await serviceClient
    .from('skill_executions')
    .select('output, input')
    .eq('team_id', teamId)
    .eq('status', 'completed')
    .filter('input->>type', 'eq', 'campaign')
    .order('created_at', { ascending: false })

  if (!data) return {}

  const result: Record<string, FullCampaign> = {}
  for (const row of data as Array<{ output: unknown; input: Record<string, string> }>) {
    const dateId = row.input?.dateId
    if (dateId && row.output) {
      result[dateId] = row.output as FullCampaign
    }
  }
  return result
}

/** Load a single completed campaign execution by dateId. */
export async function loadCampaign(dateId: string): Promise<FullCampaign | null> {
  const ctx = await getAuthContext()
  if (!ctx) return null

  const { teamId, serviceClient } = ctx

  const { data } = await serviceClient
    .from('skill_executions')
    .select('output, input')
    .eq('team_id', teamId)
    .eq('status', 'completed')
    .filter('input->>type', 'eq', 'campaign')
    .filter('input->>dateId', 'eq', dateId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!data || (data as unknown[]).length === 0) return null
  return ((data as Array<{ output: unknown }>)[0].output as FullCampaign) ?? null
}
