import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}
