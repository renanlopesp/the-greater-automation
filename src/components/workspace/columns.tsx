'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Sparkles,
  FolderOpen,
} from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import BoringAvatar from 'boring-avatars'
import { getAgentPalette } from '@/lib/agent-palettes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatRelativeTime } from '@/lib/utils/format-relative-time'
import { InlineFolderName } from '@/components/workspace/inline-folder-name'
import type {
  WorkspaceItem,
  WorkspaceAgent,
  WorkspaceWorkflow,
  WorkspaceFolder,
} from '@/lib/queries/workspace'

export interface ColumnMeta {
  userId: string
  memberNameById: Map<string, string | null>
  expandedAgentIds: Set<string>
  expandedFolderIds: Set<string>
  onToggleExpand: (id: string) => void
  onToggleFolderExpand: (id: string) => void
  onDeleteWorkflow?: (id: string, name: string) => void
  onDeleteAgent?: (id: string, name: string) => void
  onDeleteFolder?: (id: string) => void
  onDuplicateWorkflow?: (id: string) => void
  onRenameWorkflow?: (id: string, newName: string) => void
  onMoveToFolder?: (ids: string[]) => void
  onNavigateFolder?: (folderId: string | null) => void
}

function getCreatedByLabel(
  item: WorkspaceItem,
  userId: string,
  memberNameById: Map<string, string | null>
) {
  if (item.created_by === userId) return 'You'
  return memberNameById.get(item.created_by) ?? '--'
}

function InlineRenameCell({
  workflow,
  isNested,
  onRename,
}: {
  workflow: WorkspaceWorkflow
  isNested: boolean
  onRename?: (id: string, newName: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(workflow.name)

  const inputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      node.focus()
      node.select()
    }
  }, [])

  function handleSave() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== workflow.name) {
      onRename?.(workflow.id, trimmed)
    } else {
      setEditValue(workflow.name)
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex max-w-[300px] items-center gap-2">
        {isNested && <span className="w-4" />}
        <span className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm">
          {workflow.emoji ?? '\uD83D\uDCCB'}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') {
              setEditValue(workflow.name)
              setIsEditing(false)
            }
          }}
          onBlur={handleSave}
          className="bg-background focus:ring-ring h-7 w-full rounded border px-1.5 text-sm font-medium outline-none focus:ring-1"
        />
      </div>
    )
  }

  return (
    <Link
      href={`/workflows/${workflow.id}/edit`}
      className="flex max-w-[300px] items-center gap-2 truncate"
      onDoubleClick={(e) => {
        if (onRename) {
          e.preventDefault()
          setEditValue(workflow.name)
          setIsEditing(true)
        }
      }}
    >
      {isNested && <span className="w-4" />}
      <span className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm">
        {workflow.emoji ?? '\uD83D\uDCCB'}
      </span>
      <span className="truncate text-sm font-medium">{workflow.name}</span>
    </Link>
  )
}

export function createColumns(meta: ColumnMeta): ColumnDef<WorkspaceItem>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 44,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const item = row.original

        if (item.type === 'folder') {
          const folder = item as WorkspaceFolder
          const isExpanded = meta.expandedFolderIds.has(folder.id)
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => meta.onToggleFolderExpand(folder.id)}
                className="p-0.5"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => meta.onNavigateFolder?.(folder.id)}
                className="flex items-center gap-2"
              >
                <FolderOpen className="text-muted-foreground h-5 w-5 shrink-0" />
                <InlineFolderName folderId={folder.id} name={folder.name} />
              </button>
              <span className="text-muted-foreground text-xs">
                {folder.workflow_count} workflow{folder.workflow_count !== 1 ? 's' : ''}
              </span>
            </div>
          )
        }

        if (item.type === 'agent') {
          const agent = item as WorkspaceAgent
          const isExpanded = meta.expandedAgentIds.has(agent.id)
          return (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => meta.onToggleExpand(agent.id)} className="p-0.5">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              <div className="overflow-hidden rounded-md">
                <BoringAvatar
                  name={agent.name}
                  variant="bauhaus"
                  size={24}
                  colors={getAgentPalette(agent.palette)}
                />
              </div>
              <span className="text-sm font-semibold">{agent.name}</span>
            </div>
          )
        }

        const workflow = item as WorkspaceWorkflow
        const isNested = !!workflow.agent_id
        return (
          <InlineRenameCell
            workflow={workflow}
            isNested={isNested}
            onRename={meta.onRenameWorkflow}
          />
        )
      },
    },
    {
      id: 'type',
      accessorFn: (row) => row.type,
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.type
        return (
          <Badge variant="outline" className="capitalize">
            {type}
          </Badge>
        )
      },
    },
    {
      id: 'status',
      accessorFn: (row) => {
        if (row.type === 'workflow') return (row as WorkspaceWorkflow).status
        return '--'
      },
      header: 'Status',
      cell: ({ row }) => {
        const item = row.original
        if (item.type !== 'workflow') {
          return <span className="text-muted-foreground text-sm">--</span>
        }
        const workflow = item as WorkspaceWorkflow
        const status = workflow.status === 'published' ? 'published' : 'draft'
        return (
          <Badge variant={status === 'published' ? 'default' : 'secondary'}>
            {status === 'published' ? 'Published' : 'Draft'}
          </Badge>
        )
      },
    },
    {
      id: 'published',
      accessorFn: (row) => {
        if (row.type === 'workflow') return (row as WorkspaceWorkflow).published_at
        return null
      },
      header: 'Published',
      cell: ({ row }) => {
        const item = row.original
        if (item.type !== 'workflow') {
          return <span className="text-muted-foreground text-sm">--</span>
        }
        const publishedAt = (item as WorkspaceWorkflow).published_at
        if (!publishedAt) {
          return <span className="text-muted-foreground text-sm">--</span>
        }
        return (
          <span className="text-muted-foreground text-sm">{formatRelativeTime(publishedAt)}</span>
        )
      },
    },
    {
      id: 'steps',
      accessorFn: (row) => {
        if (row.type === 'workflow') return (row as WorkspaceWorkflow).step_count
        return null
      },
      header: 'Steps',
      cell: ({ row }) => {
        const item = row.original
        if (item.type !== 'workflow') {
          return <span className="text-muted-foreground text-sm">--</span>
        }
        return (
          <span className="text-muted-foreground text-sm">
            {(item as WorkspaceWorkflow).step_count}
          </span>
        )
      },
      size: 60,
    },
    {
      id: 'ai',
      accessorFn: (row) => {
        if (row.type === 'workflow') return (row as WorkspaceWorkflow).has_ai_steps
        return false
      },
      header: 'AI',
      cell: ({ row }) => {
        const item = row.original
        if (item.type === 'workflow' && (item as WorkspaceWorkflow).has_ai_steps) {
          return <Sparkles className="text-muted-foreground h-4 w-4" />
        }
        return null
      },
      size: 44,
    },
    {
      id: 'lastRun',
      accessorFn: (row) => {
        if (row.type === 'workflow') return (row as WorkspaceWorkflow).last_run_at
        return null
      },
      header: 'Last run',
      cell: ({ row }) => {
        const item = row.original
        if (item.type !== 'workflow') {
          return <span className="text-muted-foreground text-sm">--</span>
        }
        return (
          <span className="text-muted-foreground text-sm">
            {formatRelativeTime((item as WorkspaceWorkflow).last_run_at)}
          </span>
        )
      },
    },
    {
      id: 'createdBy',
      accessorFn: (row) => row.created_by,
      header: 'Created by',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {getCreatedByLabel(row.original, meta.userId, meta.memberNameById)}
        </span>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const item = row.original

        if (item.type === 'folder') {
          const folder = item as WorkspaceFolder
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => meta.onNavigateFolder?.(folder.id)}>
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => meta.onDeleteFolder?.(folder.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        }

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {item.type === 'workflow' ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/workflows/${item.id}/edit`}>Edit</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => meta.onDuplicateWorkflow?.(item.id)}>
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => meta.onMoveToFolder?.([item.id])}>
                      Move to folder
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => meta.onDeleteWorkflow?.(item.id, item.name)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/agents/${item.id}`}>Edit</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => meta.onDeleteAgent?.(item.id, item.name)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]
}
