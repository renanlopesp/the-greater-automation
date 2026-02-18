'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

interface PresenceUser {
  id: string
  fullName: string | null
  avatarUrl: string | null
}

/**
 * Creates an external presence store for a given agent channel.
 * Side effects (channel creation, WebSocket subscription) are deferred
 * to the first `subscribe` call — keeping the factory itself pure.
 *
 * Cleanup uses a grace period (100ms) so that React Strict Mode's rapid
 * subscribe → unsubscribe → subscribe cycle doesn't kill the WebSocket
 * before it can connect. The Supabase browser client is a singleton, so
 * tearing down the Realtime connection too early leaves it in a dead state.
 */
function createPresenceStore(agentId: string, currentUser: PresenceUser) {
  let users: PresenceUser[] = []
  const listeners = new Set<() => void>()
  let initialized = false
  let cleanup: (() => void) | null = null
  let cleanupTimer: ReturnType<typeof setTimeout> | null = null

  function init() {
    if (initialized) return
    initialized = true

    const supabase = createBrowserClient()
    const channel = supabase.channel(`presence:agent:${agentId}`, {
      config: { presence: { key: currentUser.id } },
    })

    function syncPresence() {
      const state = channel.presenceState()
      const next: PresenceUser[] = []
      const seen = new Set<string>()
      for (const key of Object.keys(state)) {
        for (const p of state[key]) {
          const payload = p as unknown as Record<string, unknown>
          const id = payload.id as string | undefined
          if (id && !seen.has(id) && id !== currentUser.id) {
            seen.add(id)
            next.push({
              id,
              fullName: (payload.fullName as string) ?? null,
              avatarUrl: (payload.avatarUrl as string) ?? null,
            })
          }
        }
      }
      users = next
      listeners.forEach((l) => l())
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
          syncPresence()
        }
      })

    cleanup = () => {
      supabase.removeChannel(channel)
      initialized = false
      cleanup = null
    }
  }

  return {
    subscribe(listener: () => void) {
      // Cancel any pending teardown (Strict Mode re-subscribe)
      if (cleanupTimer) {
        clearTimeout(cleanupTimer)
        cleanupTimer = null
      }
      init()
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          // Grace period: allow Strict Mode to re-subscribe before tearing down
          cleanupTimer = setTimeout(() => {
            cleanupTimer = null
            cleanup?.()
          }, 200)
        }
      }
    },
    getSnapshot() {
      return users
    },
  }
}

const emptyUsers: PresenceUser[] = []

export function useAgentPresence(agentId: string, currentUser: PresenceUser) {
  const store = useMemo(
    () => createPresenceStore(agentId, currentUser),
    // Recreate store when agent or user changes (client-side navigation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentId, currentUser.id]
  )

  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store])
  const getSnapshot = useCallback(() => store.getSnapshot(), [store])

  const activeUsers = useSyncExternalStore(subscribe, getSnapshot, () => emptyUsers)

  return { activeUsers }
}
