# Layout Audit Synthesis

> Consolidated findings from 3 parallel Codex analysis agents (2026-02-08)
> Total tokens consumed: ~443K (Agent 1: 278K, Agent 2: 106K, Agent 3: 58K)

---

## P0 — Critical Layout Bugs

These cause broken UX (double scrollbars, viewport overflow, hydration jumps).

| #   | Issue                                                                                                                  | File:Line                                                                                  | Fix                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 1   | **Double scroll** — `main` and children both have `overflow-auto`, creating nested scrollbars                          | `src/components/dashboard-shell.tsx:31,35`                                                 | Single scroll container: remove inner `overflow-auto`, keep only on `main` |
| 2   | **`h-screen` on dashboard shell** — 100vh breaks on mobile (URL bar eats space)                                        | `src/components/dashboard-shell.tsx:24`                                                    | Replace with `h-dvh` or `min-h-dvh`                                        |
| 3   | **`h-screen` on editor layout** — same mobile viewport issue                                                           | `src/app/(editor)/layout.tsx:6`                                                            | Replace with `h-dvh`                                                       |
| 4   | **`min-h-screen` on auth layout** — same issue                                                                         | `src/app/(auth)/layout.tsx:15`                                                             | Replace with `min-h-dvh`                                                   |
| 5   | **Duplicate `overflow-x-auto` on tables** — `Table` component already wraps with overflow, outer wrapper duplicates it | `src/components/workspace/workspace-table.tsx:48`, `src/components/runs/runs-table.tsx:32` | Remove outer `overflow-x-auto` wrapper                                     |
| 6   | **Editor `useIsMobile()` SSR mismatch** — returns `false` on server, re-renders on client causing layout jump          | `src/components/workflow-editor/editor-layout.tsx:14`                                      | Use CSS-only responsive approach or `suppressHydrationWarning`             |

## P1 — Responsiveness

Fixed widths that break on small screens. Pattern: replace `w-[Xpx]` with `w-full sm:w-[Xpx]`.

| #   | Issue                                                                                           | File:Line                                                  |
| --- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 7   | **No mobile navigation** — sidebar is `hidden md:flex` with no hamburger/bottom nav alternative | `src/components/app-sidebar.tsx:111`                       |
| 8   | **Step config panel `w-[400px]`** — overflows on screens < 400px                                | `src/components/workflow-editor/step-config-panel.tsx:37`  |
| 9   | **Workspace filter selects** — 3 fixed widths (160px, 140px, 140px)                             | `src/components/workspace/workspace-filters.tsx:47,64,75`  |
| 10  | **Runs filter inputs** — 3 fixed widths (200px, 160px, 200px)                                   | `src/components/runs/runs-filters.tsx:34,41,57`            |
| 11  | **Settings sidebar `w-56`** — squeezes content on small screens, should collapse to tabs        | `src/components/settings/settings-sidebar.tsx:39`          |
| 12  | **Settings dialog `h-[70vh]`/`max-h-[80vh]`** — clips on mobile with keyboard open              | `src/components/settings/settings-dialog.tsx:71,76`        |
| 13  | **AI assistant panel `grid-cols-2`** — no single-column fallback for mobile                     | `src/components/workflow-editor/ai-assistant-panel.tsx:51` |
| 14  | **Activity heatmap fixed pixel layout** — hardcoded px widths overflow on small screens         | `src/components/agent-detail/activity-heatmap.tsx:59,67`   |
| 15  | **Workspace header no flex-wrap** — buttons overflow on narrow screens                          | `src/components/workspace/workspace-header.tsx:13`         |
| 16  | **Agent detail inconsistent padding** — `p-8` vs `p-6` used everywhere else                     | `src/app/(dashboard)/agents/[id]/page.tsx:113`             |

## P2 — Accessibility & UX Polish

| #   | Issue                                                                                | File:Line                                                                        | Fix                                                    |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 17  | **Sidebar "Create new" button missing `aria-label`** — icon-only, no accessible name | `src/components/app-sidebar.tsx:119`                                             | Add `aria-label="Create new"`                          |
| 18  | **Sidebar nav links icon-only without labels** — weak accessible names               | `src/components/app-sidebar.tsx:140`                                             | Add `aria-label` or sr-only text                       |
| 19  | **Sidebar nav items use `href="#"`** — should be `button` for actions                | `src/components/app-sidebar.tsx:41`                                              | Use `<button>` for non-navigation actions              |
| 20  | **Search trigger missing `focus-visible` ring and `type="button"`**                  | `src/components/search-trigger.tsx:11,13`                                        | Add `type="button"` and `focus-visible:ring-*`         |
| 21  | **Search trigger "Ctrl K" not platform-aware** — should show Cmd on Mac              | `src/components/search-trigger.tsx:13`                                           | Detect platform, render keycap-styled hint             |
| 22  | **Command menu `Ctrl+K` fires in editable fields** — conflicts with text input       | `src/components/command-menu.tsx:46`                                             | Check `e.target` is not input/textarea/contenteditable |
| 23  | **Command menu runs query missing `teamId` filter**                                  | `src/components/command-menu.tsx:83`                                             | Add team scoping                                       |
| 24  | **`transition-all` overuse** — triggers GPU layers for all properties                | `button.tsx:8`, `theme-toggle.tsx:21`, `agent-card.tsx:25`, `agents-grid.tsx:17` | Use specific transition properties                     |
| 25  | **Missing `--font-geist-mono`** — CSS var referenced but never defined               | `src/app/globals.css:11`                                                         | Import Geist Mono via `next/font` or remove reference  |
| 26  | **Redundant `TooltipProvider`** — one in sidebar + one in shell                      | `app-sidebar.tsx:110`, `dashboard-shell.tsx:23`                                  | Keep only one at shell level                           |
| 27  | **Dialog `outline-none`** — may remove focus indicator                               | `src/components/ui/dialog.tsx:64`                                                | Verify focus-visible still works                       |

## P3 — Visual Alignment with relay.com

Differences between current implementation and relay.com reference screenshots.

| #   | Gap                                        | Current                     | Reference                             |
| --- | ------------------------------------------ | --------------------------- | ------------------------------------- |
| 28  | **Workflows section** — flat list          | No `Card` wrapper           | Card with padding/radius/shadow       |
| 29  | **Dashboard background** — flat solid      | `bg-background`             | Subtle gradient/tint                  |
| 30  | **Search bar kbd hint** — plain text       | `"Type Ctrl K..."`          | Styled `<kbd>` keycap element         |
| 31  | **Integration icons** — 404s on CDN        | Falls back to letter avatar | Full icon set from SimpleIcons        |
| 32  | **Elevation/surface system** — no layering | Single background           | `--surface-0/1/2` with subtle shadows |

## P4 — Enhancement Proposals (Agent 3)

Longer-term improvements for "premium product" feel.

1. **Surface tokens** — add `--surface-0/1/2`, `--shadow-1/2`, `--border-subtle` to `globals.css`
2. **Typography scale** — introduce heading font, define `h1/h2/h3` base styles via `@layer base`
3. **Shell toolbar** — sticky header with breadcrumbs, contextual actions, global search
4. **Mobile navigation** — bottom nav (Home/Workspace/Runs/Search/Settings) or hamburger Sheet
5. **Micro-interactions** — specific transitions, `prefers-reduced-motion` respect, hover lift on cards
6. **Command menu premium** — match highlights, "Recents" section, team-scoped results
7. **Table enhancements** — sticky headers, zebra rows, hover row actions

---

## Recommended Implementation Order

**Sprint 1 (P0 — immediate):** Fix double scroll, viewport units, duplicate overflow wrappers, SSR hydration
**Sprint 2 (P1 — responsiveness):** Mobile navigation, fixed width → fluid, settings dialog responsive
**Sprint 3 (P2 — a11y):** aria-labels, focus rings, platform-aware kbd, transition cleanup
**Sprint 4 (P3+P4 — polish):** Visual alignment with relay.com, surface tokens, premium UX
