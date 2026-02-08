# 003 - Dashboard & Workspace Pages

## Overview

This feature implements the three primary data-viewing pages of the Relay application: the Dashboard (home page), the Workspace (file-manager-style view), and the Runs page (execution history). Together these pages provide the user's primary interface for monitoring agents, browsing workflows, and inspecting run history.

**Depends on:**
- 001-foundation: Database schema (`profiles`, `teams`, `agents`, `workflows`, `workflow_runs`, `agent_skills`, `usage`), TypeScript types (`database.types.ts`), Supabase clients, middleware
- 002-navigation-layout: `AppSidebar`, `CommandMenu`, `(dashboard)/layout.tsx`, QueryProvider

---

## User Stories

### US1 (P1): Dashboard Page

**As a** team member, **I want** to see my team's agents and recent workflow activity on a single dashboard, **so that** I can quickly assess the current state and jump into any agent or workflow.

#### Acceptance Criteria

1. **Search bar** at the top displays placeholder text "Type Ctrl K to search" and opens the CommandMenu on click or Ctrl+K.
2. **Team section** shows the team avatar (rounded, 32x32) and team name (e.g., "R's team") as an `<h2>`.
3. **Agents grid** renders as a responsive CSS grid:
   - Breakpoints: 1 column on mobile, 2 columns at `md`, 3 columns at `lg`, 4 columns at `xl`.
   - Each **AgentCard** displays:
     - Animated avatar: a 24x24 grid of small dots with a staggered pulse animation (concentric rings radiating outward). Background uses the agent's color theme (default: blue).
     - Agent name (truncated at 1 line with `truncate`).
     - Description (truncated at 2 lines with `line-clamp-2`).
     - Skills list: up to **3 skills** shown as chips with emoji + skill name. If the agent has more than 3 skills, a `+N` badge is appended (e.g., "+2").
     - The entire card is clickable, navigating to `/agents/[id]`.
   - The **last card** in the grid is always a "Create new agent" card with:
     - Dashed 2px border (`border-dashed border-2 border-muted-foreground/25`).
     - Centered `Plus` icon (lucide-react) and "Create new agent" text.
     - Hover state: `border-muted-foreground/50` with slight background tint.
4. **Workflows section** header shows a link icon (lucide `Link`) + "Workflows" title.
5. **Workflow tabs** use shadcn `Tabs` with 4 tab values:
   - `needs-attention` (default) - workflows with failed or stuck runs.
   - `recently-edited` - sorted by `updated_at` descending.
   - `recently-run` - sorted by latest `workflow_runs.started_at` descending.
   - `starred` - filtered by `is_starred = true`.
6. Right side of the tab list has a **Filter button** (funnel icon) and **Add workflow button** (plus icon, primary variant).
7. Each **WorkflowListItem** displays in a horizontal row:
   - Emoji (from `workflows.emoji`, default `"📋"`).
   - Status badge: `Draft` (secondary variant) or `Published` (default/green variant). Uses shadcn `Badge`.
   - Workflow name (truncated at 1 line).
   - Published time: relative format via `date-fns` `formatDistanceToNow` (e.g., "3 days ago"). Shows "Not published" if `published_at` is null.
   - Total runs count: number with "runs" label (e.g., "42 runs").
   - Activity sparkline: a small inline SVG or recharts `<Sparkline>` showing run counts over the last 14 days. Width 80px, height 24px.
   - Last run time: relative format (e.g., "2 hours ago") or "Never" if no runs.
   - The row is clickable, navigating to `/workflows/[id]/edit`.
8. When there are **zero workflows** in a tab, display an empty state message: "No workflows found" with muted text.
9. Maximum of **20 workflow items** per tab; no pagination in v1 (YAGNI).

#### Edge Cases
- Zero agents: show only the "Create new agent" card.
- Zero workflows in all tabs: show empty state in the default tab.
- Agent with zero skills: show "No skills yet" in muted text instead of skills list.
- Agent name longer than card width: truncated with ellipsis.
- Description longer than 2 lines: clamped with ellipsis.
- Sparkline with no data: render a flat line at y=0.

---

### US2 (P2): Workspace Page

**As a** team member, **I want** a file-manager-style workspace to browse, filter, and manage all my workflows and agents, **so that** I can organize my automation assets efficiently.

#### Acceptance Criteria

1. **Header** displays:
   - "Workspace" as `<h1>` (`text-2xl font-semibold`).
   - "New folder" button (outline variant, `FolderPlus` icon).
   - "New workflow" split button: primary button text "New workflow" + dropdown chevron. Dropdown menu items: "From template" and "Blank workflow".
2. **Filters row** contains:
   - Search input (`Search` icon prefix, placeholder "Search workflows..."). Filters client-side on `name` field.
   - "Created by" dropdown (`Select`): options are team member names. Default "All members".
   - "Status" dropdown (`Select`): options "All statuses", "Draft", "Published".
   - "Type" dropdown (`Select`): options "All types", "Workflow", "Agent".
3. **View toggle** group (3 icon buttons, `outline` variant, one active with `default` variant):
   - Folder view (`FolderOpen` icon) - default.
   - List view (`List` icon).
   - Graph view (`GitBranch` icon).
   - Only List view is functional in v1; Folder and Graph show "Coming soon" toast.
4. **Data table** uses shadcn `Table` with the following columns:
   - Checkbox column: shadcn `Checkbox` for row selection. Header checkbox toggles select-all.
   - **Name** (sortable, ascending/descending toggle via click on header): displays emoji + name for workflows, avatar + name for agents. Agent rows have an expand/collapse arrow (`ChevronRight`/`ChevronDown`) to show child workflows.
   - **Last run**: relative time or "Never".
   - **Created by**: user avatar (16x16) + name.
   - **Published**: relative time or dash.
   - **Status**: `Badge` component ("Draft" secondary / "Published" green).
   - **Steps**: integer count of `workflow_steps`.
   - **AI**: boolean indicator (sparkle icon if workflow uses AI steps, empty otherwise).
   - **Actions**: `...` dropdown (`DropdownMenu`) with items: Edit, Duplicate, Move to folder, Delete.
5. **Agent rows** are visually distinct:
   - Slightly bolder font weight or different background (`bg-muted/30`).
   - Expandable: clicking the arrow reveals child workflow rows indented below.
   - Agent rows do not have Steps/AI/Status columns filled (show dashes).
6. **Sorting**: clicking the Name header toggles between ascending (A-Z) and descending (Z-A). A small arrow icon indicates direction.
7. **Empty state**: when no workflows/agents exist, show centered illustration with text "No workflows yet" and a "Create your first workflow" button (primary).
8. **Loading state**: skeleton rows (8 rows) with shimmer animation matching column widths.

#### Edge Cases
- Zero items: empty state with CTA.
- Many items (50+): virtual scrolling not required in v1; render all rows.
- Long workflow names: truncated with ellipsis in the Name column (max-width via `truncate` + `max-w-[300px]`).
- Agent with zero child workflows: expandable arrow still visible but expands to show "No workflows" text.
- Search with no matches: show "No results for '[query]'" message.
- Filter combinations: all filters are AND-composed (e.g., status=Draft AND type=Workflow AND createdBy=Alice).

---

### US3 (P3): Runs Page

**As a** team member, **I want** to see a history of all workflow executions, **so that** I can monitor success/failure rates, debug issues, and track resource usage.

#### Acceptance Criteria

1. **Header** displays "Runs" as `<h1>` (`text-2xl font-semibold`).
2. **Filters row** contains:
   - Search input (`Search` icon prefix, placeholder "Search runs..."). Filters on run ID or workflow name.
   - "Status" dropdown (`Select`): options "All statuses", "Pending", "Running", "Completed", "Failed", "Cancelled".
   - "Workflow" dropdown (`Select`): lists all workflows by name. Default "All workflows".
3. **Empty state** (when zero runs exist):
   - Illustration: 3 stacked card shapes (layered, offset, with subtle shadow) using pure CSS/SVG. Muted colors.
   - Text: "No runs yet" (`text-lg font-medium text-muted-foreground`).
   - Link: "View workflows" linking to `/workspace` (text-primary, underline on hover).
4. **Populated table** uses shadcn `Table` with columns:
   - **Run ID**: formatted as truncated UUID with monospace font (`font-mono text-sm`). E.g., `run_a1b2c3d4`.
   - **Workflow**: emoji + workflow name (clickable, navigates to `/workflows/[id]/edit`).
   - **Status**: `Badge` with variant colors:
     - Pending: `secondary` variant.
     - Running: `default` variant with a pulsing dot indicator.
     - Completed: green badge (`bg-emerald-100 text-emerald-800`).
     - Failed: `destructive` variant.
     - Cancelled: `outline` variant with muted text.
   - **Duration**: formatted as human-readable (e.g., "1m 23s", "< 1s", "45s"). Computed from `started_at` to `completed_at`. Shows "--" if still running or not started.
   - **Steps used**: integer (e.g., "5").
   - **AI credits**: decimal with 1 decimal place (e.g., "2.5") or "0" if none.
   - **Timestamp**: relative time (e.g., "3 minutes ago") with full datetime in tooltip on hover.
5. **Sorting**: default sort by timestamp descending (newest first). No user-controlled sorting in v1.
6. **Pagination**: display up to 50 runs. Show "Load more" button at bottom if more exist. Uses cursor-based pagination via Supabase.
7. **Auto-refresh**: runs table polls every 10 seconds when there are runs in "Pending" or "Running" status. Uses React Query `refetchInterval`.

#### Edge Cases
- Zero runs: empty state with illustration.
- Run in progress: duration shows "--" and status badge has pulsing dot animation.
- Run with zero steps: steps column shows "0".
- Very long workflow name in the Workflow column: truncated with `max-w-[200px] truncate`.
- Failed run: entire row has a subtle red-tinted left border (`border-l-2 border-destructive/50`).
- Timestamp older than 7 days: show formatted date ("Jan 15, 2026") instead of relative time.

---

## Functional Requirements

### FR1: Card Dimensions & Grid Layout
- Agent cards: min-height 180px, padding 16px (p-4). Card uses shadcn `Card` component.
- Animated avatar area: 64x64px (h-16 w-16), rounded-full, overflow-hidden.
- Grid gap: 16px (`gap-4`).
- Dashboard max-width: 1280px (`max-w-7xl`), centered with `mx-auto`.

### FR2: Tab Behavior
- Tabs are client-side only (no URL change). State stored in React `useState`.
- Tab content fetches data via React Query with the tab value as a query key parameter.
- Stale time: 30 seconds. Background refetch on window focus.
- Tab switch is instant (cached data shown while refetching).

### FR3: Table Sort Logic
- Workspace table Name column sort: case-insensitive alphabetical.
- Sort state managed in local React state.
- Sort indicator: `ArrowUp` or `ArrowDown` icon from lucide-react next to header text.

### FR4: Filter Logic
- All filters apply client-side over the fetched dataset.
- Search is debounced at 300ms using a custom `useDebounce` hook.
- Filters compose with AND logic.
- Clearing a filter resets it to its default ("All ...") value.

### FR5: Empty States
- Each page/section has a unique empty state.
- Empty states include an illustration or icon, a primary message, and optionally a CTA button or link.
- Empty state components are reusable: `<EmptyState icon={...} title="..." description="..." action={...} />`.

### FR6: Loading States
- All server-fetched sections show skeleton placeholders while loading.
- Dashboard: 4 skeleton agent cards + 5 skeleton workflow list items.
- Workspace: 8 skeleton table rows.
- Runs: 8 skeleton table rows.
- Skeletons use shadcn's built-in skeleton pattern (bg-muted with pulse animation).

### FR7: Sparkline Rendering
- Uses recharts `<LineChart>` in a tiny container (80x24px).
- Data: array of 14 objects `{ day: number, count: number }` representing runs per day for the last 14 days.
- Line color: `hsl(var(--primary))`.
- No axes, no grid, no tooltip, no dots. Just the line.
- Stroke width: 1.5px. Area fill with 10% opacity below the line.

---

## Key Entities (from 001-foundation schema)

| Entity | Key Fields | Used In |
|--------|-----------|---------|
| `teams` | id, name, slug, avatar_url | Dashboard team section |
| `agents` | id, team_id, name, description, avatar_url, avatar_type | Dashboard agent grid, Workspace table |
| `agent_skills` | id, agent_id, workflow_id, name, last_run_at, run_count | Dashboard agent cards (skills list) |
| `workflows` | id, team_id, folder_id, name, emoji, status, is_starred, published_at, created_by | Dashboard workflows list, Workspace table |
| `workflow_runs` | id, workflow_id, agent_id, status, steps_used, ai_credits_used, started_at, completed_at | Dashboard sparklines, Runs table |
| `workflow_steps` | id, workflow_id, position, type | Workspace table (Steps column), Runs table (steps used) |
| `profiles` | id, email, full_name, avatar_url | Workspace table (Created by column) |
| `usage` | team_id, steps_used, steps_limit, ai_credits_used, ai_credits_limit | Sidebar usage meters (from 002) |

---

## Non-Functional Requirements

- All pages must be server-component-first: initial data fetched on the server, hydrated for client interactivity.
- Client components marked with `"use client"` only where required (tabs, filters, table interactions).
- All interactive elements must be keyboard accessible (tab navigation, enter to activate).
- Pages should render meaningful content within 200ms on fast connections (no waterfall fetches).
- All text truncation must preserve the full text in a `title` attribute or tooltip for accessibility.
