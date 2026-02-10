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
      toast.error('Failed to move items')
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to folder</DialogTitle>
          <DialogDescription>
            Select a destination folder for{' '}
            {itemIds.length === 1 ? 'this item' : `${itemIds.length} items`}.
          </DialogDescription>
        </DialogHeader>
        <FolderTreePicker
          tree={folderTree}
          selectedId={selectedFolderId}
          onSelect={setSelectedFolderId}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMoving}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={isMoving}>
            {isMoving ? 'Moving...' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
