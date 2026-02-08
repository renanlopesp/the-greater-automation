# Feature Specification: Navigation & Layout

**Feature Branch**: `002-navigation-layout`
**Created**: 2026-02-07
**Status**: Draft
**Input**: Phase 2 of DEVELOPMENT_SPEC.md -- App Sidebar, Command Menu, Dashboard Layout
**Depends on**: `001-foundation` (Supabase clients, auth middleware, database schema, QueryProvider)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - App Sidebar Navigation (Priority: P1)

As an authenticated user, I need a persistent icon-based sidebar so that I can navigate between all major sections of the application (Home, Search, Workspace, Runs, Apps, Support) without losing context, see my usage at a glance, and access account settings.

**Why this priority**: The sidebar is the primary navigation mechanism for the entire app. Without it, no other page can be reached. It is the single most critical UI element for the authenticated experience.

**Independent Test**: Can be fully tested by rendering the sidebar on any page and verifying that all nav items link to the correct routes, the active route is visually highlighted, usage meters display current data, and the avatar dropdown opens with menu items. Delivers a complete navigation experience even without other features.

**Acceptance Scenarios**:

1. **Given** an authenticated user on any dashboard page, **When** the page loads, **Then** a vertical sidebar with width 64px (w-16) is visible on the left edge of the viewport.
2. **Given** the sidebar is rendered, **When** the user looks at the top section, **Then** they see the Relay logo (blue rounded square with "R" letter) and a "Create new" button (+ icon).
3. **Given** the sidebar is rendered, **When** the user looks at the navigation section, **Then** they see icon buttons for: Home, Search, Workspace, Runs, Apps, Support -- in that order top-to-bottom.
4. **Given** the user is on the `/dashboard` route, **When** the sidebar renders, **Then** the Home icon has a blue background indicating it is the active route.
5. **Given** the user is on the `/workspace` route, **When** the sidebar renders, **Then** the Workspace icon has a blue background and no other icon does.
6. **Given** the user clicks the "Workspace" nav icon, **When** navigation completes, **Then** the URL changes to `/workspace` and the Workspace icon becomes active.
7. **Given** the sidebar is rendered, **When** the user looks at the bottom section, **Then** they see two horizontal progress bars labeled "Steps" and "AI Credits" showing current usage vs. limits.
8. **Given** the user's team has used 750 of 1000 steps, **When** the usage meter renders, **Then** the Steps progress bar is filled to 75%.
9. **Given** the sidebar is rendered, **When** the user looks at the very bottom, **Then** they see their avatar (or initials fallback).
10. **Given** the user clicks their avatar, **When** the dropdown opens, **Then** they see menu items including: Settings, Log out.
11. **Given** the user hovers over a nav icon, **When** the tooltip appears, **Then** it displays the label text for that icon (e.g., "Home", "Workspace").

---

### User Story 2 - Dashboard Layout (Priority: P2)

As an authenticated user, I need the dashboard layout to wrap all authenticated pages with the sidebar and a main content area, enforce authentication, and provide the team/usage data context needed by child components.

**Why this priority**: The layout is the structural container that integrates the sidebar (US1) with page content. It handles the auth gate and data fetching that all child pages depend on. Without it, the sidebar floats without content and pages have no auth protection.

**Independent Test**: Can be tested by visiting any `/(dashboard)/*` route while authenticated (should see sidebar + content) and while unauthenticated (should redirect to `/login`). Delivers the authenticated shell experience.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they navigate to any `/(dashboard)/*` route (e.g., `/dashboard`, `/workspace`, `/runs`), **Then** they are redirected to `/login`.
2. **Given** an authenticated user, **When** they navigate to `/dashboard`, **Then** the page renders with the AppSidebar on the left and the page content filling the remaining width.
3. **Given** an authenticated user, **When** the dashboard layout loads, **Then** it fetches the user profile, team data, and usage data from Supabase on the server.
4. **Given** the Supabase session is valid, **When** the layout renders, **Then** the user's avatar URL, team name, and usage numbers are passed to child components (sidebar, etc.).
5. **Given** the user resizes the browser to a narrow viewport (< 768px), **When** the layout re-renders, **Then** the sidebar collapses or becomes a mobile drawer and content fills the full width.

---

### User Story 3 - Command Menu (Priority: P3)

As a user, I need a command menu (Ctrl+K) so that I can quickly search across workflows, agents, and runs without navigating through menus, enabling keyboard-driven productivity.

**Why this priority**: The command menu is an enhancement for power users. The app is fully functional without it, but it significantly improves efficiency for frequent users. It depends on the layout being in place (US2) to be accessible.

**Independent Test**: Can be tested by pressing Ctrl+K on any dashboard page and verifying the dialog opens, typing a query and verifying results appear, selecting a result and verifying navigation occurs. Delivers a quick-search experience.

**Acceptance Scenarios**:

1. **Given** an authenticated user on any dashboard page, **When** they press `Ctrl+K` (or `Cmd+K` on macOS), **Then** a centered modal dialog opens with a search input auto-focused.
2. **Given** the command menu is closed, **When** the user looks at the top of the dashboard, **Then** they see a static search bar placeholder reading "Type Ctrl K to search" that also opens the command menu when clicked.
3. **Given** the command menu is open, **When** the user types "my workflow", **Then** matching workflows appear in a "Workflows" group within the results list.
4. **Given** the command menu is open and showing results, **When** the user uses arrow keys to highlight a result and presses Enter, **Then** they are navigated to that item's detail page and the menu closes.
5. **Given** the command menu is open, **When** the user presses `Escape`, **Then** the menu closes and focus returns to the previous element.
6. **Given** the command menu is open and the user types a query with no matches, **When** the search completes, **Then** the menu displays "No results found."
7. **Given** the command menu is open, **When** results are displayed, **Then** they are grouped by type: Workflows, Agents, Runs -- each with a section heading.

---

### Edge Cases

- **No team data**: User has a profile but no team membership. Sidebar should still render with zeroed usage meters and a prompt or graceful empty state.
- **Usage at 100%**: When steps_used equals steps_limit, the progress bar should be fully filled and optionally change color to a warning/destructive tone (e.g., red/amber).
- **Usage exceeds limit**: If steps_used > steps_limit (overage), the progress bar should be capped at 100% fill and display a visual warning.
- **Sidebar on mobile**: On viewports < 768px, the sidebar should collapse to a slide-out drawer or bottom nav. The hamburger menu or equivalent trigger must be accessible.
- **Keyboard navigation**: All sidebar nav items must be reachable via Tab key. The active item must have `aria-current="page"`. The avatar dropdown must be operable via Enter/Space keys.
- **Command menu with empty database**: If there are no workflows, agents, or runs, the command menu should show "No results found" for any query rather than erroring.
- **Command menu rapid typing**: Debounce search queries so that typing rapidly does not fire excessive Supabase queries.
- **Multiple browser tabs**: Auth state changes (logout) in one tab should not leave stale sessions in other tabs. The middleware should handle this on next navigation.
- **Avatar fallback**: If user has no avatar_url, display initials derived from full_name or email. If neither exists, display a generic user icon.
- **Long team names**: Team names longer than sidebar width should truncate with ellipsis in the avatar dropdown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render a fixed-position vertical sidebar with a width of 64px (Tailwind `w-16`) on the left edge of all authenticated pages.
- **FR-002**: Sidebar MUST display the Relay logo at the top -- a blue rounded square containing the letter "R" in white.
- **FR-003**: Sidebar MUST display a "Create new" button rendered as a `+` icon below the logo.
- **FR-004**: Sidebar MUST display navigation icons in this order: Home (`/dashboard`), Search (triggers command menu), Workspace (`/workspace`), Runs (`/runs`), Apps (opens settings/apps), Support (external link or modal).
- **FR-005**: Navigation icons MUST be 20x20px (`w-5 h-5`) Lucide icons centered in 40x40px (`w-10 h-10`) clickable areas.
- **FR-006**: The active route's nav icon MUST have a blue background (`bg-primary` or custom blue) with white icon color to indicate current location.
- **FR-007**: Non-active nav icons MUST have a transparent background with muted foreground color, and show a subtle hover state.
- **FR-008**: Each nav icon MUST display a tooltip on hover showing the navigation label (using shadcn Tooltip component).
- **FR-009**: Sidebar bottom section MUST display two progress bars: "Steps" showing `steps_used / steps_limit` and "AI Credits" showing `ai_credits_used / ai_credits_limit`.
- **FR-010**: Progress bars MUST use the shadcn Progress component (or a thin custom bar) with percentage fill calculated from usage data.
- **FR-011**: Sidebar bottom MUST display the user's avatar (shadcn Avatar with AvatarImage + AvatarFallback) that opens a dropdown menu on click.
- **FR-012**: Avatar dropdown MUST include at minimum: user name/email display, "Settings" action, "Log out" action.
- **FR-013**: Dashboard layout (`src/app/(dashboard)/layout.tsx`) MUST be a Server Component that checks authentication via Supabase server client.
- **FR-014**: Dashboard layout MUST redirect to `/login` if no valid session exists (using `redirect()` from `next/navigation`).
- **FR-015**: Dashboard layout MUST fetch user profile, team, and usage data from Supabase and pass them as props or context to child components.
- **FR-016**: Dashboard layout MUST render AppSidebar on the left and `{children}` in a flex container filling the remaining viewport width.
- **FR-017**: Command menu MUST open when the user presses `Ctrl+K` (Windows/Linux) or `Cmd+K` (macOS).
- **FR-018**: Command menu MUST use the shadcn `Command` component (backed by `cmdk` library).
- **FR-019**: Command menu MUST include a search input, result groups (Workflows, Agents, Runs), and individual result items.
- **FR-020**: Command menu result items MUST navigate to the relevant detail page when selected (click or Enter).
- **FR-021**: Command menu MUST display "No results found." when a search query yields no matches.
- **FR-022**: A static search bar trigger MUST be visible at the top of the dashboard displaying "Type Ctrl K to search" that opens the command menu on click.

### Key Entities

- **Profile**: User identity (id, email, full_name, avatar_url). Source: `profiles` table joined with `auth.users`.
- **Team**: Organization context (id, name, slug, avatar_url). Source: `teams` table via `team_members` join.
- **Usage**: Consumption metrics (steps_used, steps_limit, ai_credits_used, ai_credits_limit, period_start, period_end). Source: `usage` table filtered by team_id and current period.
- **Workflow** (for search): Name, emoji, id. Source: `workflows` table filtered by team_id.
- **Agent** (for search): Name, avatar_url, id. Source: `agents` table filtered by team_id.
- **Workflow Run** (for search): Id, status, workflow name. Source: `workflow_runs` table joined with `workflows`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All six navigation items are visible and clickable in the sidebar, linking to the correct routes.
- **SC-002**: Active route is visually distinguishable (blue background) at all times, matching the current URL.
- **SC-003**: Usage meters accurately reflect data from the `usage` table, updating on page load.
- **SC-004**: Unauthenticated users are redirected to `/login` within one server roundtrip when accessing any dashboard route.
- **SC-005**: `Ctrl+K` / `Cmd+K` opens the command menu within 100ms of keypress.
- **SC-006**: Command menu search returns results within 300ms for queries against a dataset of up to 1000 items.
- **SC-007**: All interactive elements (nav items, avatar dropdown, command menu) are operable via keyboard alone.
- **SC-008**: `bun run build` passes with zero errors after all components are implemented.
- **SC-009**: `bun run lint` passes with zero warnings after all components are implemented.
