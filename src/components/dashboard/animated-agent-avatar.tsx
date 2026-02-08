'use client'

import { cn } from '@/lib/utils'

interface AnimatedAgentAvatarProps {
  color?: string
  className?: string
}

export default function AnimatedAgentAvatar({
  color = 'bg-blue-500',
  className,
}: AnimatedAgentAvatarProps) {
  const gridSize = 6
  const centerOffset = (gridSize - 1) / 2

  return (
    <div
      className={cn(
        'flex h-16 w-16 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950',
        className
      )}
    >
      <div className="grid grid-cols-6 gap-[3px]">
        {Array.from({ length: gridSize * gridSize }, (_, i) => {
          const row = Math.floor(i / gridSize)
          const col = i % gridSize
          const distance = Math.sqrt(
            Math.pow(row - centerOffset, 2) + Math.pow(col - centerOffset, 2)
          )
          const delay = distance * 0.15

          return (
            <div
              key={i}
              className={cn('h-[3px] w-[3px] rounded-full', color)}
              style={{
                animation: `agent-dot-pulse 2s ease-in-out ${delay}s infinite`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
