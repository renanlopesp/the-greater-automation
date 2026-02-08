# Tasks: Navigation & Layout

**Input**: Design documents from `/specs/002-navigation-layout/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)
**Depends on**: `001-foundation` must be complete (Supabase clients, auth middleware, database schema, QueryProvider, root layout with providers)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Ensure shadcn/ui components required by this feature are installed

- [x] T001 Verify shadcn components are installed: `sidebar`, `command`, `dropdown-menu`, `avatar`, `tooltip`, `progress`, `dialog`, `separator`, `scroll-area`. Run `bunx shadcn@latest add <component>` for any missing ones. Verify files exist in `src/components/ui/`.
- [x] T002 [P] Create shared navigation types file at `src/types/navigation.ts` defining `NavItem`, `UsageData`, `UserData`, `TeamData` interfaces per plan.md component interfaces section.

**Checkpoint**: All shadcn dependencies installed, shared types defined.

---

## Phase 2: Foundational (Dashboard Route Group)

**Purpose**: Create the `(dashboard)` route group structure that all authenticated pages live under

- [x] T003 Create the `(dashboard)` route group directory at `src/app/(dashboard)/`. This is a Next.js route group (parentheses) so it does not affect URL paths.
- [x] T004 Create a minimal placeholder layout at `src/app/(dashboard)/layout.tsx` that renders `{children}` wrapped in a flex container. This will be expanded in Phase 4 (US2). For now, it should be a valid Server Component that exports default.
- [x] T005 Create a placeholder dashboard page at `src/app/(dashboard)/dashboard/page.tsx` that renders a heading "Dashboard" so the layout can be visually tested. This page will be fully built in feature 003.
- [x] T006 [P] Create placeholder pages for other sidebar routes so navigation can be tested end-to-end:
  - `src/app/(dashboard)/workspace/page.tsx` -- heading "Workspace"
  - `src/app/(dashboard)/runs/page.tsx` -- heading "Runs"

**Checkpoint**: Navigating to `/dashboard`, `/workspace`, `/runs` renders placeholder pages within the `(dashboard)` layout.

---

## Phase 3: US1 - App Sidebar (Priority: P1)

**Goal**: Fully functional icon-based sidebar with logo, navigation, usage meters, and avatar dropdown.

**Independent Test**: Render sidebar on `/dashboard`, verify all 6 nav icons are visible, click each to navigate, verify active state highlights correct icon, check usage meters display values, open avatar dropdown and see Settings/Log out.

### Implementation for User Story 1

- [x] T007 [US1] Create `src/components/app-sidebar.tsx` as a `"use client"` component. Define the component skeleton with the `AppSidebarProps` interface accepting `user`, `team`, `usage` props. Import `usePathname` from `next/navigation` for active route detection.

- [x] T008 [US1] Implement the logo section at the top of the sidebar. Render a blue rounded square (e.g., `bg-blue-600 rounded-lg w-10 h-10 flex items-center justify-center`) containing a white "R" letter. Below it, render a "Create new" button as a `+` icon using the shadcn `Button` component with `variant="ghost"` and `size="icon"`.

- [x] T009 [US1] Implement the navigation items section. Define the nav items array per the route map in plan.md (Home, Search, Workspace, Runs, Apps, Support) with their Lucide icons and routes. Render each as a clickable icon wrapped in a shadcn `Tooltip` showing the label on hover. Use `Link` from `next/link` for standard routes.

- [x] T010 [US1] Implement active route styling. Compare each nav item's `href` against `usePathname()` result. Apply `bg-primary text-primary-foreground` (blue background, white icon) to the active item. Apply `text-muted-foreground hover:bg-accent hover:text-accent-foreground` to inactive items.

- [x] T011 [US1] Implement special nav item behaviors. The "Search" item should call a callback or dispatch an event to open the command menu (not navigate). The "Apps" item should open the settings dialog (placeholder for now -- can just log or no-op). The "Support" item should open an external link or no-op.

- [x] T012 [US1] Implement the usage meters section at the bottom of the sidebar. Render two thin progress bars using the shadcn `Progress` component (or a custom thin bar with `div` + percentage width). Label them "Steps" and "AI Credits". Calculate fill percentage from `usage.stepsUsed / usage.stepsLimit * 100` and `usage.aiCreditsUsed / usage.aiCreditsLimit * 100`. Handle null usage (show 0%). Handle 100%+ usage (cap at 100%, optionally apply `bg-destructive` color).

- [x] T013 [US1] Implement the user avatar dropdown at the very bottom of the sidebar. Use shadcn `Avatar` (with `AvatarImage` for `user.avatarUrl` and `AvatarFallback` with initials from `user.fullName` or first letter of `user.email`). Wrap in shadcn `DropdownMenu` with `DropdownMenuTrigger`. Add `DropdownMenuItem` entries for: user display (name + email, non-clickable label), `Separator`, "Settings", "Log out".

- [x] T014 [US1] Implement the "Log out" action in the avatar dropdown. Create a client-side function that calls `supabase.auth.signOut()` using the browser Supabase client from `@/lib/supabase/client`, then redirects to `/login` using `router.push()`.

- [x] T015 [US1] Style the overall sidebar container. The sidebar should be a fixed-position `div` with `w-16 h-screen bg-background border-r border-border flex flex-col items-center py-4 gap-2 justify-between` (or equivalent). Ensure it uses `position: fixed` or is part of a flex layout so it does not scroll with page content.

**Checkpoint**: Sidebar renders with all elements. Navigation works. Active state highlights correctly. Usage meters display. Avatar dropdown opens with menu items. Log out signs out and redirects.

---

## Phase 4: US2 - Dashboard Layout (Priority: P2)

**Goal**: Server Component layout that authenticates users, fetches data, and integrates the sidebar with the content area.

**Independent Test**: Visit `/dashboard` while authenticated (see sidebar + content). Visit `/dashboard` while unauthenticated (redirect to `/login`). Verify usage data appears in sidebar meters.

### Implementation for User Story 2

- [x] T016 [US2] Expand `src/app/(dashboard)/layout.tsx` to a full Server Component. Import `createServerClient` (or equivalent) from `@/lib/supabase/server`. Call `supabase.auth.getUser()` to check authentication. If no user, call `redirect("/login")` from `next/navigation`.

- [x] T017 [US2] Add Supabase data fetching to the layout. After confirming auth, fetch:
  1. User profile: `supabase.from("profiles").select("id, email, full_name, avatar_url").eq("id", user.id).single()`
  2. User's team: `supabase.from("team_members").select("teams(id, name, slug, avatar_url)").eq("user_id", user.id).limit(1).single()`
  3. Usage data: `supabase.from("usage").select("steps_used, steps_limit, ai_credits_used, ai_credits_limit").eq("team_id", teamId).lte("period_start", now).gte("period_end", now).single()`
     Handle null/error results gracefully (default to null values).

- [x] T018 [US2] Integrate AppSidebar into the layout. Import `AppSidebar` and render it alongside `{children}` in a horizontal flex container. Pass the fetched `user`, `team`, and `usage` data as props. Structure: `<div className="flex h-screen"><AppSidebar ... /><main className="flex-1 overflow-auto ml-16">{children}</main></div>`. The `ml-16` accounts for the fixed sidebar width.

- [x] T019 [US2] Handle edge cases in the layout:
  - No profile found: Create a minimal fallback user object with email from auth.
  - No team found: Pass `team={null}` to sidebar; sidebar should handle gracefully.
  - No usage found: Pass `usage={null}` to sidebar; meters show 0%.
  - Supabase query errors: Log errors server-side, continue with null data rather than crashing.

**Checkpoint**: Authenticated users see sidebar + content. Unauthenticated users redirect to `/login`. Usage data flows from server to sidebar.

---

## Phase 5: US3 - Command Menu (Priority: P3)

**Goal**: Ctrl+K command menu using shadcn Command (cmdk) that searches across workflows, agents, and runs.

**Independent Test**: Press Ctrl+K on any dashboard page, type a search query, see grouped results, select one to navigate, press Escape to close. Click the static search trigger bar to open.

### Implementation for User Story 3

- [x] T020 [US3] Create `src/components/command-menu.tsx` as a `"use client"` component. Accept `teamId: string | null` as a prop. Use `useState` for `open` (dialog visibility). Render the shadcn `CommandDialog` (which wraps `Command` in a `Dialog`). Register a global `keydown` listener in a `useEffect` for `Ctrl+K` / `Cmd+K` that toggles `open`.

- [x] T021 [US3] Implement the search input and empty state. Use `CommandInput` with placeholder "Search workflows, agents, runs...". Use `CommandEmpty` to display "No results found." when no items match. Use `CommandList` to wrap all result groups.

- [x] T022 [US3] Implement search data fetching. Use `useState` for the query string (captured from `CommandInput` via `onValueChange`). Use `useEffect` with a 300ms debounce to query Supabase when the query changes and is non-empty. Use the browser Supabase client from `@/lib/supabase/client`. Run three parallel queries (workflows, agents, runs) scoped to `teamId`.

- [x] T023 [US3] Implement result groups. Render three `CommandGroup` sections:
  - "Workflows": `CommandItem` per workflow showing emoji + name. `onSelect` navigates to `/workflows/{id}/edit`.
  - "Agents": `CommandItem` per agent showing avatar/icon + name. `onSelect` navigates to `/agents/{id}`.
  - "Runs": `CommandItem` per run showing status badge + workflow name + run ID. `onSelect` navigates to `/runs/{id}` (or relevant route).
    Only render groups that have results. Use `useRouter()` from `next/navigation` for navigation, and close the dialog on select.

- [x] T024 [US3] Create `src/components/search-trigger.tsx` as a `"use client"` component. Render a styled div that looks like a search input but is non-editable, displaying "Type Ctrl K to search" with a search icon. On click, it opens the command menu. This component communicates with CommandMenu via a shared state mechanism (e.g., a callback prop, or by lifting state to the layout).

- [x] T025 [US3] Integrate the command menu into the dashboard layout. Import `CommandMenu` and `SearchTrigger` into the layout (or into a client wrapper component if needed to manage shared open state). Render `CommandMenu` at the layout level so it is accessible from any page. Pass `teamId` to `CommandMenu`.

**Checkpoint**: Ctrl+K opens command menu. Typing shows filtered results grouped by type. Selecting a result navigates to the correct page. Clicking the search trigger bar also opens the menu. Escape closes it.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Refinements that span multiple user stories

- [x] T026 [P] Verify keyboard accessibility: Tab through all sidebar nav items, verify focus ring is visible, verify `aria-current="page"` on active item. Test dropdown menu keyboard operation (Enter to open, arrow keys to navigate, Enter to select, Escape to close).
- [x] T027 [P] Verify responsive behavior: At viewport < 768px, sidebar should collapse or adapt. Add `hidden md:flex` to sidebar and a mobile menu trigger if needed. Test that content is accessible on mobile.
- [x] T028 [P] Run `bun run build` and fix any TypeScript errors, missing imports, or build failures.
- [x] T029 [P] Run `bun run lint` and fix any ESLint warnings or errors.
- [x] T030 Review all components for constitution compliance: no `any` types, no hex/rgb colors, all using `cn()` for dynamic classes, Server Components where possible, `"use client"` only where required.

---

## Phase 7: Testing

**Purpose**: Unit tests for components and hooks, e2e tests for navigation flows.

**Prerequisites**: 001-foundation Phase 6 (Vitest, Playwright, Prettier, Husky) must be complete.

### Unit Tests (Vitest + Testing Library)

- [x] T031 [P] Write unit test for AppSidebar at `src/components/__tests__/app-sidebar.test.tsx`: render with mock props, verify all 6 nav icons render, verify active route gets highlighted class, verify usage meters render correct percentages, verify avatar dropdown opens on click.
- [x] T032 [P] Write unit test for CommandMenu at `src/components/__tests__/command-menu.test.tsx`: render with mock teamId, verify Ctrl+K opens dialog, verify search input filters results, verify selecting a result calls router.push, verify Escape closes dialog.
- [x] T033 [P] Write unit test for SearchTrigger at `src/components/__tests__/search-trigger.test.tsx`: render component, verify click triggers command menu open behavior.

### End-to-End Tests (Playwright)

- [x] T034 Write e2e test at `e2e/navigation.test.ts`:
  - Navigate to `/dashboard` (with auth session), verify sidebar renders
  - Click each navigation icon, verify URL changes to correct route
  - Verify active state highlights the current route's icon
- [x] T035 Write e2e test at `e2e/command-menu.test.ts`:
  - On `/dashboard`, press Ctrl+K, verify command menu dialog opens
  - Type a search query, verify results appear
  - Press Escape, verify dialog closes
- [x] T036 Run `bun run test` and `bun run test:e2e` -- fix any failures.

**Checkpoint**: All unit tests pass (`bun run test`). All e2e tests pass (`bun run test:e2e`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies within this feature. Depends on 001-foundation being complete.
- **Phase 2 (Foundational)**: Depends on Phase 1 completion.
- **Phase 3 (US1 - Sidebar)**: Depends on Phase 1 (types) and Phase 2 (route group exists). Can start after T002 and T003.
- **Phase 4 (US2 - Layout)**: Depends on Phase 3 (sidebar component exists to integrate). Specifically depends on T015 (sidebar complete).
- **Phase 5 (US3 - Command Menu)**: Depends on Phase 4 (layout exists to host the menu). Can start T020-T024 in parallel with Phase 4, but T025 (integration) depends on Phase 4.
- **Phase 6 (Polish)**: Depends on all prior phases.
- **Phase 7 (Testing)**: Depends on all previous phases being complete. Also depends on 001-foundation Phase 6 (tooling setup).

### Within Each Phase

- Tasks marked [P] can run in parallel.
- Within US1 (Phase 3): T007 must complete first (skeleton). Then T008-T015 can largely be done sequentially as they build on the same file, though T012-T014 (bottom section) are independent from T008-T011 (top/middle section).
- Within US3 (Phase 5): T020-T024 can be done in parallel (separate files). T025 (integration) depends on all prior US3 tasks.

### Parallel Opportunities

- T002 (types) and T001 (shadcn install) can run in parallel.
- T005 and T006 (placeholder pages) can run in parallel.
- T026, T027, T028, T029, T030 (polish) can all run in parallel.

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational route group
3. Complete Phase 3: US1 -- App Sidebar
4. **STOP and VALIDATE**: Sidebar renders, nav works, usage meters display, avatar dropdown functions
5. Sidebar is independently valuable as the core navigation element

### Incremental Delivery

1. Phase 1 + 2 -> Route group ready
2. Phase 3 (US1) -> Sidebar complete -> Validate navigation
3. Phase 4 (US2) -> Layout with auth -> Validate auth gating + data flow
4. Phase 5 (US3) -> Command menu -> Validate search experience
5. Phase 6 -> Polish -> Validate build/lint/a11y
6. Phase 7 -> Testing -> Validate all tests pass

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- The sidebar file (`app-sidebar.tsx`) is built incrementally across T007-T015; these are logical steps within a single file, not parallelizable
- Supabase queries in the layout assume 001-foundation tables and RLS policies exist
- Command menu search uses client-side Supabase queries with the browser client for real-time filtering
- The `(dashboard)` route group is a Next.js convention that groups routes under a shared layout without adding a URL segment
- Run `bun run test` and `bun run test:e2e` after Phase 7 to validate all tests pass
