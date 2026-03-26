'use client'

import React, { createContext, useContext, useState } from 'react'

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

export function ArtifactNavProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<ArtifactNavItem[]>([])

  const push = (label: string) => {
    setStack((prev) => [...prev, { level: prev.length + 1, label }])
  }

  const pop = () => {
    setStack((prev) => prev.slice(0, -1))
  }

  const reset = () => {
    setStack([])
  }

  return (
    <ArtifactNavContext.Provider value={{ stack, push, pop, reset, depth: stack.length }}>
      {children}
    </ArtifactNavContext.Provider>
  )
}

export function useArtifactNav(): ArtifactNavState {
  const ctx = useContext(ArtifactNavContext)
  if (!ctx) {
    throw new Error('useArtifactNav must be used within ArtifactNavProvider')
  }
  return ctx
}
