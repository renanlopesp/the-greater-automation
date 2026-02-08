'use client'

import { ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import WorkflowRow from '@/components/workspace/workflow-row'
import type { WorkspaceAgent } from '@/lib/queries/workspace'

interface AgentRowProps {
  agent: WorkspaceAgent
  isExpanded: boolean
  onToggle: () => void
  isSelected: boolean
  onSelect: (id: string) => void
  selectedWorkflowIds: Set<string>
  onSelectWorkflow: (id: string) => void
}

export default function AgentRow({
  agent,
  isExpanded,
  onToggle,
  isSelected,
  onSelect,
  selectedWorkflowIds,
  onSelectWorkflow,
}: AgentRowProps) {
  return (
    <>
      <TableRow className="bg-muted/30">
        <TableCell>
          <Checkbox checked={isSelected} onCheckedChange={() => onSelect(agent.id)} />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onToggle} className="p-0.5">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <Avatar className="h-6 w-6">
              <AvatarImage src={agent.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">{agent.name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-bold">{agent.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">--</TableCell>
        <TableCell className="text-muted-foreground text-sm">--</TableCell>
        <TableCell className="text-muted-foreground text-sm">--</TableCell>
        <TableCell>--</TableCell>
        <TableCell>--</TableCell>
        <TableCell>--</TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {isExpanded &&
        (agent.workflows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-muted-foreground pl-12 text-sm">
              No workflows
            </TableCell>
          </TableRow>
        ) : (
          agent.workflows.map((w) => (
            <WorkflowRow
              key={w.id}
              workflow={w}
              isSelected={selectedWorkflowIds.has(w.id)}
              onSelect={onSelectWorkflow}
              isNested
            />
          ))
        ))}
    </>
  )
}
