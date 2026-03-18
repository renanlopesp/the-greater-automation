'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCard {
  label: string
  value: string
  trend: 'up' | 'down' | 'neutral'
  trendValue?: string
  subText: string
}

async function fetchResultsKpis(agentId: string): Promise<KpiCard[]> {
  const supabase = createBrowserClient()

  // Fetch last 30 days of kpi-summary outputs for this agent
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: rows } = await supabase
    .from('workflow_run_outputs' as never)
    .select('id, output_type, output_data, summary_text, created_at, agent_modules!inner(agent_id)')
    .eq('agent_modules.agent_id' as never, agentId)
    .eq('output_type', 'kpi-summary')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  if (!rows || (rows as unknown[]).length === 0) return []

  type KpiRow = { output_data: { kpis?: { label: string; value: string }[] } }
  const typedRows = rows as KpiRow[]

  // Aggregate: sum numeric values, keep last string values
  const aggregated = new Map<string, { values: number[]; lastValue: string }>()

  for (const row of typedRows) {
    const kpis = row.output_data?.kpis ?? []
    for (const kpi of kpis) {
      const num = parseFloat(kpi.value.replace(/[^\d.,]/g, '').replace(',', '.'))
      const existing = aggregated.get(kpi.label) ?? { values: [], lastValue: kpi.value }
      if (!isNaN(num)) {
        existing.values.push(num)
      }
      existing.lastValue = kpi.value
      aggregated.set(kpi.label, existing)
    }
  }

  return Array.from(aggregated.entries()).map(([label, data]) => {
    const avg =
      data.values.length > 0 ? data.values.reduce((a, b) => a + b, 0) / data.values.length : null
    const last = data.values[0] ?? null
    const prev = data.values[1] ?? null

    let trend: 'up' | 'down' | 'neutral' = 'neutral'
    let trendValue: string | undefined

    if (last !== null && prev !== null && prev !== 0) {
      const delta = ((last - prev) / prev) * 100
      if (delta > 2) {
        trend = 'up'
        trendValue = `+${delta.toFixed(0)}%`
      } else if (delta < -2) {
        trend = 'down'
        trendValue = `${delta.toFixed(0)}%`
      }
    }

    return {
      label,
      value: data.lastValue,
      trend,
      trendValue,
      subText: avg !== null ? `média 30 dias: ${avg.toFixed(1)}` : 'últimos 30 dias',
    }
  })
}

interface AgentResultsTabProps {
  agentId: string
}

export default function AgentResultsTab({ agentId }: AgentResultsTabProps) {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['agent-results', agentId],
    queryFn: () => fetchResultsKpis(agentId),
    staleTime: 5 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border-border bg-muted/40 h-24 animate-pulse rounded-xl border" />
        ))}
      </div>
    )
  }

  if (!kpis || kpis.length === 0) {
    return (
      <div className="border-border rounded-xl border p-8 text-center">
        <p className="text-muted-foreground text-sm">Sem dados ainda.</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Os resultados aparecerão após os módulos executarem.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-foreground text-sm font-medium">Resultados — últimos 30 dias</h3>
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="border-border bg-card rounded-xl border p-4">
            <p className="text-muted-foreground text-xs">{kpi.label}</p>
            <div className="mt-1 flex items-end justify-between gap-1">
              <p className="text-foreground text-lg leading-none font-semibold">{kpi.value}</p>
              {kpi.trendValue && (
                <div
                  className={cn(
                    'flex items-center gap-0.5 text-[11px] font-medium',
                    kpi.trend === 'up' && 'text-green-600',
                    kpi.trend === 'down' && 'text-red-500',
                    kpi.trend === 'neutral' && 'text-muted-foreground'
                  )}
                >
                  {kpi.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                  {kpi.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                  {kpi.trend === 'neutral' && <Minus className="h-3 w-3" />}
                  {kpi.trendValue}
                </div>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">{kpi.subText}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
