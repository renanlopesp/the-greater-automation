'use client'

import { useMemo } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import SkillsList from '@/components/agent-detail/skills-list'
import ConnectionIndicators from '@/components/agent-detail/connection-indicators'
import ActivityHeatmap from '@/components/agent-detail/activity-heatmap'
import RunHistory from '@/components/agent-detail/run-history'
import { useAgentSkills } from '@/hooks/use-agent-skills'
import type { AgentSkillData } from '@/lib/actions/agents'

interface AgentSidebarProps {
  agentId: string
  teamId: string
  initialSkills: AgentSkillData[]
  connectedApps: Array<{
    app_id: string
    account_label: string | null
  }>
  recentRuns: Array<{
    id: string
    status: string
    steps_used: number
    ai_credits_used: number
    started_at: string
    completed_at: string | null
    workflow: { name: string; emoji: string } | null
  }>
  skillRuns: Array<{
    id: string
    skill_id: string
    status: string
    trigger_data: Record<string, unknown> | null
    actions_executed: unknown[] | null
    error: string | null
    duration_ms: number | null
    created_at: string
    agent_skills: { name: string } | null
  }>
  heatmapData: Map<string, number>
}

export default function AgentSidebar({
  agentId,
  teamId,
  initialSkills,
  connectedApps,
  recentRuns,
  skillRuns,
  heatmapData,
}: AgentSidebarProps) {
  const { data: skills = initialSkills } = useAgentSkills(agentId, initialSkills)
  // Merge workflow runs and skill runs into a single chronological list
  const allRuns = useMemo(() => {
    const normalizedSkillRuns = skillRuns.map((sr) => ({
      id: sr.id,
      status: sr.status,
      steps_used: 0,
      ai_credits_used: 0,
      started_at: sr.created_at,
      completed_at: sr.duration_ms
        ? new Date(new Date(sr.created_at).getTime() + sr.duration_ms).toISOString()
        : null,
      workflow: sr.agent_skills ? { name: sr.agent_skills.name, emoji: '\u26A1' } : null,
      trigger_data: sr.trigger_data,
      actions_executed: sr.actions_executed,
      error: sr.error,
    }))

    return [...recentRuns, ...normalizedSkillRuns].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )
  }, [recentRuns, skillRuns])

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] p-0 sm:w-[440px]">
        <SheetHeader className="border-b px-6 pt-6 pb-4">
          <SheetTitle>Agent Details</SheetTitle>
          <SheetDescription className="sr-only">
            Skills, connected apps, and activity
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-5rem)] [&>[data-slot=scroll-area-viewport]>div]:!block">
          <div className="space-y-6 p-6">
            <SkillsList skills={skills} agentId={agentId} teamId={teamId} />

            <section className="space-y-3">
              <h2 className="text-foreground text-[15px] font-semibold">Connected apps</h2>
              <ConnectionIndicators apps={connectedApps} />
            </section>

            <section className="space-y-3">
              <h2 className="text-foreground text-[15px] font-semibold">Recent activity</h2>
              <ActivityHeatmap data={heatmapData} />
            </section>

            <section className="space-y-3">
              <h2 className="text-foreground text-[15px] font-semibold">Run history</h2>
              <RunHistory runs={allRuns} />
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
