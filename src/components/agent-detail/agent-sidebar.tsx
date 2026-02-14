'use client'

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

interface AgentSidebarProps {
  agentId: string
  teamId: string
  skills: Array<{
    id: string
    name: string
    description: string | null
    source: string | null
    last_run_at: string | null
    workflow_id?: string | null
    workflow: { name: string; emoji: string } | null
    action_template?: Record<string, unknown> | null
  }>
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
  heatmapData: Map<string, number>
}

export default function AgentSidebar({
  agentId,
  teamId,
  skills,
  connectedApps,
  recentRuns,
  heatmapData,
}: AgentSidebarProps) {
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
        <ScrollArea className="h-[calc(100vh-5rem)]">
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

            <RunHistory runs={recentRuns} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
