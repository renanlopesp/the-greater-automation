'use client'

import { createBrowserClient } from '@/lib/supabase/client'

/**
 * Convert a `data:image/...;base64,...` URL into a Blob and upload it directly
 * to the `chat-uploads` bucket via the browser Supabase client, returning the
 * public storage URL. Non-data URLs (already hosted) are returned unchanged.
 *
 * Uploading through a Next.js server action hits the 1MB Server Actions body
 * limit — generated images routinely exceed that — so we bypass the server
 * and talk to Supabase directly using the authenticated user session.
 *
 * Snapshots persisted into `tasks.artifact_data` should only carry small
 * hosted URLs — keeping base64 blobs there bloats the row by 1–3 MB per
 * canvas change and makes reloads slow.
 */
export async function uploadDataUrlToStorage(url: string): Promise<string> {
  if (!url || !url.startsWith('data:')) return url
  try {
    const [header, payload] = url.split(',')
    if (!header || !payload) return url
    const mimeMatch = header.match(/data:([^;]+)/)
    const mime = mimeMatch?.[1] ?? 'image/png'
    const ext = mime.split('/')[1]?.split('+')[0] ?? 'png'
    const bytes = atob(payload)
    const buf = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i)
    const blob = new Blob([buf], { type: mime })

    const supabase = createBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return url

    const filePath = `${user.id}/studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('chat-uploads')
      .upload(filePath, blob, { contentType: mime, upsert: false })

    if (uploadError) {
      console.warn('[uploadDataUrl] upload failed:', uploadError.message)
      return url
    }
    const { data: urlData } = supabase.storage.from('chat-uploads').getPublicUrl(filePath)
    return urlData.publicUrl || url
  } catch (e) {
    console.warn('[uploadDataUrl] failed:', e)
    return url
  }
}
