'use client'

import { Loader2 } from 'lucide-react'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import RunRow from '@/components/runs/run-row'
import RunsEmptyState from '@/components/runs/runs-empty-state'
import SkeletonRows from '@/components/shared/skeleton-rows'
import type { Run } from '@/lib/queries/runs'

interface RunsTableProps {
  runs: Run[]
  isLoading: boolean
  hasNextPage: boolean
  onLoadMore: () => void
  isFetchingNextPage: boolean
}

export default function RunsTable({
  runs,
  isLoading,
  hasNextPage,
  onLoadMore,
  isFetchingNextPage,
}: RunsTableProps) {
  if (!isLoading && runs.length === 0) {
    return <RunsEmptyState />
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run ID</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>AI Credits</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows rows={8} columns={7} />
            ) : (
              runs.map((run) => <RunRow key={run.id} run={run} />)
            )}
          </TableBody>
        </Table>
      </div>
      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
