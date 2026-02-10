'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
} from '@tanstack/react-table'
import { useQueryStates, parseAsString } from 'nuqs'
import WorkspaceHeader from '@/components/workspace/workspace-header'
import WorkspaceFilters from '@/components/workspace/workspace-filters'
import ViewToggle from '@/components/workspace/view-toggle'
import WorkspaceTable from '@/components/workspace/workspace-table'
import { createColumns } from '@/components/workspace/columns'
import type { WorkspaceItem, WorkspaceAgent, WorkspaceWorkflow } from '@/lib/queries/workspace'

interface WorkspaceClientProps {
  initialItems: WorkspaceItem[]
  teamId: string
  teamMembers: { id: string; full_name: string | null }[]
  userId: string
}

export default function WorkspaceClient({
  initialItems,
  teamMembers,
  userId,
}: WorkspaceClientProps) {
  const [filters, setFilters] = useQueryStates({
    search: parseAsString.withDefault(''),
    status: parseAsString.withDefault(''),
    type: parseAsString.withDefault(''),
    createdBy: parseAsString.withDefault(''),
  })

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [expandedAgentIds, setExpandedAgentIds] = useState<Set<string>>(new Set())
  const [activeView, setActiveView] = useState<'folder' | 'list' | 'graph'>('folder')

  const memberNameById = useMemo(() => {
    return new Map(teamMembers.map((m) => [m.id, m.full_name ?? null]))
  }, [teamMembers])

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedAgentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const columns = useMemo(
    () =>
      createColumns({
        userId,
        memberNameById,
        expandedAgentIds,
        onToggleExpand: handleToggleExpand,
      }),
    [userId, memberNameById, expandedAgentIds]
  )

  // Flatten agent nested workflows into table data when expanded
  const flatData = useMemo(() => {
    const hasTypeFilter = !!filters.type
    const hasCreatedByFilter = !!filters.createdBy
    const hasStatusFilter = !!filters.status
    const searchLower = filters.search ? filters.search.toLowerCase() : ''

    // Single-pass filter + flatten
    const result: WorkspaceItem[] = []
    for (const item of initialItems) {
      if (hasTypeFilter && item.type !== filters.type) continue
      if (hasCreatedByFilter && item.created_by !== filters.createdBy) continue
      if (hasStatusFilter) {
        if (item.type === 'workflow' && (item as WorkspaceWorkflow).status !== filters.status)
          continue
        if (
          item.type === 'agent' &&
          !(item as WorkspaceAgent).workflows.some((w) => w.status === filters.status)
        )
          continue
      }
      if (searchLower && !item.name.toLowerCase().includes(searchLower)) continue

      result.push(item)
      if (item.type === 'agent' && expandedAgentIds.has(item.id)) {
        for (const w of (item as WorkspaceAgent).workflows) {
          result.push(w)
        }
      }
    }

    return result
  }, [initialItems, filters, expandedAgentIds])

  const table = useReactTable({
    data: flatData,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
  })

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-6">
      <WorkspaceHeader />
      <div className="flex items-center justify-between gap-4">
        <WorkspaceFilters
          filters={filters}
          onFiltersChange={setFilters}
          teamMembers={teamMembers}
        />
        <ViewToggle activeView={activeView} onViewChange={setActiveView} />
      </div>
      <WorkspaceTable table={table} />
    </div>
  )
}
