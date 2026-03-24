import { Check } from 'lucide-react'

interface ConnectionItem {
  emoji: string
  name: string
  connected: boolean
}

interface ConnectedSkillItem {
  name: string
  reason: string
  active: boolean
}

interface SkillConnectionsSectionProps {
  connections: ConnectionItem[]
  connectedSkills: ConnectedSkillItem[]
}

export default function SkillConnectionsSection({
  connections,
  connectedSkills,
}: SkillConnectionsSectionProps) {
  return (
    <>
      {/* Required connections */}
      {connections.length > 0 && (
        <section>
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
            Required connections
          </p>
          <div className="divide-border border-border divide-y overflow-hidden rounded-2xl border">
            {connections.map((conn) => (
              <div
                key={conn.name}
                className="bg-background flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{conn.emoji}</span>
                  <span className="text-foreground text-sm font-medium">{conn.name}</span>
                </div>
                {conn.connected ? (
                  <span
                    className="flex items-center gap-1.5 text-sm font-medium"
                    style={{ color: 'var(--green)' }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Connected
                  </span>
                ) : (
                  <button
                    className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                    style={{
                      borderColor: 'var(--blue)',
                      color: 'var(--blue)',
                    }}
                  >
                    Connect
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Connected skills */}
      {connectedSkills.length > 0 && (
        <section>
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
            Connected skills
          </p>
          <div className="divide-border border-border divide-y overflow-hidden rounded-2xl border">
            {connectedSkills.map((cs) => (
              <div
                key={cs.name}
                className="bg-background flex items-center justify-between px-5 py-4"
              >
                <div>
                  <p className="text-foreground text-sm font-medium">{cs.name}</p>
                  <p className="text-muted-foreground mt-0.5 text-[12px]">{cs.reason}</p>
                </div>
                {cs.active ? (
                  <span
                    className="ml-3 flex shrink-0 items-center gap-1.5 text-xs font-medium"
                    style={{ color: 'var(--green)' }}
                  >
                    <Check className="h-3 w-3" />
                    Active
                  </span>
                ) : (
                  <span className="text-muted-foreground ml-3 shrink-0 text-xs">Not active</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
