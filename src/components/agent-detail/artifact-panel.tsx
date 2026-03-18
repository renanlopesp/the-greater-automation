'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize2, PanelRight, X } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchArtifact } from '@/lib/queries/agent-activity'
import { useAgentWorkspaceStore } from '@/stores/agent-workspace-store'
import { OutputSchemaMap } from '@/lib/modules/output-schemas'
import type { ArtifactOutputType } from '@/lib/modules/types'
import { cn } from '@/lib/utils'
import ArtifactCartTable from './artifact-cart-table'
import ArtifactChannels from './artifact-channels'
import ArtifactConversions from './artifact-conversions'
import ArtifactApproval from './artifact-approval'
import ArtifactCategoryChart from './artifact-category-chart'
import ArtifactEscalationCards from './artifact-escalation-cards'

type ArtifactRow = {
  id: string
  workflow_run_id: string
  module_id: string
  output_type: string
  output_data: unknown
  summary_text: string | null
  created_at: string
}

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

function ArtifactContent({ artifact }: { artifact: ArtifactRow }) {
  const outputType = artifact.output_type as ArtifactOutputType
  const schema = OutputSchemaMap[outputType]
  if (!schema) {
    return (
      <p className="text-muted-foreground text-sm">
        Tipo de artefato desconhecido: {artifact.output_type}
      </p>
    )
  }

  const parsed = schema.safeParse(artifact.output_data)
  if (!parsed.success) {
    return <p className="text-muted-foreground text-sm">Dados inválidos para este artefato.</p>
  }

  switch (outputType) {
    case 'cart-table':
      return <ArtifactCartTable data={parsed.data as never} />
    case 'channel-performance':
      return <ArtifactChannels data={parsed.data as never} />
    case 'conversion-list':
      return <ArtifactConversions data={parsed.data as never} />
    case 'message-approval':
      return <ArtifactApproval runOutputId={artifact.id} data={parsed.data as never} />
    case 'category-chart':
      return <ArtifactCategoryChart data={parsed.data as never} />
    case 'escalation-cards':
      return <ArtifactEscalationCards data={parsed.data as never} />
    default:
      return (
        <p className="text-muted-foreground text-sm">Visualização não disponível para este tipo.</p>
      )
  }
}

const MIN_WIDTH = 320
const MAX_WIDTH = 900
const DEFAULT_WIDTH = 480

export default function ArtifactPanel() {
  const { selectedArtifactId, artifactPanelWidth, setSelectedArtifact, setArtifactPanelWidth } =
    useAgentWorkspaceStore()
  const [artifact, setArtifact] = useState<ArtifactRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Drag state
  const dragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(DEFAULT_WIDTH)

  // Fetch artifact when selectedArtifactId changes
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!selectedArtifactId) {
        if (!cancelled) setArtifact(null)
        return
      }
      if (!cancelled) setLoading(true)
      const supabase = createBrowserClient()
      const data = await fetchArtifact(supabase, selectedArtifactId)
      if (!cancelled) {
        setArtifact(data)
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [selectedArtifactId])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      dragStartX.current = e.clientX
      dragStartWidth.current = artifactPanelWidth

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return
        const delta = dragStartX.current - ev.clientX
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta))
        setArtifactPanelWidth(newWidth)
      }

      const onMouseUp = () => {
        dragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [artifactPanelWidth, setArtifactPanelWidth]
  )

  if (!selectedArtifactId) return null

  const panelWidth = expanded ? '100%' : artifactPanelWidth

  return (
    <div
      className={cn(
        'border-border bg-background relative flex flex-col border-l transition-all',
        'animate-in slide-in-from-right-8 duration-200'
      )}
      style={{ width: expanded ? '100%' : panelWidth }}
    >
      {/* Drag handle */}
      {!expanded && (
        <div
          className="absolute top-0 bottom-0 left-0 w-1 cursor-col-resize hover:bg-blue-500/30"
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Panel header */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground truncate text-sm font-semibold">
            {loading ? 'Carregando...' : (artifact?.summary_text ?? 'Detalhe da ação')}
          </h3>
          {artifact?.created_at && (
            <p className="text-muted-foreground text-xs">{formatTimestamp(artifact.created_at)}</p>
          )}
        </div>

        {/* Controls */}
        <div className="ml-2 flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="hover:bg-muted text-muted-foreground rounded-md p-1.5 transition-colors"
            title={expanded ? 'Minimizar' : 'Expandir'}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedArtifact(null)
              setExpanded(false)
            }}
            className="hover:bg-muted text-muted-foreground rounded-md p-1.5 transition-colors"
            title="Fechar"
          >
            <PanelRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="border-muted-foreground/20 border-t-muted-foreground h-6 w-6 animate-spin rounded-full border-2" />
          </div>
        )}
        {!loading && artifact && <ArtifactContent artifact={artifact} />}
        {!loading && !artifact && selectedArtifactId && (
          <p className="text-muted-foreground py-8 text-center text-sm">Artefato não encontrado.</p>
        )}
      </div>
    </div>
  )
}
