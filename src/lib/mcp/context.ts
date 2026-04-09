import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface ToolContext {
  teamId: string
  userId: string
  storeId: string | null
  taskId: string | null
  supabase: SupabaseClient
}

/**
 * Initialize tool context from environment variables.
 * Called once at MCP server startup.
 */
export function createToolContext(): ToolContext {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const teamId = process.env.SNEW_TEAM_ID
  const userId = process.env.SNEW_USER_ID

  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL')
  if (!supabaseKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  if (!teamId) throw new Error('Missing SNEW_TEAM_ID')
  if (!userId) throw new Error('Missing SNEW_USER_ID')

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return {
    teamId,
    userId,
    storeId: process.env.SNEW_STORE_ID || null,
    taskId: process.env.SNEW_TASK_ID || null,
    supabase,
  }
}
