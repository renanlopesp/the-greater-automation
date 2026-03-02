'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/actions/notifications'

interface NotificationPrefs {
  emailEnabled: boolean
  failuresEnabled: boolean
  digestEnabled: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailEnabled: true,
  failuresEnabled: true,
  digestEnabled: true,
}

/**
 * Hook to manage notification preferences with optimistic updates.
 */
export function useNotificationPreferences() {
  const queryClient = useQueryClient()

  const query = useQuery<NotificationPrefs>({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const result = await getNotificationPreferences()
      if (result.error) throw new Error(result.error)
      if (!result.preferences) return DEFAULT_PREFS
      return {
        emailEnabled: result.preferences.email_enabled,
        failuresEnabled: result.preferences.failures_enabled,
        digestEnabled: result.preferences.digest_enabled,
      }
    },
    staleTime: 5 * 60_000,
  })

  const updatePrefs = useMutation({
    mutationFn: async (prefs: Partial<NotificationPrefs>) => {
      const result = await updateNotificationPreferences(prefs)
      if (result.error) throw new Error(result.error)
    },
    onMutate: async (newPrefs) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['notification-preferences'] })
      const prev = queryClient.getQueryData<NotificationPrefs>(['notification-preferences'])
      queryClient.setQueryData<NotificationPrefs>(['notification-preferences'], (old) => ({
        ...(old ?? DEFAULT_PREFS),
        ...newPrefs,
      }))
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['notification-preferences'], context.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })

  return {
    preferences: query.data ?? DEFAULT_PREFS,
    isLoading: query.isLoading,
    error: query.error,
    updatePreference: (key: keyof NotificationPrefs, value: boolean) => {
      updatePrefs.mutate({ [key]: value })
    },
    isUpdating: updatePrefs.isPending,
  }
}
