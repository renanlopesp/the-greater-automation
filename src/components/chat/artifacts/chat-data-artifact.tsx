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
// Design System CSS — injected into every iframe
// ---------------------------------------------------------------------------

const DESIGN_SYSTEM_CSS = `
/* ── Reset & Base ──────────────────────────────────────────── */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  color: #1a1a1a; background: #fff; line-height: 1.5;
  -webkit-font-smoothing: antialiased; padding: 28px;
}

/* ── Layout ────────────────────────────────────────────────── */
.section { margin-bottom: 28px; }
.section:last-child { margin-bottom: 0; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.items-baseline { align-items: baseline; }
.items-start { align-items: flex-start; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.gap-6 { gap: 24px; }
.w-full { width: 100%; }
.flex-1 { flex: 1; }
.shrink-0 { flex-shrink: 0; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.text-right { text-align: right; }
.text-center { text-align: center; }

/* ── Spacing ───────────────────────────────────────────────── */
.mt-1 { margin-top: 4px; } .mt-2 { margin-top: 8px; } .mt-3 { margin-top: 12px; } .mt-4 { margin-top: 16px; } .mt-6 { margin-top: 24px; }
.mb-1 { margin-bottom: 4px; } .mb-2 { margin-bottom: 8px; } .mb-3 { margin-bottom: 12px; } .mb-4 { margin-bottom: 16px; }
.p-3 { padding: 12px; } .p-4 { padding: 16px; } .p-5 { padding: 20px; }
.px-4 { padding-left: 16px; padding-right: 16px; }
.py-2 { padding-top: 8px; padding-bottom: 8px; }
.py-3 { padding-top: 12px; padding-bottom: 12px; }
.pr-4 { padding-right: 16px; }

/* ── Typography ────────────────────────────────────────────── */
.hero { font-size: 44px; font-weight: 700; letter-spacing: -1.5px; line-height: 1; color: #111; }
.h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #111; }
.h2 { font-size: 17px; font-weight: 600; color: #111; }
.h3 { font-size: 14px; font-weight: 600; color: #111; }
.label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #888; }
.value { font-size: 24px; font-weight: 700; color: #111; letter-spacing: -0.5px; }
.value-sm { font-size: 18px; font-weight: 600; color: #111; }
.body { font-size: 14px; color: #444; line-height: 1.6; }
.small { font-size: 12px; color: #888; }
.tiny { font-size: 11px; color: #999; }
.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; }
.tabular { font-variant-numeric: tabular-nums; }
.bold { font-weight: 600; }
.medium { font-weight: 500; }

/* ── Colors ────────────────────────────────────────────────── */
.text-primary { color: #111; }
.text-secondary { color: #555; }
.text-muted { color: #999; }
.text-green { color: #059669; }
.text-red { color: #dc2626; }
.text-amber { color: #d97706; }
.text-blue { color: #2563eb; }
.text-purple { color: #7c3aed; }

/* ── Cards & Surfaces ─────────────────────────────────────── */
.card {
  background: #f7f7f8; border-radius: 14px; padding: 18px 20px;
}
.card-elevated {
  background: #fff; border-radius: 14px; padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
}
.card-outline {
  background: #fff; border: 1px solid #eee; border-radius: 14px; padding: 18px 20px;
}
.card-accent-green { border-left: 3px solid #10b981; }
.card-accent-red { border-left: 3px solid #ef4444; }
.card-accent-amber { border-left: 3px solid #f59e0b; }
.card-accent-blue { border-left: 3px solid #3b82f6; }

/* ── Badges ────────────────────────────────────────────────── */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px;
}
.badge-green { background: rgba(16,185,129,0.12); color: #059669; }
.badge-red { background: rgba(239,68,68,0.12); color: #dc2626; }
.badge-amber { background: rgba(245,158,11,0.12); color: #d97706; }
.badge-blue { background: rgba(59,130,246,0.12); color: #2563eb; }
.badge-purple { background: rgba(124,58,237,0.12); color: #7c3aed; }
.badge-gray { background: #f0f0f0; color: #666; }

/* ── Lists ─────────────────────────────────────────────────── */
.list-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-radius: 10px;
}
.list-item:nth-child(odd) { background: #f8f9fa; }
.list-item:nth-child(even) { background: transparent; }

/* ── Progress / Bars ───────────────────────────────────────── */
.progress { height: 6px; border-radius: 3px; background: #f0f0f0; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
.bar-green { background: #10b981; }
.bar-blue { background: #3b82f6; }
.bar-amber { background: #f59e0b; }
.bar-red { background: #ef4444; }
.bar-purple { background: #7c3aed; }

/* Horizontal bar chart */
.bar-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; }
.bar-label { font-size: 13px; color: #444; width: 140px; flex-shrink: 0; }
.bar-track { flex: 1; height: 8px; border-radius: 4px; background: #f0f0f0; overflow: hidden; }
.bar-value { font-size: 13px; font-weight: 600; color: #111; width: 80px; text-align: right; flex-shrink: 0; }

/* ── Separator ─────────────────────────────────────────────── */
.divider { height: 1px; background: #eee; margin: 20px 0; }

/* ── Table ─────────────────────────────────────────────────── */
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #888; padding: 8px 12px; border-bottom: 1px solid #eee; }
td { padding: 10px 12px; border-bottom: 1px solid #f5f5f5; color: #333; }
tr:last-child td { border-bottom: none; }
td.number { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
th.number { text-align: right; }

/* ── Pill / Tag ────────────────────────────────────────────── */
.pill { display: inline-block; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 6px; background: #f0f0f0; color: #555; }

/* ── Stat highlight ────────────────────────────────────────── */
.stat { text-align: center; }
.stat .value { display: block; }
.stat .label { display: block; margin-top: 4px; }

/* ── Trend indicator ───────────────────────────────────────── */
.trend-up { color: #059669; }
.trend-up::before { content: '↑ '; }
.trend-down { color: #dc2626; }
.trend-down::before { content: '↓ '; }
.trend-neutral { color: #888; }
.trend-neutral::before { content: '→ '; }

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 480px) {
  body { padding: 20px; }
  .grid-3 { grid-template-columns: 1fr 1fr; }
  .grid-4 { grid-template-columns: 1fr 1fr; }
  .hero { font-size: 36px; }
}

/* ── Dark Mode ─────────────────────────────────────────────── */
@media (prefers-color-scheme: dark) {
  body { background: #0a0a0a; color: #e5e5e5; }
  .hero, .h1, .h2, .h3, .value, .value-sm, .text-primary { color: #f0f0f0; }
  .body, td { color: #ccc; }
  .text-secondary { color: #aaa; }
  .text-muted, .label, .small, .tiny { color: #777; }
  .card { background: #161618; }
  .card-elevated { background: #1a1a1c; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
  .card-outline { background: #141416; border-color: #2a2a2e; }
  .list-item:nth-child(odd) { background: #151517; }
  .divider { background: #2a2a2e; }
  th { color: #777; border-color: #2a2a2e; }
  td { border-color: #1e1e22; }
  .progress, .bar-track { background: #222; }
  .pill { background: #222; color: #aaa; }
  .badge-gray { background: #222; color: #aaa; }
  .badge-green { background: rgba(16,185,129,0.15); }
  .badge-red { background: rgba(239,68,68,0.15); }
  .badge-amber { background: rgba(245,158,11,0.15); }
  .badge-blue { background: rgba(59,130,246,0.15); }
  .badge-purple { background: rgba(124,58,237,0.15); }
}
`

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
// HTML Artifact — full-bleed iframe with design system + version navigation
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
  <style>${DESIGN_SYSTEM_CSS}</style>
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
