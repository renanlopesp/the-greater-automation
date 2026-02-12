import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
        'Add it to .env.local with your Supabase project URL.'
    )
  }

  if (!key) {
    throw new Error(
      'Missing SUPABASE_SECRET_KEY environment variable. ' +
        'Add it to .env.local with your Supabase secret key (sb_secret_...).'
    )
  }

  return createClient<Database>(url, key)
}
