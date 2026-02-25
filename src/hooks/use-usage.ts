'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

interface UsageData {
  stepsUsed: number
  stepsLimit: number
  aiCreditsUsed: number
  aiCreditsLimit: number
}

/**
 * Hook that subscribes to real-time usage updates via Supabase Realtime.
 * Falls back to initial server-rendered data until the first client fetch.
 */
export function useUsage(teamId: string | undefined, initial: UsageData): UsageData {
  const [usage, setUsage] = useState<UsageData>(initial)

  useEffect(() => {
    if (!teamId) return

    const supabase = createBrowserClient()

    async function fetchUsage() {
      const now = new Date().toISOString()
      const { data } = await supabase
        .from('usage')
        .select('steps_used, steps_limit, ai_credits_used, ai_credits_limit')
        .eq('team_id', teamId!)
        .lte('period_start', now)
        .gte('period_end', now)
        .order('period_start', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setUsage({
          stepsUsed: data.steps_used,
          stepsLimit: data.steps_limit,
          aiCreditsUsed: Number(data.ai_credits_used),
          aiCreditsLimit: Number(data.ai_credits_limit),
        })
      }
    }

    // Subscribe to realtime updates on the usage table for this team
    // Skip initial fetch — server-rendered `initial` data is already fresh
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
          fetchUsage()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, initial])

  return usage
}
