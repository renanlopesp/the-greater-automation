import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import AgentCard, { type AgentCardProps } from '@/components/dashboard/agent-card'

interface AgentsGridProps {
  agents: AgentCardProps[]
}

export default function AgentsGrid({ agents }: AgentsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {agents.map((a) => (
        <AgentCard key={a.agent.id} agent={a.agent} skills={a.skills} />
      ))}
      <Link href="/agents/new">
        <Card className="border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50 min-h-[180px] border-2 border-dashed transition-colors">
          <CardContent className="flex h-full flex-col items-center justify-center gap-2 p-4">
            <Plus className="text-muted-foreground h-8 w-8" />
            <span className="text-muted-foreground text-sm">Create new agent</span>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
