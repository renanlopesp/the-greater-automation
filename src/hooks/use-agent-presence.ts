'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface PresenceUser {
  id: string
  fullName: string | null
  avatarUrl: string | null
}

function extractUsers(channel: RealtimeChannel, currentUserId: string): PresenceUser[] {
  const state = channel.presenceState<PresenceUser>()
  const users: PresenceUser[] = []
  const seen = new Set<string>()
  for (const key of Object.keys(state)) {
    for (const presence of state[key]) {
      if (!seen.has(presence.id) && presence.id !== currentUserId) {
        seen.add(presence.id)
        users.push({
          id: presence.id,
          fullName: presence.fullName,
          avatarUrl: presence.avatarUrl,
        })
      }
    }
  }
  return users
}

export function useAgentPresence(agentId: string, currentUser: PresenceUser) {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  const syncState = useCallback(() => {
    if (!channelRef.current) return
    setActiveUsers(extractUsers(channelRef.current, currentUser.id))
  }, [currentUser.id])

  useEffect(() => {
    const supabase = createBrowserClient()
    const channel = supabase.channel(`presence:agent:${agentId}`, {
      config: { presence: { key: currentUser.id } },
    })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, syncState)
      .on('presence', { event: 'join' }, syncState)
      .on('presence', { event: 'leave' }, syncState)
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
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [agentId, currentUser.id, currentUser.fullName, currentUser.avatarUrl, syncState])

  return { activeUsers }
}
