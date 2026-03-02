'use client'

import { Area, AreaChart } from 'recharts'
import { ChartConfig, ChartContainer } from '@/components/ui/chart'

interface ActivitySparklineProps {
  data: { day: number; count: number }[]
}

const chartConfig = {
  count: {
    label: 'Execuções',
    color: 'var(--color-primary)',
  },
} satisfies ChartConfig

export default function ActivitySparkline({ data }: ActivitySparklineProps) {
  if (!data || data.length === 0) {
    return <div className="h-8 w-24" />
  }

  return (
    <ChartContainer className="h-8 w-24" config={chartConfig}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradient-sparkline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.5} />
            <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <Area
          dataKey="count"
          type="monotone"
          fill="url(#gradient-sparkline)"
          fillOpacity={0.4}
          stroke="var(--color-count)"
          strokeWidth={0.8}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
