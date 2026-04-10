'use client'

import { Sparkles, AlertCircle, Loader2 } from 'lucide-react'
import ArtifactPanelShell from '@/components/chat/artifact-panel-shell'
import { SeasonalCalendarArtifact } from '@/components/chat/artifacts/seasonal-calendar-artifact'
import { ChatDataArtifact } from '@/components/chat/artifacts/chat-data-artifact'

// ── Empty State ────────────────────────────────────────────────────────
export function ArtifactEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--foreground) 6%, transparent)' }}
      >
        <Sparkles className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
      </div>
      <p className="font-medium" style={{ fontSize: 14, color: 'var(--foreground)' }}>
        Nenhum resultado ainda
      </p>
      <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 4, maxWidth: 280 }}>
        Converse com o Snew e os resultados de skills aparecem aqui.
      </p>
    </div>
  )
}

// ── Loading State ──────────────────────────────────────────────────────
export function ArtifactLoadingState({
  skillName,
  progress,
}: {
  skillName: string | null
  progress?: { steps: Array<{ label: string; done: boolean }>; current?: string } | null
}) {
  const hasSteps = progress?.steps && progress.steps.length > 0

  // Show progress steps without skeleton when available
  if (hasSteps) {
    return (
      <ArtifactPanelShell>
        <div className="flex flex-col gap-4">
          <p className="font-medium" style={{ fontSize: 15, color: 'var(--foreground)' }}>
            {skillName ? `Gerando ${skillName}...` : 'Processando...'}
          </p>
          <div className="flex flex-col gap-3">
            {progress!.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {step.done ? (
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'color-mix(in srgb, var(--foreground) 12%, transparent)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6L5 8.5L9.5 3.5"
                        stroke="var(--foreground)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ) : (
                  <Loader2
                    className="h-5 w-5 shrink-0 animate-spin"
                    style={{ color: 'var(--muted-foreground)' }}
                  />
                )}
                <p
                  style={{
                    fontSize: 13,
                    color: step.done ? 'var(--muted-foreground)' : 'var(--foreground)',
                  }}
                >
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </ArtifactPanelShell>
    )
  }

  // Fallback: skeleton loading
  return (
    <ArtifactPanelShell loading>
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--muted-foreground)' }} />
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
          {skillName ? `Gerando ${skillName}...` : 'Processando...'}
        </p>
      </div>
    </ArtifactPanelShell>
  )
}

// ── Error State ────────────────────────────────────────────────────────
export function ArtifactErrorState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--destructive) 10%, transparent)' }}
      >
        <AlertCircle className="h-5 w-5" style={{ color: 'var(--destructive)' }} />
      </div>
      <p className="font-medium" style={{ fontSize: 14, color: 'var(--destructive)' }}>
        Erro ao gerar resultado
      </p>
      <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 4, maxWidth: 280 }}>
        Tente novamente na conversa.
      </p>
    </div>
  )
}

// ── Generic Artifact (JSON prettified) ─────────────────────────────────
function GenericArtifact({ data }: { data: unknown }) {
  return (
    <ArtifactPanelShell>
      <pre
        className="overflow-x-auto text-xs"
        style={{ color: 'var(--foreground)', whiteSpace: 'pre-wrap' }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </ArtifactPanelShell>
  )
}

// ── Main Renderer ──────────────────────────────────────────────────────
interface ArtifactRendererProps {
  artifactType: string | null
  artifactData: unknown
  taskId?: string
}

/**
 * Dynamic artifact renderer. Switches on artifact_type to render
 * the correct component for each skill output.
 *
 * Phase 2: all types render as GenericArtifact (JSON prettified).
 * Phase 3 will add SeasonalCalendarArtifact for 'seasonal-calendar'.
 */
export default function ArtifactRenderer({
  artifactType,
  artifactData,
  taskId,
}: ArtifactRendererProps) {
  if (!artifactType || !artifactData) {
    return <ArtifactEmptyState />
  }

  switch (artifactType) {
    case 'seasonal-calendar':
      return <SeasonalCalendarArtifact data={artifactData as never} taskId={taskId} />
    case 'chat-data':
      return <ChatDataArtifact data={artifactData} />
    default:
      return <GenericArtifact data={artifactData} />
  }
}
