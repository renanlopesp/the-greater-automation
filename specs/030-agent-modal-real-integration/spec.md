# Feature Specification: Agent Detail Modal - Full Real Integration

**Feature Branch**: `030-agent-modal-real-integration`
**Created**: 2026-03-09
**Status**: Draft
**Input**: Replace all mocked data in the agent detail modal with real integrations from the existing agents/[id] page

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Real AI Chat in Modal (Priority: P1)

A user clicks on an agent card from the Home page or Co-workers page. A modal opens showing a real AI chat on the left panel. The user can type messages, receive streaming AI responses with tool calls, attach files, and see conversation history — identical to the full agent detail page chat.

**Why this priority**: Chat is the core interaction with agents. Without real chat, the modal is useless.

**Independent Test**: Can be tested by opening the modal, sending a message, and verifying a real AI response streams back with tool call display.

**Acceptance Scenarios**:

1. **Given** a user on the Home page, **When** they click an agent card, **Then** a modal opens with the real chat panel showing conversation history (if any exists)
2. **Given** an open agent modal, **When** the user types a message and sends it, **Then** the message is sent to the real AI API, response streams back with markdown rendering and tool call display
3. **Given** an open agent modal with active chat, **When** the AI invokes tools (Composio, SNEW\_\*, retail tools), **Then** tool calls are displayed inline with input/output details
4. **Given** an open agent modal, **When** the user attaches a file and sends a message, **Then** the file is processed by the AI
5. **Given** a user closes and reopens the modal for the same agent, **Then** the conversation history is preserved and loaded from the database

---

### User Story 2 - Real Connected Apps in Sidebar (Priority: P1)

The modal's right sidebar shows the agent's real connected apps (from app_connections table), not fake/mocked channel data. Only apps that are actually connected for the agent's workflows appear.

**Why this priority**: Showing fake connections (Telegram, WhatsApp, Email) when only Nuvemshop is connected is misleading and confusing.

**Independent Test**: Can be tested by opening the modal for an agent with known connections and verifying only real connections appear.

**Acceptance Scenarios**:

1. **Given** an agent with Nuvemshop connected via workflows, **When** the modal opens, **Then** only "Nuvemshop" appears in the connected apps section
2. **Given** an agent with no connected apps, **When** the modal opens, **Then** a "Nenhum aplicativo conectado" message appears
3. **Given** an agent with multiple real connections, **When** the modal opens, **Then** all real connections appear as indicator pills with correct icons

---

### User Story 3 - Complete Sidebar with Real Data (Priority: P2)

The modal's right sidebar shows agent info (name, description), connected apps, workflows (Automações tab), and skills (Skills tab) — all from real data, matching the existing AgentSidebar component.

**Why this priority**: Workflows and skills tabs already partially work, but the full sidebar integration needs connected apps and proper data flow.

**Independent Test**: Can be tested by opening the modal and verifying each sidebar section shows real data matching the database.

**Acceptance Scenarios**:

1. **Given** an agent with active workflows, **When** the modal opens and "Automações" tab is selected, **Then** real workflows appear with trigger icons, status, and enabled state
2. **Given** an agent with knowledge/procedure skills, **When** "Skills" tab is selected, **Then** real skills appear with content, parameters, and toggle controls

---

### Edge Cases

- What happens when the modal opens but the agent has no prior conversation? → Empty chat state with conversation starters
- What happens when the user sends a message and closes the modal before response completes? → Chat state is preserved in DB; reopening shows the completed response
- What happens when another team member is chatting with the same agent? → Realtime subscription shows their messages
- What happens when a skill-mutating tool call completes? → Sidebar workflows/skills refresh automatically
- What happens when the API returns an error during chat? → Error banner displayed above the input area

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Modal MUST use the real AI chat system connected to the agent chat API for conversation
- **FR-002**: Modal MUST fetch and display the active conversation history when opened
- **FR-003**: Modal MUST support streaming AI responses with markdown rendering, tool call display, and reasoning blocks
- **FR-004**: Modal MUST support file attachments in chat messages
- **FR-005**: Modal MUST show real connected apps from the database, using the existing ConnectionIndicators component
- **FR-006**: Connected apps MUST be filtered to show only apps used by the agent's workflows, triggers, or store platform
- **FR-007**: Modal MUST display real workflows and skills (already partially implemented)
- **FR-008**: Modal MUST support realtime message sync (messages from other team members appear automatically)
- **FR-009**: Modal MUST support skill mutation detection (when AI creates/deletes workflows or skills, sidebar refreshes)
- **FR-010**: Modal MUST remove all mocked/static data (EXAMPLE_ACTIVITIES, CHANNELS constant, static chat textarea)
- **FR-011**: Modal MUST pass currentUserId to the chat system for proper message attribution
- **FR-012**: Modal MUST provide conversation starters when no conversation history exists

### Key Entities

- **Agent**: The AI agent being viewed (id, name, description, palette, status, conversation_starters)
- **Conversation**: Active chat session (id, messages, participants)
- **Connected App**: Real app connection (app_id, account_label, derived from workflows + store platform)
- **Workflow**: Agent's automation rules (trigger_config, actions, is_enabled)
- **Skill**: Agent's knowledge/procedures (name, content, type, is_enabled)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can send a message in the modal and receive a real AI response within the same timeframe as the full agent page
- **SC-002**: Connected apps section shows 100% accuracy — only real connections, zero mocked data
- **SC-003**: All chat features (streaming, tool calls, file attachments, conversation starters) work identically in the modal and the full agent page
- **SC-004**: Modal loads conversation history and sidebar data within 2 seconds of opening
- **SC-005**: Zero static/mocked data remains in the modal component after implementation

## Assumptions

- The existing ChatPanel component or useAgentChat hook can be reused in the modal context without modification
- The existing agent chat API route works correctly when called from the modal
- The loadConversationHistory server action can be used to fetch initial conversation data client-side
- Connected apps data can be fetched via a new server action since the modal is a client component
- The user is already authenticated (modal is inside the dashboard layout which requires auth)
