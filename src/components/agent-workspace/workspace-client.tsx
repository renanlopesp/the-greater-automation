// DEPRECATED: This component belongs to the old multi-agent workspace.
// It will be replaced by new skill-based workspace UI components.
// Do not extend — use src/components/skills/ for new skill UI.
'use client'

import { agents } from '@/data/agents'
import ActivityLog from './activity-log'
import AgentInfoSidebar from './agent-info-sidebar'
import type { ActivityItem } from './activity-card'

const mockActivities: ActivityItem[] = [
  {
    id: 'a1',
    problem: '284 customers inactive for 45+ days — R$12,600 revenue at risk',
    suggestion:
      'Launch a segmented WhatsApp win-back campaign targeting the 142 high-ticket customers first. Historical recovery rate: 38%.',
    priority: 'High',
    status: 'Pending',
  },
  {
    id: 'a2',
    problem: 'Delivery delay detected for 12 orders in São Paulo region',
    suggestion:
      'Send proactive delay notification via WhatsApp to affected customers before they contact support.',
    priority: 'High',
    status: 'In Progress',
  },
  {
    id: 'a3',
    problem: '3 negative reviews in 48h for product #4521',
    suggestion:
      "Reviews mention 'size different from advertised'. Update product photos and size guide.",
    priority: 'Medium',
    status: 'Pending',
  },
  {
    id: 'a4',
    problem: 'Post-delivery review collection opportunity — 89 eligible customers',
    suggestion:
      'Trigger review request flow 3 days after delivery confirmation. Expected yield: 35-40 new reviews.',
    priority: 'Low',
    status: 'Done',
  },
]

interface WorkspaceClientProps {
  agentId: string
}

export default function WorkspaceClient({ agentId }: WorkspaceClientProps) {
  const agent = agents.find((a) => a.id === agentId) ?? agents[0]

  return (
    <div className="bg-background flex h-full">
      {/* Left panel — Activity Log */}
      <div className="min-w-0 flex-1">
        <ActivityLog items={mockActivities} />
      </div>

      {/* Right panel — Agent Info Sidebar */}
      <div className="hidden w-[280px] shrink-0 lg:block">
        <AgentInfoSidebar agent={agent} />
      </div>
    </div>
  )
}
