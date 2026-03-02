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
      toast.success('Pasta excluída com sucesso')
      onOpenChange(false)
    } catch {
      toast.error('Falha ao excluir pasta')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir pasta &quot;{folderName}&quot;</AlertDialogTitle>
          <AlertDialogDescription>
            {isEmpty
              ? 'Esta pasta está vazia. Tem certeza que deseja excluí-la?'
              : `Esta pasta contém ${workflowCount} automação${workflowCount !== 1 ? 'ões' : ''} e ${subfolderCount} subpasta${subfolderCount !== 1 ? 's' : ''}. Escolha o que fazer com o conteúdo.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          {isEmpty ? (
            <Button
              variant="destructive"
              onClick={() => handleDelete('delete-all')}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleDelete('move-to-root')}
                disabled={isDeleting}
              >
                Mover conteúdo para raiz
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete('delete-all')}
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Excluir tudo'}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
