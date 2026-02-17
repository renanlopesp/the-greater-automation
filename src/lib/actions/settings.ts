'use server'

import { createServerClient } from '@/lib/supabase/server'
import { accountSettingsSchema, workspaceSettingsSchema } from '@/lib/schemas/settings'
import { getActiveTeamId } from '@/lib/get-active-team'

export type SettingsActionResult = { error?: string; success?: boolean }

export async function updateProfileAction(formData: FormData): Promise<SettingsActionResult> {
  const raw = { fullName: formData.get('fullName') }
  const parsed = accountSettingsSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.fullName })
    .eq('id', user.id)

  if (error) {
    return { error: 'Failed to update profile' }
  }

  return { success: true }
}

export async function updateWorkspaceAction(formData: FormData): Promise<SettingsActionResult> {
  const raw = { name: formData.get('name') }
  const parsed = workspaceSettingsSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get user's active team (respects workspace switcher cookie)
  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) {
    return { error: 'No workspace found' }
  }

  const { error } = await supabase.from('teams').update({ name: parsed.data.name }).eq('id', teamId)

  if (error) {
    return { error: 'Failed to update workspace' }
  }

  return { success: true }
}
