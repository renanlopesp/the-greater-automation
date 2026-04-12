/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
  const { data: team } = await supabase
    .from('teams')
    .select('anthropic_agent_id')
    .eq('id', '15fe71a9-03a1-4732-8c41-8383c887c6ed')
    .single()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const agent = await anthropic.beta.agents.retrieve(team!.anthropic_agent_id)

  const updated = await (anthropic.beta.agents as any).update(team!.anthropic_agent_id, {
    version: (agent as any).version,
    model: { id: 'claude-sonnet-4-6', speed: 'standard' },
  })
  console.log('Reverted to:', JSON.stringify(updated.model))
}
main().catch(console.error)
