'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import {
  getNotifications,
  getUnreadCount,
  markAsRead as markAsReadAction,
  markAllAsRead as markAllAsReadAction,
  type NotificationRow,
} from '@/lib/actions/notifications'

/**
 * Hook to fetch notifications with Supabase Realtime updates.
 * Automatically refetches when new notifications arrive via Realtime.
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
    staleTime: 30_000,
  })

  // Subscribe to Realtime for new notifications
  useEffect(() => {
    const supabase = createBrowserClient()

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          // Invalidate both notifications list and unread count
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await markAsReadAction(notificationId)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const result = await markAllAsReadAction()
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
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
 * Lightweight — only fetches count, not full notification list.
 */
export function useUnreadNotificationCount() {
  const query = useQuery<number>({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const result = await getUnreadCount()
      if (result.error) throw new Error(result.error)
      return result.count
    },
    staleTime: 30_000,
  })

  return {
    count: query.data ?? 0,
    isLoading: query.isLoading,
  }
}
