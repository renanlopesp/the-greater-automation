'use client'

import Link from 'next/link'
import { MoreHorizontal, Sparkles } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import StatusBadge from '@/components/shared/status-badge'
import { formatRelativeTime } from '@/lib/utils/format-relative-time'
import type { WorkspaceWorkflow } from '@/lib/queries/workspace'

interface WorkflowRowProps {
  workflow: WorkspaceWorkflow
  isSelected: boolean
  onSelect: (id: string) => void
  isNested?: boolean
}

export default function WorkflowRow({
  workflow,
  isSelected,
  onSelect,
  isNested = false,
}: WorkflowRowProps) {
  return (
    <TableRow>
      <TableCell>
        <Checkbox checked={isSelected} onCheckedChange={() => onSelect(workflow.id)} />
      </TableCell>
      <TableCell className={isNested ? 'pl-8' : ''}>
        <Link
          href={`/workflows/${workflow.id}/edit`}
          className="flex max-w-[300px] items-center gap-2 truncate"
        >
          <span>{workflow.emoji ?? '📋'}</span>
          <span className="truncate text-sm font-medium">{workflow.name}</span>
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatRelativeTime(workflow.updated_at)}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {workflow.created_by_name ?? '--'}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatRelativeTime(workflow.created_at)}
      </TableCell>
      <TableCell>
        <StatusBadge status={workflow.status === 'published' ? 'published' : 'draft'} />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{workflow.step_count}</TableCell>
      <TableCell>
        {workflow.has_ai_steps && <Sparkles className="text-muted-foreground h-4 w-4" />}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/workflows/${workflow.id}/edit`}>Edit</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem>Move to folder</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
