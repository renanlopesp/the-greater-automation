'use client'

import { useState } from 'react'
import {
  X,
  FileText,
  Table2,
  BarChart3,
  Megaphone,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Artifact, ArtifactType } from '@/types/artifacts'

interface ArtifactPanelProps {
  artifact: Artifact | null
  onClose: () => void
}

const TYPE_ICONS: Record<ArtifactType, React.ElementType> = {
  data: BarChart3,
  table: Table2,
  document: FileText,
  'campaign-table': Megaphone,
  approval: FileText,
}

const TYPE_LABELS: Record<ArtifactType, string> = {
  data: 'Data',
  table: 'Table',
  document: 'Document',
  'campaign-table': 'Campaign',
  approval: 'Approval',
}

const PRIORITY_VARIANTS: Record<
  string,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }
> = {
  High: {
    variant: 'destructive',
    className:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  },
  Medium: {
    variant: 'outline',
    className:
      'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
  },
  Low: {
    variant: 'secondary',
    className:
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  },
}

function renderDocument(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('## '))
      return (
        <h2 key={i} className="text-foreground mt-4 mb-1.5 text-sm font-semibold">
          {line.slice(3)}
        </h2>
      )
    if (line.startsWith('# '))
      return (
        <h1 key={i} className="text-foreground mb-2 text-[15px] font-semibold">
          {line.slice(2)}
        </h1>
      )
    if (line.startsWith('- '))
      return (
        <p key={i} className="text-foreground/70 flex items-start gap-2 text-sm leading-relaxed">
          <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
          <span>{line.slice(2)}</span>
        </p>
      )
    if (line.trim() === '') return <div key={i} className="h-2" />
    return (
      <p key={i} className="text-foreground/70 text-sm leading-relaxed">
        {line}
      </p>
    )
  })
}

export default function ArtifactPanel({ artifact, onClose }: ArtifactPanelProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  if (!artifact) return null

  const Icon = TYPE_ICONS[artifact.type] ?? FileText
  const typeLabel = TYPE_LABELS[artifact.type] ?? artifact.type

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDir('asc')
    }
  }

  const getSortedRows = () => {
    if (!artifact.rows) return []
    if (!sortColumn) return artifact.rows
    return [...artifact.rows].sort((a, b) => {
      const av = a[sortColumn] ?? ''
      const bv = b[sortColumn] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  return (
    <div
      className={cn(
        'border-border bg-background fixed top-0 right-0 z-40 flex h-full flex-col border-l shadow-xl',
        'w-full md:w-[420px]',
        'translate-x-0 transition-transform duration-200'
      )}
    >
      {/* Header */}
      <div className="border-border flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground/80 truncate text-[13px] font-medium">
            {artifact.title}
          </span>
          <span className="border-border text-muted-foreground shrink-0 rounded border px-1.5 py-0.5 text-[10px]">
            {typeLabel}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:bg-muted hover:text-foreground ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
          aria-label="Close panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── data: KPI table with delta indicators ── */}
        {artifact.type === 'data' && (
          <>
            {/* KPI summary row if kpis present */}
            {artifact.kpis && artifact.kpis.length > 0 && (
              <div className="border-border grid grid-cols-3 border-b">
                {artifact.kpis.slice(0, 3).map((kpi, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex flex-col items-center gap-0.5 px-3 py-4 text-center',
                      i < 2 && 'border-border border-r'
                    )}
                  >
                    <span className="text-foreground/90 text-[19px] leading-none font-semibold tabular-nums">
                      {kpi.value}
                    </span>
                    <span className="text-muted-foreground/60 mt-1 text-[10px] leading-snug">
                      {kpi.label}
                    </span>
                    {kpi.delta && (
                      <span
                        className={cn(
                          'mt-0.5 flex items-center gap-0.5 text-[10px] leading-none',
                          kpi.positive
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-500 dark:text-red-400'
                        )}
                      >
                        {kpi.positive ? (
                          <TrendingUp className="h-2.5 w-2.5" />
                        ) : (
                          <TrendingDown className="h-2.5 w-2.5" />
                        )}
                        {kpi.delta}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* rows table */}
            {artifact.rows && artifact.rows.length > 0 && (
              <div className="p-4">
                <div className="border-border overflow-hidden rounded-xl border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-border bg-muted/30 border-b">
                        <th className="text-muted-foreground px-4 py-2.5 text-left text-[11px] font-medium">
                          Metric
                        </th>
                        <th className="text-muted-foreground px-4 py-2.5 text-right text-[11px] font-medium">
                          Value
                        </th>
                        <th className="text-muted-foreground px-4 py-2.5 text-right text-[11px] font-medium">
                          Change
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {artifact.rows.map((row, i) => (
                        <tr
                          key={i}
                          className="border-border hover:bg-muted/20 border-b transition-colors last:border-0"
                        >
                          <td className="text-foreground/70 px-4 py-3 text-sm">
                            {String(row.label ?? '')}
                          </td>
                          <td className="text-foreground/70 px-4 py-3 text-right text-sm font-medium">
                            {String(row.value ?? '')}
                          </td>
                          <td
                            className={cn(
                              'px-4 py-3 text-right text-[12px]',
                              row.delta
                                ? row.positive
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-500 dark:text-red-400'
                                : 'text-muted-foreground'
                            )}
                          >
                            {row.delta ? (
                              <span className="flex items-center justify-end gap-0.5">
                                {row.positive ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : row.positive === false ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : (
                                  <Minus className="h-3 w-3" />
                                )}
                                {String(row.delta)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* remaining KPIs if more than 3 */}
            {artifact.kpis && artifact.kpis.length > 3 && (
              <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                {artifact.kpis.slice(3).map((kpi, i) => (
                  <div
                    key={i}
                    className="border-border bg-muted/20 flex flex-col gap-0.5 rounded-xl border px-4 py-3"
                  >
                    <span className="text-muted-foreground/60 text-[10.5px] leading-tight">
                      {kpi.label}
                    </span>
                    <span className="text-foreground/85 text-[18px] leading-tight font-semibold tracking-tight">
                      {kpi.value}
                    </span>
                    {kpi.delta && (
                      <span
                        className={cn(
                          'text-[10.5px] leading-tight',
                          kpi.positive
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-500 dark:text-red-400'
                        )}
                      >
                        {kpi.delta}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── table: sortable generic table ── */}
        {artifact.type === 'table' && artifact.columns && artifact.rows && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-border bg-muted/30 border-b">
                  {artifact.columns.map((col) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="text-muted-foreground hover:text-foreground/70 cursor-pointer px-4 py-2.5 text-left text-[11px] font-medium select-none"
                    >
                      <span className="flex items-center gap-1">
                        {col}
                        {sortColumn === col && (
                          <span className="text-[9px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getSortedRows().map((row, i) => (
                  <tr
                    key={i}
                    className="border-border hover:bg-muted/20 border-b transition-colors last:border-0"
                  >
                    {artifact.columns!.map((col) => (
                      <td key={col} className="text-foreground/70 px-4 py-3 text-[12px]">
                        {String(row[col] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── document: rendered markdown ── */}
        {artifact.type === 'document' && artifact.content && (
          <div className="px-6 py-5">{renderDocument(artifact.content)}</div>
        )}

        {/* ── campaign-table: marketing table with priority badges ── */}
        {artifact.type === 'campaign-table' && artifact.rows && (
          <div className="flex flex-col">
            <div className="border-border flex items-center gap-2 border-b px-5 py-3">
              <TrendingUp className="text-muted-foreground h-3.5 w-3.5" />
              <span className="text-muted-foreground text-[11px]">
                {artifact.rows.length} marketing opportunities
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-border bg-muted/30 border-b">
                    <th className="text-muted-foreground px-4 py-2.5 text-left text-[11px] font-medium">
                      Segment
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-left text-[11px] font-medium">
                      Product / Action
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-left text-[11px] font-medium">
                      Channel
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-[11px] font-medium">
                      Value
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-[11px] font-medium">
                      Status
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-[11px] font-medium">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {artifact.rows.map((row, i) => {
                    const priority = String(row.priority ?? '')
                    const priorityCfg = PRIORITY_VARIANTS[priority] ?? PRIORITY_VARIANTS['Low']
                    return (
                      <tr
                        key={i}
                        className="border-border hover:bg-muted/20 border-b transition-colors last:border-0"
                      >
                        <td className="text-foreground/80 max-w-[120px] truncate px-4 py-3 text-[12px] font-medium">
                          {String(row.segment ?? '—')}
                        </td>
                        <td className="text-foreground/60 max-w-[130px] truncate px-4 py-3 text-[12px]">
                          {String(row.product ?? '—')}
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-[12px]">
                          {String(row.channel ?? '—')}
                        </td>
                        <td className="text-foreground/70 px-4 py-3 text-right text-[12px] font-medium tabular-nums">
                          {String(row.potentialValue ?? '—')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.status ? (
                            <span className="text-muted-foreground text-[10px]">
                              {String(row.status)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px]', priorityCfg.className)}
                          >
                            {priority || '—'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── approval: fallback doc render ── */}
        {artifact.type === 'approval' && artifact.content && (
          <div className="px-6 py-5">{renderDocument(artifact.content)}</div>
        )}
      </div>
    </div>
  )
}
