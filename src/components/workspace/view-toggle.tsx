'use client'

import { FolderOpen, List, GitBranch } from 'lucide-react'
import { toast } from 'sonner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface ViewToggleProps {
  activeView: 'folder' | 'list' | 'graph'
  onViewChange: (view: 'folder' | 'list' | 'graph') => void
}

export default function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  function handleValueChange(value: string) {
    if (!value) return
    if (value === 'graph') {
      toast('Coming soon')
      return
    }
    onViewChange(value as 'folder' | 'list' | 'graph')
  }

  return (
    <ToggleGroup
      type="single"
      value={activeView}
      onValueChange={handleValueChange}
      variant="outline"
      size="sm"
    >
      <ToggleGroupItem value="folder" aria-label="Folder view">
        <FolderOpen className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label="List view">
        <List className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="graph" aria-label="Graph view">
        <GitBranch className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
