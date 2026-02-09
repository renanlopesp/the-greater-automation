'use client'

import { type Table as TanstackTable, flexRender } from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import EmptyState from '@/components/shared/empty-state'
import { FolderOpen } from 'lucide-react'
import type { WorkspaceItem } from '@/lib/queries/workspace'

interface WorkspaceTableProps {
  table: TanstackTable<WorkspaceItem>
}

export default function WorkspaceTable({ table }: WorkspaceTableProps) {
  if (table.getRowModel().rows.length === 0) {
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
    <div className="bg-background min-h-[calc(100dvh-260px)] overflow-hidden rounded-xl border shadow-xs">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="text-muted-foreground text-xs font-medium"
                  style={
                    header.column.columnDef.size
                      ? { width: header.column.columnDef.size }
                      : undefined
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
