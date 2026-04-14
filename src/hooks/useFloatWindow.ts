'use client'

import { useRef, useEffect, useCallback } from 'react'

interface UseFloatWindowOptions {
  onClose: () => void
  enabled?: boolean
}

export function useFloatWindow({ onClose, enabled = true }: UseFloatWindowOptions) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return

    const handler = (e: MouseEvent) => {
      if (!ref.current) return
      if (ref.current.contains(e.target as Node)) return
      onClose()
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler)
    }, 50)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [enabled, onClose])

  const startDrag = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return

    const el = ref.current
    const rect = el.getBoundingClientRect()

    const startX = e.clientX
    const startY = e.clientY
    const originX = rect.left
    const originY = rect.top

    el.style.position = 'fixed'
    el.style.left = `${originX}px`
    el.style.top = `${originY}px`
    el.style.right = 'auto'
    el.style.bottom = 'auto'
    el.style.margin = '0'
    el.style.zIndex = '999'

    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX
      const dy = me.clientY - startY

      const newX = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, originX + dx))
      const newY = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, originY + dy))

      el.style.left = `${newX}px`
      el.style.top = `${newY}px`
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      el.style.zIndex = '50'
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  return { ref, startDrag }
}
