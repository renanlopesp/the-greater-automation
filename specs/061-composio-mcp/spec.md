# Feature Specification: Composio MCP Integration

**Feature Branch**: `061-composio-mcp`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: Part of 058 Managed Agents Migration (spec 058-D from MASTER_PLAN)

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Agent Executes Actions on Connected Apps (Priority: P1)

When a customer asks the agent to perform actions on connected third-party apps (e.g., "posta essa imagem no Instagram", "envia um email para meus clientes"), the Managed Agent executes those actions through Composio's MCP server. The agent has direct access to all connected app capabilities without manual session management.

**Why this priority**: Third-party app integration is a core differentiator — customers connect apps to automate their business.

**Independent Test**: Connect Instagram, ask "quantos seguidores tenho?". The agent queries Instagram via Composio MCP and returns real follower data.

**Acceptance Scenarios**:

1. **Given** a customer with Instagram connected, **When** they ask about followers, **Then** the agent queries Instagram via Composio and returns real data.
2. **Given** a customer with Gmail connected, **When** they ask to send an email, **Then** the agent composes and sends it via Composio.
3. **Given** a customer asking about an app they haven't connected, **When** the agent detects the app is not connected, **Then** it provides a connection link for the user.

---

### User Story 2 — Agent Manages App Connections In Chat (Priority: P1)

Customers can connect new apps directly through the chat interface. When the agent identifies that an app connection is needed, it provides an OAuth connection link. After connecting, the app's capabilities become available immediately.

**Why this priority**: Seamless in-chat connection flow removes friction from the onboarding experience.

**Independent Test**: Ask "quero conectar meu Instagram". The agent provides a connection link. After connecting, ask "quantos seguidores tenho?" and receive real data.

**Acceptance Scenarios**:

1. **Given** a customer without Instagram connected, **When** they ask to connect it, **Then** the agent provides an OAuth connection link rendered as a button in the UI.
2. **Given** a customer who just connected a new app, **When** they ask a question about that app, **Then** the agent can use the app's capabilities immediately.

---

### User Story 3 — Legacy Composio Code Removed (Priority: P2)

The old Composio integration code (in-process Vercel SDK, manual session management, tool filtering/wrapping) is removed and replaced by the MCP server configuration on the Managed Agent.

**Why this priority**: Cleanup reduces maintenance burden but doesn't affect users directly.

**Independent Test**: Build passes with zero errors. No references to old Composio session management code remain.

**Acceptance Scenarios**:

1. **Given** the old Composio session code is removed, **When** the project builds, **Then** there are zero errors.
2. **Given** Composio actions work via MCP, **When** searching the codebase for old patterns, **Then** no references to the old integration remain.

---

### Edge Cases

- What happens when Composio's service is temporarily unavailable? → Agent explains the service is temporarily down and suggests retrying.
- What happens when an app's OAuth token expires? → Composio handles token refresh automatically. If refresh fails, agent provides a re-connection link.
- What happens when the user asks about an app not supported by Composio? → Agent explains the app is not available and lists supported apps.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Managed Agent MUST be able to execute actions on connected third-party apps via Composio's MCP server
- **FR-002**: Composio MUST be configured as a remote MCP server attached to the Managed Agent (not loaded in-process)
- **FR-003**: The agent MUST be able to check which apps the user has connected and their available actions
- **FR-004**: The agent MUST provide OAuth connection links when a user wants to connect a new app
- **FR-005**: Connection links MUST render as styled buttons in the chat UI (existing behavior preserved)
- **FR-006**: The old Composio integration code (session management, tool filtering, tool wrapping) MUST be removed
- **FR-007**: Composio's connection management MUST work seamlessly within the MCP protocol

### Key Entities

- **Composio MCP Server**: Remote MCP server that exposes third-party app actions (Instagram, Gmail, Meta Ads, etc.) to the Managed Agent
- **App Connection**: An OAuth link between a user and a third-party app, managed by Composio
- **App Action**: A specific capability on a connected app (e.g., post to Instagram, send email, create ad)

### Assumptions

- Composio provides an `@composio/mcp` package or a hosted MCP server URL that can be attached to the Managed Agent
- The Managed Agent's MCP server configuration supports multiple MCP servers (snew-tools + composio)
- Composio's MCP server handles OAuth token management, refresh, and session scoping per user
- The existing connection link rendering in the frontend (styled buttons) continues to work with the new backend

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All currently supported app actions (Instagram, Gmail, Meta Ads) work through the new Composio MCP integration
- **SC-002**: Users can connect new apps via chat with the same click-to-connect flow as before
- **SC-003**: Build passes with zero errors after removing old Composio session management code
- **SC-004**: Response time for Composio actions is within 10 seconds (same or better than current)
- **SC-005**: Zero changes required to the frontend connection button rendering
