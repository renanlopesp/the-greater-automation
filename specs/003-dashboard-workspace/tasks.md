# 003 - Dashboard & Workspace Pages: Task List

## Phase 1: Setup

- [ ] **T1.1** Install `skeleton` component if not already present
  ```bash
  bunx shadcn@latest add skeleton
  ```
  Verify: `src/components/ui/skeleton.tsx` exists

- [ ] **T1.2** Verify all required shadcn components are installed: `tabs`, `table`, `badge`, `card`, `avatar`, `dropdown-menu`, `select`, `checkbox`, `tooltip`, `separator`, `scroll-area`, `skeleton`, `button`, `input`
  Check: each file exists in `src/components/ui/`

- [ ] **T1.3** Verify `recharts` is installed in `package.json`
  If missing: `bun add recharts`

- [ ] **T1.4** Verify `date-fns` is installed in `package.json`
  If missing: `bun add date-fns`

---

## Phase 2: Foundational Shared Components

- [ ] **T2.1** Create `src/hooks/use-debounce.ts`
  - Export `useDebounce<T>(value: T, delay?: number): T` hook
  - Default delay: 300ms
  - Uses `useState` + `useEffect` with `setTimeout`/`clearTimeout`

- [ ] **T2.2** Create `src/lib/utils/format-duration.ts`
  - Export `formatDuration(startedAt: string | null, completedAt: string | null): string`
  - Returns: "1m 23s", "45s", "< 1s", "--" (if null inputs)
  - Uses `date-fns` `differenceInSeconds`

- [ ] **T2.3** Create `src/lib/utils/format-relative-time.ts`
  - Export `formatRelativeTime(dateStr: string | null): string`
  - Returns: "3 minutes ago" if within 7 days, formatted date "Jan 15, 2026" if older
  - Returns "Never" if null
  - Uses `date-fns` `formatDistanceToNow`, `differenceInDays`, `format`

- [ ] **T2.4** Create `src/components/shared/empty-state.tsx`
  - `"use client"` (may have onClick handler)
  - Props: `icon: React.ReactNode`, `title: string`, `description?: string`, `action?: { label: string; href?: string; onClick?: () => void }`
  - Renders centered flex column with icon (48x48 text-muted-foreground), title (text-lg font-medium), description (text-sm text-muted-foreground), optional Button or Link
  - Uses `cn()` for className composition

- [ ] **T2.5** Create `src/components/shared/status-badge.tsx`
  - Props: `status: "draft" | "published"`
  - "Draft" renders `<Badge variant="secondary">Draft</Badge>`
  - "Published" renders `<Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Published</Badge>`

- [ ] **T2.6** Create `src/components/shared/skeleton-rows.tsx`
  - `"use client"`
  - Props: `rows?: number` (default 8), `columns?: number` (default 6)
  - Renders `<TableRow>` elements with `<TableCell>` containing `<Skeleton>` of varying widths
  - Widths cycle: ["w-[200px]", "w-[100px]", "w-[120px]", "w-[80px]", "w-[60px]", "w-[40px]"]

---

## Phase 3: US1 -- Dashboard Page

### Supabase Queries

- [ ] **T3.1** Create `src/lib/queries/dashboard.ts`
  - Export `fetchTeam(supabase, teamId)`: returns team name + avatar_url
  - Export `fetchAgentsWithSkills(supabase, teamId)`: returns agents joined with agent_skills (limit 20)
  - Export `fetchWorkflows(supabase, teamId, tab)`:
    - `needs-attention`: workflows with runs in "failed" status, ordered by latest failed run
    - `recently-edited`: ordered by `updated_at` desc, limit 20
    - `recently-run`: ordered by latest run `started_at` desc, limit 20
    - `starred`: filtered by `is_starred = true`, limit 20
  - Export `fetchWorkflowSparklineData(supabase, workflowId)`: returns run counts per day for last 14 days
  - All functions typed with return types from `database.types.ts`

### React Query Hooks

- [ ] **T3.2** Create `src/hooks/use-agents.ts`
  - Export `useAgents(teamId: string, initialData)` wrapping React Query
  - Query key: `["agents", teamId]`
  - Stale time: 30_000

- [ ] **T3.3** Create `src/hooks/use-workflows.ts`
  - Export `useWorkflows(teamId: string, tab: string, initialData)` wrapping React Query
  - Query key: `["workflows", teamId, tab]`
  - Stale time: 30_000
  - Fetches from Supabase client-side on tab change

### Components

- [ ] **T3.4** Create `src/components/dashboard/search-bar-trigger.tsx`
  - `"use client"`
  - Renders a styled div that looks like a search input
  - Placeholder text: "Type Ctrl K to search"
  - On click: dispatches `Ctrl+K` keyboard event to open CommandMenu (or calls a shared setter)
  - Uses `Search` icon from lucide-react
  - Styling: `bg-muted/50 rounded-lg px-4 py-2 text-sm text-muted-foreground cursor-pointer hover:bg-muted`

- [ ] **T3.5** Create `src/components/dashboard/team-section.tsx`
  - Props: `team: { name: string; avatar_url: string | null }`
  - Renders: `<Avatar>` (32x32) + `<h2>` with team name
  - Layout: `flex items-center gap-3`

- [ ] **T3.6** Create `src/components/dashboard/animated-agent-avatar.tsx`
  - `"use client"`
  - Renders a 64x64 container with 24x24 grid of small circles (2px each)
  - CSS animation: concentric rings pulse outward from center. Uses `@keyframes` with staggered `animation-delay` based on distance from center.
  - Color: `bg-blue-500` for dots, `bg-blue-50 dark:bg-blue-950` for background
  - Accepts optional `color` prop for theme variations

- [ ] **T3.7** Create `src/components/dashboard/skill-chip.tsx`
  - Props: `emoji: string`, `name: string`
  - Renders: inline-flex pill with emoji + name text
  - Styling: `inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground`

- [ ] **T3.8** Create `src/components/dashboard/agent-card.tsx`
  - `"use client"`
  - Props: `AgentCardProps` (agent + skills)
  - Uses shadcn `Card` with `CardContent`
  - Renders: AnimatedAgentAvatar, name (truncate), description (line-clamp-2), skills list (max 3 SkillChips + "+N" Badge)
  - Zero skills: show "No skills yet" in muted text
  - Wraps in `<Link href={/agents/${agent.id}}>` for navigation
  - Min-height: 180px
  - Hover: `hover:border-primary/20 hover:shadow-sm transition-all`

- [ ] **T3.9** Create `src/components/dashboard/agents-grid.tsx`
  - Props: `agents: AgentCardProps[]`
  - Renders responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`
  - Maps agents to `<AgentCard>` components
  - Last item: "Create new agent" card with dashed border, Plus icon, centered text
  - Create card: `border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50`
  - Create card links to `/agents/new` (or opens create dialog -- link for now, YAGNI)

- [ ] **T3.10** Create `src/components/dashboard/activity-sparkline.tsx`
  - `"use client"`
  - Props: `data: { day: number; count: number }[]`
  - Uses recharts `<LineChart>` + `<Line>` + `<Area>` (no axes, no grid, no tooltip)
  - Container: 80x24px
  - Line: stroke `hsl(var(--primary))`, strokeWidth 1.5
  - Area fill: `hsl(var(--primary))` with 10% opacity
  - Empty/flat data: renders flat line at y=0

- [ ] **T3.11** Create `src/components/dashboard/workflow-list-item.tsx`
  - `"use client"`
  - Props: `WorkflowListItemProps`
  - Renders horizontal row: emoji, StatusBadge, name (truncate), published time, total runs, ActivitySparkline, last run time
  - Layout: `flex items-center gap-4 px-4 py-3 hover:bg-muted/50 rounded-lg cursor-pointer`
  - Clickable: wraps in `<Link href={/workflows/${workflow.id}/edit}>`
  - Published time: uses `formatRelativeTime`
  - Last run: uses `formatRelativeTime`

- [ ] **T3.12** Create `src/components/dashboard/workflows-section.tsx`
  - `"use client"`
  - Props: `initialWorkflows`, `teamId`
  - Header: Link icon + "Workflows" h3 + Filter button (ghost) + Add button (primary, small)
  - Tabs component with 4 TabsTrigger items
  - TabsContent renders list of WorkflowListItem components
  - Empty tab content: "No workflows found" muted text
  - Uses `useWorkflows` hook for data per tab

- [ ] **T3.13** Create `src/components/dashboard/dashboard-client.tsx`
  - `"use client"`
  - Props: `team`, `initialAgents`, `initialWorkflows`, `teamId`
  - Composes: SearchBarTrigger, TeamSection, AgentsGrid, WorkflowsSection
  - Layout: `flex flex-col gap-8 p-6 max-w-7xl mx-auto`

- [ ] **T3.14** Create `src/app/(dashboard)/dashboard/page.tsx`
  - Server Component
  - Fetches team, agents with skills, default tab workflows from Supabase server client
  - Gets teamId from user session / team_members join
  - Passes data as props to `<DashboardClient>`
  - Handles error states (redirect if no team)

---

## Phase 4: US2 -- Workspace Page

### Supabase Queries

- [ ] **T4.1** Create `src/lib/queries/workspace.ts`
  - Export `fetchWorkspaceItems(supabase, teamId)`: returns agents with nested workflows + standalone workflows
  - Joins with `profiles` for created_by info
  - Joins with `workflow_steps` for step count + AI step detection
  - Orders by name ascending by default

### React Query Hooks

- [ ] **T4.2** Create `src/hooks/use-workspace-items.ts`
  - Export `useWorkspaceItems(teamId, initialData)` wrapping React Query
  - Query key: `["workspace-items", teamId]`
  - Stale time: 30_000

### Components

- [ ] **T4.3** Create `src/components/workspace/split-button.tsx`
  - `"use client"`
  - Props: `onNewBlank: () => void`, `onNewFromTemplate: () => void`
  - Renders: primary Button "New workflow" + attached DropdownMenuTrigger (ChevronDown)
  - Dropdown items: "From template", "Blank workflow"
  - Styling: buttons visually joined with `rounded-l-md rounded-r-none` + `rounded-r-md rounded-l-none border-l`

- [ ] **T4.4** Create `src/components/workspace/workspace-header.tsx`
  - Props: none (actions are self-contained for now)
  - Renders: h1 "Workspace" + "New folder" Button (outline, FolderPlus icon) + SplitButton
  - Layout: `flex items-center justify-between`
  - "New folder": shows toast "Coming soon" (via sonner)
  - "From template": shows toast "Coming soon"
  - "Blank workflow": navigates to `/workflows/new/edit`

- [ ] **T4.5** Create `src/components/workspace/workspace-filters.tsx`
  - `"use client"`
  - Props: `filters`, `onFiltersChange`, `teamMembers: { id: string; full_name: string }[]`
  - Renders: Search Input + 3 Select dropdowns (Created by, Status, Type)
  - Search has `Search` icon, debounced via `useDebounce`
  - Layout: `flex items-center gap-3 flex-wrap`

- [ ] **T4.6** Create `src/components/workspace/view-toggle.tsx`
  - `"use client"`
  - Props: `activeView: "folder" | "list" | "graph"`, `onViewChange`
  - Renders 3 icon buttons: FolderOpen, List, GitBranch
  - Active button: `variant="default"`, others: `variant="outline"`
  - Folder/Graph click: call `toast("Coming soon")` from sonner, do not change view
  - List click: set active view

- [ ] **T4.7** Create `src/components/workspace/agent-row.tsx`
  - `"use client"`
  - Props: `agent: WorkspaceAgent`, `isExpanded`, `onToggle`, `isSelected`, `onSelect`
  - Renders TableRow with: Checkbox, expand arrow (ChevronRight/ChevronDown), Avatar + name (bold), last run, created by, dashes for Published/Status/Steps/AI, actions dropdown
  - Background: `bg-muted/30` for visual distinction
  - When expanded: renders child WorkflowRow components below (indented with pl-8 on name cell)
  - Zero children: expanded state shows "No workflows" text in muted

- [ ] **T4.8** Create `src/components/workspace/workflow-row.tsx`
  - Props: `workflow: WorkspaceWorkflow`, `isSelected`, `onSelect`, `isNested?: boolean`
  - Renders TableRow: Checkbox, emoji + name (truncate, max-w-[300px]), last run, created by (avatar + name), published time, StatusBadge, step count, AI icon (Sparkles or empty), actions dropdown
  - Actions dropdown: Edit, Duplicate, Move to folder, Delete
  - If `isNested`: adds `pl-8` padding to name cell
  - Edit navigates to `/workflows/${id}/edit`

- [ ] **T4.9** Create `src/components/workspace/workspace-table.tsx`
  - `"use client"`
  - Props: `items`, `sortDirection`, `onSortChange`, `selectedIds`, `onSelectionChange`
  - Renders shadcn Table with header row (checkbox, sortable Name, Last run, Created by, Published, Status, Steps, AI, Actions)
  - Name header: clickable, shows ArrowUp/ArrowDown icon based on sort direction
  - Header checkbox: toggles select all
  - Maps items to AgentRow or WorkflowRow based on `type` field
  - Empty: renders EmptyState component
  - Loading: renders SkeletonRows

- [ ] **T4.10** Create `src/components/workspace/workspace-client.tsx`
  - `"use client"`
  - Props: `initialItems`, `teamId`, `teamMembers`
  - Manages state: filters (search, createdBy, status, type), sortDirection, selectedIds, expandedAgentIds, activeView
  - Filters data client-side with AND composition + debounced search
  - Composes: WorkspaceHeader, WorkspaceFilters, ViewToggle, WorkspaceTable

- [ ] **T4.11** Create `src/app/(dashboard)/workspace/page.tsx`
  - Server Component
  - Fetches workspace items + team members from Supabase server client
  - Passes data as props to `<WorkspaceClient>`

---

## Phase 5: US3 -- Runs Page

### Supabase Queries

- [ ] **T5.1** Create `src/lib/queries/runs.ts`
  - Export `fetchRuns(supabase, teamId, options?)`: returns runs joined with workflow (name, emoji)
  - Options: `{ cursor?: string; limit?: number; status?: string; workflowId?: string }`
  - Default limit: 50
  - Orders by `started_at` descending
  - Returns `{ data: Run[]; nextCursor: string | null }`

### React Query Hooks

- [ ] **T5.2** Create `src/hooks/use-runs.ts`
  - Export `useRuns(teamId, filters, initialData)` wrapping React Query `useInfiniteQuery`
  - Query key: `["runs", teamId, filters]`
  - `getNextPageParam`: returns nextCursor
  - `refetchInterval`: 10_000 if any run has status "pending" or "running", else false
  - Stale time: 10_000

### Components

- [ ] **T5.3** Create `src/components/runs/run-status-badge.tsx`
  - Props: `status: "pending" | "running" | "completed" | "failed" | "cancelled"`
  - Pending: `<Badge variant="secondary">Pending</Badge>`
  - Running: `<Badge variant="default">` with pulsing dot (`<span className="mr-1.5 h-2 w-2 rounded-full bg-current animate-pulse" />`) + "Running"
  - Completed: `<Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Completed</Badge>`
  - Failed: `<Badge variant="destructive">Failed</Badge>`
  - Cancelled: `<Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>`

- [ ] **T5.4** Create `src/components/runs/runs-header.tsx`
  - Renders: h1 "Runs" (`text-2xl font-semibold`)

- [ ] **T5.5** Create `src/components/runs/runs-filters.tsx`
  - `"use client"`
  - Props: `filters`, `onFiltersChange`, `workflows: { id: string; name: string }[]`
  - Renders: Search Input (debounced) + Status Select + Workflow Select
  - Status options: All statuses, Pending, Running, Completed, Failed, Cancelled
  - Workflow options: All workflows + list of workflow names

- [ ] **T5.6** Create `src/components/runs/run-row.tsx`
  - Props: `RunRowProps`
  - Renders TableRow: run ID (font-mono, truncated), workflow (emoji + name, linked), RunStatusBadge, duration (formatDuration), steps used, AI credits (1 decimal), timestamp (formatRelativeTime with Tooltip for full datetime)
  - Failed runs: `className="border-l-2 border-destructive/50"`
  - Workflow name: `max-w-[200px] truncate`

- [ ] **T5.7** Create `src/components/runs/runs-empty-state.tsx`
  - Renders the stacked cards illustration:
    - 3 div elements with card-like styling, stacked with offset transforms
    - `bg-muted border rounded-lg` with varying widths and translate-y offsets
    - Wrapped in a 120x100 container
  - Uses `<EmptyState>` wrapper with title "No runs yet", link "View workflows" to `/workspace`

- [ ] **T5.8** Create `src/components/runs/runs-table.tsx`
  - `"use client"`
  - Props: `runs`, `isLoading`, `hasNextPage`, `onLoadMore`, `isFetchingNextPage`
  - Renders shadcn Table with header: Run ID, Workflow, Status, Duration, Steps, AI Credits, Timestamp
  - Maps runs to RunRow
  - If zero runs and not loading: renders RunsEmptyState
  - If loading: renders SkeletonRows (8 rows, 7 columns)
  - "Load more" Button at bottom if `hasNextPage` (outline variant, shows spinner if fetching)

- [ ] **T5.9** Create `src/components/runs/runs-client.tsx`
  - `"use client"`
  - Props: `initialRuns`, `teamId`, `workflows`
  - Manages filter state (search, status, workflowId)
  - Filters client-side with debounced search + status + workflowId AND composition
  - Uses `useRuns` hook for infinite query + polling
  - Composes: RunsHeader, RunsFilters, RunsTable

- [ ] **T5.10** Create `src/app/(dashboard)/runs/page.tsx`
  - Server Component
  - Fetches initial runs (first 50) + workflow list for filter dropdown
  - Passes data as props to `<RunsClient>`

---

## Phase 6: Polish & Integration

- [ ] **T6.1** Add animated agent avatar keyframes to `src/app/globals.css`
  - Define `@keyframes agent-dot-pulse` with opacity 0.3 -> 1 -> 0.3
  - Define CSS custom property `--dot-delay` for staggered animation
  - Keep it minimal: max 10 lines of CSS

- [ ] **T6.2** Verify all pages render without errors
  - `bun run build` completes without TypeScript or lint errors
  - Each page loads at `/dashboard`, `/workspace`, `/runs`

- [ ] **T6.3** Test loading states
  - Temporarily remove initial data props to verify skeleton renders
  - Verify pulse animation appears

- [ ] **T6.4** Test empty states
  - Verify each page renders its empty state when data arrays are empty
  - Dashboard: only "Create new agent" card, "No workflows found" in tabs
  - Workspace: centered empty state with CTA
  - Runs: stacked cards illustration

- [ ] **T6.5** Test responsive layout
  - Dashboard grid: verify 1/2/3/4 column breakpoints
  - Workspace/Runs tables: verify horizontal scroll on mobile (`overflow-x-auto`)
  - All text truncation works at narrow widths

- [ ] **T6.6** Test dark mode
  - Toggle dark class on HTML element
  - Verify all badges, cards, tables, and empty states are readable
  - Verify sparkline colors adapt

- [ ] **T6.7** Test keyboard navigation
  - Tab through all interactive elements on each page
  - Verify enter activates buttons, links, tab triggers
  - Verify Ctrl+K opens command menu from dashboard search bar

---

## Phase 7: Testing

**Purpose**: Unit tests for components/hooks and e2e tests for page flows.

**Prerequisites**: 001-foundation Phase 6 (Vitest, Playwright, Prettier, Husky) must be complete.

### Unit Tests (Vitest + Testing Library)

- [ ] **T7.1** [P] Write unit tests for utility functions at `src/lib/utils/__tests__/format-duration.test.ts`: test "1m 23s", "45s", "< 1s", "--" for null inputs.
- [ ] **T7.2** [P] Write unit tests for utility functions at `src/lib/utils/__tests__/format-relative-time.test.ts`: test "3 minutes ago" for recent dates, formatted date for older dates, "Never" for null.
- [ ] **T7.3** [P] Write unit tests for StatusBadge at `src/components/shared/__tests__/status-badge.test.tsx`: render with "draft" and "published" status, verify correct badge variant and text.
- [ ] **T7.4** [P] Write unit tests for EmptyState at `src/components/shared/__tests__/empty-state.test.tsx`: render with/without action, verify title and description render, verify action button/link renders when provided.
- [ ] **T7.5** [P] Write unit tests for AgentCard at `src/components/dashboard/__tests__/agent-card.test.tsx`: render with mock agent data, verify name/description/skills display, verify skill chip limit (max 3 + "+N").
- [ ] **T7.6** [P] Write unit tests for WorkflowListItem at `src/components/dashboard/__tests__/workflow-list-item.test.tsx`: render with mock workflow, verify emoji, name, status badge, and times render.
- [ ] **T7.7** [P] Write unit tests for RunStatusBadge at `src/components/runs/__tests__/run-status-badge.test.tsx`: render each status (pending, running, completed, failed, cancelled), verify correct badge variant and content.
- [ ] **T7.8** [P] Write unit tests for useDebounce hook at `src/hooks/__tests__/use-debounce.test.ts`: verify debounced value updates after delay.

### End-to-End Tests (Playwright)

- [ ] **T7.9** Write e2e test at `e2e/dashboard.test.ts`:
  - Navigate to `/dashboard` (with auth), verify team section renders
  - Verify agents grid renders agent cards (or "Create new agent" if empty)
  - Verify workflows section renders with tabs, click through tabs
- [ ] **T7.10** Write e2e test at `e2e/workspace.test.ts`:
  - Navigate to `/workspace`, verify header and table render
  - Test search filter: type in search, verify table filters
  - Test status filter: select a status, verify table filters
- [ ] **T7.11** Write e2e test at `e2e/runs.test.ts`:
  - Navigate to `/runs`, verify header and table render (or empty state)
  - If runs exist: verify status badges, durations, timestamps display
  - Test "Load more" button if available
- [ ] **T7.12** Run `bun run test` and `bun run test:e2e` -- fix any failures.

**Checkpoint**: All unit tests pass. All e2e tests pass.

---

## Summary

| Phase | Tasks | Estimated Files |
|-------|-------|----------------|
| 1. Setup | 4 | 0 new (verify existing) |
| 2. Foundational | 6 | 6 new |
| 3. US1 - Dashboard | 14 | 14 new |
| 4. US2 - Workspace | 11 | 11 new |
| 5. US3 - Runs | 10 | 10 new |
| 6. Polish | 7 | 1 modified |
| 7. Testing | 12 | ~15 test files |
| **Total** | **64** | **41 new + 1 modified + ~15 test files** |
