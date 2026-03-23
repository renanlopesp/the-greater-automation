'use client'

import Link from 'next/link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const ACTIVE_SKILLS = [
  { id: 'seasonal-calendar', emoji: '📅', name: 'Seasonal Calendar' },
  { id: 'campaign-engine', emoji: '🎯', name: 'Campaign Engine' },
  { id: 'revenue-intelligence', emoji: '📈', name: 'Revenue Intelligence' },
  { id: 'funnel-diagnostics', emoji: '🔍', name: 'Funnel Diagnostics' },
] as const

interface SidebarSkillPillsProps {
  collapsed: boolean
  onClose?: () => void
}

export function SidebarSkillPills({ collapsed, onClose }: SidebarSkillPillsProps) {
  return (
    <div
      className={cn(
        'border-border border-t pt-3 pb-2',
        collapsed ? 'flex flex-col items-center gap-1 px-1.5' : 'flex flex-col gap-1 px-2.5'
      )}
    >
      {!collapsed && (
        <p className="text-muted-foreground/50 mb-1 px-1 text-[11px] font-normal">active skills</p>
      )}

      {ACTIVE_SKILLS.map((skill) => {
        const pill = (
          <Link
            key={skill.id}
            href={`/skills/${skill.id}`}
            onClick={onClose}
            className={cn(
              'hover:bg-accent/60 flex w-full items-center rounded-md transition-colors',
              collapsed ? 'justify-center p-1' : 'gap-2.5 px-2 py-1.5'
            )}
          >
            <div className="bg-muted relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]">
              {skill.emoji}
              <span className="ring-background absolute right-0 bottom-0 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1" />
            </div>
            <div
              className={cn(
                'min-w-0 flex-1 overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out',
                collapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'
              )}
            >
              <span className="text-foreground/80 block truncate text-left text-[12px] whitespace-nowrap">
                {skill.name}
              </span>
            </div>
          </Link>
        )

        if (collapsed) {
          return (
            <Tooltip key={skill.id}>
              <TooltipTrigger asChild>{pill}</TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={8}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium"
              >
                {skill.name}
              </TooltipContent>
            </Tooltip>
          )
        }

        return pill
      })}
    </div>
  )
}
