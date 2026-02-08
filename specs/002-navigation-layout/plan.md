# Implementation Plan: Navigation & Layout

**Branch**: `002-navigation-layout` | **Date**: 2026-02-07 | **Spec**: [specs/002-navigation-layout/spec.md](spec.md)
**Input**: Feature specification from `/specs/002-navigation-layout/spec.md`

## Summary

Implement the authenticated shell for Relay: a 64px icon-based sidebar with navigation, usage meters, and avatar dropdown; a server-component dashboard layout with Supabase auth gating and data fetching; and a `Ctrl+K` command menu using cmdk for searching workflows, agents, and runs. All components compose shadcn/ui primitives with Tailwind v4 OKLCH theming.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19.2.3, shadcn/ui (new-york style), Lucide React 0.563.0, cmdk (via shadcn command), @supabase/ssr, @supabase/supabase-js
**Storage**: Supabase (PostgreSQL) -- tables: `profiles`, `teams`, `team_members`, `usage`, `workflows`, `agents`, `workflow_runs`
**Testing**: Unit tests (Vitest + Testing Library), e2e tests (Playwright), plus `bun run build` and `bun run lint`. Testing infrastructure established in 001-foundation Phase 6.
**Target Platform**: Web (modern browsers with OKLCH support)
**Project Type**: Web (Next.js App Router monolith)
**Performance Goals**: Sidebar renders on first server response (SSR), command menu opens < 100ms, search results < 300ms
**Constraints**: Server Components by default, `"use client"` only where required; no custom API routes for CRUD that Supabase handles
**Scale/Scope**: Single team context per session, up to 1000 workflows/agents for search

## Constitution Check

*GATE: Must pass before implementation. Re-check after design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Next.js App Router First | PASS | Dashboard layout is a Server Component in `src/app/(dashboard)/layout.tsx`. Auth check and data fetching happen server-side. |
| II. shadcn/ui Component System | PASS | Uses shadcn `sidebar`, `command`, `dropdown-menu`, `avatar`, `tooltip`, `progress`, `dialog`, `separator`. All custom components compose these primitives. |
| III. Tailwind CSS v4 + OKLCH | PASS | All styling via Tailwind utility classes. Active state uses CSS variable-based blue. No hex/rgb literals. |
| IV. TypeScript Strict Mode | PASS | All components fully typed. Props interfaces defined. Supabase queries use generated database types. |
| V. Simplicity and YAGNI | PASS | No state management library needed for sidebar (uses URL for active state). Command menu uses cmdk built-in filtering. No premature abstractions. |
| VI. Supabase as Backend | PASS | Auth via `@supabase/ssr` server client. Profile/team/usage fetched via Supabase queries in the layout Server Component. No custom API routes. |

## Project Structure

### Documentation (this feature)

```text
specs/002-navigation-layout/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task checklist
```

### Source Code (repository root)

```text
src/
├── app/
│   └── (dashboard)/
│       └── layout.tsx              # US2: Server component layout with auth + sidebar
├── components/
│   ├── app-sidebar.tsx             # US1: Icon-based sidebar (client component)
│   ├── command-menu.tsx            # US3: Ctrl+K command menu (client component)
│   ├── search-trigger.tsx          # US3: Static "Type Ctrl K to search" bar
│   └── ui/
│       ├── sidebar.tsx             # shadcn sidebar (already installed or to install)
│       ├── command.tsx             # shadcn command / cmdk
│       ├── dropdown-menu.tsx       # shadcn dropdown-menu
│       ├── avatar.tsx              # shadcn avatar
│       ├── tooltip.tsx             # shadcn tooltip
│       ├── progress.tsx            # shadcn progress
│       ├── dialog.tsx              # shadcn dialog
│       └── separator.tsx           # shadcn separator
├── lib/
│   ├── supabase/
│   │   ├── server.ts               # Server Supabase client (from 001-foundation)
│   │   ├── client.ts               # Browser Supabase client (from 001-foundation)
│   │   └── database.types.ts       # Generated types (from 001-foundation)
│   └── utils.ts                    # cn() utility (exists)
└── types/
    └── navigation.ts               # Shared types for nav items, usage data
```

**Structure Decision**: Single Next.js App Router project. All components live under `src/components/`. The `(dashboard)` route group provides the authenticated layout shell without affecting URL paths.

## Component Interfaces

### AppSidebar (`src/components/app-sidebar.tsx`)

```typescript
// "use client" -- needs usePathname() for active state, event handlers for dropdown

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  action?: "command-menu" | "settings" | "external"  // override default link behavior
}

interface UsageData {
  stepsUsed: number
  stepsLimit: number
  aiCreditsUsed: number
  aiCreditsLimit: number
}

interface UserData {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

interface TeamData {
  id: string
  name: string
  slug: string
}

interface AppSidebarProps {
  user: UserData
  team: TeamData | null
  usage: UsageData | null
}
```

### CommandMenu (`src/components/command-menu.tsx`)

```typescript
// "use client" -- keyboard listeners, dialog state, search state

interface CommandMenuProps {
  teamId: string | null  // for scoping Supabase queries
}

// Internal state managed via useState:
// - open: boolean (dialog visibility)
// - query: string (search input)
// - results: grouped by type (workflows, agents, runs)
```

### SearchTrigger (`src/components/search-trigger.tsx`)

```typescript
// "use client" -- onClick handler to open command menu

interface SearchTriggerProps {
  onOpen: () => void  // or handled via shared state/event
}
```

### Dashboard Layout (`src/app/(dashboard)/layout.tsx`)

```typescript
// Server Component -- NO "use client"

interface DashboardLayoutProps {
  children: React.ReactNode
}

// Server-side data fetching:
// 1. Get Supabase session via server client
// 2. If no session -> redirect("/login")
// 3. Fetch profile from profiles table
// 4. Fetch team via team_members join
// 5. Fetch usage for current team + current period
// 6. Pass data to AppSidebar as props
```

## Data Requirements

### Supabase Queries (Server-side, in layout.tsx)

**1. Get authenticated user session**
```sql
-- Via @supabase/ssr server client
supabase.auth.getUser()
```

**2. Fetch user profile**
```sql
SELECT id, email, full_name, avatar_url
FROM profiles
WHERE id = :userId
LIMIT 1
```

**3. Fetch user's team (first team)**
```sql
SELECT t.id, t.name, t.slug, t.avatar_url
FROM teams t
INNER JOIN team_members tm ON tm.team_id = t.id
WHERE tm.user_id = :userId
LIMIT 1
```

**4. Fetch current usage**
```sql
SELECT steps_used, steps_limit, ai_credits_used, ai_credits_limit
FROM usage
WHERE team_id = :teamId
  AND period_start <= NOW()
  AND period_end >= NOW()
ORDER BY period_start DESC
LIMIT 1
```

### Supabase Queries (Client-side, in command-menu.tsx)

**5. Search workflows**
```sql
SELECT id, name, emoji
FROM workflows
WHERE team_id = :teamId
  AND name ILIKE '%:query%'
LIMIT 10
```

**6. Search agents**
```sql
SELECT id, name, avatar_url
FROM agents
WHERE team_id = :teamId
  AND name ILIKE '%:query%'
LIMIT 10
```

**7. Search runs**
```sql
SELECT wr.id, wr.status, w.name as workflow_name
FROM workflow_runs wr
INNER JOIN workflows w ON w.id = wr.workflow_id
WHERE w.team_id = :teamId
  AND (w.name ILIKE '%:query%' OR wr.id::text ILIKE '%:query%')
LIMIT 10
```

## Navigation Route Map

| Nav Item | Route | Icon (Lucide) | Behavior |
|----------|-------|---------------|----------|
| Home | `/dashboard` | `Home` | Standard link |
| Search | -- | `Search` | Opens command menu (action) |
| Workspace | `/workspace` | `FolderOpen` | Standard link |
| Runs | `/runs` | `Play` | Standard link |
| Apps | -- | `Grid2x2` | Opens settings dialog (action) |
| Support | -- | `HelpCircle` | External link or modal (action) |

## Complexity Tracking

No constitution violations. All components use standard patterns:
- Server Component layout with `redirect()` for auth gating
- Client Components only where interactivity is required (sidebar active state, command menu, dropdown)
- shadcn/ui primitives composed without custom abstractions
- Direct Supabase queries without repository pattern
