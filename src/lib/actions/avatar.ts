'use server'

import { createServerClient } from '@/lib/supabase/server'

export type AvatarActionResult = { error?: string; avatarUrl?: string }

export async function uploadAvatarAction(formData: FormData): Promise<AvatarActionResult> {
  const file = formData.get('avatar') as File | null
  if (!file || file.size === 0) {
    return { error: 'No file provided' }
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: 'File must be less than 2MB' }
  }

  if (!file.type.startsWith('image/')) {
    return { error: 'File must be an image' }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const filePath = `${user.id}/avatar.${ext}`

  // Upload to storage (upsert to replace existing)
  const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
    upsert: true,
    contentType: file.type,
  })

  if (uploadError) {
    return { error: 'Failed to upload avatar' }
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
  const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (updateError) {
    return { error: 'Failed to update profile' }
  }

  return { avatarUrl }
}
