# 003 - Dashboard & Workspace Pages: Implementation Plan

## Technical Context

### Dependencies (from 001-foundation)

Already installed or expected:
- `@supabase/supabase-js`, `@supabase/ssr` -- data fetching
- `@tanstack/react-query` -- client-side caching, polling, refetching
- `recharts` -- sparkline rendering
- `date-fns` -- relative time formatting (`formatDistanceToNow`, `format`)
- `zustand` -- not needed for this phase (no cross-component shared state)
- `sonner` -- toast notifications ("Coming soon" for unimplemented views)

### shadcn/ui Components Required

Already added or expected from 002-navigation-layout:
- `tabs` -- workflow tabs on dashboard
- `table` -- workspace table, runs table
- `badge` -- status badges (Draft/Published, run status)
- `card` -- agent cards
- `avatar` -- team avatar, user avatars, agent avatars
- `dropdown-menu` -- "New workflow" split button, row actions
- `select` -- filter dropdowns
- `checkbox` -- table row selection
- `tooltip` -- full datetime on hover
- `separator` -- section dividers
- `scroll-area` -- long lists
- `skeleton` -- loading states (from shadcn, uses `bg-muted animate-pulse`)
- `button` -- already present
- `input` -- already present

If `skeleton` is not yet added:
```bash
bunx shadcn@latest add skeleton
```

### Constitution Check

| Principle | Compliance |
|-----------|-----------|
| App Router first | All pages are `page.tsx` inside `src/app/(dashboard)/`. Server Components for data fetching. |
| shadcn/ui | All UI built from shadcn primitives. No custom UI reinventions. |
| Tailwind v4 | CSS-first config. All styling via utility classes + `cn()`. |
| TypeScript strict | All components fully typed. Interfaces for all props. |
| YAGNI | No pagination on dashboard (max 20 items). No drag-and-drop. No inline editing. No virtual scroll. Folder/Graph views deferred. |
| Supabase | All data from Supabase tables. Server-side initial fetch, client-side React Query for interactivity. |

---

## Component Tree

```
src/app/(dashboard)/dashboard/page.tsx          (Server Component)
  --> DashboardClient                            (Client Component - tabs, filters)
        --> SearchBarTrigger                     (opens CommandMenu)
        --> TeamSection                          (avatar + team name)
        --> AgentsGrid                           (responsive grid)
        |     --> AgentCard                      (per agent)
        |     |     --> AnimatedAgentAvatar      (dots animation)
        |     |     --> SkillChip               (emoji + name)
        |     --> CreateAgentCard                (dashed border + icon)
        --> WorkflowsSection                     (tabs + list)
              --> Tabs / TabsList / TabsTrigger
              --> WorkflowListItem               (per workflow)
                    --> StatusBadge
                    --> ActivitySparkline         (recharts)

src/app/(dashboard)/workspace/page.tsx           (Server Component)
  --> WorkspaceClient                            (Client Component)
        --> WorkspaceHeader                      (title + actions)
        |     --> SplitButton                    (New workflow + dropdown)
        --> WorkspaceFilters                     (search + dropdowns)
        --> ViewToggle                           (3 icon buttons)
        --> WorkspaceTable                       (shadcn Table)
              --> WorkspaceTableHeader           (sortable columns)
              --> AgentRow                        (expandable)
              --> WorkflowRow                     (standard row)
              --> EmptyState
              --> SkeletonRows

src/app/(dashboard)/runs/page.tsx                (Server Component)
  --> RunsClient                                 (Client Component)
        --> RunsHeader                           (title)
        --> RunsFilters                          (search + dropdowns)
        --> RunsTable                            (shadcn Table)
        |     --> RunRow                          (per run)
        |     |     --> RunStatusBadge
        |     --> EmptyState                      (stacked cards illustration)
        |     --> SkeletonRows
        --> LoadMoreButton                       (cursor pagination)
```

---

## Component Interfaces

```typescript
// --- Shared ---

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface StatusBadgeProps {
  status: "draft" | "published";
}

interface RunStatusBadgeProps {
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
}

interface ActivitySparklineProps {
  data: { day: number; count: number }[];
}

// --- Dashboard ---

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
    avatar_type: string | null;
  };
  skills: {
    id: string;
    name: string;
    emoji?: string;
  }[];
}

interface SkillChipProps {
  emoji: string;
  name: string;
}

interface WorkflowListItemProps {
  workflow: {
    id: string;
    name: string;
    emoji: string;
    status: "draft" | "published";
    published_at: string | null;
    total_runs: number;
    last_run_at: string | null;
    sparkline_data: { day: number; count: number }[];
  };
}

interface TeamSectionProps {
  team: {
    name: string;
    avatar_url: string | null;
  };
}

// --- Workspace ---

interface WorkspaceTableProps {
  items: (WorkspaceAgent | WorkspaceWorkflow)[];
  sortColumn: "name";
  sortDirection: "asc" | "desc";
  onSortChange: (direction: "asc" | "desc") => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

interface WorkspaceAgent {
  type: "agent";
  id: string;
  name: string;
  avatar_url: string | null;
  created_by: { id: string; full_name: string; avatar_url: string | null };
  workflows: WorkspaceWorkflow[];
}

interface WorkspaceWorkflow {
  type: "workflow";
  id: string;
  name: string;
  emoji: string;
  status: "draft" | "published";
  last_run_at: string | null;
  created_by: { id: string; full_name: string; avatar_url: string | null };
  published_at: string | null;
  step_count: number;
  has_ai_steps: boolean;
}

// --- Runs ---

interface RunRowProps {
  run: {
    id: string;
    workflow_id: string;
    workflow_name: string;
    workflow_emoji: string;
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    started_at: string | null;
    completed_at: string | null;
    steps_used: number;
    ai_credits_used: number;
  };
}
```

---

## Data Fetching Strategy

### Server-Side (Initial Load)

Each page's server component fetches initial data from Supabase using the server client (`src/lib/supabase/server.ts`). This ensures:
- Fast initial render (no client-side waterfall).
- SEO-friendly content (though these are authenticated pages).
- Reduced client bundle size.

```
Dashboard page.tsx:
  1. Fetch team (from layout or direct query)
  2. Fetch agents with skills (join agent_skills)
  3. Fetch workflows with run aggregates (needs-attention tab default)

Workspace page.tsx:
  1. Fetch agents with their child workflows
  2. Fetch standalone workflows (no agent)
  3. Join with profiles for "Created by"

Runs page.tsx:
  1. Fetch latest 50 runs with workflow name join
  2. Return cursor for pagination
```

### Client-Side (Interactivity)

React Query handles:
- **Tab switching** on dashboard: each tab is a separate query key (`["workflows", teamId, tabValue]`). Stale time 30s.
- **Filtering** on workspace/runs: client-side filtering over the pre-fetched dataset. No additional API calls for simple filters.
- **Search**: debounced at 300ms, filters in-memory.
- **Polling**: runs page polls every 10s when active runs exist (`refetchInterval: hasActiveRuns ? 10_000 : false`).
- **Pagination**: "Load more" on runs page appends to existing data via `useInfiniteQuery`.

### Query Key Structure

```typescript
// Dashboard
["team", teamId]
["agents", teamId]
["workflows", teamId, tab]  // tab = "needs-attention" | "recently-edited" | "recently-run" | "starred"

// Workspace
["workspace-items", teamId, { search, createdBy, status, type, sort }]

// Runs
["runs", teamId, { search, status, workflowId }]
```

---

## File Structure

```
src/
├── app/(dashboard)/
│   ├── dashboard/
│   │   └── page.tsx                    # Server component: fetches team, agents, workflows
│   ├── workspace/
│   │   └── page.tsx                    # Server component: fetches workspace items
│   └── runs/
│       └── page.tsx                    # Server component: fetches runs
├── components/
│   ├── dashboard/
│   │   ├── dashboard-client.tsx        # Client wrapper: tabs, state
│   │   ├── search-bar-trigger.tsx      # Ctrl+K search bar
│   │   ├── team-section.tsx            # Avatar + team name
│   │   ├── agents-grid.tsx            # Grid container + CreateAgentCard
│   │   ├── agent-card.tsx             # Individual agent card
│   │   ├── animated-agent-avatar.tsx  # Dots pulse animation
│   │   ├── skill-chip.tsx             # Emoji + skill name chip
│   │   ├── workflows-section.tsx      # Tabs + workflow list
│   │   ├── workflow-list-item.tsx     # Single workflow row
│   │   └── activity-sparkline.tsx     # Recharts mini line chart
│   ├── workspace/
│   │   ├── workspace-client.tsx        # Client wrapper: filters, sort, selection
│   │   ├── workspace-header.tsx        # Title + action buttons
│   │   ├── workspace-filters.tsx       # Search + dropdowns
│   │   ├── view-toggle.tsx             # Folder/List/Graph toggle
│   │   ├── workspace-table.tsx         # Table rendering
│   │   ├── agent-row.tsx               # Expandable agent row
│   │   ├── workflow-row.tsx            # Workflow row in table
│   │   └── split-button.tsx            # Primary + dropdown combo
│   ├── runs/
│   │   ├── runs-client.tsx             # Client wrapper: filters, polling
│   │   ├── runs-header.tsx             # Title
│   │   ├── runs-filters.tsx            # Search + dropdowns
│   │   ├── runs-table.tsx              # Table rendering
│   │   ├── run-row.tsx                 # Individual run row
│   │   └── run-status-badge.tsx        # Status with color variants
│   └── shared/
│       ├── empty-state.tsx             # Reusable empty state component
│       ├── status-badge.tsx            # Draft/Published badge
│       └── skeleton-rows.tsx           # Configurable skeleton table rows
├── hooks/
│   ├── use-debounce.ts                 # Debounced value hook (300ms default)
│   ├── use-agents.ts                   # React Query hook for agents
│   ├── use-workflows.ts               # React Query hook for workflows (with tab)
│   ├── use-workspace-items.ts          # React Query hook for workspace
│   └── use-runs.ts                     # React Query hook for runs (infinite)
└── lib/
    ├── queries/
    │   ├── dashboard.ts                # Supabase queries for dashboard data
    │   ├── workspace.ts                # Supabase queries for workspace data
    │   └── runs.ts                     # Supabase queries for runs data
    └── utils/
        ├── format-duration.ts          # "1m 23s", "< 1s" formatting
        └── format-relative-time.ts     # "3 days ago" with 7-day cutoff to date
```

---

## Styling Approach

- All styling via Tailwind v4 utility classes composed with `cn()`.
- No custom CSS files beyond `globals.css`.
- Color tokens from CSS variables: `bg-primary`, `text-muted-foreground`, `border-border`, etc.
- Responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`.
- Animated avatar uses `@keyframes` defined inline with Tailwind's `animate-` utilities or a small CSS block in `globals.css`.
- Dark mode: automatic via CSS variable switching (already configured in `globals.css`).

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Recharts bundle size for sparklines | Import only `LineChart` and `Line` (tree-shakeable). Sparkline is a tiny component. |
| Complex join queries for dashboard | Pre-compute aggregates in Supabase views or use RPC functions if joins are too slow. |
| Client-side filtering on large datasets | Cap at 50 items for workspace, 50 for runs. "Load more" for pagination. |
| Animated avatar performance | Use CSS animations only (no JS animation loop). Use `will-change: opacity` hint. |
| Many re-renders from filter changes | Debounce search input. Memoize filtered results with `useMemo`. |
