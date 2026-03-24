'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'

interface SkillEntry {
  slug: string
  name: string
  emoji: string
}

export function useActiveSkillsForSidebar() {
  const supabase = createBrowserClient()

  const query = useQuery<SkillEntry[]>({
    queryKey: ['active-skills-sidebar'],
    queryFn: async () => {
      try {
        const { data } = await (
          supabase as unknown as {
            from: (t: string) => {
              select: (s: string) => {
                eq: (
                  k: string,
                  v: string
                ) => {
                  order: (k: string) => Promise<{ data: SkillEntry[] | null }>
                }
              }
            }
          }
        )
          .from('skills')
          .select('slug, name, emoji')
          .eq('status', 'active')
          .order('name')
        return data ?? []
      } catch {
        return []
      }
    },
  })

  return {
    skills: query.data ?? [],
    isLoading: query.isLoading,
  }
}
