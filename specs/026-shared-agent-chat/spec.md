# Feature Specification: Shared Agent Chat & Team App Connections

**Feature Branch**: `026-shared-agent-chat`
**Created**: 2026-02-18
**Status**: Draft
**Input**: User description: "Team members invited to a workspace must have full access to agent conversations. Chat must show who is speaking, maintain a shared history across all team members, and allow browsing previous conversations. App connections used in agents should be shared without requiring each member to reconnect."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Shared Team Conversations (Priority: P1)

All team members see the same conversation thread when chatting with an agent. When User A sends a message to an agent, User B (who is on the same team) sees User A's message and the agent's response in real-time. Starting a "New Chat" creates a new conversation that all team members are switched to.

**Why this priority**: This is the core behavioral change — without shared conversations, every other story is meaningless. Currently each user has their own isolated conversation with each agent.

**Independent Test**: Two users logged in simultaneously on the same team can send messages to the same agent and see each other's messages appear in real-time.

**Acceptance Scenarios**:

1. **Given** User A and User B are on the same team, **When** User A sends a message to Agent X, **Then** User B sees User A's message and the agent's response in the same conversation.
2. **Given** an active shared conversation exists, **When** User A clicks "New Chat", **Then** both User A and User B are now in the new empty conversation.
3. **Given** a shared conversation, **When** User B sends a follow-up message, **Then** User A sees it appear in real-time via Supabase Realtime.
4. **Given** the agent is currently responding to User A's message, **When** User B opens the agent chat, **Then** User B sees the streaming response in progress.

---

### User Story 2 - Message Attribution (Priority: P1)

Each message in the chat displays who sent it — the user's name and avatar for human messages, the agent's name and avatar for assistant messages. Currently, user messages show as anonymous green bubbles with no sender identification.

**Why this priority**: Without knowing who said what, shared conversations would be confusing and unusable. This is tightly coupled with Story 1.

**Independent Test**: Open agent chat, send a message — your name and avatar appear on the message bubble. Another team member's messages show their name and avatar.

**Acceptance Scenarios**:

1. **Given** User A sends a message, **When** the message appears in chat, **Then** it displays User A's avatar, full name, and timestamp.
2. **Given** User B sends a message in the same conversation, **When** User A views the chat, **Then** User B's message shows User B's avatar, full name, and timestamp.
3. **Given** the agent responds, **When** the response appears, **Then** it shows the agent's avatar and name (as it does today).
4. **Given** a conversation with messages from 3 different users, **When** scrolling through, **Then** consecutive messages from the same sender are visually grouped (no repeated avatar/name).

---

### User Story 3 - Conversation History Browser (Priority: P2)

A button/panel to browse all previous conversations with an agent. Users can see a list of past chats with title, date, and participants, and click to view any historical conversation. The active conversation is highlighted.

**Why this priority**: Teams need to reference past interactions. Without history browsing, old conversations are lost when a new chat starts.

**Independent Test**: Click the history button on an agent chat page — a sidebar/panel shows all past conversations sorted by date, each clickable.

**Acceptance Scenarios**:

1. **Given** an agent with 5 past conversations, **When** user clicks "Chat History" button, **Then** a panel shows all 5 conversations with titles, dates, and participant avatars.
2. **Given** the history panel is open, **When** user clicks a past conversation, **Then** the chat area loads that conversation's messages (read-only for closed chats, or resumable).
3. **Given** the history panel is open, **When** the current active conversation is visible, **Then** it is visually highlighted/marked as "Active".
4. **Given** a long conversation history, **When** browsing, **Then** conversations are paginated or lazy-loaded (not all at once).

---

### User Story 4 - Shared Agent App Connections (Priority: P2)

App connections (e.g., Gmail, YouTube) that are already connected by the team owner and used in an agent's workflows should be visible and usable by all team members chatting with that agent — without requiring each member to connect separately. Personal connections remain personal; only connections tied to agent workflows are shared.

**Why this priority**: If the owner connected Gmail for an agent's workflow, team members shouldn't need to re-authenticate just to chat with the agent. This removes friction for team collaboration.

**Independent Test**: Owner connects Gmail to an agent workflow. Team member opens the agent chat — the agent can use Gmail actions without the member having their own Gmail connection.

**Acceptance Scenarios**:

1. **Given** Owner has connected Gmail and it's used in Agent X's workflow, **When** Member (no Gmail connection) chats with Agent X, **Then** the agent can execute Gmail actions using the owner's connection.
2. **Given** an agent with 2 connected apps from the owner, **When** viewing the agent detail page, **Then** a "Connected Apps" section shows which apps are available and who connected them.
3. **Given** a member has their OWN Gmail connection AND the owner also has one, **When** the member chats with the agent, **Then** the member's own connection takes priority.
4. **Given** an owner disconnects an app, **When** a member tries to use that agent, **Then** the agent reports the app is no longer available.

---

### User Story 5 - Real-time Presence in Chat (Priority: P3)

Show which team members are currently viewing or active in the agent chat. A small indicator or avatar stack shows who is "in the room."

**Why this priority**: Nice-to-have for collaboration awareness, but not essential for the core shared chat functionality.

**Independent Test**: Two users open the same agent chat — both see each other's avatar in a "Currently viewing" indicator.

**Acceptance Scenarios**:

1. **Given** User A is viewing Agent X chat, **When** User B also opens Agent X chat, **Then** both see each other's avatars in a presence indicator.
2. **Given** User B leaves the agent chat page, **When** User A is still viewing, **Then** User B's avatar disappears from the presence indicator after a short delay.

---

### Edge Cases

- What happens when two users send messages simultaneously? Messages should be ordered by `created_at` timestamp from the server.
- What happens when the agent is streaming a response and another user sends a message? The second message should be queued and processed after the current response completes.
- What happens when a team member is removed from the team? They lose access to all conversations immediately (RLS handles this).
- What happens when a shared app connection's credentials expire? The agent should report the error and suggest the connection owner re-authenticate.
- What happens when viewing history of a very old conversation where a team member has since left? Messages from that user are still visible with their name, but marked as "(former member)" or similar.
- What happens with the existing per-user conversations after migration? Old conversations should be migrated to shared format, attributed to their original owner.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support shared conversations — all team members see the same message thread for a given agent.
- **FR-002**: System MUST display sender identity (name, avatar) on every user message in the chat.
- **FR-003**: System MUST deliver new messages to all connected clients in real-time via Supabase Realtime.
- **FR-004**: System MUST provide a conversation history browser showing all past conversations for an agent.
- **FR-005**: System MUST allow creating new conversations that all team members are automatically switched to.
- **FR-006**: System MUST share app connections used in agent workflows with all team members for chat purposes.
- **FR-007**: System MUST prioritize a user's own app connection over a shared one when both exist.
- **FR-008**: System MUST store `user_id` on each `agent_messages` row to attribute messages to senders.
- **FR-009**: System MUST NOT expose raw credentials or `composio_connection_id` of shared connections to other team members.
- **FR-010**: System MUST migrate existing per-user conversations to the shared model, preserving message attribution.
- **FR-011**: System MUST show a real-time presence indicator of who is viewing the agent chat (P3).

### Key Entities

- **Conversation**: Belongs to an agent (team-scoped, not user-scoped). Has a title, created_by user, created_at, status (active/archived). All team members can read/write messages.
- **Message**: Belongs to a conversation. Has role (user/assistant/system/tool), content, sender_id (user who sent it for role=user), metadata. Ordered by created_at.
- **Shared App Connection**: An app_connection row that is "promoted" for agent use. When a workflow uses an owner's connection, team members can invoke that connection's actions through the agent chat.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All team members can see the same conversation and messages within 2 seconds of each other (real-time sync).
- **SC-002**: Every user message displays the sender's name and avatar correctly.
- **SC-003**: Chat history browser loads all past conversations for an agent within 1 second.
- **SC-004**: Team members can chat with an agent using shared app connections without needing to connect their own accounts.
- **SC-005**: Migration of existing conversations preserves all messages with correct user attribution.
- **SC-006**: No regression in chat performance — streaming responses remain smooth.
