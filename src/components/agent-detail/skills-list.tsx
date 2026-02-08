'use client'

import { formatDistanceToNow } from 'date-fns'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Skill {
  id: string
  name: string
  last_run_at: string | null
  workflow: { name: string; emoji: string } | null
}

interface SkillsListProps {
  skills: Skill[]
  agentId: string
}

export default function SkillsList({ skills }: SkillsListProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-muted-foreground text-sm font-semibold">Skills</h2>
      <div className="space-y-2">
        {skills.map((skill) => (
          <Card
            key={skill.id}
            className={cn('hover:bg-muted/50 flex items-center gap-3 p-3 transition-colors')}
          >
            <span className="text-lg">{skill.workflow?.emoji ?? '⚡'}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{skill.name}</p>
              <p className="text-muted-foreground text-xs">
                {skill.last_run_at
                  ? formatDistanceToNow(new Date(skill.last_run_at), {
                      addSuffix: true,
                    })
                  : 'Never ran'}
              </p>
            </div>
          </Card>
        ))}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full border-dashed">
            <Plus className="mr-2 h-4 w-4" />
            New skill
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem>Link existing workflow</DropdownMenuItem>
          <DropdownMenuItem>Create new workflow</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
