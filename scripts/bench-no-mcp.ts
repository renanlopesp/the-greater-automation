import Anthropic from '@anthropic-ai/sdk'

async function main() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  // Create a minimal agent without MCP
  const agent = await anthropic.beta.agents.create({
    name: 'bench-nomcp',
    model: 'claude-sonnet-4-6',
    system: 'You are a helpful assistant.',
  })
  const env = await anthropic.beta.environments.create({ name: 'bench-env' })

  for (let i = 0; i < 3; i++) {
    const t0 = Date.now()
    const session = await anthropic.beta.sessions.create({
      agent: agent.id,
      environment_id: env.id,
    })
    await anthropic.beta.sessions.events.send(session.id, {
      events: [{ type: 'user.message', content: [{ type: 'text', text: 'Olá' }] }],
    })
    const stream = await anthropic.beta.sessions.events.stream(session.id)
    let firstMsg = 0
    for await (const event of stream) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = event as any
      if (e.type === 'agent.message' && !firstMsg) firstMsg = Date.now() - t0
      if (e.type === 'session.status_idle' && e.stop_reason?.type === 'end_turn') break
    }
    console.log(`Run ${i + 1}: first msg at +${firstMsg}ms`)
  }

  // Managed Agents SDK does not expose delete for agents/environments
  // (created resources remain until cleaned up server-side). Intentionally no-op.
  void agent
  void env
}
main().catch(console.error)
