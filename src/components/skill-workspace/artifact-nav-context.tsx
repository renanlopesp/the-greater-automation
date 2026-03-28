'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface ArtifactNavItem {
  level: number
  label: string
}

interface ArtifactNavState {
  stack: ArtifactNavItem[]
  push: (label: string) => void
  pop: () => void
  reset: () => void
  depth: number
}

const ArtifactNavContext = createContext<ArtifactNavState | null>(null)

export function ArtifactNavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<ArtifactNavItem[]>([])

  const push = useCallback((label: string) => {
    setStack((prev) => [...prev, { level: prev.length + 1, label }])
  }, [])

  const pop = useCallback(() => {
    setStack((prev) => prev.slice(0, -1))
  }, [])

  const reset = useCallback(() => {
    setStack([])
  }, [])

  const value = useMemo(
    () => ({ stack, push, pop, reset, depth: stack.length }),
    [stack, push, pop, reset]
  )

  return <ArtifactNavContext.Provider value={value}>{children}</ArtifactNavContext.Provider>
}

export function useArtifactNav(): ArtifactNavState {
  const ctx = useContext(ArtifactNavContext)
  if (!ctx) {
    throw new Error('useArtifactNav must be used within ArtifactNavProvider')
  }
  return ctx
}
