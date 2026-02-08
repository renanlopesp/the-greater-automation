'use client'

import { useRouter } from 'next/navigation'
import { FolderPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import SplitButton from '@/components/workspace/split-button'

export default function WorkspaceHeader() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Workspace</h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => toast('Coming soon')}>
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
