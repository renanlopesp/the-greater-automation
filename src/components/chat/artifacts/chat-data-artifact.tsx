'use client'

import { useMemo } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HtmlArtifactPayload {
  type: 'html'
  title: string
  html: string
}

interface ChatDataPayload {
  type: string
  title: string
  html?: string
  data?: unknown
}

// ---------------------------------------------------------------------------
// Main Component — renders AI-generated HTML via iframe
// ---------------------------------------------------------------------------

export function ChatDataArtifact({ data }: { data: unknown }) {
  const payload = data as ChatDataPayload
  if (!payload?.type || !payload?.title) return <FallbackCard data={data} />

  // If the AI sent raw HTML, render it in an iframe
  if (payload.html) {
    return <HtmlArtifactView title={payload.title} html={payload.html} />
  }

  // Fallback for structured JSON data
  return <FallbackCard data={data} />
}

// ---------------------------------------------------------------------------
// HTML Artifact — iframe with srcdoc
// ---------------------------------------------------------------------------

function HtmlArtifactView({ title, html }: { title: string; html: string }) {
  // Wrap HTML in a full document if it doesn't start with <!DOCTYPE
  const fullHtml = useMemo(() => {
    if (
      html.trim().toLowerCase().startsWith('<!doctype') ||
      html.trim().toLowerCase().startsWith('<html')
    ) {
      return html
    }
    return `<!DOCTYPE html>
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
      padding: 24px;
      line-height: 1.5;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #0a0a0a; color: #e5e5e5; }
    }
  </style>
</head>
<body>${html}</body>
</html>`
  }, [html])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-2 border-b px-5 py-3"
        style={{ borderColor: 'color-mix(in srgb, var(--foreground) 8%, transparent)' }}
      >
        <h2 className="text-foreground text-[14px] font-semibold">{title}</h2>
      </div>

      {/* Iframe */}
      <div className="flex-1">
        <iframe
          srcDoc={fullHtml}
          sandbox="allow-scripts"
          className="h-full w-full border-0"
          title={title}
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
