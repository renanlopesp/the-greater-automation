'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

interface PresenceUser {
  id: string
  fullName: string | null
  avatarUrl: string | null
}

export function useAgentPresence(agentId: string, currentUser: PresenceUser) {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    const supabase = createBrowserClient()
    const channel = supabase.channel(`presence:agent:${agentId}`, {
      config: { presence: { key: currentUser.id } },
    })

    function syncPresence() {
      const state = channel.presenceState()
      const users: PresenceUser[] = []
      const seen = new Set<string>()
      for (const key of Object.keys(state)) {
        for (const p of state[key]) {
          const payload = p as unknown as Record<string, unknown>
          const id = payload.id as string | undefined
          if (id && !seen.has(id) && id !== currentUser.id) {
            seen.add(id)
            users.push({
              id,
              fullName: (payload.fullName as string) ?? null,
              avatarUrl: (payload.avatarUrl as string) ?? null,
            })
          }
        }
      }
      setActiveUsers(users)
    }

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: currentUser.id,
            fullName: currentUser.fullName,
            avatarUrl: currentUser.avatarUrl,
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [agentId, currentUser.id, currentUser.fullName, currentUser.avatarUrl])

  return { activeUsers }
}
