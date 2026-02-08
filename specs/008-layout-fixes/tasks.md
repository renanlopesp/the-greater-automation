# 008 — Layout Audit Fixes

Reference: docs/LAYOUT_AUDIT_SYNTHESIS.md

## Phase 1: Shell + Layouts (P0 — Critical)

Files: `src/components/dashboard-shell.tsx`, `src/app/(editor)/layout.tsx`, `src/app/(auth)/layout.tsx`

- [x] T101 — Remove double scroll: keep `overflow-auto` only on `main`, remove from children wrapper (`dashboard-shell.tsx:31,35`)
- [x] T102 — Replace `h-screen` with `h-dvh` on dashboard shell (`dashboard-shell.tsx:24`)
- [x] T103 — Replace `h-screen` with `h-dvh` on editor layout (`(editor)/layout.tsx:6`)
- [x] T104 — Replace `min-h-screen` with `min-h-dvh` on auth layout (`(auth)/layout.tsx:15`)
- [x] T105 — Remove redundant `TooltipProvider` from `dashboard-shell.tsx` (keep only in sidebar)
- [x] T106 — Run `bun run build` — must pass

## Phase 2: Sidebar + Search + Command Menu (P1+P2)

Files: `src/components/app-sidebar.tsx`, `src/components/search-trigger.tsx`, `src/components/command-menu.tsx`, `src/components/theme-toggle.tsx`

- [x] T201 — Add mobile hamburger menu: add a Sheet-based mobile nav triggered from header, visible below `md:` breakpoint (`app-sidebar.tsx`)
- [x] T202 — Add `aria-label="Create new"` on icon-only button (`app-sidebar.tsx:119`)
- [x] T203 — Add `aria-label` to all icon-only nav links (`app-sidebar.tsx:140`)
- [x] T204 — Change `href="#"` to `<button>` for non-navigation sidebar actions (`app-sidebar.tsx:41`)
- [x] T205 — Add `type="button"` and `focus-visible:ring-2 focus-visible:ring-ring` to search trigger (`search-trigger.tsx:11`)
- [x] T206 — Make kbd hint platform-aware (Cmd on Mac, Ctrl on others) with `<kbd>` styling (`search-trigger.tsx:13`)
- [x] T207 — In command menu, skip Ctrl+K handler when target is input/textarea/contenteditable (`command-menu.tsx:46`)
- [x] T208 — Add `teamId` param to runs query in command menu (`command-menu.tsx:83`)
- [x] T209 — Replace `transition-all` with specific transition properties in theme toggle (`theme-toggle.tsx:21`)
- [x] T210 — Run `bun run build` — must pass

## Phase 3: Workspace + Runs (P0+P1)

Files: `src/components/workspace/workspace-table.tsx`, `src/components/workspace/workspace-filters.tsx`, `src/components/workspace/workspace-header.tsx`, `src/components/runs/runs-table.tsx`, `src/components/runs/runs-filters.tsx`

- [x] T301 — Remove duplicate `overflow-x-auto` wrapper from workspace table (`workspace-table.tsx:48`) — `Table` component already has it
- [x] T302 — Remove duplicate `overflow-x-auto` wrapper from runs table (`runs-table.tsx:32`)
- [x] T303 — Change fixed widths in workspace filters to `w-full sm:w-[Xpx]` (`workspace-filters.tsx:47,64,75`)
- [x] T304 — Change fixed widths in runs filters to `w-full sm:w-[Xpx]` (`runs-filters.tsx:34,41,57`)
- [x] T305 — Add `flex-wrap gap-2` to workspace header for responsive button layout (`workspace-header.tsx:13`)
- [x] T306 — Run `bun run build` — must pass

## Phase 4: Workflow Editor (P0+P1)

Files: `src/components/workflow-editor/editor-layout.tsx`, `src/components/workflow-editor/step-config-panel.tsx`, `src/components/workflow-editor/ai-assistant-panel.tsx`

- [x] T401 — Fix `useIsMobile()` SSR hydration mismatch: add `suppressHydrationWarning` or use CSS-only approach (`editor-layout.tsx:14`)
- [x] T402 — Change `w-[400px]` to `w-full sm:w-[400px]` in step config panel (`step-config-panel.tsx:37`)
- [x] T403 — Change `grid-cols-2` to `grid-cols-1 sm:grid-cols-2` in AI assistant panel (`ai-assistant-panel.tsx:51`)
- [x] T404 — Run `bun run build` — must pass

## Phase 5: Settings + Agent Detail (P1)

Files: `src/components/settings/settings-dialog.tsx`, `src/components/settings/settings-sidebar.tsx`, `src/components/agent-detail/activity-heatmap.tsx`, `src/app/(dashboard)/agents/[id]/page.tsx`

- [x] T501 — Make settings sidebar responsive: `w-full sm:w-56` and stack vertically on mobile (`settings-sidebar.tsx:39`)
- [x] T502 — Replace `h-[70vh]`/`max-h-[80vh]` with dvh-based units (`settings-dialog.tsx:71,76`)
- [x] T503 — Add `overflow-x-auto` wrapper to activity heatmap and make widths responsive (`activity-heatmap.tsx:59,67`)
- [x] T504 — Change `p-8` to `p-6` for spacing consistency with rest of app (`agents/[id]/page.tsx:113`)
- [x] T505 — Run `bun run build` — must pass

## Phase 6: Globals + UI Primitives + Dashboard Cards (P2+P3)

Files: `src/app/globals.css`, `src/components/ui/button.tsx`, `src/components/ui/dialog.tsx`, `src/components/dashboard/agent-card.tsx`, `src/components/dashboard/agents-grid.tsx`, `src/components/dashboard/workflows-section.tsx`

- [x] T601 — Replace `transition-all` with specific transition properties in button (`button.tsx:8`)
- [x] T602 — Replace `transition-all` with specific transition properties in agent-card (`agent-card.tsx:25`)
- [x] T603 — Replace `transition-all` with specific transition properties in agents-grid (`agents-grid.tsx:17`)
- [x] T604 — Fix `--font-geist-mono` — either import Geist Mono font or remove dead reference (`globals.css:11`)
- [x] T605 — Verify dialog `outline-none` doesn't remove focus-visible indicator; fix if needed (`dialog.tsx:64`)
- [x] T606 — Wrap workflows list in `Card` component for visual elevation (`workflows-section.tsx`)
- [x] T607 — Run `bun run build && bun run lint` — must pass
- [x] T608 — Final: run full validation, create git commit
