'use server'

import { createServerClient } from '@/lib/supabase/server'
import { safeDbError } from '@/lib/safe-error'

// Types matching the current `notifications` table (2026-04-15 schema).
export type NotificationUrgency = 'urgent' | 'opportunity' | 'insight'

export interface NotificationRow {
  id: string
  user_id: string | null
  team_id: string
  urgency: NotificationUrgency
  title: string
  body: string | null
  cta_url: string | null
  is_read: boolean
  created_at: string
}

// Kept for callers that still import the old name. The
// `notification_preferences` table was dropped; all fields default to
// sensible values and update is a no-op.
export interface NotificationPreferencesRow {
  id: string
  user_id: string
  email_enabled: boolean
  failures_enabled: boolean
  digest_enabled: boolean
  created_at: string
  updated_at: string
}

const normaliseUrgency = (u: string | null): NotificationUrgency => {
  if (u === 'urgent' || u === 'opportunity') return u
  return 'insight'
}

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
    .select('id, user_id, team_id, urgency, title, body, cta_url, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error)
    return {
      notifications: [],
      error: safeDbError('notifications/get', error, 'Failed to load notifications'),
    }

  const notifications: NotificationRow[] = (data ?? []).map((n) => ({
    id: n.id,
    user_id: n.user_id,
    team_id: n.team_id,
    urgency: normaliseUrgency(n.urgency),
    title: n.title,
    body: n.body ?? null,
    cta_url: n.cta_url ?? null,
    is_read: n.is_read ?? false,
    created_at: n.created_at,
  }))
  return { notifications }
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
    .eq('is_read', false)

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
    .update({ is_read: true })
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
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

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
  urgency?: NotificationUrgency
  title: string
  body?: string
  ctaUrl?: string
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .eq('team_id', params.teamId)
    .single()
  if (!membership) return { error: 'Not a member of this team' }

  if (params.userId !== user.id) return { error: 'Cannot create notifications for other users' }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      team_id: params.teamId,
      urgency: params.urgency ?? 'insight',
      title: params.title,
      body: params.body ?? null,
      cta_url: params.ctaUrl ?? null,
    })
    .select('id')
    .single()

  if (error)
    return { error: safeDbError('notifications/create', error, 'Failed to create notification') }
  return { id: data?.id }
}

// Notification preferences: the `notification_preferences` table was
// dropped in the 2026-04-15 refactor. These helpers return sensible
// defaults so callers keep working; a real implementation should go
// through a dedicated settings surface once the feature is revived.
export async function getNotificationPreferences(): Promise<{
  preferences: NotificationPreferencesRow | null
  error?: string
}> {
  return { preferences: null }
}

export async function updateNotificationPreferences(_prefs: {
  emailEnabled?: boolean
  failuresEnabled?: boolean
  digestEnabled?: boolean
}): Promise<{ error?: string }> {
  return {}
}
