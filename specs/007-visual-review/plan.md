# Implementation Plan: Visual Review & Polish

**Branch**: `007-visual-review` | **Date**: 2026-02-08 | **Spec**: [specs/007-visual-review/spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-visual-review/spec.md`

## Summary

Fix 10+ visual and data discrepancies found during Playwright comparison of implemented pages vs reference screenshots. The primary issues are: (1) dashboard workflows showing "0 runs" due to missing run aggregation queries, (2) sidebar using white/gray instead of brand blue/indigo, (3) inconsistent light/dark theme support across all pages, (4) workflow editor rendering inside the sidebar layout instead of full-width, and (5) several visual polish items (agent detail background, app icons, card styling). This also adds proper `next-themes` integration for consistent light/dark mode switching with a user-accessible toggle.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19.2.3, shadcn/ui (new-york), Tailwind CSS v4, Recharts, date-fns, next-themes
**Storage**: Supabase (PostgreSQL) — querying existing `workflow_runs` table
**Testing**: Vitest + Testing Library (unit), Playwright (e2e), plus `bun run build` and `bun run lint`
**Target Platform**: Web (modern browsers supporting OKLCH colors)
**Project Type**: Next.js App Router web application
**Performance Goals**: Dashboard data queries < 500ms, no Recharts console warnings
**Constraints**: Server Components by default, all colors via CSS variables, no hex/rgb

### Key Dependencies

- `next-themes`: Theme provider for Next.js with system preference detection, localStorage persistence, and flash-free SSR
- `date-fns`: `formatDistanceToNow` for last-run timestamps (already installed)
- `recharts`: Sparkline charts (already installed) — fix dimension guards
- `lucide-react`: Icons (already installed)
- shadcn/ui: Existing components, no new ones needed (except possibly `DropdownMenu` for theme toggle)
- `simple-icons` CDN: `https://cdn.simpleicons.org/{slug}` for app brand icons (external, no install)

## Constitution Check

_GATE: Must pass before implementation._

| Principle                            | Status | Notes                                                                                                                                                          |
| ------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. App Router First                  | PASS   | New `(editor)` route group uses App Router. All data fetching remains in Server Components. Theme provider added to root layout.                               |
| II. shadcn/ui Component System       | PASS   | Uses existing shadcn components. Theme toggle uses `DropdownMenu` from shadcn. No parallel implementations.                                                    |
| III. Tailwind CSS v4 + OKLCH Theming | PASS   | All sidebar color changes use OKLCH CSS variables. Dark mode variables added/corrected in globals.css. No hex/rgb.                                             |
| IV. TypeScript Strict Mode           | PASS   | All new/modified code strictly typed. Run aggregation returns typed results.                                                                                   |
| V. Simplicity and YAGNI              | PASS   | Minimal changes to fix specific issues. No new abstractions. CDN icons with simple fallback. `next-themes` is the standard minimal solution for theme support. |
| VI. Supabase as Backend              | PASS   | Run data fetched via existing Supabase client. No new tables or schema changes.                                                                                |

## Project Structure

### Documentation (this feature)

```text
specs/007-visual-review/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task checklist
```

### Source Code Changes

```text
# NEW FILES
src/app/(editor)/layout.tsx                      # Minimal layout without sidebar
src/app/(editor)/workflows/[id]/edit/page.tsx     # Re-export or move editor page
src/components/theme-toggle.tsx                   # Light/dark mode toggle button

# MODIFIED FILES
src/app/globals.css                               # Sidebar OKLCH vars (light+dark), theme consistency audit
src/app/layout.tsx                                # Add ThemeProvider from next-themes
src/components/app-sidebar.tsx                    # Icon/text classes for sidebar brand colors
src/lib/queries/dashboard.ts                      # Add fetchWorkflowRunStats() aggregation
src/components/dashboard/workflows-section.tsx    # Pass run data to workflow items
src/components/dashboard/activity-sparkline.tsx   # Dimension guard for Recharts
src/app/(dashboard)/agents/[id]/page.tsx          # Blue-tinted left panel bg
src/lib/data/app-integrations.ts                  # Add iconSlug field to app data
src/components/settings/app-integration-row.tsx   # CDN icon with fallback
src/components/dashboard/agent-card.tsx           # Visual depth improvements
src/providers/theme-provider.tsx                  # next-themes provider wrapper

# DELETED/MOVED FILES
src/app/(dashboard)/workflows/[id]/edit/page.tsx  # Moved to (editor) route group
```

## Implementation Details

### 1. Theme System (US3) — next-themes Integration

Install `next-themes` and create a provider:

```typescript
// src/providers/theme-provider.tsx
"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

Wrap root layout:

```typescript
// src/app/layout.tsx — add to <body>
<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  {children}
</ThemeProvider>
```

Theme toggle component:

```typescript
// src/components/theme-toggle.tsx
'use client'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
// Toggle between light/dark/system
```

### 2. Dashboard Run Data Fix (US1)

Add run aggregation to `src/lib/queries/dashboard.ts`:

```typescript
export async function fetchWorkflowRunStats(supabase: Client, workflowIds: string[]) {
  // Query workflow_runs for the given IDs
  const { data } = await supabase
    .from('workflow_runs')
    .select('workflow_id, started_at, status')
    .in('workflow_id', workflowIds)

  // Aggregate per workflow:
  // - totalRuns: COUNT
  // - lastRunAt: MAX(started_at)
  // - sparklineData: daily counts for last 30 days
  const stats = new Map<
    string,
    {
      totalRuns: number
      lastRunAt: string | null
      sparklineData: { date: string; count: number }[]
    }
  >()

  // ... aggregation logic ...
  return stats
}
```

Update `workflows-section.tsx` to call `fetchWorkflowRunStats` and pass data to each workflow item.

### 3. Sidebar CSS Variables (US2)

Update `src/app/globals.css` — replace sidebar variables:

```css
/* Light mode */
:root {
  --sidebar: oklch(0.3 0.15 265); /* Deep indigo */
  --sidebar-foreground: oklch(0.98 0 0); /* White text */
  --sidebar-primary: oklch(1 0 0); /* White active bg */
  --sidebar-primary-foreground: oklch(0.3 0.15 265); /* Indigo text on active */
  --sidebar-accent: oklch(0.35 0.12 265); /* Hover: slightly lighter indigo */
  --sidebar-accent-foreground: oklch(0.98 0 0); /* White text on hover */
  --sidebar-border: oklch(0.25 0.12 265); /* Darker indigo border */
  --sidebar-ring: oklch(0.6 0.15 265); /* Focus ring */
}

/* Dark mode */
.dark {
  --sidebar: oklch(0.22 0.12 265); /* Darker indigo */
  --sidebar-foreground: oklch(0.95 0 0); /* White text */
  --sidebar-primary: oklch(0.95 0 0); /* White active bg */
  --sidebar-primary-foreground: oklch(0.22 0.12 265); /* Indigo text on active */
  --sidebar-accent: oklch(0.28 0.1 265); /* Hover */
  --sidebar-accent-foreground: oklch(0.95 0 0); /* White on hover */
  --sidebar-border: oklch(0.18 0.1 265); /* Border */
  --sidebar-ring: oklch(0.5 0.12 265); /* Focus ring */
}
```

### 4. Editor Route Group (US4)

Create `src/app/(editor)/layout.tsx`:

```typescript
import { TooltipProvider } from "@/components/ui/tooltip"
import { CommandMenu } from "@/components/command-menu"

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      {children}
      <CommandMenu />
    </TooltipProvider>
  )
}
```

Move `src/app/(dashboard)/workflows/[id]/edit/page.tsx` to `src/app/(editor)/workflows/[id]/edit/page.tsx`.

### 5. App Icons via CDN (US5)

Add `iconSlug` to each app in `src/lib/data/app-integrations.ts`:

```typescript
{ name: "Slack", iconSlug: "slack", ... }
{ name: "GitHub", iconSlug: "github", ... }
```

Update `app-integration-row.tsx`:

```typescript
<Avatar className="h-8 w-8">
  <AvatarImage src={`https://cdn.simpleicons.org/${app.iconSlug}`} alt={app.name} />
  <AvatarFallback className="text-xs">{app.name[0]}</AvatarFallback>
</Avatar>
```

### 6. Theme Audit — CSS Variables & Hardcoded Colors

Audit all files for:

- Hardcoded `hsl(...)` values in chart components → replace with `var(--primary)`, `var(--muted)`, etc.
- Components using `bg-white`, `text-black`, or other non-variable colors → replace with `bg-background`, `text-foreground`
- Ensure all `.dark` CSS variable overrides are complete and consistent
- Verify no components have `dark:` prefixed classes that conflict with CSS variable theming

## Complexity Tracking

No constitution violations — all changes are minimal fixes to existing code.
