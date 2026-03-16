'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Signal {
  customer: string
  segment: string
  signal: string
  severity: 'High' | 'Med' | 'Low'
  action: string
  lastSeen: string
}

const segmentColors: Record<string, string> = {
  VIP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'At-risk': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  New: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Post-delivery': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400',
}

const severityColors: Record<string, string> = {
  High: 'text-red-600 dark:text-red-400',
  Med: 'text-amber-600 dark:text-amber-400',
  Low: 'text-muted-foreground',
}

const signals: Signal[] = [
  {
    customer: 'Maria Silva',
    segment: 'VIP',
    signal: 'No purchase in 45 days',
    severity: 'High',
    action: 'Win-back WhatsApp',
    lastSeen: '2h ago',
  },
  {
    customer: 'João Santos',
    segment: 'At-risk',
    signal: '2 refund requests',
    severity: 'High',
    action: 'Personal outreach',
    lastSeen: '4h ago',
  },
  {
    customer: 'Ana Costa',
    segment: 'Post-delivery',
    signal: 'Delivery delayed 3 days',
    severity: 'Med',
    action: 'Proactive notification',
    lastSeen: '1h ago',
  },
  {
    customer: 'Pedro Oliveira',
    segment: 'New',
    signal: 'First purchase completed',
    severity: 'Low',
    action: 'Welcome flow',
    lastSeen: '30m ago',
  },
  {
    customer: 'Carla Lima',
    segment: 'Inactive',
    signal: 'No activity in 60 days',
    severity: 'Med',
    action: 'Re-engagement email',
    lastSeen: '6h ago',
  },
  {
    customer: 'Bruno Souza',
    segment: 'VIP',
    signal: 'Negative review posted',
    severity: 'High',
    action: 'Recovery outreach',
    lastSeen: '45m ago',
  },
]

const segments = ['All', 'VIP', 'At-risk', 'New', 'Post-delivery', 'Inactive']
const severities = ['All', 'High', 'Med', 'Low']

export default function SignalsTable() {
  const [segmentFilter, setSegmentFilter] = useState('All')
  const [severityFilter, setSeverityFilter] = useState('All')

  const filtered = signals.filter((s) => {
    if (segmentFilter !== 'All' && s.segment !== segmentFilter) return false
    if (severityFilter !== 'All' && s.severity !== severityFilter) return false
    return true
  })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-foreground text-lg font-medium">What we found</h2>
        <div className="flex items-center gap-2">
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            className="border-border bg-background text-foreground rounded-lg border px-3 py-1.5 text-xs"
          >
            {segments.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="border-border bg-background text-foreground rounded-lg border px-3 py-1.5 text-xs"
          >
            {severities.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-border overflow-hidden rounded-2xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border bg-muted/40 border-b">
              <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                Customer
              </th>
              <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                Segment
              </th>
              <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                Signal
              </th>
              <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                Severity
              </th>
              <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                Suggested action
              </th>
              <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                Last seen
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {filtered.map((s, i) => (
              <tr key={i} className="hover:bg-muted/30 transition-colors">
                <td className="text-foreground px-4 py-3 font-medium">{s.customer}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium',
                      segmentColors[s.segment]
                    )}
                  >
                    {s.segment}
                  </span>
                </td>
                <td className="text-muted-foreground px-4 py-3">{s.signal}</td>
                <td className={cn('px-4 py-3 font-medium', severityColors[s.severity])}>
                  {s.severity}
                </td>
                <td className="text-muted-foreground px-4 py-3">{s.action}</td>
                <td className="text-muted-foreground px-4 py-3">{s.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
