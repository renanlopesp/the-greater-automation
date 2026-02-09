'use client'

import { useState, useMemo } from 'react'
import RunsHeader from '@/components/runs/runs-header'
import RunsFilters, { type RunsFiltersState } from '@/components/runs/runs-filters'
import RunsTable from '@/components/runs/runs-table'
import { useRuns } from '@/hooks/use-runs'
import { useDebounce } from '@/hooks/use-debounce'
import type { FetchRunsResult } from '@/lib/queries/runs'

interface RunsClientProps {
  initialRuns: FetchRunsResult
  teamId: string
  workflows: { id: string; name: string }[]
}

export default function RunsClient({ initialRuns, teamId, workflows }: RunsClientProps) {
  const [filters, setFilters] = useState<RunsFiltersState>({
    search: '',
    status: 'all',
    workflowId: 'all',
  })

  const debouncedSearch = useDebounce(filters.search)

  const queryFilters = useMemo(
    () => ({
      status: filters.status !== 'all' ? filters.status : undefined,
      workflowId: filters.workflowId !== 'all' ? filters.workflowId : undefined,
    }),
    [filters.status, filters.workflowId]
  )

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useRuns(
    teamId,
    queryFilters,
    initialRuns
  )

  const allRuns = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data])

  const filteredRuns = useMemo(() => {
    if (!debouncedSearch) return allRuns
    const lower = debouncedSearch.toLowerCase()
    return allRuns.filter(
      (r) => r.workflow_name.toLowerCase().includes(lower) || r.id.toLowerCase().includes(lower)
    )
  }, [allRuns, debouncedSearch])

  return (
    <div className="mx-auto flex max-w-7xl flex-1 flex-col gap-4 p-6">
      <RunsHeader />
      <RunsFilters filters={filters} onFiltersChange={setFilters} workflows={workflows} />
      <RunsTable
        runs={filteredRuns}
        isLoading={isLoading}
        hasNextPage={hasNextPage ?? false}
        onLoadMore={() => fetchNextPage()}
        isFetchingNextPage={isFetchingNextPage}
      />
    </div>
  )
}
