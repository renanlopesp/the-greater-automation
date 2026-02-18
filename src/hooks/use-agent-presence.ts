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

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>()
        const users: PresenceUser[] = []
        const seen = new Set<string>()
        for (const key of Object.keys(state)) {
          for (const presence of state[key]) {
            if (!seen.has(presence.id) && presence.id !== currentUser.id) {
              seen.add(presence.id)
              users.push({
                id: presence.id,
                fullName: presence.fullName,
                avatarUrl: presence.avatarUrl,
              })
            }
          }
        }
        setActiveUsers(users)
      })
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
