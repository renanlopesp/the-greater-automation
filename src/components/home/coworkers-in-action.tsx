'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { type AgentCard } from '@/data/home-dashboard'
import { useCoworkerAvatars } from '@/hooks/use-coworker-avatars'
import CoworkerAvatar from '@/components/coworker-avatar'

interface CoworkersInActionProps {
  onSelectAgent: (agent: AgentCard) => void
  agents?: AgentCard[]
}

export default function CoworkersInAction({ onSelectAgent, agents }: CoworkersInActionProps) {
  const { avatars } = useCoworkerAvatars()

  const activeAgents = agents?.filter((a) => !a.inactive) ?? []

  if (activeAgents.length === 0) return null

  return (
    <div>
      <h2 className="text-foreground mb-4 text-lg font-medium">Co-workers em ação</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activeAgents.map((agent) => {
          const avatarUrl = agent.avatarUrl ?? avatars[agent.id]

          return (
            <div
              key={agent.id}
              onClick={() => onSelectAgent(agent)}
              className="group border-border bg-background hover:border-foreground/50 flex cursor-pointer flex-col rounded-2xl border transition-colors"
            >
              <div className="flex flex-1 flex-col gap-3 p-7">
                <div className="flex items-center gap-2.5">
                  <CoworkerAvatar src={avatarUrl} name={agent.name} size="xs" />
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <p className="text-foreground text-sm leading-tight font-medium">
                      {agent.name}
                    </p>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span
                        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                        style={{ backgroundColor: 'hsl(142 71% 45%)' }}
                      />
                      <span
                        className="relative inline-flex h-2 w-2 rounded-full"
                        style={{ backgroundColor: 'hsl(142 71% 45%)' }}
                      />
                    </span>
                  </div>
                </div>
                <p className="text-muted-foreground line-clamp-2 text-[13px] leading-relaxed">
                  {agent.summary}
                </p>
                {agent.kpis.length > 0 && (
                  <div className="border-border mt-auto border-t pt-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <p className="text-muted-foreground/60 mb-1 text-[11px]">Resultado recente</p>
                    <p className="text-muted-foreground text-[13px]">
                      {agent.kpis[0].value} {agent.kpis[0].label}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <Link
          href="/agents"
          className="border-border bg-background hover:border-foreground/30 hover:bg-muted/30 flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-7 transition-colors"
        >
          <div className="bg-muted flex h-7 w-7 items-center justify-center rounded-full">
            <Plus className="text-muted-foreground h-3.5 w-3.5" />
          </div>
          <p className="text-muted-foreground text-sm">Adicionar co-worker</p>
        </Link>
      </div>
    </div>
  )
}
