'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FolderTreePicker } from '@/components/workspace/folder-tree-picker'
import { moveToFolder } from '@/lib/actions/workspace'
import type { FolderTreeNode } from '@/lib/queries/workspace'

interface MoveToFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemIds: string[]
  folderTree: FolderTreeNode[]
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  itemIds,
  folderTree,
}: MoveToFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)

  async function handleMove() {
    setIsMoving(true)
    try {
      const result = await moveToFolder(itemIds, selectedFolderId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      onOpenChange(false)
    } catch {
      toast.error('Falha ao mover itens')
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mover para pasta</DialogTitle>
          <DialogDescription>
            Selecione uma pasta de destino para{' '}
            {itemIds.length === 1 ? 'este item' : `${itemIds.length} itens`}.
          </DialogDescription>
        </DialogHeader>
        <FolderTreePicker
          tree={folderTree}
          selectedId={selectedFolderId}
          onSelect={setSelectedFolderId}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMoving}>
            Cancelar
          </Button>
          <Button onClick={handleMove} disabled={isMoving}>
            {isMoving ? 'Movendo...' : 'Mover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
