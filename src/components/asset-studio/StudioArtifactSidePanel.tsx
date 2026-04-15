'use client'

import { useEffect, useState } from 'react'
import { X, PanelRight } from 'lucide-react'
import ArtifactRenderer from '@/components/chat/artifact-renderer'
import { useStudioSession, type ChatArtifact } from '@/lib/studio/session-context'

interface Props {
  /** Optional fallback artifact (e.g., persisted seasonal-calendar from the OLD chat). */
  fallback?: { type: string; data: unknown; title?: string } | null
  taskId?: string | null
}

/**
 * Right-hand side panel that renders chat-tool artifacts (e.g.,
 * STORE_QUERY_SALES `__artifact`) emitted into the studio session. Auto-opens
 * when a fresh artifact arrives. Coexists with the canvas — uses its own
 * region beside the AssetCreatorModal.
 */
export function StudioArtifactSidePanel({ fallback, taskId }: Props) {
  const session = useStudioSession()
  const liveArtifact = session.chatArtifact
  const hasArtifact = !!liveArtifact || !!fallback
  const [open, setOpen] = useState<boolean>(!!liveArtifact)
  const [lastSeen, setLastSeen] = useState<ChatArtifact | null>(liveArtifact)

  // Auto-open when a new live artifact arrives (don't override a manual close
  // by re-opening the same artifact; only open on a new one).
  useEffect(() => {
    if (liveArtifact && liveArtifact !== lastSeen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external chat-tool artifact into local panel state
      setLastSeen(liveArtifact)
      setOpen(true)
    }
  }, [liveArtifact, lastSeen])

  if (!hasArtifact) return null

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Abrir resultado"
        style={{
          position: 'absolute',
          right: 16,
          top: 16,
          zIndex: 40,
          background: '#1A1A1A',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 10,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <PanelRight size={14} />
        Abrir {liveArtifact?.title ?? fallback?.title ?? 'resultado'}
      </button>
    )
  }

  const renderType = liveArtifact?.type ?? fallback?.type ?? ''
  // ChatDataArtifact (and other renderers) expect the FULL artifact payload —
  // {type, title, html, data} — not just the inner `.data` field.
  const renderData = liveArtifact ?? fallback?.data ?? null
  const headerTitle = liveArtifact?.title ?? fallback?.title ?? 'Resultado'

  return (
    <aside
      data-artifact-panel="open"
      style={{
        width: 'min(48%, 680px)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--muted)',
        flexShrink: 0,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--background)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>
          {headerTitle}
        </span>
        <button
          onClick={() => setOpen(false)}
          title="Fechar resultado"
          style={{
            border: 'none',
            background: 'transparent',
            padding: 4,
            cursor: 'pointer',
            color: 'var(--muted-foreground)',
            display: 'flex',
          }}
        >
          <X size={16} />
        </button>
      </header>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <ArtifactRenderer
          artifactType={renderType}
          artifactData={renderData}
          taskId={taskId ?? undefined}
        />
      </div>
    </aside>
  )
}
