'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

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

// External store for localStorage-backed chat width
const widthStore = {
  subscribe(callback: () => void) {
    window.addEventListener('storage', callback)
    return () => window.removeEventListener('storage', callback)
  },
  getSnapshot(): number {
    try {
      const stored = localStorage.getItem(CHAT_WIDTH_KEY)
      return stored ? parseInt(stored, 10) : 0
    } catch {
      return 0
    }
  },
  getServerSnapshot(): number {
    return 0
  },
}

export function ChatContextProvider({ children }: { children: ReactNode }) {
  const [chatTitle, setChatTitle] = useState('')
  const [artifactOpen, setArtifactOpen] = useState(true)

  const storedWidth = useSyncExternalStore(
    widthStore.subscribe,
    widthStore.getSnapshot,
    widthStore.getServerSnapshot
  )
  const [dragWidth, setDragWidth] = useState(0)
  const chatWidthPx = dragWidth > 0 ? dragWidth : storedWidth

  const setChatWidthPx = useCallback((px: number) => {
    setDragWidth(px)
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
