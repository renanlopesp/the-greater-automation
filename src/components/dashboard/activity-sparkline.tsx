'use client'

import { LineChart, Line, Area } from 'recharts'

interface ActivitySparklineProps {
  data: { day: number; count: number }[]
}

export default function ActivitySparkline({ data }: ActivitySparklineProps) {
  if (!data || data.length === 0) {
    return <div className="h-6 w-20" />
  }

  return (
    <div className="h-6 w-20">
      <LineChart width={80} height={24} data={data}>
        <Area
          type="monotone"
          dataKey="count"
          fill="var(--color-primary)"
          fillOpacity={0.1}
          stroke="none"
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--color-primary)"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </div>
  )
}
