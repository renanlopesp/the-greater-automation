'use client'

import { useState, useMemo, useCallback, lazy, Suspense } from 'react'
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
import { FolderBreadcrumb } from '@/components/workspace/folder-breadcrumb'
import { DeleteFolderDialog } from '@/components/workspace/delete-folder-dialog'
import { MoveToFolderDialog } from '@/components/workspace/move-to-folder-dialog'
import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation'

const GraphView = lazy(() => import('@/components/workspace/graph-view'))
import {
  deleteWorkflow,
  deleteAgent,
  duplicateWorkflow,
  renameWorkflow,
  bulkDeleteItems,
  bulkToggleStatus,
} from '@/lib/actions/workspace'
import type {
  WorkspaceItem,
  WorkspaceAgent,
  WorkspaceWorkflow,
  WorkspaceFolder,
  FolderTreeNode,
} from '@/lib/queries/workspace'

interface WorkspaceClientProps {
  initialItems: WorkspaceItem[]
  teamId: string
  teamMembers: { id: string; full_name: string | null }[]
  userId: string
  folders: WorkspaceFolder[]
  folderTree: FolderTreeNode[]
}

interface DeleteTarget {
  id: string
  name: string
  type: 'workflow' | 'agent'
}

interface DeleteFolderTarget {
  id: string
  name: string
  workflowCount: number
  subfolderCount: number
}

export default function WorkspaceClient({
  initialItems,
  teamId,
  teamMembers,
  userId,
  folders,
  folderTree,
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
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set())
  const [activeView, setActiveView] = useState<'folder' | 'list' | 'graph'>('folder')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  // Bulk delete dialog
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [isBulkLoading, setIsBulkLoading] = useState(false)
  // Folder delete dialog
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<DeleteFolderTarget | null>(null)
  // Move to folder dialog
  const [moveToFolderOpen, setMoveToFolderOpen] = useState(false)

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

  const handleToggleFolderExpand = useCallback((id: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleNavigateFolder = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId)
    setRowSelection({})
  }, [])

  const handleDeleteWorkflow = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name, type: 'workflow' })
  }, [])

  const handleDeleteAgent = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name, type: 'agent' })
  }, [])

  const handleDeleteFolder = useCallback(
    (id: string) => {
      const folder = folders.find((f) => f.id === id)
      if (!folder) return
      setDeleteFolderTarget({
        id: folder.id,
        name: folder.name,
        workflowCount: folder.workflow_count,
        subfolderCount: folder.subfolder_count,
      })
    },
    [folders]
  )

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
        router.refresh()
      }
    } catch {
      toast.error(`Failed to delete ${deleteTarget.type}`)
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, router])

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

  const handleMoveToFolder = useCallback(() => {
    setMoveToFolderOpen(true)
  }, [])

  const columns = useMemo(
    () =>
      createColumns({
        userId,
        memberNameById,
        expandedAgentIds,
        expandedFolderIds,
        onToggleExpand: handleToggleExpand,
        onToggleFolderExpand: handleToggleFolderExpand,
        onDeleteWorkflow: handleDeleteWorkflow,
        onDeleteAgent: handleDeleteAgent,
        onDeleteFolder: handleDeleteFolder,
        onDuplicateWorkflow: handleDuplicateWorkflow,
        onRenameWorkflow: handleRenameWorkflow,
        onMoveToFolder: handleMoveToFolder,
        onNavigateFolder: handleNavigateFolder,
      }),
    [
      userId,
      memberNameById,
      expandedAgentIds,
      expandedFolderIds,
      handleToggleExpand,
      handleToggleFolderExpand,
      handleDeleteWorkflow,
      handleDeleteAgent,
      handleDeleteFolder,
      handleDuplicateWorkflow,
      handleRenameWorkflow,
      handleMoveToFolder,
      handleNavigateFolder,
    ]
  )

  // Build a map of folder_id -> workflows for folder view
  const workflowsByFolder = useMemo(() => {
    const map: Record<string, WorkspaceWorkflow[]> = {}
    for (const item of initialItems) {
      if (item.type === 'workflow') {
        const w = item as WorkspaceWorkflow
        const fid = w.folder_id ?? '__root__'
        if (!map[fid]) map[fid] = []
        map[fid].push(w)
      }
    }
    return map
  }, [initialItems])

  // Flatten items based on active view and current folder
  const flatData = useMemo(() => {
    const hasTypeFilter = !!filters.type
    const hasCreatedByFilter = !!filters.createdBy
    const hasStatusFilter = !!filters.status
    const searchLower = filters.search ? filters.search.toLowerCase() : ''

    function matchesFilters(item: WorkspaceItem): boolean {
      if (hasTypeFilter && item.type !== filters.type) return false
      if (hasCreatedByFilter && item.created_by !== filters.createdBy) return false
      if (hasStatusFilter) {
        if (item.type === 'workflow' && (item as WorkspaceWorkflow).status !== filters.status)
          return false
        if (
          item.type === 'agent' &&
          !(item as WorkspaceAgent).workflows.some((w) => w.status === filters.status)
        )
          return false
        if (item.type === 'folder') return false // folders don't have status
      }
      if (searchLower && !item.name.toLowerCase().includes(searchLower)) return false
      return true
    }

    // In folder view, show folder contents when navigating
    if (activeView === 'folder' && currentFolderId) {
      const result: WorkspaceItem[] = []
      // Show subfolders of current folder
      for (const folder of folders) {
        if (folder.parent_id !== currentFolderId) continue
        if (!matchesFilters(folder)) continue
        result.push(folder)
      }
      // Show workflows in current folder
      for (const item of initialItems) {
        if (item.type !== 'workflow') continue
        if (item.folder_id !== currentFolderId) continue
        if (!matchesFilters(item)) continue
        result.push(item)
      }
      return result
    }

    // In folder view at root, show root-level folders + items without folders
    if (activeView === 'folder') {
      const result: WorkspaceItem[] = []
      // Root folders first
      for (const folder of folders) {
        if (folder.parent_id !== null) continue
        if (!matchesFilters(folder)) continue
        result.push(folder)
        // Show folder contents if expanded
        if (expandedFolderIds.has(folder.id)) {
          const folderWorkflows = workflowsByFolder[folder.id] ?? []
          for (const w of folderWorkflows) {
            if (!matchesFilters(w)) continue
            result.push(w)
          }
        }
      }
      // Then items without folders (standalone workflows + agents)
      for (const item of initialItems) {
        if (item.type === 'folder') continue
        if (item.type === 'workflow') {
          const w = item as WorkspaceWorkflow & { folder_id?: string | null }
          if (w.folder_id) continue // skip workflows in folders
        }
        if (!matchesFilters(item)) continue
        result.push(item)
        if (item.type === 'agent' && expandedAgentIds.has(item.id)) {
          for (const w of (item as WorkspaceAgent).workflows) {
            result.push(w)
          }
        }
      }
      return result
    }

    // List view: flat list without folders
    const result: WorkspaceItem[] = []
    for (const item of initialItems) {
      if (item.type === 'folder') continue
      if (!matchesFilters(item)) continue
      result.push(item)
      if (item.type === 'agent' && expandedAgentIds.has(item.id)) {
        for (const w of (item as WorkspaceAgent).workflows) {
          result.push(w)
        }
      }
    }
    return result
  }, [
    initialItems,
    filters,
    expandedAgentIds,
    expandedFolderIds,
    activeView,
    currentFolderId,
    folders,
    workflowsByFolder,
  ])

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
      const items = selectedItems
        .filter((item): item is WorkspaceAgent | WorkspaceWorkflow => item.type !== 'folder')
        .map((item) => ({ id: item.id, type: item.type }))
      const result = await bulkDeleteItems(items)
      if (result.error) {
        toast.error(result.error)
      } else {
        setRowSelection({})
        router.refresh()
      }
    } catch {
      toast.error('Failed to delete selected items')
    } finally {
      setIsBulkLoading(false)
      setBulkDeleteOpen(false)
    }
  }, [selectedItems, router])

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
          router.refresh()
        }
      } catch {
        toast.error('Failed to change status')
      } finally {
        setIsBulkLoading(false)
      }
    },
    [selectedItems, router]
  )

  const handleBulkMoveToFolder = useCallback(() => {
    setMoveToFolderOpen(true)
  }, [])

  // Keyboard navigation
  const handleKeyboardOpen = useCallback(
    (index: number) => {
      const item = flatData[index]
      if (!item) return
      if (item.type === 'workflow') {
        router.push(`/workflows/${item.id}/edit`)
      } else if (item.type === 'agent') {
        router.push(`/agents/${item.id}`)
      } else if (item.type === 'folder') {
        setCurrentFolderId(item.id)
      }
    },
    [flatData, router]
  )

  const handleKeyboardDelete = useCallback(
    (index: number) => {
      const item = flatData[index]
      if (!item) return
      if (item.type === 'workflow') {
        handleDeleteWorkflow(item.id, item.name)
      } else if (item.type === 'agent') {
        handleDeleteAgent(item.id, item.name)
      } else if (item.type === 'folder') {
        handleDeleteFolder(item.id)
      }
    },
    [flatData, handleDeleteWorkflow, handleDeleteAgent, handleDeleteFolder]
  )

  const handleKeyboardSelect = useCallback(
    (index: number) => {
      const item = flatData[index]
      if (!item) return
      setRowSelection((prev) => {
        const next = { ...prev }
        if (next[item.id]) {
          delete next[item.id]
        } else {
          next[item.id] = true
        }
        return next
      })
    },
    [flatData]
  )

  const { focusedIndex, onKeyDown: handleTableKeyDown } = useKeyboardNavigation({
    itemCount: flatData.length,
    onOpen: handleKeyboardOpen,
    onDelete: handleKeyboardDelete,
    onSelect: handleKeyboardSelect,
  })

  // Delete dialog description
  const deleteDescription = deleteTarget
    ? deleteTarget.type === 'workflow'
      ? `Are you sure you want to delete "${deleteTarget.name}"? This will also delete all steps, triggers, and runs associated with this workflow.`
      : `Are you sure you want to delete "${deleteTarget.name}"? Workflows assigned to this agent will become standalone.`
    : ''

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-6">
      <WorkspaceHeader teamId={teamId} userId={userId} currentFolderId={currentFolderId} />

      {currentFolderId && (
        <FolderBreadcrumb
          currentFolderId={currentFolderId}
          folders={folders}
          onNavigate={handleNavigateFolder}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <WorkspaceFilters
          filters={filters}
          onFiltersChange={setFilters}
          teamMembers={teamMembers}
        />
        <ViewToggle activeView={activeView} onViewChange={setActiveView} />
      </div>

      {activeView === 'graph' ? (
        <Suspense
          fallback={
            <div className="flex h-[500px] w-full items-center justify-center rounded-lg border">
              <p className="text-muted-foreground text-sm">Loading graph...</p>
            </div>
          }
        >
          <GraphView items={initialItems} />
        </Suspense>
      ) : (
        <WorkspaceTable table={table} focusedIndex={focusedIndex} onKeyDown={handleTableKeyDown} />
      )}

      <BulkActionBar
        selectedCount={selectedCount}
        onDelete={handleBulkDelete}
        onChangeStatus={handleBulkChangeStatus}
        onMoveToFolder={handleBulkMoveToFolder}
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

      {/* Folder delete dialog */}
      {deleteFolderTarget && (
        <DeleteFolderDialog
          open={!!deleteFolderTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteFolderTarget(null)
          }}
          folderId={deleteFolderTarget.id}
          folderName={deleteFolderTarget.name}
          workflowCount={deleteFolderTarget.workflowCount}
          subfolderCount={deleteFolderTarget.subfolderCount}
        />
      )}

      {/* Move to folder dialog */}
      <MoveToFolderDialog
        open={moveToFolderOpen}
        onOpenChange={setMoveToFolderOpen}
        itemIds={selectedIds}
        folderTree={folderTree}
      />
    </div>
  )
}
