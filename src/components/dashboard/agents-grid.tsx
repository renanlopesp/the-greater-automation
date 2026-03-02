import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import AgentCard, { type AgentCardProps } from '@/components/dashboard/agent-card'

interface AgentsGridProps {
  agents: AgentCardProps[]
}

export default function AgentsGrid({ agents }: AgentsGridProps) {
  return (
    <section className="flex flex-col gap-6">
      <h3 className="text-lg font-semibold">Workers</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {agents.map((a) => (
          <AgentCard
            key={a.agent.id}
            agent={a.agent}
            workflows={a.workflows}
            skillCount={a.skillCount}
          />
        ))}
        <Link href="/agents/new">
          <Card className="border-border hover:border-muted-foreground/50 h-[280px] border-2 border-dashed bg-transparent shadow-none transition-colors">
            <CardContent className="flex h-full flex-col items-center justify-center gap-3">
              <Plus className="text-muted-foreground h-10 w-10" strokeWidth={1.5} />
              <span className="text-muted-foreground text-sm font-medium">Criar novo agente</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </section>
  )
}
