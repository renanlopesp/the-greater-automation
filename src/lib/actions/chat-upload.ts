'use server'

import { createServerClient } from '@/lib/supabase/server'

export async function uploadChatFileAction(
  formData: FormData
): Promise<{ error?: string; url?: string }> {
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'No file provided' }
  if (file.size > 10 * 1024 * 1024) return { error: 'File must be less than 10MB' }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const ext = file.name.split('.').pop() || 'bin'
  const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('chat-uploads')
    .upload(filePath, file, {
      contentType: file.type,
    })

  if (uploadError) return { error: 'Failed to upload file' }

  const { data: urlData } = supabase.storage.from('chat-uploads').getPublicUrl(filePath)
  return { url: urlData.publicUrl }
}
