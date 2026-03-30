'use client'

import type { ReactNode, CSSProperties } from 'react'
import { cn } from '@/lib/utils'

interface ArtifactPanelShellProps {
  children?: ReactNode
  loading?: boolean
}

function SkeletonBox({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-[var(--border)]', className)} style={style} />
  )
}

export default function ArtifactPanelShell({ children, loading }: ArtifactPanelShellProps) {
  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{
        background: 'var(--muted)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          maxWidth: 620,
          padding: '28px 32px',
          margin: '0 auto',
        }}
      >
        {loading ? (
          <div className="flex flex-col gap-4">
            {/* Title placeholder */}
            <SkeletonBox style={{ height: 28, width: 192, borderRadius: 8 }} />
            {/* Subtitle placeholder */}
            <SkeletonBox style={{ height: 16, width: 256, borderRadius: 8, marginBottom: 8 }} />
            {/* 5 row placeholders */}
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBox key={i} style={{ height: 64, width: '100%', borderRadius: 8 }} />
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
