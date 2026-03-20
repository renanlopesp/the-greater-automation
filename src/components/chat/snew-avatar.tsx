'use client'

import { cn } from '@/lib/utils'

interface SnewAvatarProps {
  size?: number
  className?: string
}

/**
 * Snew orchestrator avatar — holographic gradient ball matching the prototype.
 */
export default function SnewAvatar({ size = 28, className }: SnewAvatarProps) {
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/snew-avatar.png"
        alt="Snew"
        className="h-full w-full rounded-full object-cover"
      />
    </div>
  )
}
