'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import type { OrchestratorNotification } from '@/components/notifications/notification-item'
import {
  markAsRead as markAsReadAction,
  markAllAsRead as markAllAsReadAction,
  type NotificationRow,
} from '@/lib/actions/notifications'

export type { NotificationRow }

const POLL_INTERVAL = 30_000

async function fetchOrchestratorNotifications(): Promise<OrchestratorNotification[]> {
  const res = await fetch('/api/notifications')
  if (!res.ok) return []
  return res.json()
}

async function patchNotificationRead(id: string, is_read: boolean): Promise<void> {
  await fetch(`/api/notifications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_read }),
  })
}

/**
 * Hook for orchestrator notifications (urgency-based, agent-generated).
 * Fetches from /api/notifications with polling + Supabase Realtime for INSERT events.
 */
export function useNotifications(limit = 50) {
  const queryClient = useQueryClient()
  const supabase = createBrowserClient()

  const query = useQuery<OrchestratorNotification[]>({
    queryKey: ['notifications', 'orchestrator', limit],
    queryFn: fetchOrchestratorNotifications,
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
  })

  // Supabase Realtime: invalidate on new notifications
  useEffect(() => {
    const channel = supabase
      .channel('notifications-insert')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'orchestrator'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient])

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await patchNotificationRead(notificationId, true)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'orchestrator'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      const result = await markAllAsReadAction()
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'orchestrator'] })
    },
  })

  const notifications = query.data ?? []
  const unreadCount = notifications.filter((n) => !n.is_read).length
  const hasUrgent = notifications.some((n) => !n.is_read && n.urgency === 'urgent')

  return {
    notifications,
    unreadCount,
    hasUrgent,
    markRead: markRead.mutate,
    markAllRead: markAllRead.mutate,
    // Legacy aliases for backward compatibility
    markAsRead: markRead.mutate,
    markAllAsRead: markAllRead.mutate,
    isMarkingRead: markRead.isPending,
    isMarkingAllRead: markAllRead.isPending,
    isLoading: query.isLoading,
    error: query.error,
  }
}

/**
 * Hook to get just the unread notification count.
 * Derived from the notifications list to avoid a separate polling query.
 */
export function useUnreadNotificationCount() {
  const { unreadCount } = useNotifications()
  return { count: unreadCount }
}
