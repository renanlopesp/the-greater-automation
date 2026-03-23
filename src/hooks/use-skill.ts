'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchSkillBySlug, fetchSkillExecutions } from '@/lib/queries/skills'

export function useSkill(teamId: string | undefined, slug: string) {
  const skillQuery = useQuery({
    queryKey: ['skill', teamId, slug],
    queryFn: async () => {
      const supabase = createBrowserClient()
      return fetchSkillBySlug(supabase, teamId!, slug)
    },
    enabled: !!teamId && !!slug,
  })

  const executionsQuery = useQuery({
    queryKey: ['skill-executions', skillQuery.data?.id],
    queryFn: async () => {
      const supabase = createBrowserClient()
      return fetchSkillExecutions(supabase, skillQuery.data!.id, 20)
    },
    enabled: !!skillQuery.data?.id,
  })

  return {
    skill: skillQuery.data ?? null,
    isLoading: skillQuery.isLoading,
    executions: executionsQuery.data ?? [],
    executionsLoading: executionsQuery.isLoading,
  }
}
