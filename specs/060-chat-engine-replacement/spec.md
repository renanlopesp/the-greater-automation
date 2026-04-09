# Feature Specification: Chat Engine Replacement

**Feature Branch**: `060-chat-engine-replacement`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: Part of 058 Managed Agents Migration (spec 058-C from MASTER_PLAN)

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Customer Chats with Their AI Agent (Priority: P1)

A customer opens the chat interface and sends a message. The system routes the message to their dedicated Managed Agent, which processes it and streams back a response in real-time. The user sees the response appearing word-by-word, just like the current experience. The frontend requires zero changes.

**Why this priority**: This is the core product interaction. Every user session starts with chat. Without this working, nothing else matters.

**Independent Test**: Open chat, type "Olá, quem é você?". The agent responds with its identity in real-time streaming. The response appears word-by-word in the chat UI.

**Acceptance Scenarios**:

1. **Given** a customer with a provisioned agent, **When** they send a message in chat, **Then** the agent responds in real-time with streaming text visible in the UI.
2. **Given** a customer sending their first message in a new conversation, **When** the message is sent, **Then** a new session is created automatically and the response streams back.
3. **Given** a customer returning to an existing conversation, **When** they send a message, **Then** the session is resumed (not recreated) and the agent has context from previous messages.

---

### User Story 2 — Agent Uses Business Tools Automatically (Priority: P1)

When a customer asks a business question like "quanto vendi hoje?", the Managed Agent automatically calls the appropriate business tools (via MCP server) and responds with real data. The tool calls happen server-side — the user only sees the final response with data.

**Why this priority**: Tool usage is what makes the agent useful beyond generic conversation. Without tools, it's just a chatbot.

**Independent Test**: Ask "quanto vendi hoje?" — the agent queries sales data via MCP tools and responds with real numbers. Ask "como tá meu estoque?" — the agent queries stock levels.

**Acceptance Scenarios**:

1. **Given** a customer with a connected store, **When** they ask about sales, **Then** the agent calls the sales tool via MCP and responds with real revenue data.
2. **Given** a customer asking about stock, **When** the agent processes the request, **Then** it calls the stock tool and returns current inventory levels.
3. **Given** a customer asking for a campaign, **When** the agent processes the request, **Then** it calls the skill execution tool and the artifact panel updates with the result.

---

### User Story 3 — Agent Shows Thinking Process (Priority: P2)

When the agent is reasoning about a complex request, the user can see a visual indicator that the agent is "thinking". This builds trust and sets expectations for response time on complex queries.

**Why this priority**: Thinking indicators improve perceived performance and user trust, but are not blocking for core functionality.

**Independent Test**: Ask a complex question that requires reasoning. Verify the UI shows a thinking/processing indicator before the response appears.

**Acceptance Scenarios**:

1. **Given** a message that triggers agent reasoning, **When** the agent processes it, **Then** the UI shows a thinking indicator during the reasoning phase.
2. **Given** a simple message with no reasoning needed, **When** the agent responds directly, **Then** no thinking indicator is shown.

---

### User Story 4 — Conversations Are Persisted (Priority: P1)

All messages (user and agent) are saved to the database. When a customer navigates away and returns, their conversation history is intact. Credit usage is tracked per conversation.

**Why this priority**: Data persistence is essential for billing accuracy and user experience continuity.

**Independent Test**: Send a message, navigate away, return to the conversation — previous messages are visible. Check the database to confirm message records exist.

**Acceptance Scenarios**:

1. **Given** a completed conversation turn, **When** the user refreshes the page, **Then** both the user's message and the agent's response are visible from the database.
2. **Given** a conversation with token usage, **When** the response completes, **Then** credits are deducted from the team's balance based on token consumption.
3. **Given** a team with insufficient credits, **When** they try to send a message, **Then** they receive a clear message about insufficient credits before the request is processed.

---

### User Story 5 — Legacy Code Removed (Priority: P2)

The old chat engine code (manual tool loop, provider routing, step counting) is removed. This reduces codebase complexity and eliminates dead code paths.

**Why this priority**: Cleanup is important for maintainability but doesn't affect user experience directly.

**Independent Test**: Build passes with zero errors. No imports reference deleted files. All existing tests pass.

**Acceptance Scenarios**:

1. **Given** the old chat engine files are deleted, **When** the project builds, **Then** there are zero compilation errors.
2. **Given** the legacy provider routing is removed, **When** searching the codebase, **Then** no references to old provider selection logic remain.

---

### Edge Cases

- What happens when the team has no provisioned agent? → Auto-provision before first message (call /api/agents/provision).
- What happens when the session expires or is terminated? → Create a new session automatically and continue.
- What happens when the agent's response stream is interrupted (network error)? → Frontend shows error message, user can retry.
- What happens when the agent calls a tool that fails? → Agent receives the error and explains the issue to the user in natural language.
- What happens when the user sends a message while the agent is still responding? → Queue the message and process after current response completes.
- What happens with file attachments? → Files are uploaded to storage, public URLs are passed in the message content.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The chat route MUST route user messages to the team's dedicated Managed Agent via the external AI service
- **FR-002**: The system MUST create a new session automatically for new conversations and resume existing sessions for ongoing conversations
- **FR-003**: Agent responses MUST stream in real-time to the frontend using the existing streaming format (zero frontend changes)
- **FR-004**: The agent MUST be able to call business tools (sales, stock, orders, skills) via the MCP server during conversations
- **FR-005**: All messages (user and agent) MUST be persisted to the database after each conversation turn
- **FR-006**: Credit usage MUST be tracked per conversation turn based on token consumption
- **FR-007**: The system MUST check credit balance before processing a message and reject requests when credits are insufficient
- **FR-008**: Agent reasoning/thinking events MUST be translated into visual indicators for the frontend
- **FR-009**: The system MUST auto-provision an agent if the team doesn't have one yet (call provisioning endpoint)
- **FR-010**: The system MUST handle session errors gracefully (expired sessions, network failures) by creating new sessions as needed
- **FR-011**: The old chat engine code (manual tool loop, provider routing, step counting) MUST be removed
- **FR-012**: File attachments MUST continue to work — uploaded file URLs are passed to the agent as message content
- **FR-013**: The session identifier MUST be stored alongside conversations for session resumption

### Key Entities

- **Conversation**: A thread of messages between a user and their agent. Maps to a session in the external AI service. Extended with session identifier field.
- **Message**: A single user or agent message within a conversation. Contains text content and token usage metadata.
- **Session**: An external AI service session that maintains conversation state. Created per conversation, can be resumed.
- **Credit**: A unit of billing consumed per token used. Deducted after each agent response.

### Assumptions

- The team already has a provisioned Managed Agent (from 058-B). If not, auto-provisioning handles it.
- The MCP tools server (from 058-A) is attached to the agent and handles all tool calls automatically.
- The frontend `useChat` hook and `orchestrator-chat-wrapper` component require zero changes — only the SSE format must match.
- The existing conversation and message tables in the database are reused with minimal changes (add session_id column).
- Token usage information is available in session events for billing purposes.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can send messages and receive streaming responses within 2 seconds of first token appearing
- **SC-002**: 100% of business tool queries (sales, stock, orders) return real data through the new chat engine
- **SC-003**: Frontend requires zero code changes — existing chat UI works identically with the new backend
- **SC-004**: All conversations are persisted — navigating away and returning shows full message history
- **SC-005**: Credit deduction accuracy matches actual token usage within 5% margin
- **SC-006**: Build passes with zero errors after legacy code removal (agent-chat.ts, provider routing, step counting)
- **SC-007**: Session resumption works — sending a follow-up message in the same conversation maintains context from previous messages
