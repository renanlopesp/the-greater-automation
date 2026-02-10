'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import { toast } from 'sonner'
import WorkspaceHeader from '@/components/workspace/workspace-header'
import WorkspaceFilters from '@/components/workspace/workspace-filters'
import ViewToggle from '@/components/workspace/view-toggle'
import WorkspaceTable from '@/components/workspace/workspace-table'
import { createColumns } from '@/components/workspace/columns'
import { DeleteDialog } from '@/components/workspace/delete-dialog'
import { BulkActionBar } from '@/components/workspace/bulk-action-bar'
import {
  deleteWorkflow,
  deleteAgent,
  duplicateWorkflow,
  renameWorkflow,
  bulkDeleteItems,
  bulkToggleStatus,
} from '@/lib/actions/workspace'
import type { WorkspaceItem, WorkspaceAgent, WorkspaceWorkflow } from '@/lib/queries/workspace'

interface WorkspaceClientProps {
  initialItems: WorkspaceItem[]
  teamId: string
  teamMembers: { id: string; full_name: string | null }[]
  userId: string
}

interface DeleteTarget {
  id: string
  name: string
  type: 'workflow' | 'agent'
}

export default function WorkspaceClient({
  initialItems,
  teamId,
  teamMembers,
  userId,
}: WorkspaceClientProps) {
  const router = useRouter()
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

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  // Bulk delete dialog
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [isBulkLoading, setIsBulkLoading] = useState(false)

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

  const handleDeleteWorkflow = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name, type: 'workflow' })
  }, [])

  const handleDeleteAgent = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name, type: 'agent' })
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result =
        deleteTarget.type === 'workflow'
          ? await deleteWorkflow(deleteTarget.id)
          : await deleteAgent(deleteTarget.id)

      if (result.error) {
        toast.error(result.error)
      } else {
        setRowSelection({})
      }
    } catch {
      toast.error(`Failed to delete ${deleteTarget.type}`)
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget])

  const handleDuplicateWorkflow = useCallback(
    async (id: string) => {
      try {
        const result = await duplicateWorkflow(id, teamId, userId)
        if (result.error) {
          toast.error(result.error)
          return
        }
        if (result.id) {
          router.push(`/workflows/${result.id}/edit`)
        }
      } catch {
        toast.error('Failed to duplicate workflow')
      }
    },
    [teamId, userId, router]
  )

  const handleRenameWorkflow = useCallback(async (id: string, newName: string) => {
    try {
      const result = await renameWorkflow(id, newName)
      if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error('Failed to rename workflow')
    }
  }, [])

  const columns = useMemo(
    () =>
      createColumns({
        userId,
        memberNameById,
        expandedAgentIds,
        onToggleExpand: handleToggleExpand,
        onDeleteWorkflow: handleDeleteWorkflow,
        onDeleteAgent: handleDeleteAgent,
        onDuplicateWorkflow: handleDuplicateWorkflow,
        onRenameWorkflow: handleRenameWorkflow,
      }),
    [
      userId,
      memberNameById,
      expandedAgentIds,
      handleToggleExpand,
      handleDeleteWorkflow,
      handleDeleteAgent,
      handleDuplicateWorkflow,
      handleRenameWorkflow,
    ]
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

  // Bulk actions
  const selectedIds = Object.keys(rowSelection)
  const selectedCount = selectedIds.length
  const selectedItems = useMemo(() => {
    return selectedIds
      .map((id) => flatData.find((item) => item.id === id))
      .filter(Boolean) as WorkspaceItem[]
  }, [selectedIds, flatData])

  const handleBulkDelete = useCallback(() => {
    setBulkDeleteOpen(true)
  }, [])

  const handleConfirmBulkDelete = useCallback(async () => {
    setIsBulkLoading(true)
    try {
      const items = selectedItems.map((item) => ({ id: item.id, type: item.type }))
      const result = await bulkDeleteItems(items)
      if (result.error) {
        toast.error(result.error)
      } else {
        setRowSelection({})
      }
    } catch {
      toast.error('Failed to delete selected items')
    } finally {
      setIsBulkLoading(false)
      setBulkDeleteOpen(false)
    }
  }, [selectedItems])

  const handleBulkChangeStatus = useCallback(
    async (status: 'draft' | 'published') => {
      setIsBulkLoading(true)
      try {
        const workflowIds = selectedItems
          .filter((item) => item.type === 'workflow')
          .map((item) => item.id)

        if (workflowIds.length === 0) {
          toast.error('No workflows selected')
          return
        }

        const result = await bulkToggleStatus(workflowIds, status)
        if (result.error) {
          toast.error(result.error)
        } else {
          setRowSelection({})
        }
      } catch {
        toast.error('Failed to change status')
      } finally {
        setIsBulkLoading(false)
      }
    },
    [selectedItems]
  )

  // Delete dialog description
  const deleteDescription = deleteTarget
    ? deleteTarget.type === 'workflow'
      ? `Are you sure you want to delete "${deleteTarget.name}"? This will also delete all steps, triggers, and runs associated with this workflow.`
      : `Are you sure you want to delete "${deleteTarget.name}"? Workflows assigned to this agent will become standalone.`
    : ''

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-6">
      <WorkspaceHeader teamId={teamId} userId={userId} />
      <div className="flex items-center justify-between gap-4">
        <WorkspaceFilters
          filters={filters}
          onFiltersChange={setFilters}
          teamMembers={teamMembers}
        />
        <ViewToggle activeView={activeView} onViewChange={setActiveView} />
      </div>
      <WorkspaceTable table={table} />

      <BulkActionBar
        selectedCount={selectedCount}
        onDelete={handleBulkDelete}
        onChangeStatus={handleBulkChangeStatus}
        isLoading={isBulkLoading}
      />

      {/* Single delete dialog */}
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={`Delete ${deleteTarget?.type ?? 'item'}`}
        description={deleteDescription}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />

      {/* Bulk delete dialog */}
      <DeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete selected items"
        description={`Are you sure you want to delete ${selectedCount} selected item${selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`}
        onConfirm={handleConfirmBulkDelete}
        loading={isBulkLoading}
      />
    </div>
  )
}
