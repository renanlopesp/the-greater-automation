'use client'

import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for the Snew Studio feature.
 * Points to the prototype Supabase project (plkhvlnqjihonpzeeybh),
 * separate from the main relay Supabase project.
 */
const STUDIO_SUPABASE_URL = 'https://plkhvlnqjihonpzeeybh.supabase.co'
const STUDIO_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsa2h2bG5xamlob25wemVleWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMzY1MDUsImV4cCI6MjA4OTYxMjUwNX0.cQCQWCT7xf91O_8wR8GY8OSLLQ5AI1fVpIluCkrNraw'

export const studioSupabase = createClient(STUDIO_SUPABASE_URL, STUDIO_SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
})
