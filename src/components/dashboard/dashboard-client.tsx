'use client'

import TeamSection from '@/components/dashboard/team-section'
import AgentsGrid from '@/components/dashboard/agents-grid'
import WorkflowsSection from '@/components/dashboard/workflows-section'
import type { AgentCardProps } from '@/components/dashboard/agent-card'
import type { fetchWorkflows } from '@/lib/queries/dashboard'

type Workflow = Awaited<ReturnType<typeof fetchWorkflows>>[number]

interface DashboardClientProps {
  team: { name: string; avatar_url: string | null }
  initialAgents: AgentCardProps[]
  initialWorkflows: Workflow[]
  teamId: string
}

export default function DashboardClient({
  team,
  initialAgents,
  initialWorkflows,
  teamId,
}: DashboardClientProps) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 p-6">
      <TeamSection team={team} />
      <AgentsGrid agents={initialAgents} />
      <WorkflowsSection initialWorkflows={initialWorkflows} teamId={teamId} />
    </div>
  )
}
