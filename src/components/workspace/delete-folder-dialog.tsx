'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deleteFolder } from '@/lib/actions/workspace'

interface DeleteFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderId: string
  folderName: string
  workflowCount: number
  subfolderCount: number
}

export function DeleteFolderDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
  workflowCount,
  subfolderCount,
}: DeleteFolderDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const isEmpty = workflowCount === 0 && subfolderCount === 0

  async function handleDelete(mode: 'move-to-root' | 'delete-all') {
    setIsDeleting(true)
    try {
      const result = await deleteFolder(folderId, mode)
      if (result.error) {
        toast.error(result.error)
        return
      }
      onOpenChange(false)
    } catch {
      toast.error('Failed to delete folder')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete folder &quot;{folderName}&quot;</AlertDialogTitle>
          <AlertDialogDescription>
            {isEmpty
              ? 'This folder is empty. Are you sure you want to delete it?'
              : `This folder contains ${workflowCount} workflow${workflowCount !== 1 ? 's' : ''} and ${subfolderCount} subfolder${subfolderCount !== 1 ? 's' : ''}. Choose what to do with the contents.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          {isEmpty ? (
            <Button
              variant="destructive"
              onClick={() => handleDelete('delete-all')}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleDelete('move-to-root')}
                disabled={isDeleting}
              >
                Move contents to root
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete('delete-all')}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete all'}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
