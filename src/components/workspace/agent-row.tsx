'use client'

import { ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import BoringAvatar from 'boring-avatars'
import { getAgentPalette } from '@/lib/agent-palettes'
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
  userId: string
  memberNameById: Map<string, string | null>
}

export default function AgentRow({
  agent,
  isExpanded,
  onToggle,
  isSelected,
  onSelect,
  selectedWorkflowIds,
  onSelectWorkflow,
  userId,
  memberNameById,
}: AgentRowProps) {
  const createdByLabel =
    agent.created_by === userId ? 'You' : (memberNameById.get(agent.created_by) ?? '--')

  return (
    <>
      <TableRow>
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
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">--</TableCell>
        <TableCell className="text-muted-foreground text-sm">{createdByLabel}</TableCell>
        <TableCell className="text-muted-foreground text-sm">--</TableCell>
        <TableCell className="text-muted-foreground text-sm">--</TableCell>
        <TableCell className="text-muted-foreground text-sm">--</TableCell>
        <TableCell className="text-muted-foreground text-sm">--</TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Editar</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {isExpanded &&
        (agent.workflows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-muted-foreground pl-12 text-sm">
              Nenhuma automação
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
              userId={userId}
              memberNameById={memberNameById}
            />
          ))
        ))}
    </>
  )
}
