# Feature Specification: Agent System

**Feature Branch**: `005-agent-system`
**Created**: 2026-02-07
**Status**: Draft
**Input**: Phase 5 of DEVELOPMENT_SPEC.md - Agent detail page with 2-panel layout, activity heatmap, skills management, and chat interface

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent Detail Page with Two-Panel Layout (Priority: P1)

As a user viewing an agent's details, I need a two-panel layout that shows the agent's identity (avatar, name, description), its skills with last run times, and its recent activity (heatmap, progress indicators, run history) so that I can understand the agent's purpose, capabilities, and usage at a glance.

**Why this priority**: The agent detail page is the primary view for understanding an individual agent. Without it, there is no way to inspect agent configuration, see what skills it has, or review its activity history. Every other agent-related interaction (chat, skill management) lives within this page. This is the core MVP for the agent system.

**Independent Test**: Can be fully tested by navigating to `/agents/[id]`, verifying the two-panel layout renders with the left panel showing the animated avatar, agent name, description, skills list, and the right panel showing the activity heatmap, progress indicators, and run history (or empty state). Mock data is sufficient for verification.

**Acceptance Scenarios**:

1. **Given** an agent exists with id, name, and description, **When** the user navigates to `/agents/[id]`, **Then** the page renders a two-panel layout: left panel (w-96, bg-muted/30) and right panel (flex-1).
2. **Given** the left panel is visible, **When** the page loads, **Then** it displays a large animated dots avatar (blue circle containing a 24x24 grid of small circles with staggered pulse animation), followed by the agent name as an h1 heading, and the description as body text below.
3. **Given** the agent has skills linked via agent_skills, **When** the left panel renders the "Skills" section, **Then** each skill is shown as a card with an emoji icon, skill name, and either "Never ran" (if last_run_at is null) or the relative time since last run (e.g., "2 hours ago") using date-fns `formatDistanceToNow`.
4. **Given** the agent has zero skills, **When** the left panel renders the "Skills" section, **Then** only the "New skill" button is visible with no skill cards above it.
5. **Given** the left panel has a "New skill" button, **When** the user clicks it, **Then** a dropdown menu appears with options to link an existing workflow as a skill.
6. **Given** the right panel is visible, **When** the page loads, **Then** it displays a "Recent activity" heading, a 6-month activity heatmap, two progress indicators (steps used and AI credits used), and a run history section.
7. **Given** the agent has zero workflow runs, **When** the right panel renders the run history, **Then** it displays an empty state with an illustration (3 stacked cards) and "No runs yet." text.
8. **Given** the agent has workflow runs, **When** the right panel renders the run history, **Then** it displays a list of run items showing run status, workflow name, duration, and timestamp.
9. **Given** a valid agent id in the URL, **When** the Supabase query for the agent returns data, **Then** the page renders without errors and all sub-components receive the correct props.
10. **Given** an invalid or non-existent agent id in the URL, **When** the Supabase query returns null, **Then** the page renders a "not found" state or redirects to a 404 page using Next.js `notFound()`.

---

### User Story 2 - Activity Heatmap Component (Priority: P2)

As a user viewing an agent's activity, I need a GitHub-style contribution heatmap showing the last 6 months of run data so that I can visually identify patterns in the agent's usage, spot high-activity periods, and understand its run frequency over time.

**Why this priority**: The heatmap is the primary visual indicator of agent activity and is prominently placed in the right panel. While the page layout (US1) can render without it (showing a placeholder), the heatmap is the defining visual element of the agent detail view and provides significant value for understanding agent usage patterns.

**Independent Test**: Can be fully tested by rendering the ActivityHeatmap component in isolation with mock data (an array of `{ date: string, count: number }` entries). Verify that the grid renders 6 months of day cells, month labels appear above the correct columns, day-of-week labels appear on the left (S, M, T, W, T, F, S), cells have correct background colors based on count thresholds, and hovering a cell shows a tooltip with the date and run count.

**Acceptance Scenarios**:

1. **Given** the ActivityHeatmap component receives run data aggregated by day, **When** it renders, **Then** it displays a grid of cells representing each day of the last 6 months, organized as columns (weeks) with rows (days of week, Sunday at top).
2. **Given** a day with 0 runs, **When** the cell renders, **Then** it has the `bg-muted` background color (neutral/empty).
3. **Given** a day with 1-2 runs, **When** the cell renders, **Then** it has the `bg-blue-200` background color (low activity).
4. **Given** a day with 3-5 runs, **When** the cell renders, **Then** it has the `bg-blue-400` background color (medium activity).
5. **Given** a day with 6 or more runs, **When** the cell renders, **Then** it has the `bg-blue-600` background color (high activity).
6. **Given** the heatmap renders, **When** the user looks at the top of the grid, **Then** month labels (abbreviated, e.g., "Aug", "Sep", "Oct") appear above the first week column of each month.
7. **Given** the heatmap renders, **When** the user looks at the left side of the grid, **Then** day-of-week labels (S, M, T, W, T, F, S) appear vertically.
8. **Given** the user hovers over a cell, **When** the tooltip triggers, **Then** it shows the date formatted as "MMM d, yyyy" and the run count (e.g., "Oct 15, 2025 - 4 runs" or "Oct 15, 2025 - No runs").
9. **Given** no run data is provided (empty array), **When** the heatmap renders, **Then** all cells display with the `bg-muted` background (all zeroes), and the grid structure is still complete with correct month/day labels.
10. **Given** today's date, **When** the heatmap calculates the 6-month range, **Then** it uses `date-fns` functions (`subMonths`, `startOfWeek`, `eachDayOfInterval`, `format`, `getDay`, `startOfMonth`, `isSameMonth`) to compute the date range and grid layout. Future dates (beyond today) MUST NOT be rendered.

---

### User Story 3 - Agent Chat Interface (Priority: P3)

As a user interacting with an agent, I need a chat input at the bottom of the left panel so that I can communicate with the agent, ask questions, and give instructions in natural language.

**Why this priority**: The chat interface is an enhancement to the agent detail page. The page is fully functional without it (viewing agent info, skills, and activity is the core use case). Chat adds interactivity but is not required for the MVP agent detail view. The backend for processing chat messages is not part of this phase.

**Independent Test**: Can be fully tested by verifying the chat input renders at the bottom of the left panel with the placeholder "Chat with [Agent Name]...", typing text into the input, clicking the send button (or pressing Enter), and verifying the input clears. Since this phase is UI-only (no backend processing), the test confirms the input and button render correctly and handle basic interaction.

**Acceptance Scenarios**:

1. **Given** the left panel is rendered for an agent named "Research Assistant", **When** the chat section appears at the bottom, **Then** it displays an input field with placeholder text "Chat with Research Assistant..." and a send button (arrow icon).
2. **Given** the chat input is empty, **When** the user looks at the send button, **Then** the send button is disabled (visually muted, not clickable).
3. **Given** the user has typed text into the chat input, **When** the user clicks the send button or presses Enter, **Then** the input is cleared and the message is dispatched (UI-only in this phase; no backend processing).
4. **Given** the left panel layout, **When** the chat input renders, **Then** it is positioned at the very bottom of the left panel using a sticky or fixed-within-panel layout so it remains visible as the skills list scrolls.

---

### Edge Cases

- **Agent not found**: If the agent id in the URL does not match any agent in the database, the page MUST call `notFound()` from `next/navigation` to render the Next.js 404 page. No crash or empty layout should be shown.
- **Agent with zero skills**: The "Skills" section MUST render the "New skill" button even when no skills exist. The section heading "Skills" MUST still appear.
- **Agent with zero runs**: The right panel MUST display the empty state illustration and "No runs yet." text. The heatmap MUST still render with all cells in `bg-muted` state. Progress indicators MUST show 0/limit values.
- **Very long agent name**: Agent names exceeding the left panel width MUST truncate with an ellipsis (`truncate` class) or wrap naturally without breaking the layout. The h1 heading MUST NOT overflow the w-96 panel.
- **Very long agent description**: Descriptions MUST be displayed in full (no truncation) with natural line wrapping. The left panel MUST scroll vertically if content exceeds viewport height.
- **Future dates in heatmap**: The heatmap MUST NOT render cells for dates beyond today. The grid ends at today's date. Partial weeks at the end are acceptable.
- **Skill with thousands of runs**: The run count display on skill cards should use compact formatting if needed but primarily shows the relative time of last run, so large run counts only appear in detail views, not on the skill card itself.
- **Heatmap with extreme data**: If a single day has hundreds of runs, it still maps to the `bg-blue-600` tier (6+). There is no fifth tier. The tooltip MUST show the actual count accurately.
- **Skills with null workflow**: If an agent_skill references a deleted workflow (workflow_id with ON DELETE CASCADE should prevent this, but defensively), the skill card MUST either not render or show a "Deleted workflow" indicator rather than crashing.
- **Concurrent navigation**: If the user navigates between different agent detail pages rapidly, each page MUST fetch and display the correct agent's data without stale data from a previous agent leaking through.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render the agent detail page at route `/agents/[id]` using the Next.js App Router with a dynamic `[id]` segment.
- **FR-002**: System MUST display a two-panel layout: left panel (w-96, bg-muted/30 background, border-r) containing agent identity, skills, and chat; right panel (flex-1) containing activity heatmap, progress indicators, and run history.
- **FR-003**: System MUST render an animated dots avatar consisting of a 24x24 grid of small circles within a blue circular container. The dots MUST use a staggered pulse animation via CSS keyframes.
- **FR-004**: System MUST display the agent name as an h1 heading and the description as paragraph text below the avatar in the left panel.
- **FR-005**: System MUST display a "Skills" section listing all agent_skills for the agent. Each skill card MUST show an emoji icon, the skill name, and the last run time as either "Never ran" (when last_run_at is null) or a relative time string computed by `date-fns` `formatDistanceToNow`.
- **FR-006**: System MUST provide a "New skill" button that opens a dropdown menu for adding skills to the agent.
- **FR-007**: System MUST display a chat input at the bottom of the left panel with placeholder "Chat with [Agent Name]..." and a send button. The send button MUST be disabled when the input is empty.
- **FR-008**: System MUST render an ActivityHeatmap component in the right panel showing 6 months of run data as a grid of colored cells.
- **FR-009**: Heatmap cells MUST use the following color mapping based on daily run count: 0 runs = `bg-muted`, 1-2 runs = `bg-blue-200`, 3-5 runs = `bg-blue-400`, 6+ runs = `bg-blue-600`.
- **FR-010**: Heatmap MUST display month labels (abbreviated) above the grid columns and day-of-week labels (S, M, T, W, T, F, S) on the left side of the grid.
- **FR-011**: Heatmap cells MUST show a tooltip on hover displaying the date (formatted as "MMM d, yyyy") and the run count for that day.
- **FR-012**: System MUST display two progress indicators below the heatmap: one for steps used and one for AI credits used, showing current usage against limits.
- **FR-013**: System MUST display run history below the progress indicators. When no runs exist, an empty state with an illustration and "No runs yet." text MUST be shown.
- **FR-014**: System MUST use `date-fns` for all date calculations in the heatmap (subMonths, startOfWeek, eachDayOfInterval, format, getDay, startOfMonth, isSameMonth) and for relative time formatting in skill cards (formatDistanceToNow).
- **FR-015**: System MUST call `notFound()` from `next/navigation` when the agent id does not match any record in the database.
- **FR-016**: System MUST fetch agent data, skills, and run data from Supabase using the server-side client in the page Server Component.

### Key Entities

- **Agent**: The primary entity displayed on this page. Fields used: `id`, `name`, `description`, `avatar_url`, `avatar_type`. Fetched by `id` from URL params. Related to `agent_skills` (one-to-many) and `workflow_runs` (one-to-many via agent_id).
- **AgentSkill**: Skills linked to the agent. Fields used: `id`, `name`, `last_run_at`, `run_count`, `workflow_id`. Fetched by `agent_id`. Each skill references a workflow.
- **WorkflowRun**: Execution records for the agent. Fields used: `id`, `status`, `steps_used`, `ai_credits_used`, `started_at`, `completed_at`, `workflow_id`. Fetched by `agent_id`, aggregated by day for heatmap, listed chronologically for run history.
- **Usage**: Team usage data for progress indicators. Fields used: `steps_used`, `steps_limit`, `ai_credits_used`, `ai_credits_limit`. Fetched by `team_id` from the agent's team.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `bun run build` completes with zero errors after all agent system files are created.
- **SC-002**: `bun run lint` passes with zero warnings on all new files.
- **SC-003**: Navigating to `/agents/[valid-id]` renders the two-panel layout with agent name, avatar, skills, heatmap, and progress indicators within 2 seconds on first load.
- **SC-004**: Navigating to `/agents/[invalid-id]` renders the Next.js 404 page without a console error or crash.
- **SC-005**: The animated dots avatar renders a visible 24x24 grid with smooth staggered pulse animation at 60fps without layout jank.
- **SC-006**: The activity heatmap correctly renders 6 months of data with accurate color mapping: cells with 0 runs are visually distinct from cells with 1-2, 3-5, and 6+ runs.
- **SC-007**: Hovering any heatmap cell displays a tooltip with the correct date and run count within 100ms.
- **SC-008**: Skill cards display "Never ran" when `last_run_at` is null and correct relative time (e.g., "3 hours ago") when populated.
- **SC-009**: The chat input at the bottom of the left panel shows the correct placeholder with the agent's name and the send button is disabled when the input is empty.
- **SC-010**: The page is keyboard-accessible: all interactive elements (skills, new skill button, chat input, send button) can be reached and activated via Tab and Enter keys.
