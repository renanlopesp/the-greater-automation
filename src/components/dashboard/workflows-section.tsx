'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Link2, Plus, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import WorkflowListItem from '@/components/dashboard/workflow-list-item'
import { useWorkflows } from '@/hooks/use-workflows'
import { useWorkflowRunStats } from '@/hooks/use-workflow-run-stats'
import type { DashboardTab, fetchWorkflows } from '@/lib/queries/dashboard'

type Workflow = Awaited<ReturnType<typeof fetchWorkflows>>[number]

interface WorkflowsSectionProps {
  initialWorkflows: Workflow[]
  teamId: string
}

const TABS: { value: DashboardTab; label: string }[] = [
  { value: 'needs-attention', label: 'Needs attention' },
  { value: 'recently-edited', label: 'Recently edited' },
  { value: 'recently-run', label: 'Recently run' },
  { value: 'starred', label: 'Starred' },
]

export default function WorkflowsSection({ initialWorkflows, teamId }: WorkflowsSectionProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('recently-edited')
  const { data: workflows } = useWorkflows(teamId, activeTab, initialWorkflows)
  const workflowIds = workflows.map((w) => w.id)
  const { data: runStats } = useWorkflowRunStats(workflowIds)

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">Workflows</h3>
      <Card className="overflow-hidden border py-0 shadow-none">
        <CardContent className="flex flex-col gap-0 p-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)}>
            <div className="flex items-center gap-3 px-4 pt-4 pb-2">
              <Link
                href="/workspace"
                className="flex items-center gap-3 transition-opacity hover:opacity-80"
              >
                <div className="bg-muted/50 flex h-10 w-10 items-center justify-center rounded-lg">
                  <Link2 className="text-foreground h-5 w-5" />
                </div>
              </Link>
              <div className="flex-1" />
              <TabsList>
                {TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {workflows.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No workflows found
                  </p>
                ) : (
                  <div className="flex flex-col divide-y">
                    {workflows.map((w) => {
                      const stats = runStats?.[w.id]
                      return (
                        <WorkflowListItem
                          key={w.id}
                          workflow={w}
                          totalRuns={stats?.totalRuns}
                          lastRunAt={stats?.lastRunAt}
                          sparklineData={stats?.sparklineData}
                        />
                      )
                    })}
                  </div>
                )}
                <div className="flex justify-center pb-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/workspace">View all</Link>
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </section>
  )
}
