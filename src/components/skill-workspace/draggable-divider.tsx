'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface DraggableDividerProps {
  onResize: (leftPercent: number) => void
  initialPercent?: number
}

export function DraggableDivider({ onResize, initialPercent = 50 }: DraggableDividerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return
      const parent = e.currentTarget.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percent = (x / rect.width) * 100
      const clamped = Math.min(70, Math.max(30, percent))
      onResize(clamped)
    },
    [isDragging, onResize]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex w-2 shrink-0 cursor-col-resize items-center justify-center',
        isDragging && 'select-none'
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* The visible line */}
      <div className="bg-border h-full w-px" />
      {/* Center handle dot */}
      <div className="bg-border absolute h-4 w-1 rounded-full" />
    </div>
  )
}
