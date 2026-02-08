'use client'

import { useState } from 'react'
import { Link2, Plus } from 'lucide-react'
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link2 className="text-muted-foreground h-5 w-5" />
        <h3 className="text-lg font-semibold">Workflows</h3>
        <div className="flex-1" />
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {workflows.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">No workflows found</p>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="flex flex-col">
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
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
