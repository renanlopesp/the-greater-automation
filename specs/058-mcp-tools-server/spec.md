# Feature Specification: MCP Tools Server

**Feature Branch**: `058-mcp-tools-server`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: Part of 058 Managed Agents Migration (spec 058-A from MASTER_PLAN)

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Managed Agent Calls Business Tools (Priority: P1)

The Managed Agent, running on Anthropic's infrastructure, needs to access the store's business logic (sales data, stock levels, orders, skills, notifications) through a standardized protocol. When a customer asks "quanto vendi hoje?", the agent calls the MCP server's STORE_QUERY_SALES tool and receives real data from the store's database.

**Why this priority**: Without tool access, the Managed Agent is a generic chatbot — it cannot answer any business-specific questions. This is the foundation for the entire migration.

**Independent Test**: Connect a test MCP client to the server, call STORE_QUERY_SALES with a valid team/store context, verify real sales data is returned from the database.

**Acceptance Scenarios**:

1. **Given** a running MCP server with valid store credentials, **When** a client calls STORE_QUERY_SALES with period "today", **Then** it returns sales data matching what the database contains for today.
2. **Given** a running MCP server, **When** a client calls STORE_QUERY_STOCK, **Then** it returns current stock levels for the store's products.
3. **Given** a running MCP server, **When** a client calls STORE_LIST_ORDERS with status filter, **Then** it returns filtered orders matching the criteria.

---

### User Story 2 — Agent Manages Skills and Artifacts (Priority: P1)

The agent needs to execute skills (seasonal-calendar, copywriter) and write visual artifacts (HTML dashboards, charts) to the side panel. When a customer asks "cria uma campanha de Dia das Mães", the agent calls SNEW_RUN_SKILL via MCP, and when asked "quanto vendi hoje?", the agent calls SNEW_MODIFY_ARTIFACT to display a rich HTML dashboard.

**Why this priority**: Skills and artifacts are core differentiators of the product — without them, the agent is just a text chatbot.

**Independent Test**: Call SNEW_RUN_SKILL with "seasonal-calendar" slug, verify it generates calendar data and writes to the tasks table. Call SNEW_MODIFY_ARTIFACT with HTML content, verify it persists to the task's artifact_data column.

**Acceptance Scenarios**:

1. **Given** a running MCP server with a valid task context, **When** a client calls SNEW_RUN_SKILL with slug "seasonal-calendar", **Then** the skill executes and returns calendar data, and the task's artifact_data is updated in the database.
2. **Given** a running MCP server with a valid task context, **When** a client calls SNEW_MODIFY_ARTIFACT with operation "replace" and HTML content, **Then** the task's artifact_data is updated and artifact_type is set to "chat-data".
3. **Given** a running MCP server, **When** a client calls SNEW_LIST_SKILLS, **Then** it returns all skills for the team with their status.

---

### User Story 3 — Agent Queries Composio Connections (Priority: P2)

The agent needs to check which third-party apps the user has connected (Instagram, Gmail, Meta Ads) and list available apps for connection. This enables the agent to know its capabilities and guide users to connect new integrations.

**Why this priority**: App connections are important for full functionality but the agent can operate without them for retail-focused tasks.

**Independent Test**: Call SNEW_CHECK_CONNECTIONS, verify it returns the user's active Composio connections. Call SNEW_LIST_AVAILABLE_APPS, verify it returns all connectable apps with connection status.

**Acceptance Scenarios**:

1. **Given** a user with Instagram and Gmail connected, **When** a client calls SNEW_CHECK_CONNECTIONS, **Then** it returns those two apps as connected.
2. **Given** a running MCP server, **When** a client calls SNEW_LIST_AVAILABLE_APPS, **Then** it returns all apps with a flag indicating which are already connected.
3. **Given** a running MCP server, **When** a client calls SNEW_LIST_APP_CAPABILITIES with app_id "instagram", **Then** it returns available actions and triggers for Instagram.

---

### User Story 4 — Agent Creates Notifications (Priority: P2)

The agent can proactively surface insights, opportunities, or urgent alerts to the user via the platform's notification system. When the agent detects low stock or a sales spike, it creates a notification that appears in the UI.

**Why this priority**: Notifications enhance the agent's proactive capabilities but are not blocking for core chat functionality.

**Independent Test**: Call SNEW_CREATE_NOTIFICATION with urgency "opportunity" and a title, verify a notification row is created in the notifications table.

**Acceptance Scenarios**:

1. **Given** a running MCP server, **When** a client calls SNEW_CREATE_NOTIFICATION with urgency "urgent" and title "Estoque baixo", **Then** a notification is created in the database and is visible in the platform UI.

---

### User Story 5 — Agent Manages Store Products and Categories (Priority: P2)

The agent can create, update, and delete products, manage categories, handle coupons, process orders, and perform other store management operations through the MCP server.

**Why this priority**: Full store management extends the agent beyond read-only queries to actionable commerce operations.

**Independent Test**: Call STORE_CREATE_PRODUCT with product data, verify it's created on both the platform and local database. Call STORE_MANAGE_COUPONS to create a discount, verify it exists.

**Acceptance Scenarios**:

1. **Given** a store with synced products, **When** a client calls STORE_UPDATE_PRODUCT with a price change, **Then** the price is updated on the e-commerce platform and in the local database.
2. **Given** a running MCP server, **When** a client calls STORE_MANAGE_COUPONS to create a 10% discount, **Then** the coupon is created on the e-commerce platform.
3. **Given** a running MCP server, **When** a client calls STORE_QUERY_CUSTOMERS, **Then** it returns customer data with segmentation analysis.

---

### Edge Cases

- What happens when the store has no products synced? → STORE\_ tools return empty results with a message suggesting sync.
- What happens when a skill slug doesn't exist? → Returns a clear error with available slugs.
- What happens when the Composio service is unreachable? → Falls back to local database cache for connections.
- What happens when the MCP server receives a call without valid team/store context? → Returns an authentication error.
- What happens when SNEW_MODIFY_ARTIFACT is called without a task context? → The tool is not registered (unavailable for that session).
- What happens when concurrent calls modify the same artifact? → Last-write-wins with version history preservation.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST expose all SNEW\_\* platform tools via the MCP protocol (SNEW_LIST_SKILLS, SNEW_GET_SKILL, SNEW_RUN_SKILL, SNEW_LIST_WORKFLOWS, SNEW_LIST_APP_CAPABILITIES, SNEW_CHECK_CONNECTIONS, SNEW_LIST_AVAILABLE_APPS, SNEW_CREATE_SKILL, SNEW_RUN_WORKFLOW, SNEW_LIST_RUNS, SNEW_ACTIVATE_SKILL, SNEW_GET_SKILLS_ACTIVITY, SNEW_CREATE_NOTIFICATION, SNEW_MODIFY_ARTIFACT)
- **FR-002**: System MUST expose all STORE\_\* retail tools via the MCP protocol (STORE_QUERY_STOCK, STORE_QUERY_SALES, STORE_LIST_ORDERS, STORE_UPDATE_ALERT, STORE_UPDATE_SCHEDULE, STORE_DELETE_PRODUCT, STORE_TRIGGER_SYNC, STORE_UPDATE_PRODUCT, STORE_CREATE_PRODUCT, STORE_QUERY_CATEGORIES, STORE_MANAGE_CATEGORIES, STORE_QUERY_CUSTOMERS, STORE_MANAGE_COUPONS, STORE_MANAGE_ORDERS, STORE_GET_ABANDONED_CHECKOUTS, STORE_ADD_PRODUCT_IMAGE, STORE_MANAGE_DRAFT_ORDERS, STORE_MANAGE_FULFILLMENT, STORE_GET_PAYMENT_OPTIONS, STORE_QUERY_TRANSACTIONS, STORE_MANAGE_PAGES, STORE_GET_STORE_INFO, STORE_QUERY_MARGINS)
- **FR-003**: Each MCP tool MUST call the same underlying business logic as the current in-process tools (no logic duplication)
- **FR-004**: The MCP server MUST receive team context (team_id, user_id, store_id, task_id) to scope all operations to the correct customer
- **FR-005**: The MCP server MUST return structured results that the Managed Agent can interpret (same format as current tool outputs)
- **FR-006**: The MCP server MUST handle errors gracefully, returning descriptive error messages instead of crashing
- **FR-007**: SNEW_MODIFY_ARTIFACT MUST only be available when a task context is present
- **FR-008**: STORE\_\* tools MUST only be available when a store context is present (store_id exists)
- **FR-009**: The MCP server MUST support the stdio transport protocol for communication with the Managed Agent
- **FR-010**: The MCP server MUST be independently deployable and testable without requiring the full application

### Key Entities

- **MCP Server**: The service that exposes business tools to the Managed Agent via the Model Context Protocol
- **Tool**: A single capability exposed via MCP (e.g., STORE_QUERY_SALES) with defined input schema and output format
- **Team Context**: The set of identifiers (team_id, user_id, store_id, task_id) that scope tool operations to a specific customer
- **Tool Result**: The structured response returned by each tool, containing either data or an error message

### Assumptions

- The MCP server runs as a subprocess managed by the Managed Agent's environment, communicating via stdio
- Team context is passed to the MCP server via environment variables or initialization parameters at session start
- The existing tool logic in platform-tools and retail-tools will be refactored into reusable functions that both the MCP server and any legacy code can call
- The database client will use service role credentials since the MCP server operates server-side without user cookies

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All 37 tools (14 SNEW*\* + 23 STORE*\*) are callable through the MCP server and return correct results
- **SC-002**: A test client can connect, list available tools, call each tool, and receive valid responses within 5 seconds per call
- **SC-003**: Tool responses through MCP match the responses from the current in-process tool execution (same data format, same business logic)
- **SC-004**: The server starts and becomes ready to accept connections within 3 seconds
- **SC-005**: Error scenarios (invalid input, missing context, failures) return descriptive messages without crashing the server
- **SC-006**: The server can be tested independently by connecting a generic client without running the full application
