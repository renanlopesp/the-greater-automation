'use client'

import CoworkerAvatar from '@/components/coworker-avatar'
import { useAgentActivity } from '@/hooks/use-agent-activity'
import { useAgentWorkspaceStore } from '@/stores/agent-workspace-store'
import AgentActivityItem from './agent-activity-item'

interface AgentActivityFeedProps {
  agentId: string
  agentName: string
  agentAvatarSrc?: string
}

/** Parses **bold** markers into <strong> tags */
function parseBoldText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function AgentActivityFeed({
  agentId,
  agentName,
  agentAvatarSrc,
}: AgentActivityFeedProps) {
  const { data, isLoading } = useAgentActivity(agentId)
  const selectedArtifactId = useAgentWorkspaceStore((s) => s.selectedArtifactId)

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {/* Hero skeleton */}
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="bg-muted h-20 w-20 animate-pulse rounded-full" />
          <div className="bg-muted h-4 w-24 animate-pulse rounded" />
        </div>
      </div>
    )
  }

  const hasData = data && (data.summary || data.kpis.length > 0 || data.actions.length > 0)

  return (
    <div className="space-y-3">
      {/* Hero: avatar + name */}
      <div className="flex flex-col items-center gap-1 pt-4 pb-1">
        <div
          className="relative flex items-center justify-center"
          style={{ width: 84, height: 84 }}
        >
          {/* Outer pulse ring */}
          <span className="absolute inset-0 animate-[pulse_2.5s_ease-out_infinite] rounded-full border border-[hsl(200_90%_55%/0.18)]" />
          {/* Inner pulse ring */}
          <span className="absolute inset-0 animate-[pulse_2.5s_ease-out_infinite_1.25s] rounded-full border border-[hsl(200_90%_55%/0.30)]" />
          {/* Avatar */}
          <div className="relative z-10">
            <CoworkerAvatar src={agentAvatarSrc} name={agentName} size="lg" />
          </div>
        </div>
        <p className="text-foreground/80 mt-0 text-[13px] font-medium">{agentName}</p>
      </div>

      {!hasData ? (
        /* Empty state */
        <div className="border-border rounded-xl border p-4 text-center">
          <p className="text-muted-foreground text-sm">Aguardando primeira execução...</p>
        </div>
      ) : (
        <>
          {/* Activity snapshot */}
          <div className="border-border rounded-xl border">
            {/* Summary message */}
            {data.summary && (
              <div className="border-border border-b p-3">
                <p className="text-foreground text-xs leading-relaxed">
                  {parseBoldText(data.summary)}
                </p>
              </div>
            )}

            {/* KPI rows */}
            {data.kpis.length > 0 && (
              <div>
                {data.kpis.map((kpi, i) => (
                  <div
                    key={i}
                    className="border-border flex items-center justify-between border-t px-3 py-2"
                  >
                    <span className="text-muted-foreground text-xs">{kpi.label}</span>
                    <span className="text-foreground text-xs font-semibold">{kpi.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* "o que fiz hoje" */}
          {data.actions.length > 0 && (
            <div className="border-border rounded-xl border">
              <div className="border-border border-b px-3 py-2">
                <p className="text-muted-foreground text-xs">o que fiz hoje</p>
              </div>
              <div className="p-1.5">
                {data.actions.map((item) => (
                  <AgentActivityItem
                    key={item.id}
                    item={item}
                    isSelected={selectedArtifactId === item.runOutputId}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
