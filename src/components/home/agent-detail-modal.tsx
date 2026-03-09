'use client'

import { Mic, Plus, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import WorkflowsList from '@/components/agent-detail/workflows-list'
import SkillsList from '@/components/agent-detail/skills-list'
import { getAgentWorkflows } from '@/lib/actions/agent-workflows'
import { getAgentSkills } from '@/lib/actions/agent-skills'

interface AgentItem {
  id: string
  name: string
  description: string | null
  palette: string
  is_active: boolean
  category?: string | null
}

interface ActivityItem {
  id: string
  message: string
  suggestion: string
  priority: 'High' | 'Medium' | 'Low'
  status: 'Pending' | 'In Progress' | 'Done'
}

const EXAMPLE_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    message: 'Checkout friction detected on mobile.',
    suggestion: 'Simplify mobile checkout to 2-step flow.',
    priority: 'High',
    status: 'Pending',
  },
  {
    id: '2',
    message: 'Competitor reduced price by 8%.',
    suggestion: 'Review pricing strategy for competing SKUs.',
    priority: 'High',
    status: 'Pending',
  },
  {
    id: '3',
    message: 'Meta campaign CTR dropped 22% week over week.',
    suggestion: 'Refresh ad creative and review audience targeting.',
    priority: 'Medium',
    status: 'In Progress',
  },
  {
    id: '4',
    message: 'Product page bounce rate increased to 68%.',
    suggestion: 'Add trust badges and improve above-the-fold content.',
    priority: 'Medium',
    status: 'Pending',
  },
]

function getAgentCategory(agent: AgentItem): string {
  if (agent.category) return agent.category
  const paletteMap: Record<string, string> = {
    blue: 'Customer Service',
    orange: 'Marketing',
    green: 'Analytics',
    purple: 'Competitors',
  }
  return paletteMap[agent.palette] ?? 'Productivity'
}

interface AgentDetailModalProps {
  agent: AgentItem | null
  teamId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AgentDetailModal({
  agent,
  teamId,
  open,
  onOpenChange,
}: AgentDetailModalProps) {
  const agentId = agent?.id ?? ''

  const { data: workflows = [] } = useQuery({
    queryKey: ['agent-workflows', agentId],
    queryFn: () => getAgentWorkflows(agentId),
    enabled: open && !!agentId,
  })

  const { data: skills = [] } = useQuery({
    queryKey: ['agent-skills', agentId],
    queryFn: () => getAgentSkills(agentId),
    enabled: open && !!agentId,
  })

  if (!agent) return null

  const category = getAgentCategory(agent)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[85vh] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-6 py-4">
          <span className="bg-muted flex size-10 items-center justify-center rounded-full text-lg">
            💬
          </span>
          <div className="flex-1">
            <DialogTitle className="text-base font-semibold">{agent.name}</DialogTitle>
            <p className="text-muted-foreground text-sm">{category}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body: Activity Log + Automações/Skills Panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Activity Log + Chat Input */}
          <div className="flex flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="mb-4 text-base font-semibold">Activity Log</h2>
              <div className="space-y-3">
                {EXAMPLE_ACTIVITIES.map((activity) => (
                  <div
                    key={activity.id}
                    className="hover:bg-accent/50 cursor-pointer rounded-xl border p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm">{activity.message}</p>
                        <p className="text-muted-foreground text-sm">{activity.suggestion}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-muted-foreground text-xs">{activity.priority}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs ${
                            activity.status === 'In Progress'
                              ? 'bg-foreground text-background'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {activity.status}
                        </span>
                      </div>
                    </div>
                    {activity.status === 'Pending' && (
                      <div className="mt-3 flex items-center gap-3">
                        <button type="button" className="text-sm font-medium underline">
                          Approve Action
                        </button>
                        <button type="button" className="text-muted-foreground text-sm">
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div className="border-t p-4">
              <div className="bg-card flex items-end gap-2 rounded-2xl border px-4 py-3">
                <textarea
                  placeholder="Ask the agent anything..."
                  rows={1}
                  className="placeholder:text-muted-foreground flex-1 resize-none bg-transparent text-sm outline-none"
                />
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" className="text-muted-foreground hover:text-foreground p-1">
                    <Plus className="size-4" />
                  </button>
                  <button type="button" className="text-muted-foreground hover:text-foreground p-1">
                    <Mic className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Automações / Skills Panel */}
          <aside className="bg-muted/30 w-[340px] shrink-0 border-l">
            <ScrollArea className="h-full">
              <div className="p-6">
                <Tabs defaultValue="workflows" className="space-y-3">
                  <TabsList className="h-8">
                    <TabsTrigger value="workflows" className="h-7 px-3 text-xs">
                      Automações
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
              </div>
            </ScrollArea>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}
