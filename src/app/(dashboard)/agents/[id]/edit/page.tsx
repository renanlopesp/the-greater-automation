import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { fetchAgent, fetchTeamWorkflows } from '@/lib/queries/agents'
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

  // Fetch skills for this agent (to pre-select workflows)
  const { data: skills } = await supabase
    .from('agent_skills')
    .select('workflow_id')
    .eq('agent_id', id)

  const skillWorkflowIds = (skills ?? [])
    .map((s) => s.workflow_id)
    .filter((id): id is string => id !== null)

  const workflows = await fetchTeamWorkflows(supabase, agent.team_id)

  return (
    <div className="mx-auto max-w-5xl p-6">
      <AgentForm
        mode="edit"
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
          skillWorkflowIds,
        }}
        workflows={workflows}
        teamId={agent.team_id}
        userId={user.id}
      />
    </div>
  )
}
