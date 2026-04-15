'use client'

import { createClient } from '@supabase/supabase-js'

/**
 * Studio's legacy prototype client.
 * Hosts: gemini-generate, generate-copy, generate-carousel, generate-video,
 * check-video-status, generate-legenda, conversion-scanner, freepik-generate,
 * freepik-icon, convert-video. Will be decommissioned once all edge functions migrate.
 *
 * For `studio-chat` (on relay's main project), use the standard
 * `createBrowserClient` from `@/lib/supabase/client` — it shares the
 * authenticated session (cookie-based) so edge functions with `verify_jwt: true`
 * receive a valid user JWT.
 */

const LEGACY_URL = process.env.NEXT_PUBLIC_STUDIO_SUPABASE_URL!
const LEGACY_ANON_KEY = process.env.NEXT_PUBLIC_STUDIO_SUPABASE_ANON_KEY!

export const studioSupabase = createClient(LEGACY_URL, LEGACY_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
})
