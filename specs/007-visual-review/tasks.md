# Tasks: Visual Review & Polish

**Input**: Design documents from `/specs/007-visual-review/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup & Prerequisites

**Purpose**: Install dependencies, verify existing infrastructure

- [x] T001 Install `next-themes` package: run `bun add next-themes`. Verify it appears in `package.json` dependencies.
- [x] T002 Verify existing dependencies are available: `date-fns`, `recharts`, `lucide-react`, `@supabase/ssr`. Run `bun pm ls` to confirm.
- [x] T003 Verify reference screenshots exist in project root: `relay-dashboard.png`, `relay-workspace.png`, `relay-runs.png`, `relay-workflow-editor.png`, `relay-agent-detail.png`, `relay-apps-settings.png`.

---

## Phase 2: Theme System — Light/Dark Mode (US3) 🎯 BLOCKING

**Purpose**: Establish consistent theme infrastructure before any visual fixes, so all subsequent changes work correctly in both modes

**Goal**: All pages support light and dark mode consistently via `next-themes`, with a user-accessible toggle

**CRITICAL**: This phase MUST be complete before Phases 3-6, because sidebar colors and all other visual fixes depend on the theme system working correctly.

### Implementation

- [x] T004 [US3] Create theme provider at `src/providers/theme-provider.tsx`:
  - `"use client"` directive
  - Export `ThemeProvider` component that wraps `NextThemesProvider` from `next-themes`
  - Props: pass through all `NextThemesProvider` props
  - Set `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`

- [x] T005 [US3] Update root layout at `src/app/layout.tsx`:
  - Import `ThemeProvider` from `@/providers/theme-provider`
  - Wrap `{children}` (and any existing providers) with `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`
  - Add `suppressHydrationWarning` to the `<html>` tag (required by next-themes to prevent hydration mismatch)

- [x] T006 [US3] Create theme toggle component at `src/components/theme-toggle.tsx`:
  - `"use client"` directive
  - Import `useTheme` from `next-themes`, `Moon`, `Sun`, `Monitor` from `lucide-react`
  - Import `Button` from `@/components/ui/button`
  - Import `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` from `@/components/ui/dropdown-menu`
  - Render a `Button` (variant="ghost", size="icon") that shows Sun icon in light mode, Moon icon in dark mode
  - Dropdown menu with 3 options: Light, Dark, System — each calls `setTheme()` with the corresponding value
  - Use `cn()` for all dynamic className composition

- [x] T007 [US3] Add theme toggle to sidebar footer in `src/components/app-sidebar.tsx`:
  - Import `ThemeToggle` from `@/components/theme-toggle`
  - Place the toggle in the sidebar footer area (near the user menu / team selector)
  - Ensure the toggle button uses sidebar-appropriate colors (will be white/light against indigo after Phase 3)

- [x] T008 [US3] Audit and fix `src/app/globals.css` for dark mode completeness:
  - Verify every CSS variable defined in `:root` has a corresponding override in `.dark`
  - Ensure no variables are missing from either mode
  - Pay special attention to: `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--muted`, `--muted-foreground`
  - Verify chart-related variables exist for both modes (needed for Recharts)
  - Add `--chart-1` through `--chart-5` variables if missing in dark mode

- [x] T009 [US3] Audit all components for hardcoded colors and theme-incompatible classes:
  - Search for hardcoded `hsl(...)`, `rgb(...)`, `#` hex colors in all `.tsx` files under `src/`
  - Replace `hsl(var(--primary))` patterns in Recharts components with proper CSS variable references
  - Replace any `bg-white`, `text-black`, `text-white`, `bg-black` with `bg-background`, `text-foreground`, `bg-card`, etc.
  - Ensure no component uses `dark:` prefixed Tailwind classes that conflict with CSS variable theming (CSS variables should handle both modes automatically)
  - Fix any `style={{ color: '...' }}` inline styles to use CSS variables

**Checkpoint**: Theme toggle works, switching between light/dark/system. All pages render correctly in both modes with no visual mixing.

---

## Phase 3: Sidebar Brand Colors (US2)

**Purpose**: Update sidebar to use blue/indigo brand colors matching reference screenshots

**Goal**: Sidebar has deep indigo background with white icons and text in both light and dark mode

### Implementation

- [x] T010 [US2] Update sidebar CSS variables in `src/app/globals.css` — light mode (`:root`):
  - `--sidebar: oklch(0.30 0.15 265)` — deep indigo background
  - `--sidebar-foreground: oklch(0.98 0 0)` — white text
  - `--sidebar-primary: oklch(1 0 0)` — white active background
  - `--sidebar-primary-foreground: oklch(0.30 0.15 265)` — indigo text on active
  - `--sidebar-accent: oklch(0.35 0.12 265)` — slightly lighter indigo for hover
  - `--sidebar-accent-foreground: oklch(0.98 0 0)` — white text on hover
  - `--sidebar-border: oklch(0.25 0.12 265)` — darker indigo border
  - `--sidebar-ring: oklch(0.60 0.15 265)` — focus ring

- [x] T011 [US2] Update sidebar CSS variables in `src/app/globals.css` — dark mode (`.dark`):
  - `--sidebar: oklch(0.22 0.12 265)` — darker indigo
  - `--sidebar-foreground: oklch(0.95 0 0)` — white text
  - `--sidebar-primary: oklch(0.95 0 0)` — near-white active bg
  - `--sidebar-primary-foreground: oklch(0.22 0.12 265)` — indigo text on active
  - `--sidebar-accent: oklch(0.28 0.10 265)` — hover state
  - `--sidebar-accent-foreground: oklch(0.95 0 0)` — white on hover
  - `--sidebar-border: oklch(0.18 0.10 265)` — dark border
  - `--sidebar-ring: oklch(0.50 0.12 265)` — focus ring

- [x] T012 [US2] Update icon and text classes in `src/components/app-sidebar.tsx`:
  - Navigation icons: ensure they inherit `text-sidebar-foreground` (white) from parent, or explicitly set if needed
  - Active nav item: should use `bg-sidebar-primary text-sidebar-primary-foreground` (white bg, indigo text)
  - Inactive nav item: should use `text-sidebar-foreground` (white) with `hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`
  - Remove any hardcoded `text-muted-foreground` on nav icons — these should use sidebar color scheme
  - Team name, user name: ensure they use `text-sidebar-foreground`
  - Verify the Relay logo/brand mark is visible against the indigo background

**Checkpoint**: Sidebar is blue/indigo with white icons in both light and dark mode. Matches `relay-dashboard.png` reference.

---

## Phase 4: Dashboard Data Fix (US1)

**Purpose**: Fix workflows showing "0 runs" / "Never" / empty sparklines by adding run aggregation queries

**Goal**: Dashboard workflows display correct run counts, last-run timestamps, and sparkline activity data

### Implementation

- [x] T013 [US1] Add `fetchWorkflowRunStats()` function to `src/lib/queries/dashboard.ts`:
  - Accept `supabase` client and `workflowIds: string[]` as parameters
  - Query `workflow_runs` table: `SELECT workflow_id, started_at, status FROM workflow_runs WHERE workflow_id IN (workflowIds)`
  - Aggregate results into a `Map<string, WorkflowRunStats>` where `WorkflowRunStats` is:
    ```typescript
    type WorkflowRunStats = {
      totalRuns: number
      lastRunAt: string | null
      sparklineData: { date: string; count: number }[]
    }
    ```
  - `totalRuns`: COUNT of runs per workflow_id
  - `lastRunAt`: MAX(started_at) per workflow_id
  - `sparklineData`: daily run counts for the last 30 days per workflow_id (use `date-fns` to generate date range, fill missing days with 0)
  - Export the function and the `WorkflowRunStats` type

- [x] T014 [US1] Update workflow data flow in `src/components/dashboard/workflows-section.tsx`:
  - Call `fetchWorkflowRunStats()` with the workflow IDs from the existing workflow query
  - If data comes from a hook (`useWorkflows`), integrate the run stats into the hook's data flow
  - If data comes from server, pass run stats as props alongside workflows
  - Each workflow item should receive: `totalRuns`, `lastRunAt`, `sparklineData`
  - Display `totalRuns` where "0 runs" currently shows (e.g., "{totalRuns} runs")
  - Display `formatDistanceToNow(new Date(lastRunAt), { addSuffix: true })` where "Never" currently shows, or "Never" if `lastRunAt` is null
  - Pass `sparklineData` to the sparkline component

- [x] T015 [US1] Fix sparkline dimension issue in `src/components/dashboard/activity-sparkline.tsx`:
  - Add minimum width/height guards: wrap `ResponsiveContainer` with a div that has `min-w-[60px] min-h-[20px]`
  - OR: check if `sparklineData` is empty/undefined and render null or a placeholder instead of an empty chart
  - Ensure the component accepts and renders the `sparklineData` prop (array of `{ date: string; count: number }`)
  - Verify chart colors use CSS variable references that work in both light and dark mode

**Checkpoint**: Dashboard workflows show correct run counts > 0, "last run" timestamps, and visible sparklines. No Recharts console warnings.

---

## Phase 5: Editor Full-Width Layout (US4)

**Purpose**: Move workflow editor to a dedicated route group without sidebar

**Goal**: Editor uses full viewport width, no sidebar visible

### Implementation

- [x] T016 [US4] Create `src/app/(editor)/layout.tsx`:
  - Import `TooltipProvider` from `@/components/ui/tooltip`
  - Import `CommandMenu` from `@/components/command-menu` (if it exists and is used in editor)
  - Import `ThemeProvider` from `@/providers/theme-provider` (if not already in root layout)
  - Render minimal layout: `<TooltipProvider>{children}<CommandMenu /></TooltipProvider>`
  - No sidebar, no `DashboardShell`, no search bar
  - Ensure the layout handles the full viewport: `min-h-screen` or `h-screen`

- [x] T017 [US4] Move editor page from `src/app/(dashboard)/workflows/[id]/edit/page.tsx` to `src/app/(editor)/workflows/[id]/edit/page.tsx`:
  - Create the directory structure: `src/app/(editor)/workflows/[id]/edit/`
  - Move (not copy) the page file
  - Verify all imports in the moved file still resolve correctly (all should use `@/` paths)
  - Delete the old file at `src/app/(dashboard)/workflows/[id]/edit/page.tsx`
  - If the old directory `src/app/(dashboard)/workflows/[id]/edit/` is now empty, delete it
  - If `src/app/(dashboard)/workflows/[id]/` is now empty, delete it
  - If `src/app/(dashboard)/workflows/` is now empty, delete it

- [x] T018 [US4] Verify editor routing works:
  - Confirm the editor is accessible at `/workflows/[id]/edit` (route should be the same since route groups don't affect URL)
  - Confirm navigating from dashboard to editor works
  - Confirm navigating back from editor to dashboard shows the sidebar

**Checkpoint**: Workflow editor renders full-width without sidebar. Dashboard still has sidebar. Navigation between them works.

---

## Phase 6: Visual Polish (US5)

**Purpose**: Fix remaining visual discrepancies — agent detail bg, app icons, card styling

**Goal**: All pages match reference screenshots more closely

### Implementation

- [x] T019 [P] [US5] Update agent detail left panel background in `src/app/(dashboard)/agents/[id]/page.tsx`:
  - Change `bg-muted/30` (or similar gray class) on the left panel to a light blue/indigo tint
  - Use a CSS variable-based approach: e.g., `bg-blue-50 dark:bg-blue-950/20` or create a custom variable
  - Ensure the color works in both light and dark mode
  - The right panel should remain `bg-background` or neutral

- [x] T020 [P] [US5] Add `iconSlug` field to app integrations in `src/lib/data/app-integrations.ts`:
  - Add `iconSlug: string` to the `AppIntegration` type
  - Map each app to its simple-icons slug:
    - Slack → `slack`, GitHub → `github`, Google Sheets → `googlesheets`, Gmail → `gmail`
    - Notion → `notion`, Airtable → `airtable`, HubSpot → `hubspot`, Salesforce → `salesforce`
    - Zapier → `zapier`, Stripe → `stripe`, Twilio → `twilio`, SendGrid → `sendgrid`
    - Discord → `discord`, Microsoft Teams → `microsoftteams`, Jira → `jira`, Asana → `asana`
    - Trello → `trello`, Linear → `linear`, Figma → `figma`, Dropbox → `dropbox`
    - For any app without a simple-icons match, use empty string `""` (will fallback to letter avatar)

- [x] T021 [P] [US5] Update app icon rendering in `src/components/settings/app-integration-row.tsx`:
  - Import `Avatar`, `AvatarImage`, `AvatarFallback` from `@/components/ui/avatar`
  - Replace the current letter-only avatar with:
    ```tsx
    <Avatar className="h-8 w-8">
      {app.iconSlug && (
        <AvatarImage src={`https://cdn.simpleicons.org/${app.iconSlug}`} alt={app.name} />
      )}
      <AvatarFallback className="text-xs font-medium">{app.name[0]}</AvatarFallback>
    </Avatar>
    ```
  - The `AvatarFallback` automatically shows when `AvatarImage` fails to load or `iconSlug` is empty
  - Ensure the avatar size matches the existing row height

- [x] T022 [P] [US5] Improve agent card styling in `src/components/dashboard/agent-card.tsx`:
  - Compare current card styling against `relay-dashboard.png` reference
  - Add appropriate shadow: `shadow-sm` or `shadow` for visual depth
  - Ensure border treatment matches reference: possibly `border` with appropriate color
  - Hover state: verify `hover:shadow-md` or similar lift effect
  - Ensure card works in both light and dark mode

- [x] T023 [US5] Verify settings dialog default tab in `src/components/settings/settings-dialog.tsx`:
  - Check that the dialog opens on "General" tab by default (or the first tab)
  - If there's state management for the active tab, ensure it initializes correctly
  - Verify tab content renders without errors

**Checkpoint**: Agent detail has blue left panel, settings shows brand icons, cards have visual depth. All correct in both themes.

---

## Phase 7: Testing & Validation

**Purpose**: Verify all changes work correctly, update/add tests, ensure build passes

- [x] T024 Run `bun run build` and fix any TypeScript or build errors introduced by the changes.
- [x] T025 Run `bun run lint` and fix any linting warnings or errors.
- [x] T026 Run existing unit tests with `bunx vitest run` and fix any failures caused by the changes (e.g., component snapshots, import path changes from editor move).
- [x] T027 Run existing e2e tests with `bunx playwright test` and fix any failures (e.g., selectors that changed, route changes for editor).
- [x] T028 Visual verification with Playwright MCP — take screenshots of all major pages in BOTH light and dark mode:
  - `/dashboard` — verify sidebar is indigo, workflows show run data, sparklines visible, theme toggle works
  - `/workspace` — verify consistent theming
  - `/runs` — verify consistent theming
  - `/workflows/[id]/edit` — verify no sidebar, full-width editor, consistent theming
  - `/agents/[id]` — verify blue left panel, consistent theming
  - Settings dialog > Apps — verify brand icons, consistent theming
- [x] T029 Console check: open browser DevTools console on `/dashboard` and verify zero Recharts dimension warnings.

---

## Phase 8: Final Polish

**Purpose**: Last pass for quality

- [x] T030 [P] Review all modified files for TypeScript strict compliance — no `any` types, proper interfaces.
- [x] T031 [P] Review all modified files for convention compliance — `@/` imports, `cn()` usage, no hex/rgb colors.
- [x] T032 Final `bun run build` — must pass with zero errors.
- [x] T033 Final `bun run lint` — must pass with zero warnings.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Theme System)**: Depends on Phase 1 — BLOCKS all subsequent phases
- **Phase 3 (Sidebar Colors)**: Depends on Phase 2 (needs theme system for dark mode to work)
- **Phase 4 (Dashboard Data)**: Depends on Phase 2 (charts need theme-aware colors)
- **Phase 5 (Editor Layout)**: Depends on Phase 2 (needs theme provider in editor layout)
- **Phase 6 (Visual Polish)**: Depends on Phase 2 (all visual fixes need to work in both themes)
- **Phase 7 (Testing)**: Depends on Phases 3, 4, 5, 6
- **Phase 8 (Final Polish)**: Depends on Phase 7

### Parallel Opportunities

- Phases 3, 4, 5, 6 can run in parallel after Phase 2 completes (different files)
- Within Phase 6, tasks T019, T020, T021, T022 are marked [P] (different files)
- Phase 3 tasks T010+T011 (same file globals.css) must be sequential, T012 can follow after

### Within Each Phase

- Tasks without [P] must be done sequentially
- Commit after each phase completion
- Run `bun run build` after each phase to catch issues early

## Implementation Strategy

### Sequential Execution (Single Developer)

1. Phase 1: Setup (~5 min)
2. Phase 2: Theme System (~30 min) — BLOCKING
3. Phase 3: Sidebar Colors (~15 min)
4. Phase 4: Dashboard Data (~30 min)
5. Phase 5: Editor Layout (~15 min)
6. Phase 6: Visual Polish (~20 min)
7. Phase 7: Testing (~20 min)
8. Phase 8: Final Polish (~10 min)

---

## Notes

- All CSS color values MUST use OKLCH (per constitution). The sidebar values use hue 265 (indigo range).
- The `simple-icons` CDN (`cdn.simpleicons.org`) is free and does not require API keys. Icons are SVGs served directly.
- `next-themes` is the standard solution for Next.js theme switching — it handles SSR flash prevention, localStorage persistence, and system preference detection.
- The editor route move changes the layout wrapper but NOT the URL path. `(editor)` is a route group that only affects layout, so `/workflows/[id]/edit` remains the same URL.
- Theme toggle is placed in the sidebar for easy access. In the editor (no sidebar), users can still access it via the command menu or system preferences.
