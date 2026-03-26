import { useQuery } from '@tanstack/react-query'
import type { TeamMember, TeamInvitation, PlanData } from '@/types/navigation'

export interface SettingsData {
  usage: {
    stepsUsed: number
    stepsLimit: number
    aiCreditsUsed: number
    aiCreditsLimit: number
  } | null
  planData: PlanData | null
  members: TeamMember[]
  invitations: TeamInvitation[]
  currentUserRole: 'owner' | 'admin' | 'member'
  storeData: {
    id: string
    name: string
    segment: string
    platform: string | null
    platform_store_id: string | null
    last_sync_at: string | null
    settings: Record<string, unknown> | null
  } | null
}

async function fetchSettingsData(): Promise<SettingsData> {
  const res = await fetch('/api/settings-data')
  if (!res.ok) throw new Error('Failed to fetch settings data')
  return res.json()
}

export function useSettingsData(enabled: boolean) {
  return useQuery({
    queryKey: ['settings-data'],
    queryFn: fetchSettingsData,
    enabled,
    staleTime: 60_000,
  })
}
