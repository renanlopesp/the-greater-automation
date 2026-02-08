# Relay.app Clone - Development Specification

## Context

Create a 1:1 clone of Relay.app's logged-in dashboard product. The goal is to produce a comprehensive development spec file that Ralph (autonomous coding agent) can execute end-to-end. The product was captured via Playwright sessions while authenticated, providing complete UI/UX details.

**Current state:** Next.js 16.1.6 + React 19 + TypeScript 5 + Tailwind v4 + shadcn/ui (new-york) already scaffolded at `/home/renanl/Projects/relay`. Uses `bun` as package manager.

---

## Phase 1: Foundation & Infrastructure

### 1.1 Install dependencies
```bash
bun add @supabase/supabase-js @supabase/ssr @tanstack/react-query zustand react-hook-form zod @hookform/resolvers date-fns sonner recharts cmdk
bunx shadcn@latest add avatar badge separator tooltip dropdown-menu scroll-area dialog command popover tabs table select checkbox textarea sheet switch slider sidebar
```

### 1.2 Create files

| File | Purpose |
|------|---------|
| `.env.local` | Supabase URL + anon key |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client (cookies-based) |
| `src/lib/supabase/database.types.ts` | TypeScript types for all tables |
| `src/middleware.ts` | Auth middleware - protect `/dashboard/*`, `/workspace/*`, `/runs/*`, `/agents/*`, `/workflows/*` |
| `src/providers/query-provider.tsx` | TanStack Query provider wrapper |
| `supabase/schema.sql` | Full database schema (see below) |

### 1.3 Database schema (tables)
- `profiles` (extends auth.users): id, email, full_name, avatar_url
- `teams`: id, name, slug, avatar_url
- `team_members`: team_id, user_id, role (owner/admin/member)
- `agents`: team_id, name, description, avatar_url, avatar_type, created_by
- `folders`: team_id, name, parent_id (self-referential)
- `workflows`: team_id, folder_id, name, emoji, description, status (draft/published), is_starred, created_by, published_at
- `workflow_triggers`: workflow_id, type (manual/scheduled/webhook/form/rss/mailhook/table/mcp/app), config JSONB
- `workflow_steps`: workflow_id, position, type (app/ai/flow_control/web_scraping/human_in_loop/utility/http/sequence), name, config JSONB
- `agent_skills`: agent_id, workflow_id, name, last_run_at, run_count
- `workflow_runs`: workflow_id, agent_id, status (pending/running/completed/failed/cancelled), steps_used, ai_credits_used, started_at, completed_at
- `app_connections`: user_id, team_id, app_name, app_logo_url, status, credentials JSONB
- `usage`: team_id, period_start, period_end, steps_used, steps_limit, ai_credits_used, ai_credits_limit

All tables with RLS enabled. Indexes on: workflows(team_id), workflow_runs(workflow_id), workflow_steps(workflow_id), agent_skills(agent_id), team_members(team_id).

### 1.4 Update root layout
- `src/app/layout.tsx`: Wrap with QueryProvider, add Toaster (sonner), use Inter font

---

## Phase 2: Navigation & Layout

### 2.1 App Sidebar (`src/components/app-sidebar.tsx`)
- Icon-based left sidebar (w-16), collapsible
- Top: Logo (blue rounded square with "R"), "Create new" button (+)
- Nav items: Home, Search, Workspace, Runs, Apps, Support
- Bottom: Usage meters (steps + AI credits progress bars), User avatar dropdown
- Active state: blue background on current route
- Hover expand to show labels (optional, can be icon-only like Relay)

### 2.2 Command Menu (`src/components/command-menu.tsx`)
- `Ctrl+K` keyboard shortcut to open
- Search bar visible at top of dashboard: "Type Ctrl K to search"
- Uses shadcn `command` component (cmdk)
- Search across workflows, agents, runs

### 2.3 Dashboard layout (`src/app/(dashboard)/layout.tsx`)
- Server component, fetches user/team/usage from Supabase
- Renders AppSidebar + main content area
- Redirects to `/login` if unauthenticated

---

## Phase 3: Dashboard & Workspace Pages

### 3.1 Dashboard page (`src/app/(dashboard)/dashboard/page.tsx`)
- **Top**: Search bar (Ctrl+K trigger)
- **Team section**: Avatar + team name (e.g., "R's team")
- **Agents grid**: Cards showing agent avatar (animated dots pattern), name, description, skills list with emoji, skill count badge. Last card = "Create new agent" with dashed border and + icon.
- **Workflows section**: Title with link icon, tabs (Needs attention | Recently edited | Recently run | Starred), filter + add buttons. Workflow list items showing: emoji, status badge (Draft/Published), name, published time, total runs count, activity sparkline, last run time.

### 3.2 Workspace page (`src/app/(dashboard)/workspace/page.tsx`)
- **Header**: "Workspace" title + "New folder" button + "New workflow" split button (dropdown: from template, blank)
- **Filters**: Search input, Created by dropdown, Status dropdown, Type dropdown
- **View toggles**: Folder view, List view, Graph view (3 icon buttons)
- **Table**: Columns = checkbox, Name (sortable ↑), Last run, Created by, Published, Status, Steps, AI, actions (...)
- Rows show agent rows (expandable with arrow) and workflow rows (emoji + name)

### 3.3 Runs page (`src/app/(dashboard)/runs/page.tsx`)
- **Header**: "Runs" title
- **Filters**: Search input, Status dropdown, Workflow dropdown
- **Empty state**: Illustration (3 stacked cards), "No runs yet. View workflows" link
- **Populated state**: Table with run ID, workflow name, status badge, duration, steps used, AI credits, timestamp

---

## Phase 4: Workflow Editor (CRITICAL)

### 4.1 Zustand store (`src/stores/workflow-editor-store.ts`)
State: workflowId, workflowName, workflowEmoji, isStarred, trigger, steps[], selectedStepId, isAssistantOpen
Actions: setTrigger, addStep, updateStep, deleteStep, reorderSteps, selectStep, toggleAssistant

### 4.2 Editor page (`src/app/(dashboard)/workflows/[id]/edit/page.tsx`)
- **Top bar**: Emoji + editable name input + star toggle + dropdown (rename/change emoji/duplicate) + notifications bell + add person + "Sharing" button + more (...)
- **Tabs**: Editor | Runs (Editor is default)
- **Layout**: 3-panel: AI Assistant (left, 320px collapsible) | Step canvas (center) | Step config (right, shown when step selected)

### 4.3 AI Assistant panel (`src/components/workflow-editor/ai-assistant-panel.tsx`)
- Header: Relay.app logo + "Relay.app Assistant" + dock/collapse button
- Welcome: Diamond icon, "What can I help you build?"
- Input: Textarea "Describe a workflow or ask a question" + send button
- Popular use cases: 4 cards (Meeting briefings, Competitor analysis, Email assistant, YouTube summarizer) with emoji + title + description
- Collapsible: toggles via store, shows "Open Assistant" button when closed

### 4.4 Trigger selector (`src/components/workflow-editor/trigger-selector.tsx`)
Dialog/panel with search input + 9 trigger types:
1. **Apps** - Start runs based on actions in other apps (has sub-menu →)
2. **Manual** - Start runs by clicking a button
3. **Scheduled** - Start runs on a recurring schedule
4. **Form** - Start runs by submitting a form
5. **RSS** - Start runs for new RSS items
6. **Mailhook** - Start runs by sending emails to unique address
7. **Webhook** - Start runs with custom HTTP requests
8. **Table** - Start runs when Table is updated (has sub-menu →)
9. **MCP Server** - Create MCP server for Cursor/Claude

### 4.5 Step selector (`src/components/workflow-editor/step-selector.tsx`)
Dialog/panel with search input + 8 categories:
1. **Apps** - Automate actions in Gmail, Notion, HubSpot etc.
2. **Flow control** - Paths, waiting, looping
3. **AI** - Summarizing, extracting
4. **Web scraping** - Get text/profile data from websites
5. **Human in the loop** - Wait for person action
6. **Utilities** - Format, convert data/files
7. **HTTP requests** - Custom requests, webhook wait
8. **Sequences** - Reusable step groups

Plus "CONNECTED APPS" section: Email, LinkedIn, X (Twitter), YouTube

### 4.6 Step canvas (center panel)
- **NOT React Flow** - vertical sequential step list
- Trigger block at top (card with "Trigger" header + "Add trigger" button)
- When trigger set: shows icon + type name + config summary
- Steps numbered (1, 2, 3...) vertically
- Vertical connector lines between steps (thin border line)
- "Add step" button at bottom
- Step config panel opens on right when step clicked

### 4.7 Step config panel (right side)
- Header: step icon + step name (editable) + "Run as" avatar + delete/settings buttons
- Description text about what this step does
- Config form fields (varies by step type)
- "Add run inputs" section (for manual trigger)
- Footer: "Output:" reference badge + "Done" button

---

## Phase 5: Agent System

### 5.1 Agent detail page (`src/app/(dashboard)/agents/[id]/page.tsx`)
**Left panel (w-96, bg-muted/30):**
- Agent avatar: Animated concentric dots pattern in blue circle (24x24 grid of small circles with staggered pulse animation)
- Agent name (h1) + description text
- "Skills" section: Cards with emoji icon + skill name + "Never ran" / last run time. "New skill" button with dropdown.
- Bottom: Chat input "Chat with [Agent Name]..." + send button

**Right panel:**
- "Recent activity" section: 6-month heatmap calendar (similar to GitHub contribution graph). Months: columns, days: cells. Color intensity = run count. Days of week labels (S M T W T F S).
- Below calendar: two small progress indicators (steps + AI)
- Run history: empty state = illustration + "No runs yet." / populated = run list items

### 5.2 Activity heatmap (`src/components/agent-detail/activity-heatmap.tsx`)
- Uses date-fns for date calculations
- 6 months of data shown
- Grid of colored cells (bg-muted = 0, blue-200 = low, blue-400 = medium, blue-600 = high)
- Month labels on top

---

## Phase 6: Settings & Auth

### 6.1 Settings dialog (`src/components/settings-dialog.tsx`)
- Opens as modal dialog (max-w-5xl, 80vh)
- Left sidebar navigation:
  - **PERSONAL**: Account, Notifications, Manage apps
  - **WORKSPACE**: General, Members, Billing
- **Manage apps** (default view): Search input + scrollable list of 100+ app integrations. Each row: app logo + name + "Connect" button (blue). Some show "Sign in with Google" variant.
- Other sections: Form-based settings pages

### 6.2 Auth pages
- `src/app/(auth)/login/page.tsx`: Email/password form + Google OAuth button
- `src/app/(auth)/signup/page.tsx`: Similar with name field added
- `src/app/auth/callback/route.ts`: OAuth callback handler

### 6.3 Landing page (`src/app/page.tsx`)
- Simple redirect to `/login` or `/dashboard` based on auth state

---

## Verification

1. **Start dev server**: `bun dev`
2. **Test auth flow**: Navigate to `/login`, create account, verify redirect to `/dashboard`
3. **Test navigation**: Click all sidebar items, verify correct pages load
4. **Test Cmd+K**: Press Ctrl+K, verify command menu opens
5. **Test dashboard**: Verify agent cards render, workflow list shows with tabs
6. **Test workspace**: Verify table view with columns, filters work
7. **Test workflow editor**: Create new workflow, add Manual trigger, add AI step, verify step list renders vertically
8. **Test agent detail**: Click agent card, verify left panel (avatar, skills, chat) and right panel (heatmap, runs) render
9. **Test settings**: Click Apps in sidebar, verify settings dialog with app integrations list

---

## File Summary (35+ files to create/modify)

**Supabase**: schema.sql, client.ts, server.ts, database.types.ts
**Auth**: middleware.ts, login/page.tsx, signup/page.tsx, auth/callback/route.ts
**Providers**: query-provider.tsx
**Layout**: (dashboard)/layout.tsx, app-sidebar.tsx, command-menu.tsx
**Dashboard**: dashboard/page.tsx, agent-card.tsx, workflow-list-item.tsx
**Workspace**: workspace/page.tsx
**Runs**: runs/page.tsx
**Workflow Editor**: workflows/[id]/edit/page.tsx, workflow-editor-store.ts, ai-assistant-panel.tsx, trigger-selector.tsx, step-selector.tsx
**Agents**: agents/[id]/page.tsx, activity-heatmap.tsx
**Settings**: settings-dialog.tsx
