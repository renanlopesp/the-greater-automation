'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface ChatContextState {
  chatTitle: string
  setChatTitle: (title: string) => void
  artifactOpen: boolean
  setArtifactOpen: (open: boolean) => void
  chatWidthPx: number
  setChatWidthPx: (px: number) => void
}

const ChatContext = createContext<ChatContextState | null>(null)

const CHAT_WIDTH_KEY = 'snew-chat-width'

function getStoredWidth(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(CHAT_WIDTH_KEY)
    return stored ? parseInt(stored, 10) : null
  } catch {
    return null
  }
}

export function ChatContextProvider({ children }: { children: ReactNode }) {
  const [chatTitle, setChatTitle] = useState('')
  const [artifactOpen, setArtifactOpen] = useState(true)
  const [chatWidthPx, setChatWidthPxState] = useState(() => getStoredWidth() ?? 0)

  const setChatWidthPx = useCallback((px: number) => {
    setChatWidthPxState(px)
    try {
      localStorage.setItem(CHAT_WIDTH_KEY, String(px))
    } catch {
      // ignore
    }
  }, [])

  return (
    <ChatContext.Provider
      value={{
        chatTitle,
        setChatTitle,
        artifactOpen,
        setArtifactOpen,
        chatWidthPx,
        setChatWidthPx,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatContextProvider')
  return ctx
}
