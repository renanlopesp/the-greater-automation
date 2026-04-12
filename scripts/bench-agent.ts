import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const TEAM_ID = '15fe71a9-03a1-4732-8c41-8383c887c6ed'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: team } = await supabase
    .from('teams')
    .select('anthropic_agent_id, anthropic_env_id')
    .eq('id', TEAM_ID)
    .single()

  if (!team?.anthropic_agent_id) {
    console.error('No agent provisioned')
    process.exit(1)
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  console.log(`[${new Date().toISOString()}] Creating session...`)
  const tSession = Date.now()
  const session = await anthropic.beta.sessions.create({
    agent: team.anthropic_agent_id,
    environment_id: team.anthropic_env_id,
    metadata: { team_id: TEAM_ID, source: 'bench' },
  })
  console.log(`Session created in ${Date.now() - tSession}ms`)

  const tSend = Date.now()
  await anthropic.beta.sessions.events.send(session.id, {
    events: [{ type: 'user.message', content: [{ type: 'text', text: 'Olá' }] }],
  })
  console.log(`[${new Date().toISOString()}] Message sent in ${Date.now() - tSend}ms`)

  const tStream = Date.now()
  const eventStream = await anthropic.beta.sessions.events.stream(session.id)
  console.log(`[${new Date().toISOString()}] Stream opened in ${Date.now() - tStream}ms`)

  let firstTextAt = 0
  let lastEventAt = 0
  let fullText = ''
  let toolResultAt = 0

  for await (const event of eventStream) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = event as any
    const elapsed = Date.now() - tSend
    lastEventAt = elapsed

    if (e.type === 'agent.mcp_tool_use') {
      console.log(`[+${elapsed}ms] MCP TOOL USE: ${e.name}`)
    } else if (e.type === 'agent.mcp_tool_result') {
      toolResultAt = elapsed
      console.log(`[+${elapsed}ms] MCP TOOL RESULT (is_error=${e.is_error})`)
    } else if (e.type === 'agent.thinking') {
      console.log(`[+${elapsed}ms] THINKING`)
    } else if (e.type === 'agent.message') {
      if (!firstTextAt) firstTextAt = elapsed
      const text =
        e.content
          ?.filter((b: { type: string }) => b.type === 'text')
          .map((b: { text: string }) => b.text)
          .join('') ?? ''
      console.log(`[+${elapsed}ms] MESSAGE (${text.length} chars): ${text.slice(0, 80)}...`)
      fullText += text
    } else if (e.type === 'session.status_idle') {
      console.log(`[+${elapsed}ms] IDLE (${e.stop_reason?.type})`)
      if (e.stop_reason?.type === 'end_turn') break
    } else if (e.type === 'session.status_terminated' || e.type === 'session.error') {
      console.log(`[+${elapsed}ms] ${e.type}`)
      break
    }
  }

  console.log('---')
  console.log(`Tool result at: +${toolResultAt}ms`)
  console.log(`First text at: +${firstTextAt}ms`)
  console.log(`Gap (tool→text): ${firstTextAt - toolResultAt}ms`)
  console.log(`Total: ${lastEventAt}ms`)
  console.log(`\nResponse: ${fullText.slice(0, 300)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
