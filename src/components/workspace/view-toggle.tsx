'use client'

import { FolderOpen, List, GitBranch } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface ViewToggleProps {
  activeView: 'folder' | 'list' | 'graph'
  onViewChange: (view: 'folder' | 'list' | 'graph') => void
}

export default function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  function handleClick(view: 'folder' | 'list' | 'graph') {
    if (view === 'folder' || view === 'graph') {
      toast('Coming soon')
      return
    }
    onViewChange(view)
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={activeView === 'folder' ? 'default' : 'outline'}
        size="icon"
        className="h-8 w-8"
        onClick={() => handleClick('folder')}
      >
        <FolderOpen className="h-4 w-4" />
      </Button>
      <Button
        variant={activeView === 'list' ? 'default' : 'outline'}
        size="icon"
        className="h-8 w-8"
        onClick={() => handleClick('list')}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={activeView === 'graph' ? 'default' : 'outline'}
        size="icon"
        className="h-8 w-8"
        onClick={() => handleClick('graph')}
      >
        <GitBranch className="h-4 w-4" />
      </Button>
    </div>
  )
}
