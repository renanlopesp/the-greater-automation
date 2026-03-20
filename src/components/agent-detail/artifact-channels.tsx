'use client'

import { cn } from '@/lib/utils'
import type { ChannelPerformanceOutput } from '@/lib/modules/output-schemas'

interface ArtifactChannelsProps {
  data: ChannelPerformanceOutput
}

export default function ArtifactChannels({ data }: ArtifactChannelsProps) {
  return (
    <div className="space-y-4">
      {/* Per-channel bars */}
      <div className="space-y-3">
        {data.channels.map((channel, i) => {
          const conversionPct = channel.sent > 0 ? (channel.converted / channel.sent) * 100 : 0
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{channel.name}</span>
                <span className="text-muted-foreground">
                  <span className="text-foreground font-semibold">{channel.converted}</span>{' '}
                  convertidos de{' '}
                  <span className="text-foreground font-semibold">{channel.sent}</span> enviados
                </span>
              </div>
              {/* Progress bar */}
              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div
                  className={cn('h-full rounded-full bg-green-500 transition-all')}
                  style={{ width: `${Math.min(conversionPct, 100)}%` }}
                />
              </div>
              <p className="text-muted-foreground text-[10px]">
                {(channel.conversion_rate * 100).toFixed(1)}% de conversão
              </p>
            </div>
          )
        })}
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
