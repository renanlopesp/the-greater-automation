'use client'

import SignalsTable from './signals-table'
import RecommendedActions from './recommended-actions'
import CampaignBuilder from './campaign-builder'
import AgentLog from './agent-log'

const metrics = [
  {
    label: 'At-risk customers',
    value: '284',
    change: '+8% this week',
    color: 'text-red-600 dark:text-red-400',
  },
  {
    label: 'Refund risk',
    value: 'R$3,200',
    change: '12 orders flagged',
    color: 'text-amber-600 dark:text-amber-400',
  },
  {
    label: 'Review opportunities',
    value: '89',
    change: 'Post-delivery eligible',
    color: 'text-green-600 dark:text-green-400',
  },
  {
    label: 'Inactive customers',
    value: '142',
    change: '45+ days no purchase',
    color: 'text-purple-600 dark:text-purple-400',
  },
]

const kpis = [
  { label: 'Repeat purchase rate', value: '22%', sub: '+4pp' },
  { label: 'Refund rate', value: '3.1%', sub: '-1.2pp' },
  { label: 'Avg response time', value: '12 min', sub: '-8 min' },
  { label: 'NPS', value: '76', sub: '+4' },
  { label: 'Reviews collected', value: '142', sub: 'this month' },
  { label: 'Revenue saved', value: 'R$18,400', sub: 'this month' },
  { label: 'LTV uplift', value: '+14%', sub: 'vs 3mo ago' },
]

export default function CSDashboardClient() {
  return (
    <div className="bg-background h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-foreground text-2xl font-semibold tracking-tight">
                Customer Service Agent
              </h1>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Active
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Turn support into retention. Detect at-risk customers and automate personalized
              outreach.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button className="border-border text-foreground hover:bg-muted rounded-xl border px-4 py-2 text-xs font-medium transition-colors">
              Connect channels
            </button>
            <select className="border-border bg-background text-foreground rounded-lg border px-3 py-2 text-xs">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="border-border bg-background rounded-xl border p-5">
              <p className="text-muted-foreground mb-1 text-xs">{m.label}</p>
              <p className={`text-2xl font-semibold ${m.color}`}>{m.value}</p>
              <p className="text-muted-foreground mt-1 text-[11px]">{m.change}</p>
            </div>
          ))}
        </div>

        {/* Signals table */}
        <SignalsTable />

        {/* Recommended actions */}
        <RecommendedActions />

        {/* Campaign builder */}
        <CampaignBuilder />

        {/* Agent log */}
        <AgentLog />

        {/* KPIs grid */}
        <div>
          <h2 className="text-foreground mb-4 text-lg font-medium">Performance Metrics</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="border-border bg-background rounded-xl border p-4">
                <p className="text-muted-foreground mb-1 text-xs">{kpi.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-foreground text-xl font-medium">{kpi.value}</span>
                  <span className="text-muted-foreground text-xs">{kpi.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-10" />
      </div>
    </div>
  )
}
