'use client'

import { useRouter } from 'next/navigation'
import { FolderPlus, Network } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import SplitButton from '@/components/workspace/split-button'

export default function WorkspaceHeader() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Network className="text-muted-foreground h-4 w-4" />
        <span>Workspace</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="bg-background"
          onClick={() => toast('Coming soon')}
        >
          <FolderPlus className="h-4 w-4" />
          New folder
        </Button>
        <SplitButton
          onNewBlank={() => router.push('/workflows/new/edit')}
          onNewFromTemplate={() => toast('Coming soon')}
        />
      </div>
    </div>
  )
}
