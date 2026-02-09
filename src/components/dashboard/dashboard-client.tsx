'use client'

import { Bot, GitBranch, Play, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import SearchTrigger from '@/components/search-trigger'
import TeamSection from '@/components/dashboard/team-section'
import AgentsGrid from '@/components/dashboard/agents-grid'
import WorkflowsSection from '@/components/dashboard/workflows-section'
import { useCommandMenu } from '@/lib/command-menu-context'
import type { AgentCardProps } from '@/components/dashboard/agent-card'
import type { fetchWorkflows } from '@/lib/queries/dashboard'

type Workflow = Awaited<ReturnType<typeof fetchWorkflows>>[number]

interface DashboardClientProps {
  team: { name: string; avatar_url: string | null }
  initialAgents: AgentCardProps[]
  initialWorkflows: Workflow[]
  teamId: string
}

const stats = [
  { label: 'Agents', icon: Bot, value: 0 },
  { label: 'Workflows', icon: GitBranch, value: 0 },
  { label: 'Runs today', icon: Play, value: 0 },
  { label: 'Starred', icon: Star, value: 0 },
]

export default function DashboardClient({
  team,
  initialAgents,
  initialWorkflows,
  teamId,
}: DashboardClientProps) {
  const openCommandMenu = useCommandMenu()

  const computedStats = [
    { ...stats[0], value: initialAgents.length },
    { ...stats[1], value: initialWorkflows.length },
    { ...stats[2], value: 0 },
    { ...stats[3], value: initialWorkflows.filter((w) => w.is_starred).length },
  ]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pt-2 pb-12">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground text-sm">
          Overview of your team&apos;s agents and workflows.
        </p>
      </div>

      {/* Search */}
      <div className="mx-auto w-full max-w-md">
        <SearchTrigger onOpen={openCommandMenu} />
      </div>

      {/* Team */}
      <TeamSection team={team} />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {computedStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 pt-0">
              <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
                <stat.icon className="text-primary h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">{stat.value}</span>
                <span className="text-muted-foreground text-xs">{stat.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agents */}
      <AgentsGrid agents={initialAgents} />

      {/* Workflows */}
      <WorkflowsSection initialWorkflows={initialWorkflows} teamId={teamId} />
    </div>
  )
}
