'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  markAsRead as markAsReadAction,
  markAllAsRead as markAllAsReadAction,
  type NotificationRow,
} from '@/lib/actions/notifications'

const POLL_INTERVAL = 30_000

/**
 * Hook to fetch notifications with polling.
 * Polls every 30s for new notifications. Pauses when the tab is inactive.
 */
export function useNotifications(limit = 50) {
  const queryClient = useQueryClient()

  const query = useQuery<NotificationRow[]>({
    queryKey: ['notifications', limit],
    queryFn: async () => {
      const result = await getNotifications(limit)
      if (result.error) throw new Error(result.error)
      return result.notifications
    },
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
  })

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await markAsReadAction(notificationId)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const result = await markAllAsReadAction()
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    isMarkingRead: markAsRead.isPending,
    isMarkingAllRead: markAllAsRead.isPending,
  }
}

/**
 * Hook to get just the unread notification count.
 * Derived from the notifications list to avoid a separate polling query.
 */
export function useUnreadNotificationCount() {
  const { notifications } = useNotifications()
  return { count: notifications.filter((n) => !n.read).length }
}
