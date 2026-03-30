'use client'

import Link from 'next/link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BubbleAvatar } from '@/config/design-system'
import { cn } from '@/lib/utils'

const ACTIVE_SKILLS = [
  { id: 'seasonal-calendar', name: 'Seasonal Calendar' },
  { id: 'copywriter', name: 'Copywriter' },
  { id: 'image-generator', name: 'Image Generator' },
  { id: 'social-content', name: 'Social Asset Creator' },
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
            <BubbleAvatar skillName={skill.name} size={20} animated={false} />
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
