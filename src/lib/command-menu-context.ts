'use client'

import { createContext, useContext } from 'react'

export const CommandMenuContext = createContext<() => void>(() => {})

export function useCommandMenu() {
  return useContext(CommandMenuContext)
}
