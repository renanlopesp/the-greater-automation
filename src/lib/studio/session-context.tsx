'use client'

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

/**
 * Side-panel artifact pushed by chat tools (e.g., STORE_QUERY_SALES returns a
 * `__artifact: { type: 'chat-data', html, ... }` block). Coexists with the
 * canvas snapshot — they live in different fields so the studio canvas state
 * isn't overwritten by a stock-table card and vice versa.
 */
export interface ChatArtifact {
  type: string
  title?: string
  html?: string
  data?: unknown
}

export interface StudioSession {
  taskId: string | null
  conversationId: string | null
  chatArtifact: ChatArtifact | null
  /** Ensures a task + conversation exist. Creates them via POST /api/tasks if missing. */
  ensureSession: (
    initialMessage: string
  ) => Promise<{ taskId: string; conversationId: string | null } | null>
  /** Persist a user/assistant turn to `conversation_messages`. Lazy-creates task if needed. */
  persistTurn: (opts: {
    userMessage: string
    assistantMessage?: string
    metadata?: Record<string, unknown>
  }) => Promise<void>
  /** Debounced snapshot of the canvas state to `tasks.artifact_data`. No-op if taskId missing. */
  snapshotCanvas: (artifactData: Record<string, unknown>) => void
  /**
   * Push a chat tool artifact (e.g., STORE_QUERY_SALES `__artifact`). Updates
   * the side-panel state immediately and persists it under
   * `artifact_data.chatArtifact` (JSONB merge, no canvas overwrite).
   */
  setChatArtifact: (artifact: ChatArtifact | null) => void
}

const StudioSessionContext = createContext<StudioSession | null>(null)

const SNAPSHOT_DEBOUNCE_MS = 500

interface ProviderProps {
  taskId?: string | null
  conversationId?: string | null
  initialChatArtifact?: ChatArtifact | null
  /** When true, a `router.replace('/studio/create/[id]')` fires after lazy creation. */
  replaceUrlOnCreate?: boolean
  children: ReactNode
}

export function StudioSessionProvider({
  taskId: initialTaskId = null,
  conversationId: initialConversationId = null,
  initialChatArtifact = null,
  replaceUrlOnCreate = false,
  children,
}: ProviderProps) {
  const [taskId, setTaskId] = useState<string | null>(initialTaskId)
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId)
  const [chatArtifact, setChatArtifactState] = useState<ChatArtifact | null>(initialChatArtifact)

  // Mirror ids in refs so async callers (debounced snapshots, activity
  // persistence) read the freshest value even if their closure captured an
  // older `taskId`/`conversationId`.
  const taskIdRef = useRef<string | null>(initialTaskId)
  const conversationIdRef = useRef<string | null>(initialConversationId)
  taskIdRef.current = taskId
  conversationIdRef.current = conversationId

  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSnapshotRef = useRef<Record<string, unknown> | null>(null)
  const creatingRef = useRef<Promise<{
    taskId: string
    conversationId: string | null
  } | null> | null>(null)

  const value = useMemo<StudioSession>(
    () => ({
      taskId,
      conversationId,
      chatArtifact,
      setChatArtifact(artifact) {
        setChatArtifactState(artifact)
        // Persist under a sub-key so the canvas snapshot in artifact_data isn't
        // overwritten. Server merges with existing artifact_data via `merge:true`.
        const tid = taskIdRef.current
        if (!tid) return
        void fetch(`/api/tasks/${tid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artifact_data: { chatArtifact: artifact }, merge: true }),
        }).catch(() => {})
      },
      async ensureSession(initialMessage) {
        const currentTask = taskIdRef.current
        const currentConv = conversationIdRef.current
        if (currentTask && currentConv) return { taskId: currentTask, conversationId: currentConv }
        if (creatingRef.current) return creatingRef.current
        const title = (initialMessage ?? '').trim().slice(0, 60) || 'Nova conversa'
        creatingRef.current = (async () => {
          try {
            const res = await fetch('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: title }),
            })
            if (!res.ok) return null
            const data = (await res.json()) as { taskId: string; conversationId: string | null }
            // Update refs synchronously so concurrent persistTurn/snapshot
            // calls issued in the same tick see the new ids immediately.
            taskIdRef.current = data.taskId
            conversationIdRef.current = data.conversationId
            setTaskId(data.taskId)
            setConversationId(data.conversationId)
            if (replaceUrlOnCreate && typeof window !== 'undefined') {
              // Use history API directly — router.replace would trigger a full
              // Next.js navigation and remount the tree, killing live state
              // (images being generated, chat messages just added, canvas).
              try {
                window.history.replaceState(null, '', `/studio/create/${data.taskId}`)
              } catch {
                // ignore — URL is cosmetic at this point
              }
            }
            return { taskId: data.taskId, conversationId: data.conversationId }
          } catch {
            return null
          } finally {
            creatingRef.current = null
          }
        })()
        return creatingRef.current
      },
      async persistTurn({ userMessage, assistantMessage, metadata }) {
        let convId = conversationIdRef.current
        if (!convId) {
          const ensured = await this.ensureSession(userMessage)
          convId = ensured?.conversationId ?? null
        }
        if (!convId) return
        try {
          await fetch('/api/studio/turn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: convId,
              userMessage,
              assistantMessage,
              metadata,
            }),
          })
        } catch {
          // best-effort
        }
      },
      snapshotCanvas(artifactData) {
        pendingSnapshotRef.current = artifactData
        if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current)
        snapshotTimerRef.current = setTimeout(async () => {
          const data = pendingSnapshotRef.current
          pendingSnapshotRef.current = null
          snapshotTimerRef.current = null
          const currentTask = taskIdRef.current
          if (!data || !currentTask) return
          try {
            await fetch(`/api/tasks/${currentTask}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              // merge=true so the chatArtifact (set by setChatArtifact in
              // a separate code path) isn't wiped by a concurrent canvas
              // snapshot — they coexist as different keys in artifact_data.
              body: JSON.stringify({ artifact_data: data, merge: true }),
            })
          } catch {
            // ignore
          }
        }, SNAPSHOT_DEBOUNCE_MS)
      },
    }),
    [taskId, conversationId, chatArtifact, replaceUrlOnCreate]
  )

  return <StudioSessionContext.Provider value={value}>{children}</StudioSessionContext.Provider>
}

export function useStudioSession(): StudioSession {
  const ctx = useContext(StudioSessionContext)
  if (ctx) return ctx
  return {
    taskId: null,
    conversationId: null,
    chatArtifact: null,
    async ensureSession() {
      return null
    },
    persistTurn: async () => {},
    snapshotCanvas: () => {},
    setChatArtifact: () => {},
  }
}
