'use client'

import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for the Snew Studio feature.
 * Points to the prototype Supabase project (plkhvlnqjihonpzeeybh),
 * separate from the main relay Supabase project.
 */
const STUDIO_SUPABASE_URL = process.env.NEXT_PUBLIC_STUDIO_SUPABASE_URL!
const STUDIO_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_STUDIO_SUPABASE_ANON_KEY!

export const studioSupabase = createClient(STUDIO_SUPABASE_URL, STUDIO_SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
})
