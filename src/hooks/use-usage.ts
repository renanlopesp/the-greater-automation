'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'

interface UsageData {
  stepsUsed: number
  stepsLimit: number
  aiCreditsUsed: number
  aiCreditsLimit: number
}

async function fetchUsage(teamId: string): Promise<UsageData | null> {
  const supabase = createBrowserClient()
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('usage')
    .select('steps_used, steps_limit, ai_credits_used, ai_credits_limit')
    .eq('team_id', teamId)
    .lte('period_start', now)
    .gte('period_end', now)
    .order('period_start', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null
  return {
    stepsUsed: data.steps_used,
    stepsLimit: data.steps_limit,
    aiCreditsUsed: Number(data.ai_credits_used),
    aiCreditsLimit: Number(data.ai_credits_limit),
  }
}

/**
 * Hook that subscribes to real-time usage updates via Supabase Realtime.
 * Uses React Query with initialData from server-rendered props.
 */
export function useUsage(teamId: string | undefined, initial: UsageData): UsageData {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['usage', teamId],
    queryFn: () => fetchUsage(teamId!),
    enabled: !!teamId,
    initialData: initial,
    staleTime: 60_000,
  })

  // Realtime subscription — invalidates query on usage changes
  useEffect(() => {
    if (!teamId) return

    const supabase = createBrowserClient()
    const channel = supabase
      .channel(`usage-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'usage',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['usage', teamId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, queryClient])

  return data ?? initial
}
