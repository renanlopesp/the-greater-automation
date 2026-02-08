'use client'

import { useState, useMemo } from 'react'
import WorkspaceHeader from '@/components/workspace/workspace-header'
import WorkspaceFilters, {
  type WorkspaceFiltersState,
} from '@/components/workspace/workspace-filters'
import ViewToggle from '@/components/workspace/view-toggle'
import WorkspaceTable from '@/components/workspace/workspace-table'
import { useDebounce } from '@/hooks/use-debounce'
import type { WorkspaceItem } from '@/lib/queries/workspace'

interface WorkspaceClientProps {
  initialItems: WorkspaceItem[]
  teamId: string
  teamMembers: { id: string; full_name: string | null }[]
}

export default function WorkspaceClient({ initialItems, teamMembers }: WorkspaceClientProps) {
  const [filters, setFilters] = useState<WorkspaceFiltersState>({
    search: '',
    createdBy: 'all',
    status: 'all',
    type: 'all',
  })
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedAgentIds, setExpandedAgentIds] = useState<Set<string>>(new Set())
  const [activeView, setActiveView] = useState<'folder' | 'list' | 'graph'>('list')

  const debouncedSearch = useDebounce(filters.search)

  const filteredItems = useMemo(() => {
    let items = [...initialItems]

    // Type filter
    if (filters.type !== 'all') {
      items = items.filter((item) => item.type === filters.type)
    }

    // Status filter (only applies to workflows)
    if (filters.status !== 'all') {
      items = items.filter((item) => {
        if (item.type === 'workflow') return item.status === filters.status
        if (item.type === 'agent') {
          return item.workflows.some((w) => w.status === filters.status)
        }
        return true
      })
    }

    // Search filter
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase()
      items = items.filter((item) => item.name.toLowerCase().includes(lower))
    }

    // Sort
    items.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name)
      return sortDirection === 'asc' ? cmp : -cmp
    })

    return items
  }, [initialItems, filters.type, filters.status, debouncedSearch, sortDirection])

  function handleSelectionChange(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAll() {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)))
    }
  }

  function handleToggleExpand(id: string) {
    setExpandedAgentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <WorkspaceHeader />
      <div className="flex items-center justify-between gap-4">
        <WorkspaceFilters
          filters={filters}
          onFiltersChange={setFilters}
          teamMembers={teamMembers}
        />
        <ViewToggle activeView={activeView} onViewChange={setActiveView} />
      </div>
      <WorkspaceTable
        items={filteredItems}
        sortDirection={sortDirection}
        onSortChange={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
        onSelectAll={handleSelectAll}
        expandedAgentIds={expandedAgentIds}
        onToggleExpand={handleToggleExpand}
      />
    </div>
  )
}
