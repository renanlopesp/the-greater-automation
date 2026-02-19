'use client'

import Link from 'next/link'
import { SlidersHorizontal, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetClose,
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
import RunHistory, { type Run } from '@/components/agent-detail/run-history'
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
  allRuns: Run[]
  triggerSubscriptions?: Array<{
    id: string
    agent_workflow_id: string
    trigger_slug: string
    app_id: string
    is_enabled: boolean
    last_event_at: string | null
    event_count: number
  }>
}

export default function AgentSidebar({
  agentId,
  teamId,
  initialWorkflows,
  skills,
  connectedApps,
  allRuns,
  triggerSubscriptions,
}: AgentSidebarProps) {
  const { data: workflows = initialWorkflows } = useAgentWorkflows(agentId, initialWorkflows)

  return (
    <Sheet>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
      <SheetContent
        showCloseButton={false}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[50vw]"
      >
        <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Agent Details</SheetTitle>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link href={`/agents/${agentId}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit agent
                </Link>
              </Button>
              <SheetClose asChild>
                <Button variant="ghost" size="icon-sm">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </SheetClose>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Skills, connected apps, and activity
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]]:!overflow-x-hidden [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!min-w-0">
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
                <WorkflowsList
                  workflows={workflows}
                  agentId={agentId}
                  teamId={teamId}
                  triggerSubscriptions={triggerSubscriptions}
                />
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
