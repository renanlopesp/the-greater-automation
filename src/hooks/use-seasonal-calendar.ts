'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { loadCalendar, loadTeamCampaigns } from '@/lib/actions/seasonal-calendar'
import type { PersonalizedCalendar } from '@/lib/ai/seasonal-campaign-generator'
import type { FullCampaign } from '@/data/campaign-data'

export function useSeasonalCalendar() {
  const queryClient = useQueryClient()

  const { data: calendar, isLoading: isLoadingCalendar } = useQuery<PersonalizedCalendar | null>({
    queryKey: ['seasonal-calendar'],
    queryFn: () => loadCalendar() as Promise<PersonalizedCalendar | null>,
    staleTime: 5 * 60 * 1000,
  })

  const { data: campaigns, isLoading: isLoadingCampaigns } = useQuery<Record<string, FullCampaign>>(
    {
      queryKey: ['seasonal-campaigns'],
      queryFn: () => loadTeamCampaigns(),
      staleTime: 5 * 60 * 1000,
    }
  )

  const generateCalendarMutation = useMutation({
    mutationFn: async (year?: number) => {
      const res = await fetch('/api/skills/seasonal-calendar/generate-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonal-calendar'] })
    },
  })

  const generateCampaignMutation = useMutation({
    mutationFn: async ({ dateId, dateName }: { dateId: string; dateName: string }) => {
      const res = await fetch('/api/skills/seasonal-calendar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateId, dateName }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonal-campaigns'] })
    },
  })

  const regenerateSectionMutation = useMutation({
    mutationFn: async ({ dateId, sectionType }: { dateId: string; sectionType: string }) => {
      const res = await fetch('/api/skills/seasonal-calendar/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateId, sectionType }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonal-campaigns'] })
    },
  })

  return {
    calendar: calendar ?? null,
    campaigns: campaigns ?? {},
    isLoadingCalendar,
    isLoadingCampaigns,
    generateCalendar: generateCalendarMutation,
    generateCampaign: generateCampaignMutation,
    regenerateSection: regenerateSectionMutation,
    isGeneratingCalendar: generateCalendarMutation.isPending,
    isGeneratingCampaign: generateCampaignMutation.isPending,
    isRegenerating: regenerateSectionMutation.isPending,
  }
}
