# Feature Specification: Skills + Artifacts via MCP

**Feature Branch**: `062-skills-artifacts-mcp`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: Part of 058 Managed Agents Migration (spec 058-E from MASTER_PLAN)

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Agent Executes Skills and Shows Results in Side Panel (Priority: P1)

When a customer asks the agent to create a campaign (e.g., "cria uma campanha de Dia das Mães"), the agent executes the appropriate skill via the MCP server. The skill generates structured data (calendar, copy, deliverables) which is written to the task's artifact data. The side panel automatically renders the result.

**Why this priority**: Skills are the product's primary value — they turn the agent from a chatbot into a marketing automation tool.

**Independent Test**: Ask "cria uma campanha de Dia das Mães". The seasonal-calendar skill executes, the side panel shows the campaign calendar with dates and details.

**Acceptance Scenarios**:

1. **Given** a customer with the seasonal-calendar skill active, **When** they ask for a campaign, **Then** the agent calls the skill via MCP, the side panel shows the calendar, and the chat shows a brief summary.
2. **Given** a customer with the copywriter skill active, **When** they ask for copy, **Then** the agent executes the skill and results appear in the side panel.
3. **Given** a customer asking about a skill that is not active, **When** the agent detects this, **Then** it suggests activating the skill.

---

### User Story 2 — Agent Creates Visual Dashboards from Data (Priority: P1)

When a customer asks a data question (e.g., "quanto vendi hoje?"), the agent queries the data via MCP tools and then writes a rich HTML dashboard to the artifact panel. The dashboard includes charts, KPIs, and insights — the same quality as the current artifact system.

**Why this priority**: Visual data artifacts are a key differentiator — raw text answers are insufficient for business intelligence.

**Independent Test**: Ask "quanto vendi hoje?". The agent queries sales data and writes an HTML dashboard to the side panel with revenue, order count, and product breakdown.

**Acceptance Scenarios**:

1. **Given** a customer asking about sales, **When** the agent queries data and creates an artifact, **Then** the side panel shows a rich HTML dashboard with KPIs and charts.
2. **Given** a customer asking about stock, **When** the agent creates an artifact, **Then** the dashboard shows stock levels with visual indicators for low stock items.
3. **Given** an existing artifact in the side panel, **When** the agent creates a new one, **Then** the previous version is preserved in the artifact history.

---

### User Story 3 — Artifact Theme Toggle Works (Priority: P2)

The HTML artifacts rendered in the side panel support light and dark theme toggling. The theme syncs with the application's theme setting. The design system CSS classes are available in all artifacts.

**Why this priority**: Theme consistency is important for UX polish but not blocking for core functionality.

**Independent Test**: Create a sales artifact, toggle the app theme from light to dark — the artifact theme follows.

**Acceptance Scenarios**:

1. **Given** an artifact displayed in the side panel, **When** the user toggles the app theme, **Then** the artifact re-renders in the matching theme.

---

### Edge Cases

- What happens when a skill execution fails mid-way? → Agent explains the error and suggests retrying.
- What happens when the artifact HTML exceeds the size limit? → Agent aggregates data (top 15 items max) to keep HTML under 8KB.
- What happens when concurrent skill executions write to the same task? → Last-write-wins with history preservation.
- What happens when the user has no active skills? → Agent lists available skills and suggests activation.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The agent MUST execute skills (seasonal-calendar, copywriter, etc.) via the MCP server's SNEW_RUN_SKILL tool
- **FR-002**: Skill results MUST be written to the task's artifact data in the database, triggering side panel rendering
- **FR-003**: The agent MUST create HTML artifacts via the MCP server's SNEW_MODIFY_ARTIFACT tool after retail data queries
- **FR-004**: Artifact HTML MUST use the existing CSS design system with theme support (light/dark toggle)
- **FR-005**: Artifact history MUST be preserved — new artifacts push previous versions to a history array
- **FR-006**: Artifacts MUST be limited to 8KB HTML and 20 items per list/table to prevent performance issues
- **FR-007**: The agent MUST provide a short text summary in chat after creating an artifact (not duplicate the data)
- **FR-008**: Skill suggestion markers MUST work — when a relevant skill is not active, the UI shows a suggestion card

### Key Entities

- **Skill**: A capability (seasonal-calendar, copywriter) that generates structured data when executed
- **Artifact**: Rich HTML content displayed in the side panel, stored in the task's artifact_data column
- **Task**: The container for a conversation that holds artifact data and skill execution state

### Assumptions

- The MCP server (058-A) already exposes SNEW_RUN_SKILL and SNEW_MODIFY_ARTIFACT tools
- The chat engine (058-C) correctly routes agent tool calls through the MCP server
- The frontend artifact rendering (chat-data-artifact component) requires zero changes
- The CSS design system is already injected into artifact iframes

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Skill execution via MCP produces identical results to the current in-process execution
- **SC-002**: HTML artifacts render correctly in the side panel with theme toggle working
- **SC-003**: Artifact history preserves at least the last 10 versions
- **SC-004**: Zero frontend changes required for artifact rendering
- **SC-005**: Skill execution completes within 30 seconds (same or better than current)
