'use client'

import SnewAvatar from './snew-avatar'

interface OrchestratorEmptyStateProps {
  starters: string[]
  onSuggestionClick: (text: string) => void
}

/**
 * Empty state for the orchestrator chat — matches the prototype layout exactly.
 * Holographic avatar, heading, subtitle, wrapped suggestion pills.
 */
export default function OrchestratorEmptyState({
  starters,
  onSuggestionClick,
}: OrchestratorEmptyStateProps) {
  return (
    <>
      <div className="mb-6">
        <SnewAvatar size={44} />
      </div>
      <h2 className="text-foreground mb-2 text-2xl font-semibold">O que posso te ajudar?</h2>
      <p className="text-muted-foreground mb-10 max-w-sm text-center text-sm">
        Pergunte qualquer coisa sobre sua loja — o Snew direciona para o co-worker certo.
      </p>
      <div className="flex w-full max-w-xl flex-wrap justify-center gap-2">
        {starters.slice(0, 4).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestionClick(s)}
            className="border-border bg-background hover:bg-muted text-muted-foreground rounded-lg border px-3 py-1.5 text-[12px] whitespace-nowrap shadow-sm transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </>
  )
}
