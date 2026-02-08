# Tasks: Agent System

**Input**: Design documents from `/specs/005-agent-system/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Verify prerequisites from Phase 1 (foundation) and Phase 2 (navigation/layout) are in place, create directory structure

- [ ] T001 Verify prerequisite dependencies are installed: `date-fns`, `@supabase/supabase-js`, `@supabase/ssr`, shadcn components (card, badge, input, button, avatar, tooltip, progress, dropdown-menu, scroll-area). Run `bun pm ls` to confirm.
- [ ] T002 Verify Supabase tables exist: `agents`, `agent_skills`, `workflow_runs`, `usage`, `workflows`. Check `supabase/schema.sql` includes these table definitions.
- [ ] T003 Create directory `src/components/agent-detail/` for agent detail sub-components.
- [ ] T004 Create directory `src/app/(dashboard)/agents/[id]/` for the agent detail page route.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the page shell and data fetching layer that all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 [US1] Create agent detail page shell at `src/app/(dashboard)/agents/[id]/page.tsx`. This is a Server Component that:
  - Extracts `id` from `params`
  - Creates a server-side Supabase client via `createServerClient()`
  - Fetches agent by id from `agents` table
  - Calls `notFound()` if agent is null
  - Renders a two-panel layout: left panel (`w-96 bg-muted/30 border-r`) and right panel (`flex-1`)
  - Passes agent data to left and right panel sub-components as props
- [ ] T006 [US1] Add Supabase queries to page.tsx:
  - Fetch agent_skills with joined workflow data (name, emoji) ordered by created_at
  - Fetch workflow_runs for the agent from the last 6 months (for heatmap data)
  - Fetch recent workflow_runs (limit 20, ordered by started_at desc) for run history
  - Fetch current usage period for the agent's team_id
  - Aggregate runs by day into a `Map<string, number>` for the heatmap
  - Pass all fetched data as props to sub-components

**Checkpoint**: Page loads at `/agents/[id]`, shows two-panel layout, returns 404 for invalid IDs

---

## Phase 3: User Story 1 - Agent Detail Page (Priority: P1)

**Goal**: Render the complete agent detail page with avatar, identity, skills, activity, and run history

**Independent Test**: Navigate to `/agents/[id]` with valid mock data. Verify left panel shows animated avatar, agent name (h1), description, skills list with last-run times, and right panel shows heatmap placeholder, progress indicators, and run history or empty state.

### Implementation for User Story 1

- [ ] T007 [P] [US1] Create `src/components/agent-detail/agent-avatar.tsx` (client component):
  - `"use client"` directive
  - Props: `size?: number` (default 120)
  - Render a blue rounded-full container
  - Inside: CSS Grid with `grid-template-columns: repeat(24, 1fr)` containing 576 (24x24) small white `rounded-full` dots
  - Add CSS keyframes for `dot-pulse` animation: opacity 0.3 + scale(0.8) at 0%/100%, opacity 1 + scale(1) at 50%
  - Calculate `animation-delay` for each dot based on Euclidean distance from center (12, 12): `distance * 0.05s`
  - Animation: `dot-pulse 3s ease-in-out infinite`
  - Use `cn()` for all className composition

- [ ] T008 [P] [US1] Create `src/components/agent-detail/agent-info.tsx` (server component):
  - Props: `name: string`, `description: string | null`
  - Render agent name as `<h1>` with `text-2xl font-bold truncate` (truncate for overflow protection within w-96 panel)
  - Render description as `<p>` with `text-sm text-muted-foreground` (natural wrapping, no truncation)

- [ ] T009 [P] [US1] Create `src/components/agent-detail/skills-list.tsx` (client component):
  - `"use client"` directive
  - Props: `skills: Array<{ id: string, name: string, last_run_at: string | null, workflow: { name: string, emoji: string } | null }>`, `agentId: string`
  - Render "Skills" section heading
  - For each skill: render a `Card` (shadcn) containing:
    - Emoji icon from workflow (or default)
    - Skill name as bold text
    - Last run indicator: if `last_run_at` is null, show "Never ran" in muted text; otherwise show `formatDistanceToNow(new Date(last_run_at), { addSuffix: true })` from date-fns
  - At the bottom: "New skill" `Button` (variant="outline", dashed border) with `Plus` icon
  - "New skill" button opens a `DropdownMenu` (shadcn) with placeholder items for linking workflows
  - Use `cn()` for all className composition

- [ ] T010 [P] [US1] Create `src/components/agent-detail/progress-indicators.tsx` (server component):
  - Props: `stepsUsed: number`, `stepsLimit: number`, `aiCreditsUsed: number`, `aiCreditsLimit: number`
  - Render two rows, each with a label, `Progress` bar (shadcn), and "X / Y" text
  - Row 1: "Steps" label + Progress value={stepsUsed/stepsLimit \* 100} + "stepsUsed / stepsLimit"
  - Row 2: "AI credits" label + Progress value={aiCreditsUsed/aiCreditsLimit \* 100} + "aiCreditsUsed / aiCreditsLimit"
  - Handle edge case: if limits are 0, show 0% progress (avoid division by zero)

- [ ] T011 [P] [US1] Create `src/components/agent-detail/run-history.tsx` (server component):
  - Props: `runs: Array<{ id: string, status: string, steps_used: number, ai_credits_used: number, started_at: string, completed_at: string | null, workflow: { name: string, emoji: string } | null }>`
  - If runs array is empty: render empty state with illustration (3 stacked card shapes using divs with border/bg-muted, offset with transform) and "No runs yet." text centered below
  - If runs array has items: render a list where each run item shows:
    - Status badge (using `Badge` from shadcn with variant based on status: completed=default, running=secondary, failed=destructive, pending=outline, cancelled=outline)
    - Workflow emoji + name
    - Duration (if completed_at exists: formatted difference between started_at and completed_at)
    - Relative timestamp using `formatDistanceToNow`
  - Note: run-history.tsx can be a server component since it has no interactive elements; date formatting uses date-fns at render time

- [ ] T012 [US1] Wire all sub-components into `src/app/(dashboard)/agents/[id]/page.tsx`:
  - Import AgentAvatar, AgentInfo, SkillsList, ProgressIndicators, RunHistory
  - Left panel: AgentAvatar + AgentInfo + SkillsList (wrapped in ScrollArea for overflow)
  - Right panel: "Recent activity" heading + placeholder for heatmap (to be implemented in US2) + ProgressIndicators + RunHistory
  - Ensure left panel has `flex flex-col h-full` layout with skills in a scrollable area
  - Ensure right panel has `flex flex-col gap-8 p-8` layout

**Checkpoint**: Agent detail page renders with all sub-components. Avatar animates, skills show last-run times, right panel shows progress bars and run history (or empty state). Page returns 404 for invalid IDs.

---

## Phase 4: User Story 2 - Activity Heatmap (Priority: P2)

**Goal**: Render a 6-month GitHub-style contribution heatmap showing daily run counts with color intensity

**Independent Test**: Render ActivityHeatmap with mock data `[{ date: "2025-10-15", count: 4 }, ...]`. Verify grid renders ~26 columns of 7 rows, month labels appear above correct columns, day labels appear on the left, cells have correct colors per count threshold, and tooltips show date + count on hover.

### Implementation for User Story 2

- [ ] T013 [US2] Create `src/components/agent-detail/activity-heatmap.tsx` (client component):
  - `"use client"` directive
  - Props: `data: Map<string, number>` (key = "yyyy-MM-dd", value = run count)
  - **Date range calculation**:
    - `today = new Date()`
    - `sixMonthsAgo = subMonths(today, 6)`
    - `gridStart = startOfWeek(sixMonthsAgo)` (align to Sunday)
    - `days = eachDayOfInterval({ start: gridStart, end: today })`
    - Filter out any days after today using `isAfter`
  - **Color mapping function** `getHeatmapColor(count: number): string`:
    - 0 returns `"bg-muted"`
    - 1-2 returns `"bg-blue-200"`
    - 3-5 returns `"bg-blue-400"`
    - 6+ returns `"bg-blue-600"`
  - **Grid rendering**:
    - CSS Grid with `grid-template-rows: repeat(7, 1fr)` and `grid-auto-flow: column`
    - Each cell: `w-3 h-3 rounded-sm` with color class from `getHeatmapColor`
    - Gap between cells: `gap-0.5`
  - **Month labels**:
    - Track which month each column (week) starts in
    - When a new month begins, render the abbreviated month name (e.g., "Aug") above that column using `format(date, "MMM")`
    - Position labels using CSS Grid column alignment or absolute positioning relative to the grid
  - **Day-of-week labels**:
    - Render "S", "M", "T", "W", "T", "F", "S" vertically on the left side of the grid, aligned to rows
    - Use `text-xs text-muted-foreground` styling
  - **Tooltips**:
    - Wrap each cell in `Tooltip` + `TooltipTrigger` + `TooltipContent` from shadcn
    - Tooltip content: `format(date, "MMM d, yyyy")` + " - " + count + " runs" (or "No runs" if count is 0)
    - Wrap the entire heatmap in `TooltipProvider` with `delayDuration={0}` for instant tooltips
  - Use `cn()` for all className composition

- [ ] T014 [US2] Integrate ActivityHeatmap into `src/app/(dashboard)/agents/[id]/page.tsx`:
  - Replace heatmap placeholder in right panel with `<ActivityHeatmap data={heatmapData} />`
  - Ensure `heatmapData` Map is correctly constructed from the aggregated runs query in T006
  - Wrap in a section with "Recent activity" heading if not already done

**Checkpoint**: Heatmap renders in the right panel with correct colors, month labels, day labels. Hovering cells shows tooltips. Empty data renders all-muted grid. Grid ends at today (no future dates).

---

## Phase 5: User Story 3 - Chat Interface (Priority: P3)

**Goal**: Add a chat input at the bottom of the left panel for communicating with the agent

**Independent Test**: View the left panel of the agent detail page. Verify the chat input appears at the bottom with placeholder "Chat with [Agent Name]...", the send button is disabled when input is empty, typing enables the send button, and clicking send (or pressing Enter) clears the input.

### Implementation for User Story 3

- [ ] T015 [US3] Create `src/components/agent-detail/chat-input.tsx` (client component):
  - `"use client"` directive
  - Props: `agentName: string`
  - Local state: `const [message, setMessage] = useState("")`
  - Render a container with `border-t p-4` styling positioned at the bottom of the left panel
  - Inside: a `flex gap-2` row containing:
    - `Input` (shadcn) with `placeholder={"Chat with " + agentName + "..."}`, `value={message}`, `onChange` handler, `onKeyDown` handler (submit on Enter if not empty)
    - `Button` (shadcn) with `Send` icon from lucide-react, `size="icon"`, `disabled={!message.trim()}`
    - On submit (button click or Enter): clear the input (`setMessage("")`). No backend processing in this phase.
  - Use `cn()` for all className composition

- [ ] T016 [US3] Integrate ChatInput into `src/app/(dashboard)/agents/[id]/page.tsx`:
  - Import ChatInput component
  - Add ChatInput at the bottom of the left panel, below the SkillsList
  - Left panel structure should be: `flex flex-col h-full` with skills in a `flex-1 overflow-y-auto` scrollable area and ChatInput as a `mt-auto` sticky bottom element
  - Pass `agentName={agent.name}` as prop

**Checkpoint**: Chat input renders at bottom of left panel with correct placeholder. Send button is disabled when empty, enabled when typing. Pressing Enter or clicking send clears the input.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize animations, hover states, responsive behavior, and code quality

- [ ] T017 [P] Verify dots avatar animation renders smoothly:
  - Confirm 24x24 grid is visible and not clipped by the blue circle container
  - Confirm staggered pulse animation creates a visible concentric ripple effect
  - Confirm animation does not cause layout shifts or reflows
  - If performance is poor with 576 animated elements, consider reducing to a 12x12 grid or using a single CSS background pattern

- [ ] T018 [P] Add hover states to interactive elements:
  - Skill cards: subtle background color change on hover (`hover:bg-muted/50`)
  - Heatmap cells: slightly brighter/larger on hover (`hover:ring-1 hover:ring-foreground/20`)
  - Run history items: subtle background on hover
  - New skill button: standard button hover state from shadcn

- [ ] T019 [P] Verify responsive behavior:
  - On narrow viewports (below md breakpoint), the two-panel layout should stack vertically (left panel full width on top, right panel below)
  - Add responsive classes: `flex flex-col md:flex-row` on the container, left panel `w-full md:w-96`, right panel `w-full md:flex-1`
  - Chat input should remain at bottom of left panel section in both layouts

- [ ] T020 [P] Run `bun run build` and fix any TypeScript errors, unused imports, or missing type definitions.

- [ ] T021 [P] Run `bun run lint` and fix any ESLint warnings on all new files:
  - `src/app/(dashboard)/agents/[id]/page.tsx`
  - `src/components/agent-detail/activity-heatmap.tsx`
  - `src/components/agent-detail/agent-avatar.tsx`
  - `src/components/agent-detail/agent-info.tsx`
  - `src/components/agent-detail/skills-list.tsx`
  - `src/components/agent-detail/chat-input.tsx`
  - `src/components/agent-detail/progress-indicators.tsx`
  - `src/components/agent-detail/run-history.tsx`

- [ ] T022 Verify keyboard accessibility:
  - Tab through all interactive elements in order: skills cards, new skill button, chat input, send button
  - Confirm heatmap tooltips are accessible (TooltipTrigger should be focusable)
  - Confirm dropdown menu is keyboard navigable (arrow keys, Enter, Escape)

- [ ] T023 Final verification: navigate to `/agents/[valid-id]` and `/agents/[invalid-id]` and confirm:
  - Valid ID: full page renders with avatar, name, description, skills, heatmap, progress, run history
  - Invalid ID: Next.js 404 page renders
  - All acceptance criteria from spec.md are met

---

## Phase 7: Testing

**Purpose**: Unit tests for components and e2e tests for agent detail page flows.

**Prerequisites**: 001-foundation Phase 6 (Vitest, Playwright, Prettier, Husky) must be complete.

### Unit Tests (Vitest + Testing Library)

- [ ] T024 [P] Write unit tests for AgentAvatar at `src/components/agent-detail/__tests__/agent-avatar.test.tsx`:
  - Render with default size, verify 24x24 grid container renders
  - Render with custom size, verify container dimensions adjust
  - Verify animation class is applied to dots

- [ ] T025 [P] Write unit tests for SkillsList at `src/components/agent-detail/__tests__/skills-list.test.tsx`:
  - Render with mock skills data, verify skill cards render with names and emojis
  - Verify "Never ran" shows for skills with null last_run_at
  - Verify formatted relative time shows for skills with valid last_run_at
  - Verify "New skill" button renders

- [ ] T026 [P] Write unit tests for ProgressIndicators at `src/components/agent-detail/__tests__/progress-indicators.test.tsx`:
  - Render with mock usage data, verify progress bars display correct percentages
  - Test edge case: limits are 0, verify 0% displayed (no division by zero)
  - Verify label text renders correctly ("Steps", "AI credits")

- [ ] T027 [P] Write unit tests for RunHistory at `src/components/agent-detail/__tests__/run-history.test.tsx`:
  - Render with empty runs array, verify empty state illustration renders
  - Render with mock runs, verify status badges, workflow names, durations display
  - Verify different status values produce correct badge variants

- [ ] T028 [P] Write unit tests for ActivityHeatmap at `src/components/agent-detail/__tests__/activity-heatmap.test.tsx`:
  - Render with mock data map, verify grid renders
  - Verify color mapping: 0 -> bg-muted, 1-2 -> bg-blue-200, 3-5 -> bg-blue-400, 6+ -> bg-blue-600
  - Verify month labels render
  - Verify day labels (S, M, T, W, T, F, S) render

- [ ] T029 [P] Write unit tests for ChatInput at `src/components/agent-detail/__tests__/chat-input.test.tsx`:
  - Render with agent name, verify placeholder text includes agent name
  - Verify send button is disabled when input is empty
  - Type text, verify send button becomes enabled
  - Click send, verify input clears

### End-to-End Tests (Playwright)

- [ ] T030 Write e2e test at `e2e/agent-detail.test.ts`:
  - Navigate to `/agents/[valid-id]`, verify page loads with two-panel layout
  - Verify left panel: animated avatar, agent name, description, skills list
  - Verify right panel: activity heatmap, progress indicators, run history
  - Verify chat input at bottom of left panel accepts text and clears on send
  - Navigate to `/agents/invalid-id`, verify 404 page renders

- [ ] T031 Run `bun run test` and `bun run test:e2e` -- fix any failures.

**Checkpoint**: All unit tests pass. All e2e tests pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion. Sub-components (T007-T011) can be built in parallel. T012 wires them together.
- **US2 (Phase 4)**: Depends on Phase 2 completion. Can run in parallel with US1 sub-component tasks (T007-T011). T014 depends on T012 (page wiring) and T013 (heatmap component).
- **US3 (Phase 5)**: Depends on Phase 2 completion. Can run in parallel with US1 and US2 sub-component tasks. T016 depends on T012 (page wiring) and T015 (chat input component).
- **Polish (Phase 6)**: Depends on all user story phases being complete.
- **Testing (Phase 7)**: Depends on all previous phases being complete. Also depends on 001-foundation Phase 6 (tooling setup).

### Parallel Opportunities

- T007, T008, T009, T010, T011 can ALL run in parallel (different files, no dependencies)
- T013 can run in parallel with T007-T011 (different file)
- T015 can run in parallel with T007-T011 and T013 (different file)
- T017, T018, T019, T020, T021 can run in parallel (different concerns)

### Within Each User Story

- Sub-component files before page integration
- Page integration (T012) is the dependency gate for heatmap integration (T014) and chat integration (T016)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Verify prerequisites
2. Complete Phase 2: Page shell + data fetching
3. Complete Phase 3: All sub-components + page wiring
4. **STOP and VALIDATE**: Agent detail page renders with avatar, name, skills, progress, run history
5. Proceed to US2 (heatmap) and US3 (chat) if MVP is solid

### Incremental Delivery

1. Setup + Foundational -> Page shell with two-panel layout
2. US1 sub-components built in parallel -> Wire into page -> MVP agent detail page
3. US2 heatmap -> Integrate into right panel -> Activity visualization complete
4. US3 chat input -> Integrate into left panel -> Full feature complete
5. Polish -> Build/lint clean, responsive, accessible

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- The heatmap is the most complex component; allocate extra time for date-fns calculations and grid layout
- The dots avatar with 576 animated elements may need performance optimization; test on low-end devices
- Chat input is UI-only in this phase; backend message processing will be a separate feature
- All Supabase queries are in the Server Component page.tsx; sub-components receive data as props
- Commit after each task or logical group
