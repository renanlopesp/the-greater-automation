# Feature Specification: Agent Modules System

**Feature Branch**: `036-agent-modules-system`
**Created**: 2026-03-17
**Status**: Draft
**Input**: Redesign agent architecture — modules as executable capabilities with connection-aware activation, workflow-based automations, and new installed agent layout matching reference prototype.

## Context

The current system has two problems:

1. **Skills are just text.** Today, agent "skills" are knowledge/procedure strings injected into the AI prompt. They have no execution capability — they can't trigger automations, check stock, send messages, or run workflows. A skill called "Abandoned Cart Recovery" just tells the AI about cart recovery; it doesn't actually recover carts.

2. **Agents are generic shells.** An agent is a name + description + prompt. There's no concept of specialized capabilities that come pre-configured when you install an agent. The user has to manually build everything.

The new system replaces this with **Modules** — executable capabilities that are the core of what an agent does. When a user installs the "Carrinho & Conversao" agent, it comes with 4 modules pre-activated (Abandoned Cart, Conversion Optimizer, Urgency Manager, Upsell Engine), each with real automations (workflows), real triggers, and real outputs. Modules that require a missing connection are visible but disabled until the connection is established.

This spec also covers the **Installed Agent Page** redesign to match the reference prototype layout (2-panel chat + activity, artifact panel, connection tour, inline wizard).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Install Agent with Pre-configured Modules (Priority: P1)

A store owner discovers the "Carrinho & Conversao" agent in the Co-Workers catalog. They click to install it. The install wizard shows what the agent does and which connections are needed. After confirming, the agent is created in their workspace with 4 modules pre-activated. Each module has real workflows already configured — abandoned cart recovery runs every 15 minutes, urgency alerts trigger on low stock, etc. The user didn't have to configure anything.

**Why this priority**: This is the core value proposition. Without working modules on install, the agent is an empty shell like before.

**Independent Test**: Install the Carrinho & Conversao agent on a store with Nuvemshop connected. Verify that abandoned cart detection runs automatically within 15 minutes. Verify activity log shows real actions.

**Acceptance Scenarios**:

1. **Given** a user on the Co-Workers catalog page, **When** they click "Ativar" on Carrinho & Conversao, **Then** the agent is created with 4 modules (Abandoned Cart, Conversion Optimizer, Urgency Manager, Upsell Engine) and their associated workflows.
2. **Given** the store has Nuvemshop connected, **When** the agent is installed, **Then** all 4 modules are active and their workflows start executing on schedule.
3. **Given** the store does NOT have Nuvemshop connected, **When** the agent is installed, **Then** modules that require Nuvemshop are visible but marked as "requires connection" and their workflows are paused.
4. **Given** a module requires WhatsApp (e.g., for multi-channel recovery), **When** WhatsApp is not connected, **Then** that module's WhatsApp-specific features are disabled but the module still works via available channels (e.g., Telegram).

---

### User Story 2 - Installed Agent Page with Activity Feed (Priority: P1)

After installing an agent, the user lands on the Installed Agent Page. They see a 2-panel layout: chat on the left, activity workspace on the right. The activity tab shows today's summary (e.g., "23 carrinhos monitorados, 8 recuperados"), KPI highlights, and a chronological log of actions the agent took. Each action log item is clickable and opens a detail artifact in the right panel showing findings, reasoning, impact, and message templates used.

**Why this priority**: Without the activity page, the user can't see what the agent is doing. Visibility is trust.

**Independent Test**: Install an agent, wait for the cron to run, refresh the page. Verify real activity data appears — not mock data.

**Acceptance Scenarios**:

1. **Given** an installed agent with active modules, **When** the user visits the agent page, **Then** they see today's summary message, KPI highlights, and action log.
2. **Given** the agent ran workflows today, **When** viewing the activity tab, **Then** each workflow run appears as an action log entry with status (done, in_progress, scheduled, pending).
3. **Given** the user clicks an action log entry, **When** the artifact panel opens, **Then** it shows findings, reasoning, impact metrics, sources, and message templates (if applicable).
4. **Given** no workflows have run yet, **When** the user visits the activity tab, **Then** they see a "waiting for first run" state with the schedule info.

---

### User Story 3 - Module Management and Connection Awareness (Priority: P2)

The user navigates to the agent's settings/configure tab. They see all 4 modules listed with their status (active, requires connection, disabled). Each module shows which connections it needs and which are satisfied. The user can toggle a module on/off. When they connect a missing integration (e.g., WhatsApp), modules that depended on it automatically become active.

**Why this priority**: Users need control over what's running and visibility into why something isn't running.

**Independent Test**: Install agent without WhatsApp connected. Verify Abandoned Cart shows "WhatsApp channel unavailable" but still works via Telegram. Connect WhatsApp. Verify module updates to show WhatsApp as active channel.

**Acceptance Scenarios**:

1. **Given** an installed agent, **When** the user opens the configure tab, **Then** they see all modules with status, required connections, and toggle controls.
2. **Given** a module requires a connection that isn't established, **When** viewing the module, **Then** it shows which connection is missing and a link to connect it.
3. **Given** a user disables a module, **When** the toggle is turned off, **Then** the module's workflows are paused and no longer execute.
4. **Given** a previously missing connection is established, **When** the user returns to the agent, **Then** dependent modules automatically activate.

---

### User Story 4 - Connection Tour on First Install (Priority: P2)

When the user installs an agent for the first time, they go through a Connection Tour that verifies all required integrations are connected. The tour shows each required tool (e.g., Nuvemshop, WhatsApp), verifies its status, and lets the user connect missing ones. Once all critical connections are verified, the agent starts.

**Why this priority**: Ensures the agent has what it needs to function before the user expects results.

**Independent Test**: Install agent with no connections. Verify the connection tour appears. Connect Nuvemshop during the tour. Verify the agent starts after tour completion.

**Acceptance Scenarios**:

1. **Given** a user installs an agent, **When** there are unverified connections, **Then** the connection tour modal appears showing each required tool with status.
2. **Given** a connection is missing during the tour, **When** the user clicks "Connect", **Then** they are taken to the OAuth/connection flow for that integration.
3. **Given** all critical connections are verified, **When** the user clicks "Continue", **Then** the agent activates and they land on the installed agent page.
4. **Given** a user skips non-critical connections, **When** they proceed, **Then** the agent installs with available modules active and unavailable ones marked.

---

### User Story 5 - Chat with Module-Aware Agent (Priority: P2)

The user chats with the installed agent. The agent knows about its active modules and can answer questions like "quantos carrinhos foram recuperados hoje?" by querying real data from module outputs. The agent can also trigger module actions on demand (e.g., "roda a analise de conversao agora").

**Why this priority**: Chat is the primary interaction mode. An agent that can't talk about its own modules is useless.

**Independent Test**: Chat with the agent asking "qual o status dos carrinhos abandonados hoje?". Verify it responds with real data from the abandoned cart module runs, not a generic answer.

**Acceptance Scenarios**:

1. **Given** an agent with active modules, **When** the user asks about module data, **Then** the agent responds with real data from recent workflow runs.
2. **Given** an agent with Abandoned Cart module active, **When** the user asks "quantos carrinhos foram recuperados?", **Then** the agent queries the cart recovery data and returns actual numbers.
3. **Given** an agent with modules, **When** the user asks to run an analysis on demand, **Then** the agent triggers the relevant module's workflow and reports the result.

---

### User Story 6 - Results and Connections Tabs (Priority: P3)

The agent page has a Results tab showing aggregated KPIs from all module runs (receita recuperada, taxa de recuperacao, carrinhos monitorados, etc.) with trend indicators. The Connections tab shows all integrations the agent uses with their status and last sync time.

**Why this priority**: Analytics and connection management are important but secondary to the core module execution and activity visibility.

**Independent Test**: After 7 days of agent activity, open the Results tab. Verify KPIs show real aggregated data with week-over-week trends.

**Acceptance Scenarios**:

1. **Given** an agent with workflow run history, **When** the user opens the Results tab, **Then** they see aggregated KPIs from all module runs with trend indicators.
2. **Given** an agent, **When** the user opens the Connections tab, **Then** they see all integrations with status (connected, warning, disconnected) and last sync time.

---

### Edge Cases

- What happens when a connection is revoked mid-operation? Module pauses gracefully and marks affected workflows as "connection lost".
- What happens when the Nuvemshop API is down during a cron run? Workflows retry with backoff. Activity log shows "retry" status.
- What happens if a user installs the same agent type twice? System prevents duplicate installation — one agent per type per workspace.
- What happens when a module's workflow fails repeatedly? After 3 consecutive failures, module shows "needs attention" status with error details.
- What happens if no cart abandonments occur? Activity log shows "monitorando — nenhum carrinho abandonado detectado" instead of empty state.

## Requirements _(mandatory)_

### Functional Requirements

**Module System:**

- **FR-001**: System MUST support a Module entity — an executable capability with associated workflows, required connections, and status.
- **FR-002**: Each module MUST have a status: `active`, `paused`, `requires_connection`, `error`.
- **FR-003**: Modules MUST be pre-configured when an agent is installed — no manual setup required by the user.
- **FR-004**: Modules MUST declare which connections they require (e.g., Nuvemshop, WhatsApp, Google Analytics).
- **FR-005**: When a required connection is missing, the module MUST be visible but marked as `requires_connection` and its workflows MUST NOT execute.
- **FR-006**: When a previously missing connection is established, dependent modules MUST automatically transition to `active` status.
- **FR-007**: Users MUST be able to toggle individual modules on/off from the configure tab.

**Agent Installation:**

- **FR-008**: Installing an agent MUST create all its modules and associated workflows in a single operation.
- **FR-009**: The installation flow MUST include a Connection Tour that verifies required integrations.
- **FR-010**: The system MUST prevent duplicate agent installations (one agent per type per workspace).
- **FR-011**: The install wizard MUST transition from the catalog modal to the connection tour to the installed agent page.

**Workflows & Automation:**

- **FR-012**: Each module MUST have one or more associated workflows that execute its logic (using the existing workflow engine: triggers, steps, conditions).
- **FR-013**: Workflow runs MUST be logged and visible in the agent's activity feed.
- **FR-014**: Workflows MUST support status tracking per run: `running`, `completed`, `failed`, `retrying`.
- **FR-015**: Failed workflows MUST retry with backoff (max 3 retries) before marking as `error`.

**Activity Feed:**

- **FR-016**: The activity feed MUST show a daily summary message (generated from module outputs).
- **FR-017**: The activity feed MUST show KPI highlights derived from real workflow run data.
- **FR-018**: Each action log entry MUST be clickable and open an artifact with detail (findings, reasoning, impact, sources).
- **FR-019**: Action log entries MUST show status indicators: done (gray dot), in_progress (animated dot), scheduled (light dot), pending (medium dot).

**Installed Agent Page:**

- **FR-020**: The installed agent page MUST have a 2-panel layout: chat (left) + workspace (right).
- **FR-021**: The workspace MUST have tabs: Activity (today), Results, Configure, Connections.
- **FR-022**: The Activity tab MUST display the daily summary, KPIs, and chronological action log.
- **FR-023**: Clicking an action log item MUST open a resizable artifact detail panel.
- **FR-024**: The Results tab MUST show aggregated KPIs with trend indicators from workflow run history.
- **FR-025**: The Configure tab MUST show all modules with status, toggle, and connection requirements.
- **FR-026**: The Connections tab MUST show all integrations with status and last sync time.

**Skill System Redesign:**

- **FR-027**: The existing text-based skill system (knowledge/procedure) MUST be replaced by the module system for agent capabilities.
- **FR-028**: Existing text skills that serve as agent context (system prompt, knowledge base) MUST remain as "Agent Context" — separate from modules.
- **FR-029**: The database schema for skills MUST be cleaned up — old skill tables repurposed or removed.

**Chat Integration:**

- **FR-030**: The agent MUST have access to its module outputs (workflow run data) when answering questions in chat.
- **FR-031**: The agent MUST be able to trigger module workflows on demand via chat.

### Key Entities

- **Agent**: A specialized AI co-worker with a name, category, description, avatar, and a set of modules. One agent per type per workspace.
- **Module**: An executable capability belonging to an agent. Has a name, description, status, required connections, and associated workflows. Example: "Abandoned Cart Recovery" module with a cron workflow that checks for abandoned carts every 15 minutes.
- **Module Workflow**: A workflow (using the existing workflow engine) that belongs to a module. Has triggers (cron, webhook, event), steps (AI, actions, conditions), and produces run logs.
- **Workflow Run**: A single execution of a module's workflow. Contains status, timestamps, outputs (findings, KPIs, actions taken), and error info.
- **Connection**: An integration link to an external service (Nuvemshop, WhatsApp, Google Analytics, etc.). Used by modules to determine activation eligibility.
- **Artifact**: A rich detail view of a workflow run or action — contains findings, reasoning, impact metrics, sources, message templates, cart items.
- **Agent Context**: Text-based knowledge injected into the agent's prompt (replaces the old "skills" concept). Not executable — purely informational.

## Installed Agent Page Layout _(mandatory)_

This section describes every visual element and interaction of the installed agent page, derived from the reference prototype at `localhost:8081/installed/abandoned-cart`.

### Overall Structure

```
┌──────────────────────────────────────────────────────────────┐
│ TOPBAR: [Avatar] Agent Name            [History] [Files] [Integrations] [Settings] │
├─────────────────────────────┬────────────────────────────────┤
│                             │                                │
│  LEFT PANEL (Chat)          │  RIGHT PANEL (Artifact)        │
│                             │  (appears when log item        │
│  ┌─ Hero: Avatar + Name ─┐ │   is clicked; resizable;       │
│  │                        │ │   closeable)                   │
│  ├─ Activity Snapshot ────┤ │                                │
│  │  Summary message       │ │  Title + timestamp             │
│  │  KPI rows (3)          │ │  Content (varies by type)      │
│  │  "o que fiz hoje"      │ │  Insight/reasoning text        │
│  │  Action log (4 items)  │ │                                │
│  ├────────────────────────┤ │  [Expand] [Minimize] buttons   │
│  │                        │ │                                │
│  │  (Chat messages area)  │ │                                │
│  │                        │ │                                │
│  ├─ Input ────────────────┤ │                                │
│  │  Textarea + suggestions│ │                                │
│  └────────────────────────┘ │                                │
│                             │                                │
└─────────────────────────────┴────────────────────────────────┘
```

### Topbar

- **Left**: Agent avatar (28px) + agent name (text-sm font-medium)
- **Right**: 4 icon buttons in row:
  - **Historico** (clock icon) — opens conversation history
  - **Arquivos** (copy/files icon) — opens generated files/reports
  - **Integracoes** (plug icon) — opens connections panel
  - **Configuracoes** (sliders icon) — opens agent settings/module management

### Sidebar — Installed Agents List

- Below the main nav (Home, New Chat, Co-workers, Apps, History), a section shows all installed agents
- Each entry: avatar (28px) + agent name, clickable to navigate to that agent's page
- Active agent is highlighted
- Green dot on avatar indicates agent is running/active

### Left Panel — Chat + Activity

**Hero Section** (top of left panel, centered):

- Agent avatar (80px) with subtle pulse ring
- Agent name below (text-sm font-medium)
- Only visible when no messages OR as first item in scroll

**Activity Snapshot** (below hero, inside bordered container):

- **Summary message**: Narrative text with bold highlights. Example: "Trabalhei nos carrinhos enquanto voce dormia. Encontrei **47 abandonados** nas ultimas 8h e entrei em contato com todos nos primeiros 15 minutos. **3 ja compraram de volta** — os outros 44 ainda estao na janela de 48h."
- **KPI rows**: 3 rows, each with label (left) + value (right, bold). Separated by border-t. Example:
  - carrinhos hoje → 47
  - ja recuperados → 3
  - receita de volta → R$890

**"o que fiz hoje" section** (below KPIs, separate bordered container):

- Title: "o que fiz hoje" (text-xs text-muted-foreground)
- Action log list: Each item is a row with:
  - Status dot (left): color by status (done=gray, in_progress=red/animated, scheduled=light, pending=dashed)
  - Label text (text-xs)
  - Right side: timestamp + optional badge (e.g., "agora" in green) + chevron icon
  - Clickable — opens artifact in right panel
- Items are in chronological order
- Example items for Abandoned Cart:
  1. "Detectei os 47 carrinhos em tempo real" — 06:10 (done)
  2. "Entrei em contato pelo canal certo" — 06:25 (done)
  3. "3 clientes responderam e compraram" — Agora [agora] (in_progress)
  4. "Segundo toque para os 44 sem resposta" — Amanha, 10:00 (scheduled)

**Chat Input** (fixed at bottom):

- Textarea with placeholder "Message [Agent Name]..."
- Below textarea: 3 suggestion pills (scrollable horizontal). Examples:
  - "Mostrar carrinhos de maior valor"
  - "Qual a taxa de recuperacao?"
  - "Ajustar oferta de desconto"
- Send button (arrow-up icon, disabled when empty)

### Right Panel — Artifact Detail

Appears when user clicks any action log item. Slides in from right side.

**Panel Controls** (top-right):

- Expand/maximize button (arrows icon)
- Close/minimize button (panel icon)
- Drag handle on left edge for resizing (320px–900px width range)

**Panel Header**:

- Title (text-sm font-bold): describes the artifact content
- Timestamp (text-xs text-muted-foreground)

**Artifact Content Types** (varies by action log item):

**Type 1 — Cart Table** (e.g., "Detectei os 47 carrinhos"):

- Table with columns: Cliente, Produto, Valor, Abandonado, Status
- Status badges: "enviado" (orange), "convertido" (green), "aguardando" (gray)
- Rows show real cart data

**Type 2 — Channel Performance** (e.g., "Entrei em contato pelo canal certo"):

- Per-channel bars:
  - Channel name (e.g., "WhatsApp") + "N convertidos de M enviados"
  - Progress bar (green for conversions, gray for sent)
- Insight text below: Agent reasoning about channel performance (e.g., "WhatsApp teve taxa de resposta mais alta ate agora — 6.5% vs 6.25% do e-mail. Vou priorizar WhatsApp nos proximos toques.")

**Type 3 — Conversion List** (e.g., "3 clientes responderam e compraram"):

- List of converted customers, each row:
  - Customer name (bold) + product name (muted)
  - Right side: value (R$X) + channel badge + "convertido" badge (green)
- Total recovered: "R$529 recuperados" (highlighted)
- Insight text: Agent narrative about the conversion (e.g., "A Mariana foi a mais rapida — comprou 12 minutos apos receber a mensagem...")

**Type 4 — Message Approval** (e.g., "Segundo toque para os 44 sem resposta"):

- WhatsApp message preview (chat bubble style):
  - Store name header (green bar)
  - Message body with template variables: [Nome], [Produto], [Valor]
  - Timestamp + checkmarks (✓✓)
- "Enviar para **N clientes**" text
- Two action buttons:
  - Primary (dark, full-width): "Aprovar e agendar para amanha 10h"
  - Secondary (outlined, full-width): "Editar mensagem antes de enviar"

**Type 5 — Category Donut Chart** (e.g., Customer Service "Resolvi 153 tickets"):

- Donut/ring chart visualization with color segments
- Legend list below: colored dot + category name + count (right-aligned). Example:
  - Rastreio de pedido → 58
  - Prazo de entrega → 41
  - Trocas e devolucoes → 28
  - Duvidas de produto → 19
  - Problemas de pagamento → 10
- Insight text below legend: Agent analysis with trends and recommendations (e.g., "Trocas e devolucoes subiram 8% em relacao a ontem. O produto mais mencionado foi o Kit Skincare Premium — vale verificar se tem algum problema de qualidade no lote atual.")

**Type 6 — Escalation Cards** (e.g., Customer Service "Escalei 3 casos para a equipe"):

- List of case cards, each containing:
  - Header: customer name (bold) + status badge (right-aligned): "andamento" (orange), "resolvido" (green), "aguardando" (gray)
  - Body: 3 structured fields:
    - "Problema:" — description of the issue
    - "O que fiz:" — actions already taken by the agent
    - "Escalei porque:" — reason why human intervention is needed
- Cards are stacked vertically with border separation

### Interaction Behaviors

- **Panel resize**: Drag left edge of right panel to resize between 320px and 900px
- **Panel close**: Click minimize/close button to hide right panel, returning to full-width left panel
- **Panel expand**: Click maximize button to expand right panel to full viewport width
- **Action log selection**: Clicking an action log item highlights it (active state) and swaps the right panel content
- **Chat + Activity coexistence**: Activity snapshot and chat messages share the same scroll container. Activity is at the top, messages below. As user chats, messages append below the activity snapshot.
- **Suggestion pills**: Clicking a suggestion sends it as a chat message

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can install the "Carrinho & Conversao" agent and see real abandoned cart recovery data in the activity feed within 30 minutes (one cron cycle).
- **SC-002**: All 4 modules of Carrinho & Conversao are active after install when Nuvemshop is connected — zero manual configuration required.
- **SC-003**: Module status correctly reflects connection state — disconnecting Nuvemshop immediately pauses dependent modules.
- **SC-004**: Activity feed shows real workflow run data (not mock) with accurate timestamps, statuses, and KPIs.
- **SC-005**: The installed agent page loads in under 2 seconds and displays the latest activity data.
- **SC-006**: Chat with the agent returns real data from module outputs when asked about performance (e.g., "quantos carrinhos recuperados?").
- **SC-007**: Old text-based skills are fully removed from the codebase and database with no orphaned data.
- **SC-008**: Zero mock data remains in the installed agent page when feature flags for mock content are disabled.

## Assumptions

- The existing workflow engine (triggers, steps, conditions, cron) is stable and will be reused as-is for module workflows.
- The Nuvemshop integration (abandoned carts, orders, products, coupons) is the primary e-commerce connection for the Carrinho & Conversao agent.
- Telegram is the available messaging channel today. WhatsApp and Email integrations are future additions — modules degrade gracefully to available channels.
- The reference prototype at `snew-agent-mind` represents the target UX but not the target architecture — we adapt the layout to Relay's Next.js/Supabase stack.
- The "Carrinho & Conversao" agent is the first agent built with the module system. The architecture must support future agents (Retencao & Churn, Marketing & Campanhas, etc.) without redesign.
- The abandoned cart cron that already runs every 15 minutes will be migrated into a module workflow.

## Scope Boundaries

**In scope:**

- Module system architecture (entities, status, connection awareness)
- Agent installation flow with connection tour
- Installed agent page (2-panel layout, activity feed, results, configure, connections tabs)
- Skill system cleanup (remove old text skills, replace with modules + agent context)
- Carrinho & Conversao as first implemented agent with 4 modules
- Real data in activity feed from workflow runs (replacing mock data)

**Out of scope:**

- WhatsApp Business API integration (future — modules degrade to Telegram)
- Email service integration (future)
- Google Analytics integration (future — Conversion Optimizer module will have limited functionality)
- Other agent types beyond Carrinho & Conversao (architecture supports them, but implementation is separate specs)
- A/B testing framework for message variants
- Dynamic pricing engine
