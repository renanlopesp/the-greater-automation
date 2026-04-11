'use client'

import { useState } from 'react'
import { FolderPlus, Network } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateFolderDialog } from '@/components/workspace/create-folder-dialog'

interface WorkspaceHeaderProps {
  teamId: string
  userId: string
  currentFolderId?: string | null
}

export default function WorkspaceHeader({ teamId, currentFolderId }: WorkspaceHeaderProps) {
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Network className="text-muted-foreground h-4 w-4" />
          <span>Área de Trabalho</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-background"
            onClick={() => setFolderDialogOpen(true)}
          >
            <FolderPlus className="h-4 w-4" />
            Nova pasta
          </Button>
        </div>
      </div>
      <CreateFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        teamId={teamId}
        parentId={currentFolderId}
      />
    </>
  )
}
