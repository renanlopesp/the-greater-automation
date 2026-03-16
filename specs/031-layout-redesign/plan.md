# Implementation Plan: Layout Redesign & Full Page Conversion

**Branch**: `031-layout-redesign` | **Date**: 2026-03-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/031-layout-redesign/spec.md`

## Summary

Replace the relay application's navigation shell (sidebar + top bar) and all 11 dashboard pages with designs matching the Vite prototype (snew-agent-mind). This is a UI-only redesign: the existing App Router structure, Supabase backend, API routes, and auth/middleware remain unchanged. New pages use static/mock data initially. An i18n system (EN + PT-BR) is added via React Context. The conic-gradient animation and OKLCH theme variables are ported from the prototype.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19.2.3, shadcn/ui (new-york), Tailwind CSS v4, TanStack React Query, Zustand, lucide-react, next-themes
**Storage**: Supabase PostgreSQL (existing — unchanged), localStorage (sidebar state, language preference)
**Testing**: Visual comparison against prototype screenshots, `bun run build` + `bun run lint`
**Target Platform**: Web (desktop + mobile responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: All pages load within 1 second, language switching instant (no reload)
**Constraints**: Must preserve existing API routes, auth, middleware. No new database tables. Static/mock data for new page sections.
**Scale/Scope**: 11 pages, ~30 new/modified components, 100+ i18n keys, 27 agent definitions

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                            | Status | Notes                                                                                                                 |
| ------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------- |
| I. Next.js App Router First          | PASS   | All pages stay in `src/app/(dashboard)/`. Server Components default, `"use client"` only for interactive sections.    |
| II. shadcn/ui Component System       | PASS   | All UI uses shadcn/ui primitives (Card, Button, Badge, Dialog, Tabs, Table, etc.). Custom components compose shadcn.  |
| III. Tailwind CSS v4 + OKLCH Theming | PASS   | Prototype HSL colors converted to OKLCH. All colors via CSS variables in globals.css. No hex/rgb.                     |
| IV. TypeScript Strict Mode           | PASS   | All new code in strict TypeScript. Static data files fully typed. Zod for any external data validation.               |
| V. Simplicity and YAGNI              | PASS   | Static data first, no premature Supabase integration. React Context for i18n (not third-party lib). No feature flags. |
| VI. Supabase as Backend              | PASS   | Existing Supabase integration unchanged. No new CRUD routes. New pages use static data until follow-up feature.       |

**Post-design re-check**: All gates still pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/031-layout-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output — 10 research decisions
├── data-model.md        # Phase 1 output — static data shapes
├── quickstart.md        # Phase 1 output — dev setup guide
├── contracts/           # Phase 1 output — component contracts
│   ├── layout-shell.md
│   ├── pages.md
│   └── i18n.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # MODIFY — replace DashboardShell with new shell
│   │   ├── dashboard/page.tsx            # MODIFY — new Home dashboard
│   │   ├── agents/
│   │   │   ├── page.tsx                  # MODIFY — new Co-Workers discovery
│   │   │   └── [id]/
│   │   │       ├── page.tsx              # MODIFY — new Agent Workspace
│   │   │       └── installed/page.tsx    # NEW — Installed Agent detail
│   │   ├── chat/
│   │   │   ├── page.tsx                  # MODIFY — new New Chat page
│   │   │   └── [id]/page.tsx             # NEW — Individual Chat view
│   │   ├── apps/page.tsx                 # MODIFY — new Apps page
│   │   ├── history/page.tsx              # MODIFY — new History page
│   │   ├── notifications/page.tsx        # MODIFY — new Notifications page
│   │   └── customer-service/page.tsx     # NEW — Customer Service dashboard
│   ├── globals.css                       # MODIFY — add OKLCH variables, conic animation
│   └── not-found.tsx                     # MODIFY — 404 page
├── components/
│   ├── app-sidebar-new.tsx               # NEW — simplified icon sidebar
│   ├── top-bar.tsx                       # NEW — 48px top bar
│   ├── dashboard-shell-new.tsx           # NEW — new layout shell (sidebar + topbar + content)
│   ├── home/                             # MODIFY — new home page components
│   │   ├── greeting-section.tsx          # NEW — time-aware greeting
│   │   ├── metrics-cards.tsx             # NEW — 5 impact metrics with conic animation
│   │   ├── ask-bar.tsx                   # NEW — store query input
│   │   ├── coworker-recommendation.tsx   # NEW — recommended agent card
│   │   ├── coworkers-in-action.tsx       # NEW — active agents grid
│   │   └── opportunities-section.tsx     # NEW — detected opportunities
│   ├── discover/                         # NEW — co-workers discovery components
│   │   ├── agent-card.tsx                # NEW — 3-column grid card
│   │   └── category-tabs.tsx             # NEW — filter tabs with counts
│   ├── chat/                             # NEW — chat page components
│   │   ├── chat-empty-state.tsx          # NEW — centered empty state
│   │   ├── chat-input-bar.tsx            # NEW — bottom input with chips
│   │   ├── coworker-selector.tsx         # NEW — agent chip selector
│   │   └── message-thread.tsx            # NEW — conversation renderer
│   ├── agent-workspace/                  # NEW — agent workspace components
│   │   ├── activity-log.tsx              # NEW — left panel activity cards
│   │   ├── agent-info-sidebar.tsx        # NEW — right panel info
│   │   └── activity-card.tsx             # NEW — individual log card
│   ├── notifications/                    # NEW — notification components
│   │   └── notification-card.tsx         # NEW — category-colored card
│   ├── customer-service/                 # NEW — CS dashboard components
│   │   ├── signals-table.tsx             # NEW — filterable data table
│   │   ├── recommended-actions.tsx       # NEW — action cards
│   │   ├── campaign-builder.tsx          # NEW — form with selectors
│   │   └── agent-log.tsx                 # NEW — timestamped log
│   └── ui/                              # shadcn/ui (unchanged, may add new components)
├── contexts/
│   └── language-context.tsx              # NEW — i18n provider (EN + PT-BR)
├── data/
│   ├── agents.ts                         # NEW — 27 agent definitions
│   ├── coworkers.ts                      # NEW — coworker selector data
│   ├── apps.ts                           # NEW — 12 app integrations
│   └── notifications.ts                  # NEW — mock notifications
└── lib/
    └── utils.ts                          # existing — cn() etc.
```

**Structure Decision**: Next.js App Router web application. All pages within `(dashboard)` route group. New components organized by page/feature domain. Static data in `src/data/`. i18n context in `src/contexts/`.

## Complexity Tracking

No constitution violations. No complexity justifications needed.

## Implementation Phases

### Phase 1: Foundation — Shell & Theme (P1)

**Goal**: New sidebar, top bar, and layout shell working across all routes.

1. Add OKLCH theme variables and conic-gradient animation to `globals.css`
2. Create `LanguageContext` provider with EN + PT-BR translations
3. Create `AppSidebarNew` component (56px/240px, 5 nav items, credits, logo)
4. Create `TopBar` component (48px, action buttons, notifications bell, avatar dropdown, language switcher)
5. Create `DashboardShellNew` that composes sidebar + top bar + content area
6. Update `(dashboard)/layout.tsx` to use new shell
7. Mobile responsive: sidebar as overlay sheet on < 768px

### Phase 2: Core Pages — Home & Discover (P1)

**Goal**: Home dashboard and Co-Workers discovery page fully functional.

8. Create Home page components (greeting, metrics, ask bar, recommendation, co-workers grid, opportunities)
9. Port agent data files (`agents.ts`, `coworkers.ts`) to `src/data/`
10. Build Home page client component composing all sections
11. Create Co-Workers discovery page (search, category tabs, 3-column card grid)
12. Create agent card component with detail view on click

### Phase 3: Communication Pages (P2)

**Goal**: New Chat, Chat History, and Individual Chat view.

13. Create New Chat empty state with prompt suggestions
14. Create chat input bar with co-worker selector chips
15. Create Individual Chat view with message thread, action chips
16. Port mock chat/conversation data

### Phase 4: Management Pages (P2)

**Goal**: Apps, History, Notifications, Agent Workspace.

17. Create Apps page (2-column grid, emoji icons, connect/connected status, search)
18. Create History page (date-grouped list, search, context menu)
19. Create Notifications page (New/Earlier sections, category badges, mark all read)
20. Create Agent Workspace (2-panel: activity log + agent sidebar)

### Phase 5: Specialized Pages (P3)

**Goal**: Customer Service dashboard, Installed Agent, 404.

21. Create Customer Service dashboard (metrics, signals table, actions, campaign builder, log, metrics grid)
22. Create Installed Agent detail page (header, chat, action log/results tabs)
23. Update 404 Not Found page

### Phase 6: Polish & Verification

**Goal**: Visual parity with prototype, build passing, all routes working.

24. Visual comparison pass against all 10 prototype screenshots
25. Verify `bun run build` and `bun run lint` pass
26. Verify mobile responsive behavior
27. Verify language switching across all pages
28. Remove unused old components (after all pages migrated)
