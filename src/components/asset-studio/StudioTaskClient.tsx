'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import {
  AssetCreatorModal,
  type AssetCreatorData,
} from '@/components/asset-studio/AssetCreatorModal'
import { loadStoreContext } from '@/lib/studio/store-context'
import { StudioSessionProvider, type ChatArtifact } from '@/lib/studio/session-context'
import { StudioArtifactSidePanel } from '@/components/asset-studio/StudioArtifactSidePanel'

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
 * - Live chat artifacts (e.g. STORE_QUERY_SALES `__artifact`) flow through the
 *   StudioSession context and surface in the same side panel without
 *   overwriting the canvas snapshot.
 */
export default function StudioTaskClient({ task, initialMessages }: StudioTaskClientProps) {
  const storeCtx = useMemo(() => loadStoreContext(), [])

  // Canvas is whatever snapshot we have. Accept any artifact_data that looks
  // like the studio creative state (regardless of artifact_type — we may not
  // set that on every PATCH).
  const canvas = useMemo(() => {
    const data = task.artifact_data as Record<string, unknown> | null | undefined
    if (!data) return null
    const hasStudioField =
      'activeImageUrl' in data || 'channel' in data || 'heading' in data || 'font' in data
    return hasStudioField ? data : null
  }, [task.artifact_data])

  // Persisted chat artifact (chat-data card from a prior turn). Coexists with
  // the canvas under `artifact_data.chatArtifact` so they don't clobber each
  // other.
  const persistedChatArtifact = useMemo<ChatArtifact | null>(() => {
    const d = task.artifact_data as Record<string, unknown> | null | undefined
    const ca = d?.chatArtifact as ChatArtifact | undefined
    if (ca && typeof ca === 'object' && typeof ca.type === 'string') return ca
    return null
  }, [task.artifact_data])

  // Legacy non-canvas artifact (e.g., seasonal-calendar from old chat) —
  // surfaces if no live/persisted chatArtifact and the task has its own type.
  const legacySidePanelArtifact =
    !!task.artifact_type && task.artifact_type !== 'studio-asset' && !canvas && !!task.artifact_data

  const studioData: AssetCreatorData = useMemo(
    () => ({
      campaignTitle:
        (canvas?.campaign as string) ??
        (canvas?.campaignTitle as string) ??
        task.title ??
        storeCtx?.name ??
        '',
      product: (canvas?.product as string) ?? storeCtx?.productTypes?.[0] ?? '',
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
    <StudioSessionProvider
      taskId={task.id}
      conversationId={task.conversation_id}
      initialChatArtifact={persistedChatArtifact}
    >
      <StudioTaskShell
        task={task}
        studioData={studioData}
        legacySidePanelArtifact={legacySidePanelArtifact}
      />
    </StudioSessionProvider>
  )
}

interface ShellProps {
  task: StudioTaskClientProps['task']
  studioData: AssetCreatorData
  legacySidePanelArtifact: boolean
}

function StudioTaskShell({ task, studioData, legacySidePanelArtifact }: ShellProps) {
  const router = useRouter()

  const fallback = legacySidePanelArtifact
    ? {
        type: task.artifact_type ?? '',
        data: task.artifact_data,
        title: task.title ?? task.artifact_type ?? undefined,
      }
    : null

  return (
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
      <div style={{ flex: 1, minWidth: 0, display: 'flex', overflow: 'hidden' }}>
        <AssetCreatorModal
          key={task.id}
          data={studioData}
          onClose={() => router.push('/tarefas')}
          embedded
        />
      </div>
      <StudioArtifactSidePanel fallback={fallback} taskId={task.id} />
    </div>
  )
}
