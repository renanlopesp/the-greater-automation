import { useQuery } from '@tanstack/react-query'
import type { UserData } from '@/types/navigation'

export interface ShellData {
  user: UserData
  team: { id: string; name: string; slug: string } | null
  userTeams: { id: string; name: string; role: string }[]
  language: string | null
  redirect?: string
}

async function fetchShellData(): Promise<ShellData> {
  const res = await fetch('/api/shell-data')
  if (!res.ok) throw new Error('Failed to fetch shell data')
  return res.json()
}

export function useShellData() {
  return useQuery({
    queryKey: ['shell-data'],
    queryFn: fetchShellData,
    staleTime: 5 * 60_000, // 5 minutes — shell data rarely changes
    gcTime: 10 * 60_000,
  })
}
