# Feature Specification: Layout Redesign & Full Page Conversion

**Feature Branch**: `031-layout-redesign`
**Created**: 2026-03-10
**Status**: Draft
**Input**: Convert the Vite prototype (snew-agent-mind) layout and all pages into the existing relay Next.js application, replacing the current UI shell and page designs with the new prototype's design system.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - New Navigation Shell (Priority: P1)

A user opens the application and sees the new simplified sidebar with 5 navigation items (Home, New Chat, Co-workers, Apps, History), a brand logo at the top, and credits/upgrade at the bottom. The sidebar collapses to icon-only mode (56px) or expands (240px). A top bar provides quick actions (Feedback, Documents, Ask), notifications bell, workspace avatar menu, and language switching (EN/PT-BR).

**Why this priority**: The shell (sidebar + top bar) wraps every page. Without it, no other page can match the target design.

**Independent Test**: Navigate between all 5 sidebar links, toggle collapse/expand, switch language, open avatar menu — all within the shell without any page content.

**Acceptance Scenarios**:

1. **Given** the user is logged in, **When** the dashboard loads, **Then** they see the "S" logo, 5 nav icons with labels, credits count, and upgrade button in the sidebar.
2. **Given** the sidebar is expanded, **When** the user clicks the collapse toggle, **Then** the sidebar shrinks to 56px showing only icons and the preference persists across page loads.
3. **Given** any page is displayed, **When** the user views the top bar, **Then** they see Feedback, Documentos, Perguntar buttons, a notifications bell with unread count, and an avatar dropdown.
4. **Given** the avatar dropdown is open, **When** the user clicks the language option, **Then** the UI switches between English and Portuguese (PT-BR) and the choice persists.

---

### User Story 2 - Home Dashboard (Priority: P1)

A user lands on the home page and sees a dynamic, time-aware greeting (e.g., "While you end the day, your agents keep working"), impact metric cards (active agents, revenue recovered, carts saved, questions resolved, hours saved), an ask bar to query their store, a recommended co-worker card, a "co-workers in action" grid showing active agents with recent results, and an "opportunities detected" section with actionable alerts.

**Why this priority**: The home page is the primary entry point and showcases the core value proposition of the platform.

**Independent Test**: Load the home dashboard and verify all sections render with data: greeting, metrics, ask bar, recommendation, co-worker grid, opportunities.

**Acceptance Scenarios**:

1. **Given** the user loads the home page, **When** the greeting renders, **Then** it displays the current date/time and a contextual message.
2. **Given** the home page loads, **When** metric cards render, **Then** 5 cards are shown with the first ("Active agents") having an animated conic-gradient border indicating "Live" status.
3. **Given** the home page loads, **When** the "Co-workers in action" section renders, **Then** up to 4 active agent cards are shown, each with name, status indicator, and recent result summary, plus an "Add co-worker" card linking to the discover page.
4. **Given** the home page loads, **When** "Opportunities detected" renders, **Then** each opportunity card shows the originating agent, description, and a CTA button.

---

### User Story 3 - Co-Workers Discovery Page (Priority: P1)

A user visits the Co-Workers page to browse and discover available AI agents. They see a search bar, category filter tabs (All, Active, Recommended, Customer Service, Marketing, Competitors, Analytics, Audit, Productivity) with counts, and a 3-column grid of agent cards showing name, category icon, description, and typical outcome.

**Why this priority**: This is the primary way users discover and evaluate agents to install.

**Independent Test**: Load the discover page, search for an agent, filter by category, and verify card content matches the agent data.

**Acceptance Scenarios**:

1. **Given** the user navigates to Co-Workers, **When** the page loads, **Then** all 27 agents are displayed in a 3-column card grid with category filter tabs showing counts.
2. **Given** the page is loaded, **When** the user types in the search bar, **Then** agents are filtered by name and description in real time.
3. **Given** the user clicks a category tab, **When** filtering completes, **Then** only agents from that category are shown and the tab count matches.
4. **Given** the user clicks an agent card, **When** the detail view opens, **Then** the agent's full description, tools, and typical outcome are shown.

---

### User Story 4 - New Chat Page (Priority: P2)

A user starts a new conversation with the platform. They see a centered empty state with a bot icon, "What can I help you with?" heading, 4 prompt suggestions, and a bottom input bar. The input bar includes co-worker selector chips (showing active agents + "+N" overflow) and attachment/microphone buttons.

**Why this priority**: Chat is the primary interaction model for the platform, but the home page already offers an ask bar.

**Independent Test**: Load new chat page, click a prompt suggestion, verify it populates the input, submit a message.

**Acceptance Scenarios**:

1. **Given** the user navigates to New Chat, **When** the page loads, **Then** they see the empty state with 4 suggestion cards and a bottom-pinned input bar.
2. **Given** the empty state is shown, **When** the user clicks a suggestion, **Then** the message is submitted and a response appears.
3. **Given** the chat input is visible, **When** the user clicks a co-worker chip, **Then** the conversation is routed to that specific agent.

---

### User Story 5 - Apps Integration Page (Priority: P2)

A user manages their connected integrations. They see a security note about encrypted credentials, a search bar, and a 2-column grid of 12 apps (Shopify, Gmail, Google Analytics, Meta Ads, Google Ads, Klaviyo, Slack, Notion, Airtable, Stripe, HubSpot, WhatsApp Business) with emoji icons and Connect/Connected status indicators.

**Why this priority**: App connections enable agents to act on user data, but this is a configuration page visited infrequently.

**Independent Test**: Load apps page, verify 12 apps displayed, check connected status for existing integrations, click Connect on a disconnected app.

**Acceptance Scenarios**:

1. **Given** the user navigates to Apps, **When** the page loads, **Then** 12 apps are shown in a 2-column grid with their connection status.
2. **Given** an app is connected, **When** viewing its card, **Then** a green checkmark "Connected" badge is displayed.
3. **Given** the user searches for an app, **When** typing in the search bar, **Then** the grid filters to matching apps.

---

### User Story 6 - Chat History Page (Priority: P2)

A user views their past conversations grouped by date (Today, Yesterday, specific dates). Each entry shows the chat title, timestamp, and a context menu with share and delete options.

**Why this priority**: History enables users to revisit and manage past interactions but is secondary to active workflows.

**Independent Test**: Load history page, verify conversations grouped by date, search for a conversation, open share menu, delete a conversation.

**Acceptance Scenarios**:

1. **Given** the user navigates to History, **When** the page loads, **Then** conversations are listed grouped by date sections (Today, Yesterday, older dates).
2. **Given** a conversation exists, **When** the user clicks it, **Then** the full chat thread opens with the message history.
3. **Given** a conversation is listed, **When** the user opens the context menu, **Then** Share and Delete options are available.

---

### User Story 7 - Notifications Page (Priority: P2)

A user checks their notifications to see actions recommended by their co-workers. Notifications are separated into "New" and "Earlier" sections, each showing a colored category badge, title, and description. A "Mark all as read" button is available.

**Why this priority**: Notifications surface time-sensitive agent recommendations, but users can also discover these on the home page.

**Independent Test**: Load notifications page, verify New/Earlier sections, click "Mark all as read", open a notification detail.

**Acceptance Scenarios**:

1. **Given** the user navigates to Notifications, **When** the page loads, **Then** they see "New" and "Earlier" sections with notification cards.
2. **Given** notifications exist, **When** viewing a card, **Then** it shows a colored category badge (e.g., "Conversion Optimizer" in orange, "Competitor Watch" in green), title, and description.
3. **Given** unread notifications exist, **When** the user clicks "Mark all as read", **Then** all notifications move to the "Earlier" section.

---

### User Story 8 - Agent Workspace Page (Priority: P2)

A user views an individual agent's workspace with a 2-panel layout. The left panel shows an "Activity Log" with action cards displaying problem description, suggested action, priority (High/Medium/Low), status (Pending/In Progress/Done), and Approve/Dismiss buttons. The right panel shows the agent's info card, a "Run Agent" button, and connected channels. A chat input is at the bottom of the left panel.

**Why this priority**: This is the detailed view for managing a specific agent, but the home page and modals already surface key information.

**Independent Test**: Navigate to an agent workspace, verify the 2-panel layout, activity log items, agent sidebar info, and chat input.

**Acceptance Scenarios**:

1. **Given** the user navigates to an agent workspace, **When** the page loads, **Then** they see a left panel with Activity Log cards and a right sidebar with agent info.
2. **Given** an activity card has status "Pending", **When** the user clicks "Approve Action", **Then** the action is approved and status updates.
3. **Given** the agent sidebar shows channels, **When** viewing the list, **Then** connected channels (Email, WhatsApp, Telegram) are shown with their status.

---

### User Story 9 - Individual Chat View (Priority: P3)

A user opens a specific conversation from history. They see a top bar with back button, chat title, and share button. Messages are displayed as a thread with user messages in bubbles on the right and agent responses with an agent icon on the left. Action chips (e.g., "Draft email sequence", "Export segment") appear below the conversation, and a chat input with attachment and microphone buttons is at the bottom.

**Why this priority**: This is a read-heavy page for reviewing past conversations, lower priority than active workflows.

**Independent Test**: Open a chat from history, verify message rendering (user vs agent), action chips, and input bar.

**Acceptance Scenarios**:

1. **Given** the user opens a chat, **When** the page loads, **Then** messages are displayed with user bubbles right-aligned and agent messages left-aligned with an icon.
2. **Given** the chat is loaded, **When** viewing the bottom section, **Then** context-specific action chips are displayed.
3. **Given** the top bar is visible, **When** the user clicks "Back", **Then** they return to the history page.

---

### User Story 10 - Installed Agent Detail Page (Priority: P3)

A user views a detailed view of an installed/active agent. The page has a header with back button, agent name, status badge, and "Edit agent" button. Below is a 2-panel layout: left panel is a chat area with the agent, right panel has "Action log" and "Results" tabs showing recent actions with timestamps and descriptions.

**Why this priority**: This provides granular agent management but overlaps significantly with the agent workspace.

**Independent Test**: Navigate to an installed agent, verify header, chat panel, action log tab, results tab.

**Acceptance Scenarios**:

1. **Given** the user navigates to an installed agent, **When** the page loads, **Then** they see the agent header with name, status, and "Edit agent" button.
2. **Given** the right panel is visible, **When** the user switches between "Action log" and "Results" tabs, **Then** the content changes accordingly.
3. **Given** the action log tab is active, **When** viewing entries, **Then** each shows a title, timestamp, and description.

---

### User Story 11 - Customer Service Agent Dashboard (Priority: P3)

A user views a specialized, full-page dashboard for the Customer Service agent. This includes: header with agent name and status controls, 4 metric cards (at-risk customers, refund risk, review opportunities, inactive customers), a signals data table with segment/severity filters, recommended actions list with activate/edit controls, a campaign builder with segment/channel/objective/tone selectors, an agent log with status badges, and a metrics grid.

**Why this priority**: This is a specialized view for a single agent type, complex to build but limited in user reach initially.

**Independent Test**: Load the customer service dashboard, verify all 7 sections render with data, interact with filters and campaign builder.

**Acceptance Scenarios**:

1. **Given** the user navigates to the Customer Service dashboard, **When** the page loads, **Then** 4 summary metric cards are displayed at the top.
2. **Given** the signals table is visible, **When** the user filters by segment or severity, **Then** the table updates to show matching rows.
3. **Given** the recommended actions section is visible, **When** the user clicks "Activate" on an action, **Then** the action status changes to "Active".

---

### User Story 12 - Internationalization (Priority: P2)

A user switches the application language between English and Brazilian Portuguese. All UI text, labels, buttons, and page content update to reflect the selected language. The preference persists across sessions.

**Why this priority**: The platform serves Brazilian market users, making Portuguese support essential for adoption.

**Independent Test**: Switch to PT-BR, navigate across all pages, verify labels are translated, switch back to EN.

**Acceptance Scenarios**:

1. **Given** the user is on any page in English, **When** they switch language to PT-BR, **Then** all navigation labels, buttons, and headings display in Portuguese.
2. **Given** the language is set to PT-BR, **When** the user refreshes or navigates to a new page, **Then** the language preference persists.

---

### Edge Cases

- What happens when the sidebar collapse state is toggled on mobile? The sidebar should overlay as a sheet with backdrop dimming.
- What happens when no agents are active? The "Co-workers in action" section should show empty state with "Add co-worker" link.
- What happens when no notifications exist? The notifications page should show an empty state message.
- What happens when a translation key is missing? The system should fall back to English.
- What happens when the user has no chat history? The history page should show an empty state.
- What happens when the user tries to connect an already-connected app? The button should show "Connected" and clicking should offer disconnect.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST render a collapsible sidebar with 5 navigation items (Home, New Chat, Co-workers, Apps, History), brand logo, and credits/upgrade section.
- **FR-002**: System MUST render a fixed top bar (48px height) with sidebar toggle, action buttons (Feedback, Documentos, Perguntar), notifications bell with unread count, and avatar dropdown menu.
- **FR-003**: System MUST support language switching between English (en) and Portuguese (pt-BR) with 100+ translation keys covering all UI surfaces.
- **FR-004**: System MUST persist sidebar collapse state and language preference across sessions via localStorage.
- **FR-005**: Home dashboard MUST display: time-aware greeting, 5 impact metric cards (with animated border on "live" card), ask bar with quick suggestions, co-worker recommendation card, co-workers in action grid (up to 4 + add card), and opportunities detected list.
- **FR-006**: Co-Workers discovery page MUST display 27 agents in a 3-column card grid with search, category tabs with counts, and clickable cards showing name, description, and typical outcome.
- **FR-007**: New Chat page MUST display centered empty state with prompt suggestions, bottom-pinned input bar with co-worker selector chips, and attachment/microphone buttons.
- **FR-008**: Apps page MUST display 12 integration apps in a 2-column grid with emoji icons, Connect/Connected status, search functionality, and a security note banner.
- **FR-009**: History page MUST display conversations grouped by date with search, and context menus offering share and delete actions.
- **FR-010**: Notifications page MUST separate notifications into "New" and "Earlier" sections with colored category badges and "Mark all as read" functionality.
- **FR-011**: Agent Workspace MUST display a 2-panel layout: left panel with Activity Log cards (priority, status, approve/dismiss actions) and chat input; right panel with agent info, Run Agent button, and connected channels.
- **FR-012**: Individual Chat view MUST display messages as a threaded conversation with user bubbles (right-aligned) and agent responses (left-aligned with icon), action chips, and bottom input bar.
- **FR-013**: Installed Agent page MUST display a header with agent status and "Edit agent" button, a chat panel, and a right sidebar with "Action log" and "Results" tabs.
- **FR-014**: Customer Service dashboard MUST display: 4 metric cards, filterable signals table, recommended actions with activate/edit, campaign builder with selectors, agent log, and metrics grid.
- **FR-015**: System MUST preserve all existing API routes, backend logic, authentication, and middleware flows unchanged.
- **FR-016**: All pages MUST use static/mock data initially where real backend data is not yet available, following the same data shapes as the Vite prototype.
- **FR-017**: System MUST support responsive behavior — sidebar overlays as a sheet on mobile viewports.
- **FR-018**: System MUST maintain dark mode support via existing next-themes integration.

### Key Entities

- **Agent (Co-worker)**: Represents an AI specialist with id, name, category, description, detailedDescription, tools, tags, and status (active/inactive). 27 agents across 7 categories.
- **Notification**: An action recommendation from a co-worker with category, title, description, urgency level, and read/unread status.
- **Conversation (Chat)**: A message thread between user and one or more agents, with title, creation date, and messages.
- **App Integration**: An external tool connection with name, emoji icon, connection status, and security metadata.
- **Activity Log Entry**: An agent action record with problem description, suggested action, priority, status, and approval state.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All 11 target pages render and match the visual design of the Vite prototype screenshots within acceptable tolerance (layout structure, spacing, component hierarchy).
- **SC-002**: Users can navigate between all 5 sidebar links and each loads the correct page within 1 second.
- **SC-003**: Language switching between EN and PT-BR updates all visible UI text immediately without page reload.
- **SC-004**: Sidebar collapse/expand persists across page navigations and browser sessions.
- **SC-005**: All 27 agents are discoverable and filterable on the Co-Workers page, with search returning results as the user types.
- **SC-006**: The home dashboard renders all 6 sections (greeting, metrics, ask bar, recommendation, co-workers grid, opportunities) with data populated.
- **SC-007**: The application builds without errors and all existing functionality (API routes, auth, middleware) continues to work after the redesign.
- **SC-008**: Mobile viewport (< 768px) shows sidebar as an overlay sheet rather than a fixed column.

## Assumptions

- The 27 agent definitions from the Vite prototype will be used as static data initially. Integration with the existing Supabase agents table can happen in a follow-up feature.
- The i18n system will be implemented as a React Context (matching the Vite prototype pattern) rather than introducing a third-party i18n library.
- The "Perguntar" button in the top bar routes to the existing orchestrator chat, not a new endpoint.
- The Customer Service Agent dashboard is a template that could later be extended to other agent types.
- Existing pages that are being replaced (dashboard, agents, apps, history, notifications) will have their current implementations archived/removed, not maintained in parallel.
- The onboarding wizard from the Vite prototype is out of scope for this spec — it can be addressed in a separate feature if needed.
- The campaign builder on the Customer Service page is UI-only (visual mockup) without backend integration initially.
