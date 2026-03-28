'use server'

import { createServerClient } from '@/lib/supabase/server'
import { safeDbError } from '@/lib/safe-error'

// Types
export type NotificationType =
  | 'workflow_published'
  | 'workflow_unpublished'
  | 'workflow_run_completed'
  | 'workflow_run_failed'
  | 'workflow_run_approval_required'
  | 'general'

export interface NotificationRow {
  id: string
  user_id: string
  team_id: string
  workflow_id: string | null
  type: NotificationType
  title: string
  message: string | null
  read: boolean
  created_at: string
}

export interface NotificationPreferencesRow {
  id: string
  user_id: string
  email_enabled: boolean
  failures_enabled: boolean
  digest_enabled: boolean
  created_at: string
  updated_at: string
}

// ─── Notifications CRUD ─────────────────────────────────────────────

export async function getNotifications(limit = 50): Promise<{
  notifications: NotificationRow[]
  error?: string
}> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { notifications: [], error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, team_id, workflow_id, type, title, message, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error)
    return {
      notifications: [],
      error: safeDbError('notifications/get', error, 'Failed to load notifications'),
    }
  return { notifications: (data ?? []) as NotificationRow[] }
}

export async function getUnreadCount(): Promise<{ count: number; error?: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { count: 0, error: 'Not authenticated' }

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  if (error)
    return {
      count: 0,
      error: safeDbError('notifications/unread-count', error, 'Failed to load unread count'),
    }
  return { count: count ?? 0 }
}

export async function markAsRead(notificationId: string): Promise<{ error?: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error)
    return {
      error: safeDbError('notifications/mark-read', error, 'Failed to mark notification as read'),
    }
  return {}
}

export async function markAllAsRead(): Promise<{ error?: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  if (error)
    return {
      error: safeDbError(
        'notifications/mark-all-read',
        error,
        'Failed to mark all notifications as read'
      ),
    }
  return {}
}

export async function createNotification(params: {
  userId: string
  teamId: string
  workflowId?: string
  type: NotificationType
  title: string
  message?: string
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify caller is a member of the target team
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .eq('team_id', params.teamId)
    .single()
  if (!membership) return { error: 'Not a member of this team' }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      team_id: params.teamId,
      workflow_id: params.workflowId ?? null,
      type: params.type,
      title: params.title,
      message: params.message ?? null,
    })
    .select('id')
    .single()

  if (error)
    return { error: safeDbError('notifications/create', error, 'Failed to create notification') }
  return { id: data?.id }
}

// ─── Notification Preferences ───────────────────────────────────────

export async function getNotificationPreferences(): Promise<{
  preferences: NotificationPreferencesRow | null
  error?: string
}> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { preferences: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('id, user_id, email_enabled, failures_enabled, digest_enabled, created_at, updated_at')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is fine (use defaults)
    return {
      preferences: null,
      error: safeDbError(
        'notifications/get-preferences',
        error,
        'Failed to load notification preferences'
      ),
    }
  }

  return { preferences: (data as NotificationPreferencesRow) ?? null }
}

export async function updateNotificationPreferences(prefs: {
  emailEnabled?: boolean
  failuresEnabled?: boolean
  digestEnabled?: boolean
}): Promise<{ error?: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (prefs.emailEnabled !== undefined) updateData.email_enabled = prefs.emailEnabled
  if (prefs.failuresEnabled !== undefined) updateData.failures_enabled = prefs.failuresEnabled
  if (prefs.digestEnabled !== undefined) updateData.digest_enabled = prefs.digestEnabled

  // Upsert — create if not exists, update if exists
  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: user.id,
      ...updateData,
    },
    { onConflict: 'user_id' }
  )

  if (error)
    return {
      error: safeDbError(
        'notifications/update-preferences',
        error,
        'Failed to update notification preferences'
      ),
    }
  return {}
}
