'use client'

import { useMemo } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import WorkflowsList from '@/components/agent-detail/workflows-list'
import SkillsList from '@/components/agent-detail/skills-list'
import ConnectionIndicators from '@/components/agent-detail/connection-indicators'
import RunHistory from '@/components/agent-detail/run-history'
import { useAgentWorkflows } from '@/hooks/use-agent-workflows'
import type { AgentWorkflowData } from '@/lib/actions/agent-workflows'

interface AgentSidebarProps {
  agentId: string
  teamId: string
  initialWorkflows: AgentWorkflowData[]
  skills: Array<{
    id: string
    name: string
    description: string | null
    content: string
    source: string
    is_enabled: boolean | null
    type: string
    parameters: unknown | null
    version: number
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
  workflowRuns: Array<{
    id: string
    workflow_id: string
    status: string
    trigger_data: Record<string, unknown> | null
    actions_executed: unknown[] | null
    error: string | null
    duration_ms: number | null
    created_at: string
    agent_workflows: { name: string } | null
  }>
}

export default function AgentSidebar({
  agentId,
  teamId,
  initialWorkflows,
  skills,
  connectedApps,
  recentRuns,
  workflowRuns,
}: AgentSidebarProps) {
  const { data: workflows = initialWorkflows } = useAgentWorkflows(agentId, initialWorkflows)
  // Merge workflow runs and workflow runs into a single chronological list
  const allRuns = useMemo(() => {
    const normalizedWorkflowRuns = workflowRuns.map((wr) => ({
      id: wr.id,
      status: wr.status,
      steps_used: 0,
      ai_credits_used: 0,
      started_at: wr.created_at,
      completed_at: wr.duration_ms
        ? new Date(new Date(wr.created_at).getTime() + wr.duration_ms).toISOString()
        : null,
      workflow: wr.agent_workflows ? { name: wr.agent_workflows.name, emoji: '\u26A1' } : null,
      trigger_data: wr.trigger_data,
      actions_executed: wr.actions_executed,
      error: wr.error,
    }))

    return [...recentRuns, ...normalizedWorkflowRuns].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )
  }, [recentRuns, workflowRuns])

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[50vw]">
        <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4">
          <SheetTitle>Agent Details</SheetTitle>
          <SheetDescription className="sr-only">
            Skills, connected apps, and activity
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 p-6">
            <Tabs defaultValue="workflows" className="space-y-3">
              <TabsList className="h-8">
                <TabsTrigger value="workflows" className="h-7 px-3 text-xs">
                  Workflows
                </TabsTrigger>
                <TabsTrigger value="skills" className="h-7 px-3 text-xs">
                  Skills
                </TabsTrigger>
              </TabsList>
              <TabsContent value="workflows" className="mt-0">
                <WorkflowsList workflows={workflows} agentId={agentId} teamId={teamId} />
              </TabsContent>
              <TabsContent value="skills" className="mt-0">
                <SkillsList skills={skills} agentId={agentId} />
              </TabsContent>
            </Tabs>

            <section className="space-y-3">
              <h2 className="text-foreground text-[15px] font-semibold">Connected apps</h2>
              <ConnectionIndicators apps={connectedApps} />
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
