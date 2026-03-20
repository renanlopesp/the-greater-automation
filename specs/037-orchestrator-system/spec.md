# Feature Specification: Snew Orchestrator System

**Feature Branch**: `037-orchestrator-system`
**Created**: 2026-03-19
**Status**: Draft
**Input**: The Snew orchestrator: a central AI assistant that is auto-created with every workspace, handles all user interactions (web chat + Telegram), can delegate to installed co-workers, suggest installing new ones, display structured results, manage approvals, and provide proactive insights. Reference: `/home/renanl/Projects/snew-agent-mind/`

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Orchestrator Auto-Creation on Workspace Setup (Priority: P1)

When a new user completes onboarding and their workspace is provisioned, the Snew orchestrator is automatically created as the central intelligence of the workspace. It exists from day one — the user never needs to "install" or "configure" it. The orchestrator is not a regular co-worker; it is the manager that coordinates all co-workers.

**Why this priority**: Without the orchestrator, no other feature in this spec can function. It is the foundation of the entire system.

**Independent Test**: After completing onboarding, the user sees the orchestrator chat available immediately on their dashboard. The "Novo Chat" sidebar link navigates to the orchestrator's chat interface.

**Acceptance Scenarios**:

1. **Given** a new user completes onboarding, **When** the workspace is provisioned, **Then** the Snew orchestrator is automatically created and available for chat.
2. **Given** a provisioned workspace, **When** the user navigates to the dashboard, **Then** the greeting section shows the orchestrator's input area with placeholder text and suggestion chips.
3. **Given** a provisioned workspace, **When** the user clicks "Novo Chat" in the sidebar, **Then** they are taken to the orchestrator's chat interface.
4. **Given** a workspace where the orchestrator already exists, **When** provisioning runs again (idempotent), **Then** no duplicate orchestrator is created.

---

### User Story 2 - Dashboard Input Routes to Orchestrator Chat (Priority: P1)

The dashboard's prominent text input ("o que você quer resolver hoje?") is the primary entry point to the orchestrator. When the user types a question and submits, they are navigated to the orchestrator's chat page with their message already sent and a response loading.

**Why this priority**: This is the main user-facing interaction — the first thing users see and use daily.

**Independent Test**: Type a question on the dashboard, press enter, and verify navigation to the chat page with the message sent and a response appearing.

**Acceptance Scenarios**:

1. **Given** the user is on the dashboard, **When** they type a question in the input area and submit, **Then** they are navigated to the orchestrator chat with the message already sent.
2. **Given** the user is on the dashboard, **When** they click a suggestion chip (e.g., "Quais carrinhos têm maior chance de conversão?"), **Then** they are navigated to the orchestrator chat with that question sent.
3. **Given** the user navigates to chat from the dashboard, **When** the orchestrator processes the message, **Then** a typing indicator appears while loading, followed by the response.

---

### User Story 3 - Orchestrator Chat Interface (Priority: P1)

The orchestrator has a dedicated chat page with a conversational interface. Messages appear as bubbles: user messages right-aligned, orchestrator responses left-aligned with the Snew avatar. The input area at the bottom allows continuous conversation with message history preserved. Responses support rich formatting (markdown, bold, lists).

**Why this priority**: The chat interface is the core interaction surface for the orchestrator — it must work before any advanced features.

**Independent Test**: Navigate to the orchestrator chat, send multiple messages, and verify a natural conversational flow with proper bubble layout, avatars, and message persistence.

**Acceptance Scenarios**:

1. **Given** the user is on the orchestrator chat page, **When** they send a message, **Then** it appears as a right-aligned bubble, followed by the orchestrator's left-aligned response with the Snew avatar.
2. **Given** an ongoing conversation, **When** the user sends additional messages, **Then** the full conversation history is preserved and visible.
3. **Given** the user leaves and returns to the chat, **When** they navigate back, **Then** the previous conversation is still available.
4. **Given** the orchestrator is processing a response, **When** the user is waiting, **Then** a typing indicator is shown with streaming text appearing progressively.
5. **Given** the user is on mobile, **When** they access the chat, **Then** the interface adapts responsively to the screen size.
6. **Given** an empty chat (no messages), **When** the page loads, **Then** the empty state shows the Snew avatar, a greeting, and suggestion chips.

---

### User Story 4 - Co-worker Delegation and Attribution (Priority: P2)

When the orchestrator answers a question, it can consult installed co-workers to provide specialized answers. The response shows which co-worker was consulted (attribution card: "co-worker utilizado"). If a relevant co-worker is not installed, the orchestrator suggests installing one ("co-worker sugerido" card) with avatar, name, description, and a reason why it's relevant.

**Why this priority**: This is the key differentiator of the orchestrator — it's not just a chatbot, it's a manager that coordinates specialists.

**Independent Test**: Ask a question about abandoned carts. If the Abandoned Cart co-worker is installed, verify the response shows it was consulted. If not installed, verify a suggestion card appears recommending its installation.

**Acceptance Scenarios**:

1. **Given** the user asks about abandoned carts and the co-worker is installed, **When** the orchestrator responds, **Then** a "co-worker utilizado" card appears with avatar, name, and brief description.
2. **Given** the user asks about a topic with no relevant installed co-worker, **When** the orchestrator responds, **Then** a "co-worker sugerido" card appears with avatar, name, description, and reason.
3. **Given** the user clicks the suggested co-worker card for an uninstalled agent, **When** they interact with it, **Then** the install wizard opens.
4. **Given** the user clicks the card for an installed agent, **When** they interact with it, **Then** they navigate to that co-worker's detail page.
5. **Given** the orchestrator delegates to multiple co-workers, **When** displaying the response, **Then** each attribution is shown clearly.

---

### User Story 5 - Follow-up Suggestions (Priority: P2)

After the orchestrator responds, contextual follow-up suggestions appear as clickable buttons. These help the user continue the conversation productively without having to think of the next question.

**Why this priority**: Follow-ups reduce friction and guide users to discover more value from their workspace.

**Independent Test**: Ask any question, wait for the response, and verify that 3-4 follow-up suggestion buttons appear below the response. Click one and verify it sends as a new message.

**Acceptance Scenarios**:

1. **Given** the orchestrator has responded, **When** the response is displayed, **Then** 3-4 contextual follow-up suggestion buttons appear below the last assistant message.
2. **Given** follow-up suggestions are visible, **When** the user clicks one, **Then** it is sent as a new message in the conversation.
3. **Given** the user sends a manual message, **When** new follow-ups are generated, **Then** the previous follow-ups are replaced by the new ones.

---

### User Story 6 - Telegram Integration via Orchestrator (Priority: P2)

When the user links their Telegram account, all Telegram messages are handled by the orchestrator — not by any specific co-worker. The orchestrator processes the message, consults co-workers as needed, and responds back through Telegram. The conversation history is preserved under the orchestrator.

**Why this priority**: Telegram is a key channel for users who manage their workspace on mobile. Routing through the orchestrator ensures consistent behavior.

**Independent Test**: Link Telegram, send a message via Telegram, and verify the orchestrator responds. Check that the conversation appears under the orchestrator.

**Acceptance Scenarios**:

1. **Given** the user has linked Telegram, **When** they send a message via Telegram, **Then** the orchestrator processes it and responds.
2. **Given** a Telegram conversation exists, **When** the user views their chat history, **Then** Telegram messages appear under the orchestrator.
3. **Given** the user asks a domain-specific question via Telegram, **When** the orchestrator responds, **Then** it consults the relevant co-worker and includes the result.

---

### User Story 7 - Install Co-worker from Chat (Priority: P2)

The user can install a co-worker directly from the orchestrator chat. When the orchestrator suggests a co-worker (via suggestion card), clicking it opens the install wizard. Alternatively, the user can type "instala o Abandoned Cart" and the orchestrator triggers the installation flow. After installation, the orchestrator confirms and the co-worker becomes available for delegation.

**Why this priority**: Reducing friction for co-worker adoption is critical — the user should never need to leave the chat to install a new specialist.

**Independent Test**: Ask about a topic with no installed co-worker → see suggestion card → click install → complete wizard → ask the same question again → see the co-worker was consulted.

**Acceptance Scenarios**:

1. **Given** the orchestrator suggests a co-worker, **When** the user clicks the suggestion card's install button, **Then** the install wizard modal opens.
2. **Given** the user types "instala o [co-worker name]" in chat, **When** the orchestrator processes it, **Then** it identifies the co-worker from the catalog and triggers the install flow.
3. **Given** a co-worker was just installed, **When** the user asks a related question, **Then** the orchestrator now delegates to the newly installed co-worker.
4. **Given** the install wizard completes, **When** returning to chat, **Then** the orchestrator confirms the installation with a message.

---

### User Story 8 - Structured Results and Artifacts (Priority: P2)

The orchestrator can display structured results alongside text responses — data tables (abandoned carts, sales), KPI summaries, campaign previews, and other rich content. These appear as clickable "artifact chips" in the chat that expand into a side panel with detailed views.

**Why this priority**: Raw text answers are not enough for data-heavy retail questions. Structured artifacts make the orchestrator genuinely useful for business decisions.

**Independent Test**: Ask "quantos carrinhos abandonados hoje?" → verify the response includes a data table artifact chip → click it → verify side panel opens with table data.

**Acceptance Scenarios**:

1. **Given** the user asks a data question, **When** the orchestrator responds, **Then** the response includes artifact chips (small tags showing artifact type and title).
2. **Given** the user clicks an artifact chip, **When** the panel opens, **Then** it shows the structured data (table, KPIs, or document).
3. **Given** multiple artifacts in one response, **When** the user clicks different chips, **Then** the panel updates to show the selected artifact.
4. **Given** an artifact with a data table, **When** displayed, **Then** it shows columns, rows, and optional delta/trend indicators.
5. **Given** an artifact with KPIs, **When** displayed, **Then** it shows metric cards with label, value, and trend.

**Supported artifact types**:

- **data** — Table with metric/value/delta columns
- **table** — Rich data table (e.g., abandoned cart list with customer, product, value, time)
- **document** — Formatted text with headers and bullets
- **campaign-table** — Marketing opportunities with segment, channel, potential value, priority

---

### User Story 9 - Approval Workflows from Chat (Priority: P3)

Co-workers can generate actions that require user approval (e.g., sending a WhatsApp recovery campaign to 47 customers). The orchestrator presents these as approval artifacts in the chat with recipient lists, message previews (WhatsApp bubble), and approve/reject buttons. The user can modify recipients before approving.

**Why this priority**: Approval is the control mechanism that lets co-workers act autonomously while keeping the human in the loop.

**Independent Test**: A co-worker generates a campaign → orchestrator shows approval card with WhatsApp preview and recipient list → user approves → confirmation message appears.

**Acceptance Scenarios**:

1. **Given** a co-worker generates a campaign needing approval, **When** the orchestrator displays it, **Then** an approval artifact shows with recipients, message preview, and approve/reject buttons.
2. **Given** an approval artifact with recipients, **When** the user toggles individual recipients, **Then** the count updates and excluded recipients are visually marked.
3. **Given** the user clicks "Aprovar", **When** the action is confirmed, **Then** a success message shows the count of recipients and the action is executed.
4. **Given** the user clicks "Rejeitar", **When** the action is cancelled, **Then** a rejection message appears and no action is taken.
5. **Given** an approval artifact with a WhatsApp message, **When** displayed, **Then** a realistic WhatsApp bubble preview shows the message template with personalization placeholders.

---

### User Story 10 - Co-worker Activity and Results (Priority: P3)

The user can ask the orchestrator "o que o Carrinho Abandonado fez hoje?" and receive a structured summary of the co-worker's recent activity: actions taken, results achieved (KPIs), and current status. This gives visibility into what co-workers are doing autonomously.

**Why this priority**: Transparency is essential — users need to know what their automated co-workers are doing without visiting each one individually.

**Independent Test**: Ask "o que o [co-worker] fez hoje?" → verify response includes activity timeline, KPI summary, and current status.

**Acceptance Scenarios**:

1. **Given** the user asks about a co-worker's activity, **When** the orchestrator responds, **Then** it includes a summary of recent actions with timestamps and status.
2. **Given** a co-worker has produced results, **When** the activity summary is shown, **Then** it includes KPI metrics (e.g., "12 carrinhos recuperados, R$1.260 receita").
3. **Given** a co-worker is idle/paused, **When** asked about its activity, **Then** the orchestrator explains its current state and last action.
4. **Given** the user asks "como estão meus co-workers?", **When** the orchestrator responds, **Then** it provides a multi-agent summary of all active co-workers.

---

### User Story 11 - Dashboard Full Integration (Priority: P3)

The dashboard mirrors the prototype layout: beyond the greeting/input, it shows recommended co-workers (not yet installed), connected apps status, co-workers in action (active agents with recent results), and detected opportunities. All sections are real data, not mocks.

**Why this priority**: The dashboard is the workspace overview — it should give the user a complete picture at a glance.

**Independent Test**: Navigate to the dashboard → verify all sections render with real data from the workspace.

**Acceptance Scenarios**:

1. **Given** the workspace has active co-workers, **When** the dashboard loads, **Then** "Co-workers em ação" shows each active agent with its latest result summary.
2. **Given** co-workers not yet installed exist in the catalog, **When** the dashboard loads, **Then** "Co-workers recomendados" shows 3 relevant recommendations based on the store's segment.
3. **Given** apps are connected or available, **When** the dashboard loads, **Then** "Conecte seus apps" shows connection status for each app.
4. **Given** co-workers have detected opportunities, **When** the dashboard loads, **Then** "Oportunidades detectadas" shows actionable insights with value estimates.
5. **Given** an opportunity card is clicked, **When** the drawer opens, **Then** it shows findings, reasoning, sources, and a suggested action.

---

### User Story 12 - Proactive Notifications (Priority: P3)

Co-workers generate proactive notifications for the user — urgent alerts, opportunities, and insights. These appear in a notification panel accessible from the top bar. Each notification shows the source co-worker, urgency level, title, reasoning, and a call-to-action.

**Why this priority**: Proactive alerts are what make co-workers feel autonomous — they surface important information without the user having to ask.

**Independent Test**: A co-worker detects an anomaly → notification badge appears in top bar → click to open panel → see notification with urgency level, reasoning, and CTA.

**Acceptance Scenarios**:

1. **Given** a co-worker generates a notification, **When** the user views the top bar, **Then** a badge shows the unread count.
2. **Given** the user opens the notification panel, **When** notifications are listed, **Then** each shows co-worker name, urgency level (urgent/opportunity/insight), title, and reasoning.
3. **Given** a notification has a CTA, **When** the user clicks it, **Then** they are taken to the relevant context (chat, co-worker page, or approval).
4. **Given** notifications are read, **When** the panel is viewed, **Then** read notifications appear below unread ones with dimmed styling.

---

### User Story 13 - Conversation History and Management (Priority: P3)

Users can view past conversations with the orchestrator, each with a title derived from the first message. Conversations are listed in the History page. Users can start a new conversation at any time.

**Why this priority**: Conversation management is important for returning users but not critical for the initial experience.

**Independent Test**: Have multiple conversations, navigate to History, and verify all conversations are listed with meaningful titles and accessible.

**Acceptance Scenarios**:

1. **Given** the user has had multiple conversations, **When** they navigate to the History page, **Then** all orchestrator conversations are listed with titles and timestamps.
2. **Given** the user is in an active conversation, **When** they click "Novo Chat", **Then** a new, empty conversation starts.
3. **Given** a conversation has a title derived from the first message, **When** the user views it, **Then** the title is meaningful and descriptive.

---

### Edge Cases

- What happens when the workspace has no co-workers installed? The orchestrator responds using its general knowledge and platform tools, and suggests relevant co-workers to install.
- What happens when the AI service is unavailable? Display a user-friendly error message and allow retry.
- What happens when the user sends very long messages? Truncate gracefully and inform the user of the limit.
- What happens when Telegram messages arrive but the orchestrator has no conversation yet? Create one automatically.
- What happens when multiple users in the same workspace use Telegram? Each user gets their own conversation linked to their messaging_link.
- What happens when a co-worker install fails mid-wizard? Roll back gracefully and inform the user.
- What happens when an approval artifact is stale (campaign already sent)? Show it as expired with no action buttons.
- What happens when a co-worker has no recent activity? Show "idle" state with last action timestamp.
- What happens when notifications exceed the display limit? Paginate or show "ver mais".

## Requirements _(mandatory)_

### Functional Requirements

**Core**:

- **FR-001**: System MUST auto-create the Snew orchestrator when a workspace is provisioned, regardless of priorities.
- **FR-002**: System MUST ensure exactly one orchestrator per workspace (idempotent).
- **FR-003**: The orchestrator MUST NOT appear in the co-workers catalog — it is not installable or uninstallable.
- **FR-004**: The dashboard text input MUST route to the orchestrator's chat with the message pre-sent.
- **FR-005**: Dashboard suggestion chips MUST behave the same as typing and submitting.

**Chat Interface**:

- **FR-006**: Chat MUST display messages as bubbles — user right-aligned, orchestrator left-aligned with Snew avatar.
- **FR-007**: The orchestrator MUST maintain conversation history with full message persistence.
- **FR-008**: Chat MUST support streaming responses with progressive text rendering.
- **FR-009**: Chat MUST show a typing indicator while processing.
- **FR-010**: Chat MUST support markdown formatting in responses (bold, lists, code).
- **FR-011**: Empty chat state MUST show Snew avatar, greeting, and suggestion chips.

**AI & Delegation**:

- **FR-012**: The orchestrator MUST be able to use platform tools (store queries, product data, order data).
- **FR-013**: The orchestrator MUST delegate to installed co-workers via `SNEW_ASK_AGENT` and attribute the source.
- **FR-014**: When a relevant co-worker is NOT installed, the orchestrator MUST suggest it with a "co-worker sugerido" card.
- **FR-015**: After each response, the orchestrator MUST display 3-4 contextual follow-up suggestions.
- **FR-016**: Clicking a follow-up MUST send it as a new message.

**Co-worker Management from Chat**:

- **FR-017**: Users MUST be able to install a co-worker from a suggestion card (opens install wizard).
- **FR-018**: Users MUST be able to install a co-worker by typing a command in chat (e.g., "instala o [name]").
- **FR-019**: The orchestrator MUST confirm co-worker installation in the chat after completion.
- **FR-020**: Users MUST be able to ask about any co-worker's recent activity and receive a structured summary.

**Artifacts & Structured Results**:

- **FR-021**: The orchestrator MUST support artifact chips in responses — clickable tags that expand into a side panel.
- **FR-022**: Supported artifact types: data tables, KPI summaries, rich documents, campaign tables.
- **FR-023**: Artifact side panel MUST show structured data with proper formatting (columns, rows, deltas, trends).

**Approvals**:

- **FR-024**: The orchestrator MUST present approval artifacts for co-worker actions requiring human confirmation.
- **FR-025**: Approval artifacts MUST include recipient list (toggleable), message preview, and approve/reject buttons.
- **FR-026**: Message previews MUST render channel-specific templates (WhatsApp bubble, email).
- **FR-027**: Approving MUST execute the action and show a confirmation message.

**Telegram**:

- **FR-028**: All Telegram messages MUST be routed to the orchestrator, never directly to a co-worker.
- **FR-029**: Telegram conversations MUST be persisted under the orchestrator.

**Dashboard**:

- **FR-030**: Dashboard MUST show "Co-workers em ação" section with active agents and their latest results.
- **FR-031**: Dashboard MUST show "Co-workers recomendados" section with relevant uninstalled agents.
- **FR-032**: Dashboard MUST show "Conecte seus apps" section with connection status.
- **FR-033**: Dashboard MUST show "Oportunidades detectadas" section with actionable insights and value estimates.

**Notifications**:

- **FR-034**: Co-workers MUST be able to generate proactive notifications with urgency levels (urgent, opportunity, insight).
- **FR-035**: Notifications MUST appear as a badge count in the top bar and expand into a notification panel.
- **FR-036**: Each notification MUST show source co-worker, urgency, title, reasoning, and CTA.

**General**:

- **FR-037**: The orchestrator MUST track AI credit usage for each conversation.
- **FR-038**: The orchestrator MUST support PT-BR and EN based on user language preference.
- **FR-039**: Each conversation MUST have a title derived from the first user message.
- **FR-040**: The sidebar "Novo Chat" link MUST navigate to the orchestrator's chat.

### Key Entities

- **Orchestrator**: Central AI assistant per workspace. One per workspace, auto-created. Coordinates all co-workers. Not a regular co-worker.
- **Conversation**: Thread of messages between user and orchestrator. Has title, creation date, channel (web/telegram), and ordered messages.
- **Message**: Single exchange in a conversation. Role (user/assistant), content with markdown, optional metadata (co-worker attribution, artifacts, follow-ups).
- **Artifact**: Structured data attached to a message. Types: data table, KPI summary, document, campaign table, approval. Rendered as chips in chat, expandable into side panel.
- **Approval**: Special artifact type requiring user action. Contains recipient list, message template preview, approve/reject actions, and execution status.
- **Co-worker Suggestion**: Recommendation card in a response. Co-worker identity, relevance reason, installation state.
- **Follow-up**: Contextual suggestion for the next question. Clickable button below the last assistant message.
- **Notification**: Proactive alert from a co-worker. Urgency level, title, reasoning, CTA, read state.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every new workspace has an orchestrator available within 5 seconds of provisioning.
- **SC-002**: Users can start a conversation from the dashboard and receive a response within 10 seconds.
- **SC-003**: The orchestrator correctly identifies and suggests relevant co-workers for at least 80% of domain-specific questions.
- **SC-004**: Telegram messages are processed and responded to within 30 seconds.
- **SC-005**: Conversation history is fully preserved across sessions — 100% of messages retrievable.
- **SC-006**: Follow-up suggestions appear after every orchestrator response.
- **SC-007**: Users can complete a full flow (ask → response → follow-up → response → install co-worker → ask again with delegation) without errors.
- **SC-008**: The orchestrator handles at least 50 concurrent conversations without degradation.
- **SC-009**: Artifact data tables render correctly with all columns, rows, and trend indicators.
- **SC-010**: Approval flows complete end-to-end — approve triggers action, reject cancels.
- **SC-011**: Dashboard loads with real data in all sections within 3 seconds.
- **SC-012**: Notifications appear within 5 seconds of co-worker generation.

## Assumptions

- The existing AI infrastructure (Vercel AI SDK, platform tools, `buildOrchestratorSystemPrompt`, `SNEW_ASK_AGENT`) is sufficient for orchestrator responses.
- The existing `agents`, `agent_conversations`, and `agent_messages` tables are sufficient. Co-worker metadata and artifacts stored in the `metadata` JSONB column.
- The reference implementation at `/home/renanl/Projects/snew-agent-mind/` serves as the design reference for all UI patterns.
- Follow-up suggestions are AI-generated based on context.
- Approval execution uses existing workflow infrastructure.
- Notifications use a new `notifications` table or existing infrastructure (to be determined in planning).
- Dashboard sections replace current mock data with real queries.
