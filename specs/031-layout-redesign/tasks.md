# Tasks: Layout Redesign & Full Page Conversion

**Input**: Design documents from `/specs/031-layout-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks grouped by user story. US1 (Navigation Shell) and US12 (i18n) are merged into the Foundational phase since they block all page work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Data & Theme)

**Purpose**: Static data files, theme variables, and CSS animations — no component work yet.

- [x] T001 [P] Create agent catalog data file with 27 agents across 7 categories in `src/data/agents.ts` — port from Vite prototype `src/data/agents.ts`, add strict TypeScript types (`Agent`, `AgentCategory`)
- [x] T002 [P] Create coworker selector data file with 25 coworkers in `src/data/coworkers.ts` — port from Vite prototype `src/data/coworkers.ts`, add strict types (`Coworker`)
- [x] T003 [P] Create apps integration data file with 12 apps in `src/data/apps.ts` — define `AppIntegration` type with id, name, emoji, connected fields
- [x] T004 [P] Create mock notifications data file in `src/data/notifications.ts` — define `Notification` type with category badges, urgency levels, read state
- [x] T005 [P] Create mock conversations data file in `src/data/conversations.ts` — define `Conversation` and `Message` types for history and chat views
- [x] T006 [P] Create mock home dashboard data file in `src/data/home-dashboard.ts` — define types and data for metrics cards, opportunities, coworkers in action, recommendations
- [x] T007 Add OKLCH theme variables to `src/app/globals.css` — convert Vite prototype HSL color variables to OKLCH, add status colors (green, amber, blue, purple), sidebar-specific variables
- [x] T008 Add conic-gradient animation to `src/app/globals.css` — port `@property` rule for `--conic-angle`, keyframes for `conic-spin`, `.live-card` class with animated border and blur glow

**Checkpoint**: All static data typed and available. Theme variables and animations ready.

---

## Phase 2: Foundational — Navigation Shell & i18n (US1 + US12)

**Purpose**: New sidebar, top bar, layout shell, and i18n context. MUST be complete before ANY page work.

**⚠️ CRITICAL**: No page implementation can begin until this phase is complete.

**Goal (US1)**: User sees new simplified sidebar with 5 nav items, top bar with actions, and working collapse/expand.
**Goal (US12)**: Language switching between EN and PT-BR works across all UI surfaces.

**Independent Test**: Navigate between sidebar links, toggle collapse, switch language, open avatar menu.

- [x] T009 [US12] Create LanguageContext provider in `src/contexts/language-context.tsx` — implement `LanguageProvider`, `useLanguage()` hook, `t()` function, EN + PT-BR translations (~100 keys), localStorage persistence (`app_language`), fallback to EN for missing keys
- [x] T010 [US1] Create new sidebar component in `src/components/app-sidebar-new.tsx` — 56px collapsed / 240px expanded, "S" logo (48px), 5 nav items (Home, New Chat, Co-workers, Apps, History) with lucide-react icons, active state detection via `usePathname()`, credits display + upgrade button in bottom section, 300ms width transition, i18n labels via `t()`
- [x] T011 [US1] Create top bar component in `src/components/top-bar.tsx` — 48px fixed height, sidebar toggle button, Feedback/Documentos/Perguntar action buttons, folder icon, notifications bell with unread count badge, avatar dropdown "JP" with menu (workspace name, settings, theme toggle via next-themes, language switcher via LanguageContext, logout)
- [x] T012 [US1] Create new dashboard shell wrapper in `src/components/dashboard-shell-new.tsx` — compose `AppSidebarNew` + `TopBar` + content area, manage collapsed state (localStorage `sidebar_collapsed`), manage mobile sidebar open/close, wrap with `LanguageProvider`, flex row layout (sidebar fixed + content flex-1)
- [x] T013 [US1] Add mobile responsive sidebar behavior to `src/components/dashboard-shell-new.tsx` — sidebar as fixed overlay with backdrop on viewport < 768px, z-40 backdrop + z-50 sidebar, close on backdrop click or navigation
- [x] T014 [US1] Update dashboard layout to use new shell in `src/app/(dashboard)/layout.tsx` — replace existing `DashboardShell` with `DashboardShellNew`, preserve server-side data fetching (user, profile, teams), preserve auth checks and redirects

**Checkpoint**: Shell fully working — sidebar navigates, collapses, language switches, mobile overlay works. All routes render inside new shell.

---

## Phase 3: User Story 2 — Home Dashboard (Priority: P1) 🎯 MVP

**Goal**: Home page shows time-aware greeting, 5 metric cards (with live animation), ask bar, co-worker recommendation, co-workers in action grid, and opportunities detected.

**Independent Test**: Load `/dashboard`, verify all 6 sections render with data, animated border on first metric card visible.

- [x] T015 [P] [US2] Create greeting section component in `src/components/home/greeting-section-new.tsx` — dynamic message based on current time (morning/afternoon/evening), date display (e.g., "terça-feira, 10 de março · 18:00"), scenario switcher badge ("Atual 1/4"), i18n support
- [x] T016 [P] [US2] Create metrics cards component in `src/components/home/metrics-cards.tsx` — 5 horizontal cards (active agents, revenue recovered, carts saved, questions resolved, hours saved), first card gets `.live-card` class with conic-gradient animation, "Live" indicator dot
- [x] T017 [P] [US2] Create ask bar component in `src/components/home/ask-bar.tsx` — textarea with placeholder "Pergunte algo sobre sua loja...", plus button, mic button, 3 quick suggestion chips below ("Clientes em risco", "Top produtos", "Previsão do mês")
- [x] T018 [P] [US2] Create co-worker recommendation component in `src/components/home/coworker-recommendation.tsx` — full-width card with agent icon, name, "Inativo" badge, description text, "Ativar agente →" CTA button
- [x] T019 [P] [US2] Create co-workers in action component in `src/components/home/coworkers-in-action.tsx` — horizontal card grid (up to 4 agents), each card: agent icon + name + status dot + description + "Resultado recente" section, plus "Adicionar co-worker" card (dashed border, plus icon, links to `/agents`)
- [x] T020 [P] [US2] Create opportunities section component in `src/components/home/opportunities-section.tsx` — vertical list of opportunity cards, each: agent avatar + name (left), description + impact badge (center), CTA button (right, e.g., "Agir →", "Ver análise →")
- [x] T021 [US2] Create home page client component in `src/components/home/home-client-new.tsx` — compose all 6 sections (GreetingSection, MetricsCards, AskBar, CoworkerRecommendation, CoworkersInAction, OpportunitiesSection), import data from `src/data/home-dashboard.ts`
- [x] T022 [US2] Update home page to use new client component in `src/app/(dashboard)/dashboard/page.tsx` — replace existing `HomeClient` with `HomeClientNew`, keep server component wrapper

**Checkpoint**: Home dashboard fully functional with all 6 sections, animated metric card, and static data.

---

## Phase 4: User Story 3 — Co-Workers Discovery (Priority: P1)

**Goal**: Co-Workers page shows search, category filter tabs with counts, and 3-column card grid of 27 agents.

**Independent Test**: Load `/agents`, search for an agent, filter by category, click a card.

- [x] T023 [P] [US3] Create category filter tabs component in `src/components/discover/category-tabs.tsx` — horizontal scrollable tabs (All, Active, Recommended, Customer Service, Marketing, Competitors, Analytics, Audit, Productivity), each with count badge, active tab highlighting
- [x] T024 [P] [US3] Create agent card component for discovery in `src/components/discover/agent-card.tsx` — category icon circle + agent name + optional status dot, description (2-3 lines), "Typical outcome" section with label + text, hover effect, click handler
- [x] T025 [US3] Create discover page client component in `src/components/discover/discover-client.tsx` — "Co-Workers" h1, subtitle with active count, full-width search input, CategoryTabs, 3-column responsive grid of AgentCards, search filters by name + description (case-insensitive), tab filters by category, import data from `src/data/agents.ts`
- [x] T026 [US3] Update agents page to use new discover component in `src/app/(dashboard)/agents/page.tsx` — replace existing agents page with `DiscoverClient`

**Checkpoint**: Discovery page shows 27 agents, search and category filtering work, cards display correctly.

---

## Phase 5: User Story 4 — New Chat Page (Priority: P2)

**Goal**: New Chat page with centered empty state, prompt suggestions, co-worker selector chips, and bottom input bar.

**Independent Test**: Load `/chat`, see empty state, click a suggestion, verify co-worker chips render.

- [x] T027 [P] [US4] Create chat empty state component in `src/components/chat/chat-empty-state.tsx` — bot icon (dark circle with grid icon), "What can I help you with?" h2, subtitle text, 2x2 grid of 4 prompt suggestion cards
- [x] T028 [P] [US4] Create co-worker selector component in `src/components/chat/coworker-selector.tsx` — horizontal chip row: "All" default chip + up to 3 agent name chips + "+N" overflow chip, click selects agent, import from `src/data/coworkers.ts`
- [x] T029 [P] [US4] Create chat input bar component in `src/components/chat/chat-input-bar.tsx` — bottom-pinned container, textarea "Ask Snew anything...", attachment button (plus icon), mic button, send button (arrow up), integrates CoworkerSelector below textarea
- [x] T030 [US4] Create new chat page client component in `src/components/chat/new-chat-client.tsx` — compose ChatEmptyState (centered) + ChatInputBar (bottom), empty state hidden after first message, i18n support
- [x] T031 [US4] Update chat page to use new client component in `src/app/(dashboard)/chat/page.tsx` — replace existing chat page with `NewChatClient`

**Checkpoint**: New Chat page renders with empty state, suggestions, and input bar with co-worker chips.

---

## Phase 6: User Story 5 — Apps Integration Page (Priority: P2)

**Goal**: Apps page with security note, search, 2-column grid of 12 apps with connect status.

**Independent Test**: Load `/apps`, verify 12 apps shown, search filters, connected apps show badge.

- [x] T032 [US5] Create apps page client component in `src/components/apps/apps-client.tsx` — "Apps" h1, subtitle with connected count, shield icon security note ("Credentials are encrypted..."), full-width search input "Search apps...", 2-column grid of 12 app cards (emoji icon + name + Connect/Connected status), search filters by name, import from `src/data/apps.ts`, i18n support
- [x] T033 [US5] Update apps page to use new client component in `src/app/(dashboard)/apps/page.tsx` — replace existing apps page with `AppsClient`

**Checkpoint**: Apps page displays 12 apps, search works, connected status shows correctly.

---

## Phase 7: User Story 6 — Chat History Page (Priority: P2)

**Goal**: History page with date-grouped conversation list, search, and context menus.

**Independent Test**: Load `/history`, verify conversations grouped by date, search works, context menu opens.

- [x] T034 [US6] Create history page client component in `src/components/history/history-client.tsx` — "History" h1, conversation count subtitle, full-width search input "Search chats...", date-grouped sections (Today, Yesterday, specific dates), each entry: title (left) + timestamp (right) + hover three-dot menu, context menu with Share (private/public toggle) and Delete options, click navigates to `/chat/[id]`, import from `src/data/conversations.ts`, i18n support
- [x] T035 [US6] Update history page to use new client component in `src/app/(dashboard)/history/page.tsx` — replace existing history page with `HistoryClient`

**Checkpoint**: History page lists conversations grouped by date, search and context menus work.

---

## Phase 8: User Story 7 — Notifications Page (Priority: P2)

**Goal**: Notifications page with New/Earlier sections, colored category badges, mark all read.

**Independent Test**: Load `/notifications`, verify sections, badge colors, mark all read button.

- [x] T036 [P] [US7] Create notification card component in `src/components/notifications/notification-card.tsx` — colored category badge (Conversion Optimizer=orange, Competitor Watch=green, Customer Service=blue, Revenue Intelligence=purple), unread dot indicator, bold title, description text, click handler for detail
- [x] T037 [US7] Create notifications page client component in `src/components/notifications/notifications-client.tsx` — "Notifications" h1, subtitle "Actions recommended by your co-workers", "Mark all as read" button (top-right), "New · N" section with notification cards, "Earlier" section, mark all read moves cards to Earlier, import from `src/data/notifications.ts`, i18n support
- [x] T038 [US7] Update notifications page to use new client component in `src/app/(dashboard)/notifications/page.tsx` — replace existing notifications page with `NotificationsClient`

**Checkpoint**: Notifications page shows New/Earlier sections, colored badges render, mark all read works.

---

## Phase 9: User Story 8 — Agent Workspace (Priority: P2)

**Goal**: Agent detail page with 2-panel layout: activity log (left) + agent sidebar (right) + chat input.

**Independent Test**: Navigate to `/agents/[id]`, verify 2-panel layout, activity cards, sidebar info, chat input.

- [x] T039 [P] [US8] Create activity card component in `src/components/agent-workspace/activity-card.tsx` — problem description (bold) + suggested action (muted), priority badge (High=red text, Medium=default, Low=muted), status badge (Pending, In Progress, Done), "Approve Action" and "Dismiss" links for Pending items
- [x] T040 [P] [US8] Create activity log panel in `src/components/agent-workspace/activity-log.tsx` — "Activity Log" h2, vertical list of ActivityCard components, bottom chat input "Ask the agent anything..." with send button
- [x] T041 [P] [US8] Create agent info sidebar in `src/components/agent-workspace/agent-info-sidebar.tsx` — agent emoji avatar, name h1, status badge (Active/Inactive) + "last active" time, description text, "Run Agent" full-width dark button, "CHANNELS" section header with "Connect" button, channel list (Email=Active, WhatsApp=Coming soon, Telegram=Coming soon)
- [x] T042 [US8] Create workspace page client component in `src/components/agent-workspace/workspace-client.tsx` — 2-panel flex layout: ActivityLog (flex-1 left) + AgentInfoSidebar (~280px right), load agent from `src/data/agents.ts` by route param, mock activity data inline, i18n support
- [x] T043 [US8] Update agent detail page to use new workspace component in `src/app/(dashboard)/agents/[id]/page.tsx` — replace existing agent detail with `WorkspaceClient`, pass agent ID from params

**Checkpoint**: Agent workspace shows 2-panel layout with activity log, sidebar, and chat input.

---

## Phase 10: User Story 9 — Individual Chat View (Priority: P3)

**Goal**: Individual chat page with back button header, message thread, action chips, and input bar.

**Independent Test**: Navigate to `/chat/[id]`, verify messages render (user right, agent left), action chips visible.

- [x] T044 [P] [US9] Create message thread component in `src/components/chat/message-thread.tsx` — scrollable area, user messages right-aligned with muted background bubble, agent messages left-aligned with agent icon + name label, markdown-like formatting support
- [x] T045 [US9] Create chat view page client component in `src/components/chat/chat-view-client.tsx` — header bar (Back button + chat title centered + Share button), MessageThread, action chips row below thread (e.g., "Draft email sequence", "Export segment", "Schedule campaign", "Set reminder"), ChatInputBar at bottom with attachment + mic, load conversation from `src/data/conversations.ts` by route param
- [x] T046 [US9] Create individual chat page route in `src/app/(dashboard)/chat/[id]/page.tsx` — server component wrapper, render `ChatViewClient` with chat ID from params

**Checkpoint**: Individual chat view renders messages, action chips, and input bar correctly.

---

## Phase 11: User Story 10 — Installed Agent Detail (Priority: P3)

**Goal**: Installed agent page with header, chat area, and action log/results tabs.

**Independent Test**: Navigate to `/agents/[id]/installed`, verify header, chat, tabs switching.

- [x] T047 [US10] Create installed agent page client component in `src/components/agent-workspace/installed-client.tsx` — header: back chevron + agent name + status badge + description + "Edit agent" button (right), 2-panel layout: left = chat area with empty state "Chat with {name} — give instructions..." + input bar, right (~300px) = tabs ("Action log" | "Results"), Action log tab: timeline with dot indicators, title, timestamp, description for each entry, Results tab: key metrics display, mock data inline, i18n support
- [x] T048 [US10] Create installed agent page route in `src/app/(dashboard)/agents/[id]/installed/page.tsx` — server component wrapper, render `InstalledClient` with agent ID from params

**Checkpoint**: Installed agent page shows header, chat area, and switchable tabs.

---

## Phase 12: User Story 11 — Customer Service Dashboard (Priority: P3)

**Goal**: Specialized full-page dashboard with metrics, signals table, actions, campaign builder, log, and KPIs.

**Independent Test**: Load `/customer-service`, verify all 7 sections render, filters work on table.

- [x] T049 [P] [US11] Create signals data table component in `src/components/customer-service/signals-table.tsx` — "What we found" heading, segment dropdown filter (All, VIP, At-risk, New, Post-delivery, Inactive), severity dropdown filter (All, High, Med, Low), data table with columns: Customer, Segment (colored badge), Signal, Severity (colored text), Suggested action, Last seen
- [x] T050 [P] [US11] Create recommended actions component in `src/components/customer-service/recommended-actions.tsx` — list of action cards, each: title + channel badge (WhatsApp/Email), goal/trigger description, message preview in italics, Active/Activate toggle button + Edit button
- [x] T051 [P] [US11] Create campaign builder component in `src/components/customer-service/campaign-builder.tsx` — 4 dropdown selectors (Segment, Channel, Objective, Tone), AI context toggle chips row (Last purchase summary, Delivery status, Ticket sentiment, Recommended product), "Generate message" button
- [x] T052 [P] [US11] Create agent log component in `src/components/customer-service/agent-log.tsx` — timestamped list of agent actions, each: datetime label + description + status badge (Done=green, Scheduled=blue, Draft=gray)
- [x] T053 [US11] Create customer service dashboard client in `src/components/customer-service/cs-dashboard-client.tsx` — compose all sections: header ("Customer Service Agent" h1, subtitle, Active badge, "Connect channels" button, date range dropdown), 4 metric cards (at-risk customers, refund risk, review opportunities, inactive customers), SignalsTable, RecommendedActions, CampaignBuilder, AgentLog, metrics grid (7 KPIs: repeat purchase rate, refund rate, avg response time, NPS, reviews collected, revenue saved, LTV uplift), mock data inline, i18n support
- [x] T054 [US11] Create customer service page route in `src/app/(dashboard)/customer-service/page.tsx` — server component wrapper, render `CSDashboardClient`

**Checkpoint**: Customer Service dashboard shows all 7 sections with working filters and interactive elements.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Visual parity, cleanup, and verification.

- [x] T055 Visual comparison pass — open each page at `localhost:3000` and compare against prototype screenshots in `screenshots/01-home.png` through `screenshots/10-installed-agent.png`, note and fix discrepancies in spacing, colors, typography, layout
- [x] T056 Update 404 Not Found page in `src/app/not-found.tsx` — simple centered message matching new design system
- [x] T057 Verify mobile responsive behavior — test all pages at viewport < 768px, confirm sidebar overlay sheet with backdrop, content area full-width
- [x] T058 Verify language switching across all pages — switch to PT-BR, navigate all routes, verify all labels/headings are translated, switch back to EN, verify English text
- [x] T059 Remove unused old components — identify and remove superseded components (old `HomeClient`, old `AgentsDiscoverClient`, old `DashboardShell` references) after verifying all routes use new components
- [x] T060 Run `bun run build` and fix any build errors — ensure zero TypeScript errors, zero missing imports, all routes compile
- [x] T061 Run `bun run lint` and fix any lint warnings — ensure zero ESLint warnings across all new/modified files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — all tasks can run in parallel
- **Phase 2 (Foundational)**: Depends on Phase 1 (T007, T008 for theme). BLOCKS all page phases.
- **Phases 3–12 (User Stories)**: All depend on Phase 2 completion. Can proceed in parallel or sequentially in priority order.
- **Phase 13 (Polish)**: Depends on all desired user story phases being complete.

### User Story Dependencies

- **US2 (Home)**: Depends on T001, T006 (agent data, home data) + Phase 2
- **US3 (Discover)**: Depends on T001 (agent data) + Phase 2
- **US4 (New Chat)**: Depends on T002 (coworker data) + Phase 2
- **US5 (Apps)**: Depends on T003 (apps data) + Phase 2
- **US6 (History)**: Depends on T005 (conversations data) + Phase 2
- **US7 (Notifications)**: Depends on T004 (notifications data) + Phase 2
- **US8 (Agent Workspace)**: Depends on T001 (agent data) + Phase 2
- **US9 (Chat View)**: Depends on T005 (conversations data) + Phase 2. Shares components with US4.
- **US10 (Installed Agent)**: Depends on T001 (agent data) + Phase 2
- **US11 (Customer Service)**: Depends on Phase 2. Self-contained mock data.

### Within Each User Story

- Data files before components that import them
- Leaf components before composite components
- Client component before page route update

### Parallel Opportunities

**Phase 1** — All 8 tasks (T001–T008) are independent and can run in parallel.

**Phase 2** — T009 (i18n), T010 (sidebar), T011 (top bar) can run in parallel. T012 (shell) depends on T010+T011. T013 depends on T012. T014 depends on T012.

**Phases 3–12** — Once Phase 2 is complete, all user story phases can run in parallel:

- US2 (Home) + US3 (Discover) + US4 (Chat) + US5 (Apps) can all start simultaneously
- Within each story, [P] tasks can run in parallel

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all data files in parallel:
Task: "Create agent catalog in src/data/agents.ts"
Task: "Create coworker data in src/data/coworkers.ts"
Task: "Create apps data in src/data/apps.ts"
Task: "Create notifications data in src/data/notifications.ts"
Task: "Create conversations data in src/data/conversations.ts"
Task: "Create home dashboard data in src/data/home-dashboard.ts"
Task: "Add OKLCH variables to globals.css"
Task: "Add conic animation to globals.css"
```

## Parallel Example: Phase 3 Home Dashboard

```bash
# Launch all home components in parallel:
Task: "Create greeting section in src/components/home/greeting-section-new.tsx"
Task: "Create metrics cards in src/components/home/metrics-cards.tsx"
Task: "Create ask bar in src/components/home/ask-bar.tsx"
Task: "Create coworker recommendation in src/components/home/coworker-recommendation.tsx"
Task: "Create coworkers in action in src/components/home/coworkers-in-action.tsx"
Task: "Create opportunities section in src/components/home/opportunities-section.tsx"

# Then compose (depends on above):
Task: "Create home client in src/components/home/home-client-new.tsx"
Task: "Update page in src/app/(dashboard)/dashboard/page.tsx"
```

---

## Implementation Strategy

### MVP First (Shell + Home + Discover)

1. Complete Phase 1: Setup (data files + theme)
2. Complete Phase 2: Foundational (sidebar + topbar + shell + i18n)
3. Complete Phase 3: Home Dashboard
4. Complete Phase 4: Co-Workers Discovery
5. **STOP and VALIDATE**: Shell works, home renders, discovery works
6. Deploy/demo as MVP

### Incremental Delivery

1. Setup + Foundational → Shell working
2. Add Home → Dashboard functional (MVP!)
3. Add Discover → Agent browsing works
4. Add Chat + Apps + History + Notifications → Core pages complete
5. Add Agent Workspace → Agent management works
6. Add Chat View + Installed Agent + Customer Service → All pages complete
7. Polish → Visual parity, build clean, responsive verified

### Parallel Team Strategy

With multiple developers after Phase 2:

- Developer A: Home Dashboard (Phase 3) + Agent Workspace (Phase 9)
- Developer B: Discover (Phase 4) + Notifications (Phase 8)
- Developer C: Chat pages (Phase 5 + 10) + History (Phase 7)
- Developer D: Apps (Phase 6) + Customer Service (Phase 12) + Installed Agent (Phase 11)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Source reference: Vite prototype at `/home/renanl/Projects/snew-agent-mind/src/`
- Screenshot reference: `screenshots/01-home.png` through `screenshots/10-installed-agent.png`
- Commit after each completed phase or logical group of tasks
- Stop at any checkpoint to validate independently
