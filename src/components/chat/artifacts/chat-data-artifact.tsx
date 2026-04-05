'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatDataPayload {
  type: string
  title: string
  html?: string
  data?: unknown
  history?: Array<{ title: string; html: string; timestamp: string }>
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ChatDataArtifact({ data }: { data: unknown }) {
  const payload = data as ChatDataPayload

  // Build version list: current + history
  const versions: Array<{ title: string; html: string; timestamp?: string }> = payload?.html
    ? [
        { title: payload.title ?? '', html: payload.html },
        ...(payload.history ?? []).map((h) => ({
          title: h.title,
          html: h.html,
          timestamp: h.timestamp,
        })),
      ]
    : []

  if (!payload?.type) return <FallbackCard data={data} />

  if (payload.html && versions.length > 0) {
    return <HtmlArtifactView versions={versions} />
  }

  return <FallbackCard data={data} />
}

// ---------------------------------------------------------------------------
// HTML Artifact — full-bleed iframe with version navigation
// ---------------------------------------------------------------------------

function HtmlArtifactView({
  versions,
}: {
  versions: Array<{ title: string; html: string; timestamp?: string }>
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const current = versions[currentIndex]
  const hasMultiple = versions.length > 1

  const html = current.html
  const fullHtml =
    html.trim().toLowerCase().startsWith('<!doctype') ||
    html.trim().toLowerCase().startsWith('<html')
      ? html
      : `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      background: #ffffff;
      line-height: 1.5;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #0a0a0a; color: #e5e5e5; }
    }
  </style>
</head>
<body>${html}</body>
</html>`

  return (
    <div className="flex h-full flex-col">
      {/* Version navigator — only shown when there are multiple versions */}
      {hasMultiple && (
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{
            borderBottom: '1px solid color-mix(in srgb, var(--foreground) 8%, transparent)',
          }}
        >
          <button
            onClick={() => setCurrentIndex((i) => Math.min(i + 1, versions.length - 1))}
            disabled={currentIndex >= versions.length - 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-muted-foreground text-[12px]">
            {currentIndex === 0
              ? 'Atual'
              : `Versão ${versions.length - currentIndex}/${versions.length}`}
          </span>
          <button
            onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
            disabled={currentIndex <= 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Full-bleed iframe */}
      <div className="flex-1">
        <iframe
          srcDoc={fullHtml}
          sandbox="allow-scripts"
          className="h-full w-full border-0"
          title={current.title}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

function FallbackCard({ data }: { data: unknown }) {
  return (
    <div className="p-6">
      <pre className="text-foreground overflow-x-auto text-xs" style={{ whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
