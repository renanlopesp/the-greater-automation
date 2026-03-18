'use client'

import type { CategoryChartOutput } from '@/lib/modules/output-schemas'

interface ArtifactCategoryChartProps {
  data: CategoryChartOutput
}

function buildDonutSegments(
  categories: CategoryChartOutput['categories'],
  total: number,
  radius: number,
  strokeWidth: number
) {
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return categories.map((cat) => {
    const fraction = total > 0 ? cat.count / total : 0
    const dashArray = fraction * circumference
    const dashOffset = -offset * circumference
    offset += fraction
    return { ...cat, dashArray, dashOffset }
  })
}

export default function ArtifactCategoryChart({ data }: ArtifactCategoryChartProps) {
  const radius = 60
  const strokeWidth = 16
  const size = (radius + strokeWidth) * 2
  const center = radius + strokeWidth

  const segments = buildDonutSegments(data.categories, data.total, radius, strokeWidth)

  return (
    <div className="space-y-4">
      {/* Donut chart */}
      <div className="flex justify-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            {/* Background ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-muted/30"
            />
            {/* Colored segments */}
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.dashArray} ${2 * Math.PI * radius - seg.dashArray}`}
                strokeDashoffset={seg.dashOffset}
                strokeLinecap="butt"
              />
            ))}
          </svg>
          {/* Center total */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-foreground text-lg font-bold">{data.total}</span>
            <span className="text-muted-foreground text-[10px]">total</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-1.5">
        {data.categories.map((cat, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            <span className="text-foreground flex-1">{cat.name}</span>
            <span className="text-muted-foreground font-medium">{cat.count}</span>
          </div>
        ))}
      </div>

      {/* Insight */}
      {data.insight && (
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-muted-foreground text-xs leading-relaxed">{data.insight}</p>
        </div>
      )}
    </div>
  )
}
