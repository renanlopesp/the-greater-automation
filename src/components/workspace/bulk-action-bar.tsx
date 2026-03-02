'use client'

import { Trash2, ChevronDown, FolderInput } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface BulkActionBarProps {
  selectedCount: number
  onDelete: () => void
  onChangeStatus: (status: 'draft' | 'published') => void
  onMoveToFolder?: () => void
  isLoading: boolean
}

export function BulkActionBar({
  selectedCount,
  onDelete,
  onChangeStatus,
  onMoveToFolder,
  isLoading,
}: BulkActionBarProps) {
  const hasSelection = selectedCount > 0
  const disabled = !hasSelection || isLoading

  return (
    <div className="bg-muted/50 flex items-center gap-3 rounded-lg border px-4 py-2.5">
      <span className="text-muted-foreground text-sm font-medium">
        {hasSelection ? `${selectedCount} selecionado(s)` : 'Nenhuma seleção'}
      </span>

      <div className="bg-border h-4 w-px" />

      <Button variant="destructive" size="sm" onClick={onDelete} disabled={disabled}>
        <Trash2 className="h-4 w-4" />
        Excluir selecionados
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled}>
            Alterar status
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onChangeStatus('draft')}>
            Definir como rascunho
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChangeStatus('published')}>
            Definir como publicado
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {onMoveToFolder && (
        <Button variant="outline" size="sm" onClick={onMoveToFolder} disabled={disabled}>
          <FolderInput className="h-4 w-4" />
          Mover para pasta
        </Button>
      )}
    </div>
  )
}
