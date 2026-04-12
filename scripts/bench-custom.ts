import Anthropic from '@anthropic-ai/sdk'

const AGENT_ID = 'agent_011CZzXix9ncQhZAA49ApzB7'

async function main() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  // Retrieve agent info first
  const agent = await anthropic.beta.agents.retrieve(AGENT_ID)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = agent as any
  console.log('Agent:', a.name)
  console.log('Model:', JSON.stringify(a.model))
  console.log('System prompt length:', a.system?.length ?? 0, 'chars')
  console.log('MCP servers:', a.mcp_servers?.length ?? 0)
  console.log('---')

  // Create a new environment for testing
  const env = await anthropic.beta.environments.create({ name: 'bench-custom-env' })

  for (let i = 1; i <= 3; i++) {
    const t0 = Date.now()
    const session = await anthropic.beta.sessions.create({
      agent: AGENT_ID,
      environment_id: env.id,
    })
    await anthropic.beta.sessions.events.send(session.id, {
      events: [{ type: 'user.message', content: [{ type: 'text', text: 'Olá' }] }],
    })
    const stream = await anthropic.beta.sessions.events.stream(session.id)
    let firstMsg = 0
    let total = 0
    let response = ''
    for await (const event of stream) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = event as any
      const elapsed = Date.now() - t0
      if (e.type === 'agent.message') {
        if (!firstMsg) firstMsg = elapsed
        const text =
          e.content
            ?.filter((b: { type: string }) => b.type === 'text')
            .map((b: { text: string }) => b.text)
            .join('') ?? ''
        response += text
      }
      if (e.type === 'session.status_idle' && e.stop_reason?.type === 'end_turn') {
        total = elapsed
        break
      }
    }
    console.log(
      `Run ${i}: first msg +${firstMsg}ms, total ${total}ms, response: "${response.slice(0, 80)}..."`
    )
  }
}
main().catch(console.error)
