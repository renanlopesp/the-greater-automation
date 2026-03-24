type DiagnosticItem = string | { title: string; description: string }

interface DiagnosticListProps {
  strengths: DiagnosticItem[]
  alerts: DiagnosticItem[]
}

function getItemText(item: DiagnosticItem): string {
  if (typeof item === 'string') return item
  return item.title + (item.description ? ` — ${item.description}` : '')
}

export function DiagnosticList({ strengths, alerts }: DiagnosticListProps) {
  return (
    <div className="mb-6">
      <span className="text-muted-foreground mb-2 block text-[11px] font-semibold tracking-[0.05em] uppercase">
        Diagnóstico de performance
      </span>
      <div className="flex flex-col gap-1.5">
        {strengths.map((item, i) => (
          <div
            key={`strength-${i}`}
            className="flex items-start gap-2.5 rounded-lg px-3 py-2"
            style={{ background: 'hsl(var(--green-bg))' }}
          >
            <span
              className="mt-[3px] flex-shrink-0 text-[11px] font-bold"
              style={{ color: 'hsl(var(--green))' }}
            >
              ✓
            </span>
            <p className="text-muted-foreground text-[13px] leading-relaxed">{getItemText(item)}</p>
          </div>
        ))}
        {alerts.map((item, i) => (
          <div
            key={`alert-${i}`}
            className="flex items-start gap-2.5 rounded-lg px-3 py-2"
            style={{ background: 'hsl(var(--amber-bg))' }}
          >
            <span
              className="mt-[3px] flex-shrink-0 text-[11px] font-bold"
              style={{ color: 'hsl(var(--amber))' }}
            >
              !
            </span>
            <p className="text-muted-foreground text-[13px] leading-relaxed">{getItemText(item)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
