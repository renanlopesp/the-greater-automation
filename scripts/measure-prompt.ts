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
    .select('anthropic_agent_id, name')
    .eq('id', '15fe71a9-03a1-4732-8c41-8383c887c6ed')
    .single()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const agent = await anthropic.beta.agents.retrieve(team!.anthropic_agent_id)

  const sys = (agent as any).system ?? (agent as any).instructions ?? ''
  console.log('Team:', team!.name)
  console.log('Model:', (agent as any).model)
  console.log('System prompt length:', sys.length, 'chars')
  console.log('Estimated tokens:', Math.round(sys.length / 4))
  console.log('---\nFirst 500 chars:\n', sys.slice(0, 500))
}
main().catch(console.error)
