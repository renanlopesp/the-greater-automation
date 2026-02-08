'use client'

import { cn } from '@/lib/utils'

interface ActivitySparklineProps {
  data: { day: number; count: number }[]
}

export default function ActivitySparkline({ data }: ActivitySparklineProps) {
  if (!data || data.length === 0) {
    return <div className="h-6 w-20" />
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="flex h-6 w-20 items-end gap-[2px]">
      {data.map((d, i) => (
        <div
          key={i}
          className={cn('bg-primary flex-1 rounded-sm', d.count === 0 && 'opacity-20')}
          style={{
            height: d.count > 0 ? `${Math.max((d.count / maxCount) * 100, 10)}%` : '2px',
          }}
        />
      ))}
    </div>
  )
}
