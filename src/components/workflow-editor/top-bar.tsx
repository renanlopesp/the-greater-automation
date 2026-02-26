'use client'

import { Star, ChevronDown, Bell, UserPlus, MoreHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import { cn } from '@/lib/utils'

export default function TopBar() {
  const workflowName = useWorkflowEditorStore((s) => s.workflowName)
  const workflowEmoji = useWorkflowEditorStore((s) => s.workflowEmoji)
  const isStarred = useWorkflowEditorStore((s) => s.isStarred)
  const setWorkflowName = useWorkflowEditorStore((s) => s.setWorkflowName)
  const toggleStar = useWorkflowEditorStore((s) => s.toggleStar)

  return (
    <div className="flex h-14 items-center gap-2 border-b px-4">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-lg">
        {workflowEmoji || '📋'}
      </Button>
      <Input
        value={workflowName}
        onChange={(e) => setWorkflowName(e.target.value)}
        className="h-8 max-w-[240px] border-none bg-transparent text-sm font-medium shadow-none focus-visible:ring-0"
      />
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleStar}>
        <Star className={cn('h-4 w-4', isStarred && 'fill-yellow-400 text-yellow-400')} />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem>Rename</DropdownMenuItem>
          <DropdownMenuItem>Change emoji</DropdownMenuItem>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Bell className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <UserPlus className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm">
        Sharing
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  )
}
