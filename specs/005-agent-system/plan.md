# Implementation Plan: Agent System

**Branch**: `005-agent-system` | **Date**: 2026-02-07 | **Spec**: [specs/005-agent-system/spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-agent-system/spec.md`

## Summary

Build the agent detail page at `/agents/[id]` with a two-panel layout: a left panel showing the agent's animated dots avatar, identity info, skills list with last-run times, and a chat input; a right panel showing a 6-month GitHub-style activity heatmap, usage progress indicators, and run history. Uses date-fns for all date calculations, Supabase server client for data fetching, and CSS keyframe animations for the dots avatar.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19.2.3, shadcn/ui (new-york), date-fns, Tailwind CSS v4
**Storage**: Supabase (PostgreSQL) - tables: agents, agent_skills, workflow_runs, usage
**Testing**: Unit tests (Vitest + Testing Library) for components, e2e tests (Playwright) for agent detail page. Plus `bun run build` and `bun run lint`. Testing infrastructure established in 001-foundation Phase 6.
**Target Platform**: Web (modern browsers supporting OKLCH colors)
**Project Type**: Next.js App Router web application
**Performance Goals**: Page load under 2 seconds, heatmap tooltip under 100ms, avatar animation at 60fps
**Constraints**: Server Components by default, `"use client"` only when interactivity required
**Scale/Scope**: 3 new files (1 page, 1 component, plus supporting sub-components)

### Key Dependencies (already installed via Phase 1)

- `date-fns`: `subMonths`, `startOfWeek`, `endOfWeek`, `eachDayOfInterval`, `format`, `formatDistanceToNow`, `getDay`, `startOfMonth`, `isSameMonth`, `isAfter`, `isBefore`
- `@supabase/ssr`: Server-side Supabase client for data fetching in Server Components
- shadcn/ui components: `Card`, `Badge`, `Input`, `Button`, `Avatar`, `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`, `Progress`, `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `ScrollArea`
- `lucide-react`: `Send`, `Plus`, `Sparkles`, `Zap`, `Bot` icons
- `cn()` from `@/lib/utils` for all dynamic className composition

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. App Router First | PASS | Page at `src/app/(dashboard)/agents/[id]/page.tsx` uses App Router. Server Component for data fetching. `"use client"` only for interactive components (heatmap tooltips, chat input, avatar animation). |
| II. shadcn/ui Component System | PASS | Uses Card, Badge, Input, Button, Avatar, Tooltip, Progress, DropdownMenu, ScrollArea from shadcn/ui. Custom components compose shadcn primitives. |
| III. Tailwind CSS v4 + OKLCH Theming | PASS | All colors reference CSS variable-based theme tokens (bg-muted, bg-blue-200/400/600). No direct hex/rgb. Responsive via Tailwind breakpoints. |
| IV. TypeScript Strict Mode | PASS | All components strictly typed. Props interfaces defined. Supabase types from database.types.ts. |
| V. Simplicity and YAGNI | PASS | No abstractions beyond what is needed. Heatmap is a single component with inline date logic. No state management library needed (page is server-rendered, interactive bits use local useState). Chat is UI-only (no backend processing in this phase). |
| VI. Supabase as Backend | PASS | All data fetched via server-side Supabase client. Agent, skills, runs, usage from Supabase tables. RLS enforced. |

## Project Structure

### Documentation (this feature)

```text
specs/005-agent-system/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task breakdown
```

### Source Code (repository root)

```text
src/
├── app/
│   └── (dashboard)/
│       └── agents/
│           └── [id]/
│               └── page.tsx           # Agent detail page (Server Component + client sub-components)
├── components/
│   └── agent-detail/
│       ├── activity-heatmap.tsx       # 6-month GitHub-style heatmap (client component)
│       ├── agent-avatar.tsx           # Animated 24x24 dots avatar (client component)
│       ├── agent-info.tsx             # Name + description display (server component)
│       ├── skills-list.tsx            # Skills cards + "New skill" button (client component)
│       ├── chat-input.tsx             # Chat input + send button (client component)
│       ├── progress-indicators.tsx    # Steps + AI credits progress bars (server component)
│       └── run-history.tsx            # Run list or empty state (server component)
└── lib/
    └── supabase/                      # Already exists from Phase 1
```

**Structure Decision**: Components are grouped under `src/components/agent-detail/` to co-locate all agent detail sub-components. The page file orchestrates data fetching and passes props to sub-components. Client components are isolated to the smallest possible boundary (avatar animation, heatmap tooltips, chat input, skills dropdown).

## Component Tree

```
AgentDetailPage (Server Component - page.tsx)
├── LeftPanel (div.w-96.bg-muted/30)
│   ├── AgentAvatar (client - animated dots)
│   ├── AgentInfo (server - h1 name + description)
│   ├── SkillsList (client - cards + dropdown)
│   │   ├── SkillCard (for each skill)
│   │   │   ├── Card (shadcn)
│   │   │   ├── emoji icon
│   │   │   ├── skill name
│   │   │   └── "Never ran" | formatDistanceToNow(last_run_at)
│   │   └── NewSkillButton
│   │       └── DropdownMenu (shadcn)
│   └── ChatInput (client - sticky bottom)
│       ├── Input (shadcn)
│       └── Button (shadcn, Send icon)
└── RightPanel (div.flex-1)
    ├── ActivityHeatmap (client - tooltips)
    │   ├── MonthLabels (text above columns)
    │   ├── DayOfWeekLabels (S M T W T F S)
    │   └── CellGrid (colored divs)
    │       └── Tooltip (shadcn, per cell on hover)
    ├── ProgressIndicators (server)
    │   ├── Progress (shadcn - steps)
    │   └── Progress (shadcn - AI credits)
    └── RunHistory (server)
        ├── EmptyState (illustration + "No runs yet.")
        └── RunList (when runs exist)
            └── RunItem (status badge, workflow, duration, time)
```

## CSS Animation: Dots Avatar

The animated dots avatar uses CSS keyframes for a staggered pulse effect. Each dot in the 24x24 grid has an animation delay based on its distance from the center, creating a ripple-like pulse.

```css
@keyframes dot-pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}
```

**Implementation approach**: Use a CSS `animation` property with `dot-pulse` keyframes. Each dot's `animation-delay` is calculated as `distance_from_center * 0.05s` where distance is the Euclidean distance from the dot's grid position to the center (12, 12). This creates concentric rings of pulsing dots. The animation is `infinite` with a duration of `3s` and `ease-in-out` timing.

The avatar is rendered as a flex container with CSS Grid (`grid-template-columns: repeat(24, 1fr)`) inside a rounded-full blue circle. Each dot is a small `div` with `rounded-full bg-white` styling.

## Heatmap Data Structure and Date Calculations

### Data flow

1. **Server Component** fetches `workflow_runs` for the agent, grouped by day:
   ```sql
   SELECT DATE(started_at) as run_date, COUNT(*) as run_count
   FROM workflow_runs
   WHERE agent_id = $1
     AND started_at >= $2  -- 6 months ago
   GROUP BY DATE(started_at)
   ```
2. Result is transformed into a `Map<string, number>` where key is `yyyy-MM-dd` date string and value is run count.
3. Map is passed to `ActivityHeatmap` as prop.

### Date calculations (using date-fns)

```typescript
import {
  subMonths, startOfWeek, eachDayOfInterval, format,
  getDay, startOfMonth, isSameMonth, isAfter, endOfDay
} from "date-fns"

const today = new Date()
const sixMonthsAgo = subMonths(today, 6)
const gridStart = startOfWeek(sixMonthsAgo)  // Align to Sunday
const days = eachDayOfInterval({ start: gridStart, end: today })
```

### Grid layout

- **Columns**: Each week is a column (approximately 26 weeks for 6 months)
- **Rows**: 7 rows (Sunday through Saturday)
- Cell size: `w-3 h-3` (12px) with `gap-0.5` (2px) between cells
- Rendered as CSS Grid: `grid-template-rows: repeat(7, 1fr)` with `grid-auto-flow: column`

### Color mapping function

```typescript
function getHeatmapColor(count: number): string {
  if (count === 0) return "bg-muted"
  if (count <= 2) return "bg-blue-200"
  if (count <= 5) return "bg-blue-400"
  return "bg-blue-600"
}
```

### Month labels

Iterate through the days array. When a day is the first day of a new month AND falls on the start of a week (or is the first rendered day of that month), place a month label above that column. Use `format(date, "MMM")` for abbreviated month names.

## Supabase Queries

### 1. Fetch agent by ID (page.tsx)

```typescript
const { data: agent } = await supabase
  .from("agents")
  .select("*")
  .eq("id", id)
  .single()
```

If `agent` is null, call `notFound()`.

### 2. Fetch skills for agent (page.tsx)

```typescript
const { data: skills } = await supabase
  .from("agent_skills")
  .select("*, workflows(name, emoji)")
  .eq("agent_id", id)
  .order("created_at", { ascending: true })
```

### 3. Fetch runs aggregated by day for heatmap (page.tsx)

```typescript
const sixMonthsAgo = subMonths(new Date(), 6)

const { data: runs } = await supabase
  .from("workflow_runs")
  .select("started_at")
  .eq("agent_id", id)
  .gte("started_at", sixMonthsAgo.toISOString())
  .order("started_at", { ascending: false })
```

Aggregate in JS: group by `format(new Date(run.started_at), "yyyy-MM-dd")` and count.

### 4. Fetch recent runs for run history (page.tsx)

```typescript
const { data: recentRuns } = await supabase
  .from("workflow_runs")
  .select("*, workflows(name, emoji)")
  .eq("agent_id", id)
  .order("started_at", { ascending: false })
  .limit(20)
```

### 5. Fetch usage for progress indicators (page.tsx)

```typescript
const { data: usage } = await supabase
  .from("usage")
  .select("steps_used, steps_limit, ai_credits_used, ai_credits_limit")
  .eq("team_id", agent.team_id)
  .order("period_start", { ascending: false })
  .limit(1)
  .single()
```

## Complexity Tracking

No constitution violations to justify. All implementation follows established patterns:
- Server Components for data fetching, client components only for interactivity
- shadcn/ui primitives composed into custom components
- Tailwind CSS v4 classes for all styling
- date-fns for date logic (no custom date utilities)
- No state management beyond local `useState` for chat input
