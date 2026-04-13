import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
  const { data: team } = await s
    .from('teams')
    .select('anthropic_agent_id')
    .eq('id', '15fe71a9-03a1-4732-8c41-8383c887c6ed')
    .single()
  const a = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent = (await a.beta.agents.retrieve(team!.anthropic_agent_id)) as any
  console.log('model:', JSON.stringify(agent.model))
  console.log('tools count:', agent.tools?.length ?? 0)
  console.log('mcp_servers count:', agent.mcp_servers?.length ?? 0)
  console.log('first mcp server name:', agent.mcp_servers?.[0]?.name)
  console.log('system prompt length:', agent.system?.length)
  console.log('system includes SNEW_RUN_SKILL:', agent.system?.includes('SNEW_RUN_SKILL'))
  console.log('system includes calendar:', agent.system?.toLowerCase().includes('calend'))
  console.log('system includes skill:', agent.system?.toLowerCase().includes('skill'))
}
main().catch(console.error)
