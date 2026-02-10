'use client'

import Link from 'next/link'
import { ArrowUpDown, ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react'
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
import type { WorkspaceItem, WorkspaceAgent, WorkspaceWorkflow } from '@/lib/queries/workspace'

interface ColumnMeta {
  userId: string
  memberNameById: Map<string, string | null>
  expandedAgentIds: Set<string>
  onToggleExpand: (id: string) => void
}

function getCreatedByLabel(
  item: WorkspaceItem,
  userId: string,
  memberNameById: Map<string, string | null>
) {
  if (item.created_by === userId) return 'You'
  return memberNameById.get(item.created_by) ?? '--'
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
          <Link
            href={`/workflows/${workflow.id}/edit`}
            className="flex max-w-[300px] items-center gap-2 truncate"
          >
            {isNested && <span className="w-4" />}
            <span className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm">
              {workflow.emoji ?? '\uD83D\uDCCB'}
            </span>
            <span className="truncate text-sm font-medium">{workflow.name}</span>
          </Link>
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

        return (
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
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem>Move to folder</DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem>Edit</DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
