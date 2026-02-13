'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface AnimatedAgentAvatarProps {
  name?: string
  className?: string
  size?: number
}

function getInitials(name: string): string {
  return name
    .split(/[\s]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * @deprecated Use Avatar + AvatarFallback directly instead.
 * This component is kept for backward compatibility with agent-detail.
 */
export function getAgentPalette() {
  return { dot: '', bg: '', text: '' }
}

export default function AnimatedAgentAvatar({
  name = 'Agent',
  className,
  size = 100,
}: AnimatedAgentAvatarProps) {
  const sizeClass =
    size >= 80 ? 'h-20 w-20 text-2xl' : size >= 40 ? 'h-10 w-10 text-base' : 'h-8 w-8 text-sm'

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Avatar className={sizeClass}>
        <AvatarFallback className="bg-primary/10 text-primary">{getInitials(name)}</AvatarFallback>
      </Avatar>
    </div>
  )
}
