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
  userId: string
  memberNameById: Map<string, string | null>
}

export default function WorkflowRow({
  workflow,
  isSelected,
  onSelect,
  isNested = false,
  userId,
  memberNameById,
}: WorkflowRowProps) {
  const createdByLabel =
    workflow.created_by === userId ? 'You' : (memberNameById.get(workflow.created_by) ?? '--')

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
          <span className="bg-muted flex h-6 w-6 items-center justify-center rounded-md border text-sm">
            {workflow.emoji ?? '📋'}
          </span>
          <span className="truncate text-sm font-medium">{workflow.name}</span>
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatRelativeTime(workflow.last_run_at)}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{createdByLabel}</TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {workflow.published_at ? formatRelativeTime(workflow.published_at) : '--'}
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
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/workflows/${workflow.id}/edit`}>Editar</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Duplicar</DropdownMenuItem>
            <DropdownMenuItem>Mover para pasta</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
