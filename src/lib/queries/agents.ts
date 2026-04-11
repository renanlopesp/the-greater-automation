import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

export async function fetchAgent(supabase: Client, agentId: string) {
  const { data } = await supabase
    .from('agents')
    .select(
      'id, name, team_id, system_prompt, model, temperature, max_tokens, is_orchestrator, palette, description, status, is_active, created_by, notification_settings, avatar_url, avatar_type, conversation_starters, snewclaw_instance_id, created_at, updated_at'
    )
    .eq('id', agentId)
    .single()
  return data
}
