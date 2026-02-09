'use client'

import { FileText, Star, ChevronDown, Bell, UserPlus, MoreHorizontal } from 'lucide-react'
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

export default function EditorHeader() {
  const { workflowName, isStarred, setWorkflowName, toggleStar } = useWorkflowEditorStore()

  return (
    <div className="flex h-14 items-center gap-2 border-b px-4">
      {/* App mark (prod has a fixed icon here, not the workflow emoji) */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground h-8 w-8 rounded-md"
        aria-label="Relay"
      >
        <span className="text-sm leading-none font-semibold select-none">t</span>
      </Button>

      <Button
        variant="outline"
        size="icon-sm"
        className="border-primary/25 text-primary h-8 w-8 rounded-md"
        aria-label="Workflow"
      >
        <FileText className="h-4 w-4" />
      </Button>

      <Input
        value={workflowName}
        onChange={(e) => setWorkflowName(e.target.value)}
        className="h-8 max-w-[240px] border-none bg-transparent text-sm font-medium shadow-none focus-visible:ring-0"
      />

      <Button variant="ghost" size="icon-sm" className="h-8 w-8" onClick={toggleStar}>
        <Star className={cn('h-4 w-4', isStarred && 'fill-yellow-400 text-yellow-400')} />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="h-8 w-8">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem>Rename</DropdownMenuItem>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      <Button variant="ghost" size="icon-sm" className="h-8 w-8">
        <Bell className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" className="h-8 w-8">
        <UserPlus className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm">
        Sharing
      </Button>
      <Button variant="ghost" size="icon-sm" className="h-8 w-8">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  )
}
