'use client'

import { LineChart, Line, Area, ResponsiveContainer } from 'recharts'

interface ActivitySparklineProps {
  data: { day: number; count: number }[]
}

export default function ActivitySparkline({ data }: ActivitySparklineProps) {
  return (
    <div className="h-6 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Area
            type="monotone"
            dataKey="count"
            fill="hsl(var(--primary))"
            fillOpacity={0.1}
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
