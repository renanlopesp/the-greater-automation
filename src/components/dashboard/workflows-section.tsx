'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import WorkflowListItem from '@/components/dashboard/workflow-list-item'
import { useWorkflows } from '@/hooks/use-workflows'
import { useWorkflowRunStats } from '@/hooks/use-workflow-run-stats'
import type { DashboardTab, fetchWorkflows } from '@/lib/queries/dashboard'

type Workflow = Awaited<ReturnType<typeof fetchWorkflows>>[number]

const EMPTY_WORKFLOWS: Workflow[] = []

interface WorkflowsSectionProps {
  initialWorkflows: Workflow[]
  teamId: string
}

const TABS: { value: DashboardTab; label: string }[] = [
  { value: 'recently-run', label: 'Execução recente' },
  { value: 'recently-edited', label: 'Editado recentemente' },
  { value: 'needs-attention', label: 'Precisa de atenção' },
  { value: 'starred', label: 'Favoritos' },
]

export default function WorkflowsSection({ initialWorkflows, teamId }: WorkflowsSectionProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('recently-edited')
  const { data: workflows = EMPTY_WORKFLOWS, isPending } = useWorkflows(
    teamId,
    activeTab,
    initialWorkflows
  )
  const workflowIds = useMemo(() => workflows.map((w) => w.id), [workflows])
  const { data: runStats } = useWorkflowRunStats(workflowIds)

  return (
    <section className="flex flex-col gap-6">
      <h3 className="text-lg font-semibold">Automações</h3>
      <div>
        <div className="flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)}>
            <div className="flex items-center gap-3 pb-6">
              <TabsList>
                {TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="flex-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" asChild>
                <Link href="/workspace">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {isPending ? (
                  <div className="flex flex-col divide-y">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <WorkflowItemSkeleton key={i} />
                    ))}
                  </div>
                ) : workflows.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    Nenhuma automação encontrada
                  </p>
                ) : (
                  <div className="flex flex-col divide-y">
                    <div className="flex items-center gap-3 pb-2">
                      <span className="flex min-w-0 flex-1 items-center gap-6">
                        <span className="text-muted-foreground min-w-0 flex-1 text-xs">
                          Agentes
                        </span>
                        <span
                          className="text-muted-foreground hidden shrink-0 text-xs md:block"
                          style={{ width: 100 }}
                        >
                          Total de execuções
                        </span>
                        <span
                          className="text-muted-foreground hidden shrink-0 text-xs md:block"
                          style={{ width: 100 }}
                        >
                          Atividade
                        </span>
                        <span className="text-muted-foreground flex min-w-0 flex-1 justify-end text-xs">
                          Última execução
                        </span>
                      </span>
                    </div>
                    {workflows.slice(0, 5).map((w) => {
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
                <div className="flex justify-center pt-6 pb-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/workspace">Ver tudo</Link>
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  )
}

function WorkflowItemSkeleton() {
  return (
    <span className="flex items-center gap-3 py-4">
      <span className="flex min-w-0 flex-1 items-center gap-6">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </span>
        </span>
        <span className="hidden shrink-0 flex-col gap-1 md:flex" style={{ width: 100 }}>
          <Skeleton className="h-4 w-12" />
        </span>
        <span className="hidden shrink-0 flex-col gap-1 md:flex" style={{ width: 100 }}>
          <Skeleton className="h-4 w-24" />
        </span>
        <span className="flex min-w-0 flex-1 flex-row items-center justify-between gap-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-28" />
        </span>
      </span>
    </span>
  )
}
