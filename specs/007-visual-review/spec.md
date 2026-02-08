# Feature Specification: Visual Review & Polish

**Feature Branch**: `007-visual-review`
**Created**: 2026-02-08
**Status**: Draft
**Input**: Side-by-side Playwright comparison of implemented pages vs reference screenshots (`relay-*.png`), plus user request for consistent light/dark theme support

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Dashboard Data Accuracy (Priority: P1)

As a user viewing the dashboard, I need workflows to show their actual run counts, last-run timestamps, and sparkline activity charts so that I can understand which workflows are active, when they last ran, and their recent activity trends — rather than seeing "0 runs" and "Never" for every workflow.

**Why this priority**: The dashboard is the primary landing page and first impression. Showing "0 runs" and empty sparklines for workflows that have hundreds of runs is a critical data bug that undermines trust in the platform. This is a functional regression that must be fixed before any visual polish.

**Independent Test**: Can be fully tested by navigating to `/dashboard` and verifying that workflows display run counts > 0, recent "last run" timestamps (not "Never"), and sparkline charts with visible data points.

**Acceptance Scenarios**:

1. **Given** a workflow has 271 recorded runs in `workflow_runs`, **When** the dashboard loads, **Then** the workflow card shows "271 runs" (or the actual count), not "0 runs".
2. **Given** a workflow's most recent run was 2 hours ago, **When** the dashboard loads, **Then** the workflow card shows "2 hours ago" (via `formatDistanceToNow`), not "Never".
3. **Given** a workflow has runs distributed over the past 30 days, **When** the sparkline renders, **Then** it displays a visible line/area chart with data points reflecting daily run counts, not an empty chart.
4. **Given** a workflow has zero runs, **When** the dashboard loads, **Then** the workflow card correctly shows "0 runs" and "Never" — this is the only case where those values are correct.
5. **Given** the sparkline component receives data, **When** it renders with container dimensions, **Then** no console warnings about "width(-1) and height(-1)" appear (Recharts dimension fix).

---

### User Story 2 - Sidebar Brand Identity (Priority: P1)

As a user of the Relay platform, I need the sidebar to have a distinctive blue/indigo color scheme with white icons and text so that it matches the brand identity shown in the reference designs, rather than appearing as a plain white/gray panel that blends with the main content.

**Why this priority**: The sidebar is visible on every authenticated page and defines the platform's visual identity. The current white sidebar with dark icons looks generic and does not match the reference designs. This affects the entire app's perceived quality.

**Independent Test**: Can be fully tested by navigating to any dashboard page and verifying the sidebar has a deep blue/indigo background, white navigation icons, white text labels, and proper hover/active states that maintain the color scheme.

**Acceptance Scenarios**:

1. **Given** the user is on any dashboard page in light mode, **When** they look at the sidebar, **Then** it has a deep blue/indigo background (`oklch(0.30 0.15 265)` or similar).
2. **Given** the sidebar is rendered, **When** looking at navigation icons, **Then** all icons are white/light-colored and clearly visible against the dark background.
3. **Given** a navigation item is active, **When** the user views it, **Then** it has a white background with indigo text (inverted from the sidebar base).
4. **Given** a navigation item is inactive, **When** the user hovers over it, **Then** it shows a slightly lighter indigo background with white text.
5. **Given** the user is in dark mode, **When** they view the sidebar, **Then** it uses an appropriately darker indigo that maintains the brand identity without clashing with the dark content area.
6. **Given** the sidebar footer shows the team name and user avatar, **When** rendered, **Then** all text is white/light and legible against the indigo background.

---

### User Story 3 - Consistent Light/Dark Theme (Priority: P1)

As a user of the Relay platform, I need all pages and components to properly support both light and dark themes without visual mixing so that the interface looks polished and intentional in whichever mode I choose, with no elements appearing "stuck" in the wrong theme.

**Why this priority**: The current implementation has inconsistent theme application — some components use light-mode-only colors, others have hardcoded values that don't respond to theme changes. A consistent theme system is foundational to the app's visual quality and is a prerequisite for all other visual fixes looking correct in both modes.

**Independent Test**: Can be fully tested by toggling between light and dark mode on every major page (dashboard, workspace, runs, workflow editor, agent detail, settings) and verifying no elements appear in the wrong theme, all text is legible, all backgrounds are appropriate, and all interactive elements have visible states.

**Acceptance Scenarios**:

1. **Given** the app has a theme provider, **When** the user loads the app, **Then** the system preference (prefers-color-scheme) is respected by default and a toggle is available to override it.
2. **Given** the user is in dark mode, **When** they view the dashboard, **Then** all cards, charts, text, and backgrounds use dark theme colors — no white cards on dark backgrounds or dark text on dark backgrounds.
3. **Given** the user is in light mode, **When** they view any page, **Then** all elements use light theme colors consistently — no dark-only elements appearing.
4. **Given** theme variables are defined in globals.css, **When** switching themes, **Then** all CSS variable references (`var(--background)`, `var(--card)`, `var(--sidebar)`, etc.) resolve to the correct values for the active theme.
5. **Given** charts and visualizations render, **When** in dark mode, **Then** they use theme-appropriate colors (not hardcoded `hsl()` or hex values that only work in light mode).
6. **Given** the sidebar uses brand colors (blue/indigo), **When** switching between light and dark mode, **Then** the sidebar maintains its brand identity in both modes with appropriate contrast adjustments.

---

### User Story 4 - Editor Full-Width Layout (Priority: P2)

As a user editing a workflow, I need the editor to use the full viewport width without the sidebar so that I have maximum workspace for the 3-panel editor layout (canvas, step config, AI assistant), matching the reference design.

**Why this priority**: The editor currently renders inside the `(dashboard)` layout which includes the sidebar, wasting ~256px of horizontal space. The reference shows the editor as a full-width experience. This is an architectural fix (route group change) rather than a simple CSS tweak.

**Independent Test**: Can be fully tested by navigating to `/workflows/[id]/edit` and verifying the editor spans the full viewport width with no sidebar visible, and that navigating back to `/dashboard` restores the sidebar.

**Acceptance Scenarios**:

1. **Given** the user navigates to `/workflows/[id]/edit`, **When** the page loads, **Then** no sidebar is visible and the editor occupies the full viewport width.
2. **Given** the editor is rendered without sidebar, **When** the 3-panel layout renders, **Then** the canvas, step config panel, and AI assistant panel have more horizontal space than when the sidebar was present.
3. **Given** the user is in the editor, **When** they navigate back to dashboard (via breadcrumb or browser back), **Then** the sidebar is visible again in the dashboard layout.
4. **Given** the editor layout exists, **When** it renders, **Then** it still includes essential providers (TooltipProvider) and shared components (CommandMenu) needed for editor functionality.

---

### User Story 5 - Visual Polish (Priority: P2)

As a user browsing the platform, I need the agent detail page, settings dialog, and dashboard cards to match the reference designs' visual quality so that the platform feels polished and professional.

**Why this priority**: These are visual refinements that improve perceived quality but don't affect functionality. Each is independent and relatively small in scope.

**Independent Test**: Can be tested by navigating to each affected page and comparing against the reference screenshots for visual fidelity.

**Acceptance Scenarios**:

1. **Given** the user views an agent detail page, **When** looking at the left panel, **Then** it has a light blue/indigo tinted background (not plain gray `bg-muted/30`).
2. **Given** the user opens Settings > Apps, **When** viewing app integration rows, **Then** each app shows its brand logo/icon (via CDN with letter-avatar fallback), not just a letter avatar.
3. **Given** the settings dialog opens, **When** it renders, **Then** it opens on the correct default tab (General or the last-viewed tab).
4. **Given** the dashboard shows agent cards, **When** comparing to reference, **Then** cards have appropriate visual depth (shadow, border treatment) matching the reference design.

---

### Edge Cases

- What happens when `workflow_runs` table has no data? Dashboard should gracefully show "0 runs" / "Never" / empty sparklines.
- What happens when simple-icons CDN is unavailable? App integration rows should fall back to letter avatars.
- What happens when the browser doesn't support OKLCH? Tailwind v4 handles fallbacks automatically.
- What happens when the user has no system theme preference? Default to light mode.
- What happens when Recharts container has 0 dimensions on initial render? Guard with minimum width/height.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Dashboard MUST aggregate run counts from `workflow_runs` table and display per-workflow totals.
- **FR-002**: Dashboard MUST show each workflow's most recent run timestamp using `formatDistanceToNow`.
- **FR-003**: Dashboard MUST pass daily run counts (last 30 days) to sparkline components.
- **FR-004**: Sidebar MUST use blue/indigo CSS variables for background, foreground, and accent states.
- **FR-005**: All sidebar icons and text MUST be white/light in both light and dark modes.
- **FR-006**: Workflow editor MUST render without sidebar in a dedicated `(editor)` route group.
- **FR-007**: App integration rows MUST attempt to load brand icons from CDN before falling back to letter avatars.
- **FR-008**: Sparkline component MUST guard against zero-dimension containers to prevent Recharts warnings.
- **FR-009**: Theme provider MUST be installed and configured to support light/dark mode switching with system preference detection.
- **FR-010**: All CSS variable pairs (light and dark) MUST be reviewed and corrected for consistency.
- **FR-011**: A theme toggle control MUST be accessible to the user (e.g., in sidebar footer or settings).
- **FR-012**: All chart colors, hardcoded `hsl()` values, and non-variable colors MUST be replaced with theme-aware CSS variable references.

### Key Entities _(no new entities — this feature modifies existing ones)_

- **workflow_runs**: Existing table — queried for run counts, timestamps, daily aggregation
- **CSS variables**: Existing `globals.css` — modified for sidebar brand colors and theme consistency
- **Route groups**: Existing `(dashboard)` — new `(editor)` group created for full-width editor

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All dashboard workflows with recorded runs display correct run counts (matching `SELECT COUNT(*) FROM workflow_runs WHERE workflow_id = X`).
- **SC-002**: Sidebar visually matches the reference `relay-dashboard.png` with blue/indigo background and white icons.
- **SC-003**: Workflow editor at `/workflows/[id]/edit` renders with full viewport width, no sidebar visible.
- **SC-004**: Zero console warnings related to Recharts dimensions on any dashboard page.
- **SC-005**: Agent detail left panel has a blue-tinted background, not plain gray.
- **SC-006**: Settings > Apps shows brand icons for at least the major integrations (Slack, GitHub, Google, etc.).
- **SC-007**: `bun run build` passes with zero errors after all changes.
- **SC-008**: `bun run lint` passes with zero warnings after all changes.
- **SC-009**: Toggling between light and dark mode on all major pages shows consistent, correct theming with no visual artifacts.
- **SC-010**: Theme preference persists across page reloads (via localStorage or cookie).
