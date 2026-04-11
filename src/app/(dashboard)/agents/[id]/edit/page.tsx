import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { fetchAgent } from '@/lib/queries/agents'
import AgentForm from '@/components/agent-detail/agent-form'

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const agent = await fetchAgent(supabase, id)
  if (!agent) notFound()

  return (
    <div className="mx-auto max-w-5xl p-6">
      <AgentForm
        agent={{
          id: agent.id,
          name: agent.name,
          description: agent.description,
          palette: agent.palette,
          system_prompt: agent.system_prompt,
          model: agent.model,
          temperature: agent.temperature,
          max_tokens: agent.max_tokens,
          conversation_starters: agent.conversation_starters,
          skillWorkflowIds: [],
        }}
        workflows={[]}
        teamId={agent.team_id}
        userId={user.id}
      />
    </div>
  )
}
