'use client'

import { cn } from '@/lib/utils'

interface AgentAvatarProps {
  size?: number
}

export default function AgentAvatar({ size = 120 }: AgentAvatarProps) {
  const gridSize = 24
  const center = (gridSize - 1) / 2

  return (
    <div
      className={cn('flex items-center justify-center rounded-full bg-blue-500')}
      style={{ width: size, height: size }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gap: '1px',
          width: size * 0.75,
          height: size * 0.75,
        }}
      >
        {Array.from({ length: gridSize * gridSize }, (_, i) => {
          const row = Math.floor(i / gridSize)
          const col = i % gridSize
          const distance = Math.sqrt(Math.pow(row - center, 2) + Math.pow(col - center, 2))
          const delay = distance * 0.05

          return (
            <div
              key={i}
              className="rounded-full bg-white"
              style={{
                aspectRatio: '1',
                animation: `agent-dot-pulse 3s ease-in-out ${delay}s infinite`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
