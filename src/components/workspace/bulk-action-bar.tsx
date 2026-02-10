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
  if (selectedCount === 0) return null

  return (
    <div className="bg-background sticky bottom-4 z-10 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-md">
      <span className="text-muted-foreground text-sm font-medium">{selectedCount} selected</span>

      <div className="bg-border h-4 w-px" />

      <Button variant="destructive" size="sm" onClick={onDelete} disabled={isLoading}>
        <Trash2 className="h-4 w-4" />
        Delete selected
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isLoading}>
            Change status
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onChangeStatus('draft')}>Set as Draft</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChangeStatus('published')}>
            Set as Published
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {onMoveToFolder && (
        <Button variant="outline" size="sm" onClick={onMoveToFolder} disabled={isLoading}>
          <FolderInput className="h-4 w-4" />
          Move to folder
        </Button>
      )}
    </div>
  )
}
