# Contract: Page Components

## Home Dashboard (`/dashboard`)

**Server component**: `src/app/(dashboard)/dashboard/page.tsx` — minimal wrapper.
**Client component**: `src/components/home/home-client-new.tsx` — all interactive content.

### Sections (top to bottom)

1. **GreetingSection**: Date/time display + contextual message. Scenario switcher badge ("Atual 1/4").
2. **MetricsCards**: 5 cards in horizontal row. First card has conic-gradient animated border (CSS `@property` animation). Data: `{ label, value, subtitle, isLive }`.
3. **AskBar**: Textarea with placeholder "Pergunte algo sobre sua loja...", plus/mic buttons, 3 quick suggestion chips below.
4. **CoworkerRecommendation**: Full-width card showing inactive agent with "Ativar agente →" CTA.
5. **CoworkersInAction**: Horizontal card grid (up to 4 agents + 1 "Add co-worker" card). Each card: agent icon, name, status dot, description, recent result.
6. **OpportunitiesSection**: Vertical list of opportunity cards. Each: agent avatar + name, description text, impact badge, CTA button.

---

## Co-Workers Discovery (`/agents`)

**Client component**: `src/components/discover/discover-client.tsx`

### Layout

- **Header**: "Co-Workers" h1, subtitle with active count, search input (full-width).
- **Category Tabs**: Horizontal scrollable tabs: All (27), Active (4), Recommended (6), Customer Service (6), Marketing (5), Competitors (4), Analytics (4), Audit (4), Productivity (4). Counts in badges.
- **Card Grid**: 3-column responsive grid. Each card:
  - Category icon (small circle) + agent name + optional status dot
  - Description text (2-3 lines)
  - "Typical outcome" section with label + text

### Interactions

- Search: filters by name + description (case-insensitive).
- Tab click: filters by category. "All" shows all. "Active" shows `status === "active"`.
- Card click: Opens agent detail (navigate to `/agents/[id]` or modal — match prototype behavior).

---

## New Chat (`/chat`)

**Client component**: `src/components/chat/new-chat-client.tsx`

### Layout

- **Empty state** (vertically centered):
  - Bot icon (dark circle with grid icon)
  - "What can I help you with?" h2
  - Subtitle text
  - 4 prompt suggestion cards (2x2 grid)
- **Input bar** (bottom-pinned):
  - Textarea "Ask Snew anything..."
  - Co-worker selector chips: "All" (default), up to 3 agent names, "+N" overflow
  - Send button (arrow up icon)

### Interactions

- Suggestion click: Submits as message.
- Co-worker chip: Filters/routes conversation to specific agent.
- After first message: Empty state hidden, messages appear above input.

---

## Apps (`/apps`)

**Client component**: `src/components/apps/apps-client.tsx`

### Layout

- **Header**: "Apps" h1, subtitle with connected count.
- **Security note**: Shield icon + "Credentials are encrypted..." message.
- **Search**: Full-width search input "Search apps...".
- **Grid**: 2-column grid. Each app card:
  - Emoji icon (large) + app name
  - Status: "Connected" with checkmark (green) or "Connect" button

### Data

12 apps: Shopify, Gmail, Google Analytics, Meta Ads, Google Ads, Klaviyo, Slack, Notion, Airtable, Stripe, HubSpot, WhatsApp Business.

---

## History (`/history`)

**Client component**: `src/components/history/history-client.tsx`

### Layout

- **Header**: "History" h1, conversation count subtitle.
- **Search**: Full-width search input "Search chats...".
- **Grouped list**: Date sections (Today, Yesterday, specific dates). Each entry:
  - Chat title (left)
  - Timestamp (right)
  - Hover: context menu trigger (three dots)

### Interactions

- Search: filters by title.
- Click entry: Navigate to `/chat/[id]`.
- Context menu: Share (toggle private/public), Delete.

---

## Notifications (`/notifications`)

**Client component**: `src/components/notifications/notifications-client.tsx`

### Layout

- **Header**: "Notifications" h1, subtitle, "Mark all as read" button (right).
- **New section**: "New · N" heading + notification cards.
- **Earlier section**: "Earlier" heading + notification cards.

### Notification Card

- Colored category badge (top-left): category-specific colors.
- Unread dot (top-right) for new notifications.
- Title (bold) + description text.

### Category Badge Colors

| Category             | Color  |
| -------------------- | ------ |
| Conversion Optimizer | Orange |
| Competitor Watch     | Green  |
| Customer Service     | Blue   |
| Revenue Intelligence | Purple |

---

## Agent Workspace (`/agents/[id]`)

**Client component**: `src/components/agent-workspace/workspace-client.tsx`

### Layout (2-panel)

- **Left panel** (flex-1):
  - "Activity Log" heading
  - List of activity cards
  - Bottom: chat input "Ask the agent anything..."
- **Right sidebar** (fixed ~280px):
  - Agent info: emoji avatar, name, status badge, "last active" time
  - Description text
  - "Run Agent" button (full-width, dark)
  - "CHANNELS" section: Connect button, list of channels with status

### Activity Card

- Problem description (bold) + suggested action (muted)
- Priority badge (High=red, Medium=default, Low=muted)
- Status badge (Pending, In Progress, Done)
- Actions: "Approve Action" link + "Dismiss" link (for Pending items)

---

## Individual Chat (`/chat/[id]`)

**Client component**: `src/components/chat/chat-view-client.tsx`

### Layout

- **Header bar**: Back button + chat title (centered) + Share button.
- **Message thread**: Scrollable area
  - User messages: Right-aligned, muted background bubble
  - Agent messages: Left-aligned, agent icon + name label, plain text
- **Action chips**: Row of contextual buttons (e.g., "Draft email sequence", "Export segment")
- **Input bar**: Textarea + attachment button + mic button

---

## Installed Agent (`/agents/[id]/installed`)

**Client component**: `src/components/agent-workspace/installed-client.tsx`

### Layout

- **Header**: Back chevron, agent name + status badge + description, "Edit agent" button (right).
- **2-panel below header**:
  - **Left** (flex-1): Chat area with agent. Empty state: "Chat with {name} — give instructions..."
  - **Right** (~300px): Tabs ("Action log" | "Results")
    - Action log: Timeline of entries with dot indicator, title, timestamp, description
    - Results: Key metrics and report files

---

## Customer Service Dashboard (`/customer-service`)

**Client component**: `src/components/customer-service/cs-dashboard-client.tsx`

### Sections (top to bottom)

1. **Header**: "Customer Service Agent" h1, subtitle, Active badge, "Connect channels" button, date range selector.
2. **Metric Cards**: 4 cards (at-risk customers, refund risk, review opportunities, inactive customers).
3. **Signals Table**: "What we found" heading, segment + severity filter dropdowns, data table with columns: Customer, Segment, Signal, Severity, Suggested action, Last seen.
4. **Recommended Actions**: List of action cards with title, channel badge, goal/trigger description, message preview, Active/Activate toggle + Edit button.
5. **Campaign Builder**: Dropdowns (Segment, Channel, Objective, Tone), AI context toggle chips, "Generate message" button.
6. **Agent Log**: Timestamped list of agent actions with status badges (Done, Scheduled, Draft).
7. **Metrics Grid**: 7 KPI cards (repeat purchase rate, refund rate, avg response time, NPS, reviews collected, revenue saved, LTV uplift).
