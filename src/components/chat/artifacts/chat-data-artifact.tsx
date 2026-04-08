'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
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
/* ── Theme Variables ──────────────────────────────────────── */
:root {
  --ds-bg: #ffffff;
  --ds-bg-subtle: #f8f9fb;
  --ds-bg-muted: #f1f3f5;
  --ds-bg-elevated: #ffffff;
  --ds-text: #0f172a;
  --ds-text-secondary: #475569;
  --ds-text-muted: #94a3b8;
  --ds-text-faint: #b0b8c4;
  --ds-border: #e2e8f0;
  --ds-border-subtle: #f1f5f9;
  --ds-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03);
  --ds-shadow-lg: 0 2px 8px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
  --ds-green: #10b981;
  --ds-green-text: #059669;
  --ds-green-bg: rgba(16,185,129,0.08);
  --ds-red: #ef4444;
  --ds-red-text: #dc2626;
  --ds-red-bg: rgba(239,68,68,0.08);
  --ds-amber: #f59e0b;
  --ds-amber-text: #d97706;
  --ds-amber-bg: rgba(245,158,11,0.08);
  --ds-blue: #3b82f6;
  --ds-blue-text: #2563eb;
  --ds-blue-bg: rgba(59,130,246,0.08);
  --ds-purple: #8b5cf6;
  --ds-purple-text: #7c3aed;
  --ds-purple-bg: rgba(139,92,246,0.08);
  --ds-radius: 12px;
  --ds-radius-sm: 8px;
  --ds-radius-pill: 9999px;
}

html.dark {
  --ds-bg: #0c0c0e;
  --ds-bg-subtle: #141418;
  --ds-bg-muted: #1c1c22;
  --ds-bg-elevated: #18181c;
  --ds-text: #e8eaed;
  --ds-text-secondary: #a1a7b3;
  --ds-text-muted: #6b7280;
  --ds-text-faint: #4b5563;
  --ds-border: #262630;
  --ds-border-subtle: #1e1e28;
  --ds-shadow: 0 1px 2px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.15);
  --ds-shadow-lg: 0 2px 8px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2);
  --ds-green-text: #34d399;
  --ds-green-bg: rgba(16,185,129,0.12);
  --ds-red-text: #f87171;
  --ds-red-bg: rgba(239,68,68,0.12);
  --ds-amber-text: #fbbf24;
  --ds-amber-bg: rgba(245,158,11,0.12);
  --ds-blue-text: #60a5fa;
  --ds-blue-bg: rgba(59,130,246,0.12);
  --ds-purple-text: #a78bfa;
  --ds-purple-bg: rgba(139,92,246,0.12);
}

/* Fallback for OS-level dark mode when no .dark class */
@media (prefers-color-scheme: dark) {
  html:not(.light) {
    --ds-bg: #0c0c0e;
    --ds-bg-subtle: #141418;
    --ds-bg-muted: #1c1c22;
    --ds-bg-elevated: #18181c;
    --ds-text: #e8eaed;
    --ds-text-secondary: #a1a7b3;
    --ds-text-muted: #6b7280;
    --ds-text-faint: #4b5563;
    --ds-border: #262630;
    --ds-border-subtle: #1e1e28;
    --ds-shadow: 0 1px 2px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.15);
    --ds-shadow-lg: 0 2px 8px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2);
    --ds-green-text: #34d399;
    --ds-green-bg: rgba(16,185,129,0.12);
    --ds-red-text: #f87171;
    --ds-red-bg: rgba(239,68,68,0.12);
    --ds-amber-text: #fbbf24;
    --ds-amber-bg: rgba(245,158,11,0.12);
    --ds-blue-text: #60a5fa;
    --ds-blue-bg: rgba(59,130,246,0.12);
    --ds-purple-text: #a78bfa;
    --ds-purple-bg: rgba(139,92,246,0.12);
  }
}

/* ── Reset & Base ──────────────────────────────────────────── */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, 'Helvetica Neue', sans-serif;
  color: var(--ds-text); background: var(--ds-bg); line-height: 1.55;
  -webkit-font-smoothing: antialiased; padding: 32px;
}

/* ── Layout ────────────────────────────────────────────────── */
.section { margin-bottom: 32px; }
.section:last-child { margin-bottom: 0; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 14px; }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }
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
.hero { font-size: 42px; font-weight: 750; letter-spacing: -1.5px; line-height: 1; color: var(--ds-text); }
.h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: var(--ds-text); }
.h2 { font-size: 17px; font-weight: 600; color: var(--ds-text); }
.h3 { font-size: 14px; font-weight: 600; color: var(--ds-text); }
.label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--ds-text-muted); }
.value { font-size: 24px; font-weight: 700; color: var(--ds-text); letter-spacing: -0.5px; }
.value-sm { font-size: 18px; font-weight: 600; color: var(--ds-text); }
.body { font-size: 14px; color: var(--ds-text-secondary); line-height: 1.6; }
.small { font-size: 12px; color: var(--ds-text-muted); }
.tiny { font-size: 11px; color: var(--ds-text-faint); }
.mono { font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace; font-size: 13px; }
.tabular { font-variant-numeric: tabular-nums; }
.bold { font-weight: 600; }
.medium { font-weight: 500; }

/* ── Colors ────────────────────────────────────────────────── */
.text-primary { color: var(--ds-text); }
.text-secondary { color: var(--ds-text-secondary); }
.text-muted { color: var(--ds-text-muted); }
.text-green { color: var(--ds-green-text); }
.text-red { color: var(--ds-red-text); }
.text-amber { color: var(--ds-amber-text); }
.text-blue { color: var(--ds-blue-text); }
.text-purple { color: var(--ds-purple-text); }

/* ── Cards & Surfaces ─────────────────────────────────────── */
.card {
  background: var(--ds-bg-subtle); border-radius: var(--ds-radius); padding: 20px;
  border: 1px solid var(--ds-border-subtle);
}
.card-elevated {
  background: var(--ds-bg-elevated); border-radius: var(--ds-radius); padding: 20px;
  box-shadow: var(--ds-shadow); border: 1px solid var(--ds-border-subtle);
}
.card-outline {
  background: var(--ds-bg); border: 1px solid var(--ds-border); border-radius: var(--ds-radius); padding: 20px;
}
.card-accent-green { border-left: 3px solid var(--ds-green); }
.card-accent-red { border-left: 3px solid var(--ds-red); }
.card-accent-amber { border-left: 3px solid var(--ds-amber); }
.card-accent-blue { border-left: 3px solid var(--ds-blue); }

/* ── Badges ────────────────────────────────────────────────── */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: var(--ds-radius-pill);
}
.badge-green { background: var(--ds-green-bg); color: var(--ds-green-text); }
.badge-red { background: var(--ds-red-bg); color: var(--ds-red-text); }
.badge-amber { background: var(--ds-amber-bg); color: var(--ds-amber-text); }
.badge-blue { background: var(--ds-blue-bg); color: var(--ds-blue-text); }
.badge-purple { background: var(--ds-purple-bg); color: var(--ds-purple-text); }
.badge-gray { background: var(--ds-bg-muted); color: var(--ds-text-muted); }

/* ── Lists ─────────────────────────────────────────────────── */
.list-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-radius: var(--ds-radius-sm); transition: background 0.15s;
}
.list-item:nth-child(odd) { background: var(--ds-bg-subtle); }
.list-item:nth-child(even) { background: transparent; }

/* ── Progress / Bars ───────────────────────────────────────── */
.progress { height: 6px; border-radius: 3px; background: var(--ds-bg-muted); overflow: hidden; }
.progress-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.bar-green { background: var(--ds-green); }
.bar-blue { background: var(--ds-blue); }
.bar-amber { background: var(--ds-amber); }
.bar-red { background: var(--ds-red); }
.bar-purple { background: var(--ds-purple); }

/* Horizontal bar chart */
.bar-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; }
.bar-label { font-size: 13px; color: var(--ds-text-secondary); width: 140px; flex-shrink: 0; }
.bar-track { flex: 1; height: 8px; border-radius: 4px; background: var(--ds-bg-muted); overflow: hidden; }
.bar-value { font-size: 13px; font-weight: 600; color: var(--ds-text); width: 80px; text-align: right; flex-shrink: 0; }

/* ── Separator ─────────────────────────────────────────────── */
.divider { height: 1px; background: var(--ds-border); margin: 24px 0; }

/* ── Table ─────────────────────────────────────────────────── */
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--ds-text-muted); padding: 10px 12px; border-bottom: 1px solid var(--ds-border); }
td { padding: 12px; border-bottom: 1px solid var(--ds-border-subtle); color: var(--ds-text-secondary); }
tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--ds-bg-subtle); }
td.number { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
th.number { text-align: right; }

/* ── Pill / Tag ────────────────────────────────────────────── */
.pill { display: inline-block; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: var(--ds-radius-sm); background: var(--ds-bg-muted); color: var(--ds-text-secondary); }

/* ── Stat highlight ────────────────────────────────────────── */
.stat { text-align: center; }
.stat .value { display: block; }
.stat .label { display: block; margin-top: 4px; }

/* ── Trend indicator ───────────────────────────────────────── */
.trend-up { color: var(--ds-green-text); }
.trend-up::before { content: '↑ '; }
.trend-down { color: var(--ds-red-text); }
.trend-down::before { content: '↓ '; }
.trend-neutral { color: var(--ds-text-muted); }
.trend-neutral::before { content: '→ '; }

/* ── Theme Toggle Button ──────────────────────────────────── */
.theme-toggle {
  position: fixed; bottom: 16px; right: 16px; z-index: 9999;
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--ds-border);
  background: var(--ds-bg-elevated);
  box-shadow: var(--ds-shadow);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
  color: var(--ds-text-muted);
}
.theme-toggle:hover {
  background: var(--ds-bg-muted);
  border-color: var(--ds-border);
  transform: scale(1.08);
}
.theme-toggle svg { width: 18px; height: 18px; }
.theme-toggle .icon-sun { display: none; }
.theme-toggle .icon-moon { display: block; }
html.dark .theme-toggle .icon-sun { display: block; }
html.dark .theme-toggle .icon-moon { display: none; }

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 480px) {
  body { padding: 20px; }
  .grid-3 { grid-template-columns: 1fr 1fr; }
  .grid-4 { grid-template-columns: 1fr 1fr; }
  .hero { font-size: 36px; }
}
`

// ---------------------------------------------------------------------------
// Theme toggle — injected into every iframe as inline script
// ---------------------------------------------------------------------------

const THEME_TOGGLE_SCRIPT = `
<button class="theme-toggle" aria-label="Toggle theme" onclick="(function(){var h=document.documentElement;h.classList.toggle('dark');h.classList.toggle('light');})()">
  <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
</button>
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
  const { resolvedTheme } = useTheme()
  const current = versions[currentIndex]
  const hasMultiple = versions.length > 1

  const themeClass = resolvedTheme === 'dark' ? 'dark' : 'light'
  const html = current.html
  const fullHtml =
    html.trim().toLowerCase().startsWith('<!doctype') ||
    html.trim().toLowerCase().startsWith('<html')
      ? html
      : `<!DOCTYPE html>
<html lang="pt-BR" class="${themeClass}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${DESIGN_SYSTEM_CSS}</style>
</head>
<body>${THEME_TOGGLE_SCRIPT}${html}</body>
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
