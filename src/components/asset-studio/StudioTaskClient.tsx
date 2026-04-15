'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  AssetCreatorModal,
  type AssetCreatorData,
} from '@/components/asset-studio/AssetCreatorModal'
import { loadStoreContext } from '@/lib/studio/store-context'
import { StudioSessionProvider } from '@/lib/studio/session-context'
import ArtifactRenderer from '@/components/chat/artifact-renderer'
import { X, PanelRight } from 'lucide-react'

interface StudioTaskClientProps {
  task: {
    id: string
    title: string | null
    status: string
    active_skill: string | null
    skill_status: string | null
    artifact_type: string | null
    artifact_data: unknown
    conversation_id: string | null
    initial_message: string | null
  }
  initialMessages: Array<{
    id: string
    role: string
    content: string
    metadata?: Record<string, unknown>
  }>
}

/**
 * Client wrapper for /studio/create/[id].
 *
 * - Maps the task row + initial conversation messages into the AssetCreatorData
 *   shape that AssetCreatorModal expects.
 * - When the task has a non-studio artifact (seasonal-calendar, chat-data, …),
 *   renders the chat's ArtifactRenderer in a right-hand panel beside the modal.
 */
export default function StudioTaskClient({ task, initialMessages }: StudioTaskClientProps) {
  const router = useRouter()

  const storeCtx = useMemo(() => loadStoreContext(), [])

  // Canvas is whatever snapshot we have. Accept any artifact_data that looks
  // like the studio creative state (regardless of artifact_type — we may not
  // set that on every PATCH).
  const canvas = useMemo(() => {
    const data = task.artifact_data as Record<string, unknown> | null | undefined
    if (!data) return null
    // Heuristic: if it has any of the studio canvas fields, treat it as canvas.
    const hasStudioField =
      'activeImageUrl' in data || 'channel' in data || 'heading' in data || 'font' in data
    return hasStudioField ? data : null
  }, [task.artifact_data])

  // Non-canvas artifact worth showing in the side panel.
  const hasSidePanelArtifact =
    !!task.artifact_type && task.artifact_type !== 'studio-asset' && !!task.artifact_data

  const [artifactPanelOpen, setArtifactPanelOpen] = useState(false)

  const studioData: AssetCreatorData = useMemo(
    () => ({
      campaignTitle:
        (canvas?.campaign as string) ??
        (canvas?.campaignTitle as string) ??
        task.title ??
        storeCtx?.name ??
        '',
      product: (canvas?.product as string) ?? storeCtx?.productTypes?.[0] ?? '',
      // activeImageUrl is written by the studio snapshot; fall back to legacy productImageUrl
      productImageUrl:
        (canvas?.activeImageUrl as string) ?? (canvas?.productImageUrl as string) ?? '',
      copyText: (canvas?.heading as string) ?? (canvas?.copyText as string) ?? '',
      selectedTone: (canvas?.selectedTone as string) ?? storeCtx?.tone ?? '',
      autoPrompt: initialMessages.length === 0 ? (task.initial_message ?? '') : '',
      restoreChatMessages:
        initialMessages.length > 0
          ? initialMessages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              metadata: m.metadata,
            }))
          : undefined,
      styleId: (canvas?.styleId as string | null) ?? (canvas?.style as string | null) ?? null,
      styleName: (canvas?.styleName as string | null) ?? null,
      styleDesc: (canvas?.styleDesc as string | null) ?? null,
      restoreGallery:
        (canvas?.imgGallery as { id: string; url: string }[] | undefined) ?? undefined,
      restoreActiveGalleryId: (canvas?.activeGalleryId as string | null) ?? null,
      restoreAssetHistory: (canvas?.assetHistory as unknown[] | undefined) ?? undefined,
    }),
    [canvas, task.title, task.initial_message, initialMessages, storeCtx]
  )

  return (
    <StudioSessionProvider taskId={task.id} conversationId={task.conversation_id}>
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
        data-task-id={task.id}
        data-conversation-id={task.conversation_id ?? ''}
      >
        {/* AssetCreatorModal (canvas + chat). Flexes so it shrinks when the side panel opens. */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', overflow: 'hidden' }}>
          <AssetCreatorModal
            key={task.id}
            data={studioData}
            onClose={() => router.push('/tarefas')}
            embedded
          />
        </div>

        {/* Side toggle when panel is closed but an artifact is available */}
        {hasSidePanelArtifact && !artifactPanelOpen && (
          <button
            onClick={() => setArtifactPanelOpen(true)}
            title="Abrir artefato"
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
            Abrir {task.artifact_type}
          </button>
        )}

        {/* Right-hand artifact panel */}
        {hasSidePanelArtifact && artifactPanelOpen && (
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
                {task.title ?? task.artifact_type}
              </span>
              <button
                onClick={() => setArtifactPanelOpen(false)}
                title="Fechar artefato"
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
                artifactType={task.artifact_type}
                artifactData={task.artifact_data}
                taskId={task.id}
              />
            </div>
          </aside>
        )}
      </div>
    </StudioSessionProvider>
  )
}
