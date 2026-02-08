'use client'

import { ArrowUp, ArrowDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import AgentRow from '@/components/workspace/agent-row'
import WorkflowRow from '@/components/workspace/workflow-row'
import SkeletonRows from '@/components/shared/skeleton-rows'
import EmptyState from '@/components/shared/empty-state'
import { FolderOpen } from 'lucide-react'
import type { WorkspaceItem } from '@/lib/queries/workspace'

interface WorkspaceTableProps {
  items: WorkspaceItem[]
  sortDirection: 'asc' | 'desc'
  onSortChange: () => void
  selectedIds: Set<string>
  onSelectionChange: (id: string) => void
  onSelectAll: () => void
  expandedAgentIds: Set<string>
  onToggleExpand: (id: string) => void
  isLoading?: boolean
}

export default function WorkspaceTable({
  items,
  sortDirection,
  onSortChange,
  selectedIds,
  onSelectionChange,
  onSelectAll,
  expandedAgentIds,
  onToggleExpand,
  isLoading = false,
}: WorkspaceTableProps) {
  if (!isLoading && items.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen />}
        title="No items yet"
        description="Create a workflow or agent to get started."
        action={{ label: 'New workflow', href: '/workflows/new/edit' }}
      />
    )
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox onCheckedChange={onSelectAll} />
            </TableHead>
            <TableHead>
              <button type="button" onClick={onSortChange} className="flex items-center gap-1">
                Name
                {sortDirection === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
              </button>
            </TableHead>
            <TableHead>Last run</TableHead>
            <TableHead>Created by</TableHead>
            <TableHead>Published</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Steps</TableHead>
            <TableHead>AI</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <SkeletonRows rows={8} columns={9} />
          ) : (
            items.map((item) =>
              item.type === 'agent' ? (
                <AgentRow
                  key={item.id}
                  agent={item}
                  isExpanded={expandedAgentIds.has(item.id)}
                  onToggle={() => onToggleExpand(item.id)}
                  isSelected={selectedIds.has(item.id)}
                  onSelect={onSelectionChange}
                  selectedWorkflowIds={selectedIds}
                  onSelectWorkflow={onSelectionChange}
                />
              ) : (
                <WorkflowRow
                  key={item.id}
                  workflow={item}
                  isSelected={selectedIds.has(item.id)}
                  onSelect={onSelectionChange}
                />
              )
            )
          )}
        </TableBody>
      </Table>
    </div>
  )
}
