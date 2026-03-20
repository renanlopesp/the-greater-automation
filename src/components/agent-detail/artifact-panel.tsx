'use client'

import { useEffect, useState } from 'react'
import { PanelRight } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchArtifact } from '@/lib/queries/agent-activity'
import { useAgentWorkspaceStore } from '@/stores/agent-workspace-store'
import { OutputSchemaMap } from '@/lib/modules/output-schemas'
import type { ArtifactOutputType } from '@/lib/modules/types'
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

export default function ArtifactPanel() {
  const { selectedArtifactId, setSelectedArtifact } = useAgentWorkspaceStore()
  const [artifact, setArtifact] = useState<ArtifactRow | null>(null)
  const [loading, setLoading] = useState(false)

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

  if (!selectedArtifactId) return null

  return (
    <div className="flex h-full flex-col">
      {/* Header — close button */}
      <div className="flex h-12 shrink-0 items-center justify-end px-4">
        <button
          type="button"
          onClick={() => setSelectedArtifact(null)}
          className="hover:bg-muted text-muted-foreground hover:text-foreground flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          title="Fechar painel"
        >
          <PanelRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Title */}
      <div className="border-border/40 shrink-0 border-b px-5 pb-3">
        <p className="text-foreground/90 text-[13px] leading-snug font-medium">
          {loading ? 'Carregando...' : (artifact?.summary_text ?? 'Detalhe da ação')}
        </p>
        {artifact?.created_at && (
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            {formatTimestamp(artifact.created_at)}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
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
