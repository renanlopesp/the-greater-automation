'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

const SIZES = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 72,
  xl: 96,
} as const

// Resolution to request from Next.js Image — higher than display size for retina/sharp rendering
const IMAGE_RESOLUTION = 300

interface CoworkerAvatarProps {
  src: string | undefined
  name: string
  size?: keyof typeof SIZES
  className?: string
}

export default function CoworkerAvatar({ src, name, size = 'xs', className }: CoworkerAvatarProps) {
  const px = SIZES[size]

  return (
    <div
      className={cn('bg-muted relative shrink-0 overflow-hidden rounded-full', className)}
      style={{ width: px, height: px }}
    >
      {/* Always render the letter as background — invisible when image loads */}
      <span
        className="text-muted-foreground absolute inset-0 flex items-center justify-center font-medium"
        style={{ fontSize: px * 0.38 }}
      >
        {name.charAt(0)}
      </span>
      {src && (
        <Image
          src={src}
          alt={name}
          width={IMAGE_RESOLUTION}
          height={IMAGE_RESOLUTION}
          className="relative h-full w-full object-cover"
        />
      )}
    </div>
  )
}
