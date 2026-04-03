# Feature Specification: Chat-Driven Artifact Modification

**Feature Branch**: `049-chat-artifact-modification`
**Created**: 2026-04-01
**Status**: Draft
**Input**: User description: "Chat-driven artifact modification — AI modifies calendar data via tools, generates campaigns, artifact panel updates reactively"

## Context

The task-based architecture (spec 047) introduced a chat + artifact panel layout where the AI generates a seasonal calendar displayed in the side panel. Currently, the AI can generate the initial calendar but **cannot reliably modify it** after creation. Users expect to interact with the calendar via natural language — adding campaigns, removing dates, clearing content — and see the panel update in real time.

**Current problems observed**:

1. The AI says it modified data but didn't actually call the tool (hallucination)
2. The AI performs actions the user didn't request (over-eager behavior)
3. Calendar keyword detection triggers full regeneration on modification requests
4. The artifact panel doesn't update reactively when data changes
5. No clear separation between "generate calendar", "generate campaign for a date", and "modify existing data"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Generate Campaign for a Specific Date (Priority: P1)

The user has a seasonal calendar displayed in the artifact panel. They ask the AI to generate campaign content (copies, email, assets, video, timeline) for a specific date like "Black Friday" or "Dia das Mães". The AI generates the campaign and the artifact panel updates to show the date as "Gerada" with all campaign sections populated.

**Why this priority**: This is the core value proposition — the AI creates deliverables on demand through conversation.

**Independent Test**: Send "gere a campanha de Black Friday" in a task with an existing calendar. Black Friday should change from "Pendente" to "Gerada" in the panel.

**Acceptance Scenarios**:

1. **Given** a task with a seasonal calendar showing Black Friday as "Pendente", **When** user says "gere a campanha de Black Friday", **Then** the AI calls the campaign generation tool, the date transitions to "Gerada" in the panel with campaign content accessible via drill-down.
2. **Given** a task with a calendar, **When** user says "gere campanhas para Dia das Mães e Natal", **Then** the AI generates campaigns for both dates sequentially, updating the panel after each.
3. **Given** a task with a calendar where Black Friday already has a campaign, **When** user says "regenere a campanha de Black Friday", **Then** the AI replaces the existing campaign with newly generated content.

---

### User Story 2 — Real-Time Panel Updates (Priority: P1)

When the AI modifies artifact data through any operation, the artifact panel must update immediately after the AI finishes responding — not after a polling delay.

**Why this priority**: Reactive feedback is essential for the conversational experience to feel connected to the artifact.

**Independent Test**: Time the delay between AI response completion and panel update. Should be under 1 second.

**Acceptance Scenarios**:

1. **Given** the AI completes a tool call that modifies artifact data, **When** the AI stream finishes, **Then** the panel fetches updated data and re-renders within 1 second.
2. **Given** the AI is still streaming text after a tool call, **When** the stream completes, **Then** the panel update happens once (not during streaming).

---

### User Story 3 — AI Only Acts When Explicitly Asked (Priority: P1)

The AI must only modify artifact data when the user explicitly requests a modification. It must not proactively change data, regenerate calendars, or perform actions the user didn't ask for.

**Why this priority**: Unpredictable AI behavior destroys user trust.

**Independent Test**: Ask the AI questions about the calendar ("quais datas têm campanha?") and verify no data is modified.

**Acceptance Scenarios**:

1. **Given** a task with a calendar, **When** user asks "quais datas têm campanha gerada?", **Then** the AI answers the question without calling any modification tool.
2. **Given** a task with a calendar, **When** user says "quero focar na Black Friday", **Then** the AI responds conversationally without modifying the calendar data.
3. **Given** a task with a calendar, **When** user says "gere a campanha de Natal", **Then** the AI calls the generate_campaign tool — not the full calendar regeneration.

---

### User Story 4 — Remove or Filter Calendar Dates (Priority: P2)

The user wants to customize the calendar by removing irrelevant dates or filtering to show only specific dates. For example, "remova Carnaval e Páscoa do calendário" or "mantenha só as datas de alta prioridade".

**Why this priority**: Users need control over the calendar content to focus on relevant dates.

**Independent Test**: Send "remova Carnaval do calendário" in a task with a calendar. Carnaval should disappear from the date list.

**Acceptance Scenarios**:

1. **Given** a calendar with 11 dates, **When** user says "remova Carnaval e Dia do Estudante", **Then** exactly those 2 dates and their campaigns are removed, panel shows 9 dates.
2. **Given** a calendar with 11 dates, **When** user says "mantenha só Dia das Mães, Black Friday e Natal", **Then** only those 3 dates remain in the panel.
3. **Given** a calendar where the user asks to remove a date that doesn't exist, **When** user says "remova Dia dos Avós", **Then** the AI informs the user that date doesn't exist and lists available dates.

---

### User Story 5 — Clear Generated Campaign Content (Priority: P2)

The user wants to keep all dates visible but clear the generated campaign content from some or all dates, resetting them to "Pendente" status.

**Why this priority**: Users need to reset campaigns for re-generation or to declutter the view.

**Independent Test**: Send "limpe todas as campanhas menos Dia das Mães". All dates except Dia das Mães should show "Pendente".

**Acceptance Scenarios**:

1. **Given** a calendar with 7 dates showing "Gerada", **When** user says "limpe todas as campanhas menos Dia das Mães", **Then** 6 campaigns are cleared, only Dia das Mães keeps "Gerada", panel updates immediately.
2. **Given** a calendar with campaigns, **When** user says "limpe a campanha de Natal", **Then** only Natal's campaign is cleared, all other campaigns preserved.

---

### User Story 6 — Distinguish Generation from Modification (Priority: P2)

When the user asks to "show the seasonal calendar" or "generate the calendar", the system generates a new calendar. When the user asks to modify, filter, remove, or generate campaigns for existing dates, the system uses modification tools without regenerating the entire calendar.

**Why this priority**: Prevents accidental data loss from unintended full regeneration.

**Independent Test**: Send "remova Natal do calendário" (contains "calendário") and verify it does NOT regenerate the entire calendar.

**Acceptance Scenarios**:

1. **Given** a task without a calendar, **When** user says "mostra o calendário sazonal", **Then** the system generates a new calendar.
2. **Given** a task with an existing calendar, **When** user says "remova Natal do calendário", **Then** the system removes Natal — does NOT regenerate the calendar.
3. **Given** a task with an existing calendar, **When** user says "atualize o calendário", **Then** the AI asks for clarification rather than regenerating everything.

---

### Edge Cases

- What happens when the user asks to generate a campaign but Brand DNA is not configured? → AI informs user to complete brand setup first.
- What happens when the user asks to modify a task that has no calendar artifact? → AI informs user to generate a calendar first.
- What happens when a tool call fails mid-execution? → Artifact data remains unchanged, AI reports the error.
- What happens when the user asks to remove ALL dates? → AI confirms this will empty the calendar and asks for confirmation.
- What happens when two operations are requested in one message (e.g., "remova Carnaval e gere campanha de Black Friday")? → AI executes them sequentially, reporting each result.
- What happens when the user references a date by name but the system needs an ID? → The AI maps the human-readable name to the correct date ID from the artifact context.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The AI MUST be able to generate a full campaign (concept, copies, email, assets, video, timeline) for any specific date in the calendar when the user requests it.
- **FR-002**: The AI MUST be able to remove specific dates from the calendar by their identifiers.
- **FR-003**: The AI MUST be able to filter the calendar to show only specified dates.
- **FR-004**: The AI MUST be able to clear generated campaign content from specific dates while keeping the dates in the list.
- **FR-005**: The AI MUST validate that requested date identifiers exist before performing any operation, returning the list of valid identifiers when invalid ones are provided.
- **FR-006**: The artifact panel MUST update within 1 second of the AI completing its response when data was modified.
- **FR-007**: The system MUST distinguish between "generate new calendar" requests and "modify existing calendar" requests, never accidentally regenerating the entire calendar when the user intends to modify it.
- **FR-008**: The AI MUST NOT modify artifact data unless the user explicitly requests a modification — informational questions must not trigger data changes.
- **FR-009**: The AI MUST always execute the modification tool before confirming a change to the user — it must never claim to have made a change without actually executing it.
- **FR-010**: The AI MUST be provided with the current artifact state (date identifiers, names, campaign status) so it can reference the correct data in tool calls.
- **FR-011**: Campaign generation for a date MUST update only that date's campaign, leaving all other data untouched.
- **FR-012**: The system MUST handle tool execution failures gracefully — artifact data remains unchanged on failure, AI informs the user of the error.

### Key Entities

- **Task**: A user's conversation unit that contains an artifact (calendar, etc.)
- **Artifact**: The deliverable displayed in the side panel (e.g., seasonal calendar with dates and campaigns)
- **Calendar Date**: A seasonal date with metadata (id, name, priority, revenue estimate, display date)
- **Campaign**: Generated content for a date (concept/slogan, copies per channel, email subject/preview, visual assets, video scripts, execution timeline)
- **Modification Operation**: A discrete change to the artifact (generate_campaign, filter_dates, remove_dates, clear_campaigns)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can generate a campaign for any calendar date via chat, with the panel reflecting the change within 1 second of completion.
- **SC-002**: 100% of AI-confirmed modifications are actually reflected in the artifact data — zero hallucinated confirmations.
- **SC-003**: Informational questions about the calendar never trigger data modifications — 0% false-positive modification rate.
- **SC-004**: Messages containing calendar-related keywords in a modification context do not trigger full calendar regeneration — 0% accidental regeneration rate.
- **SC-005**: The artifact panel updates within 1 second of the AI finishing its response for all modification operations.
- **SC-006**: Invalid date references produce clear error messages listing valid options — users are never confused about why an operation failed.

## Assumptions

- The seasonal calendar is the primary artifact type that supports chat-driven modification. The architecture should be extensible to other artifact types in the future.
- Brand DNA and store products must exist for campaign generation to work.
- The AI model reliably calls tools when properly instructed via system prompt with clear tool descriptions and context.
- Campaign generation uses the existing `generateCampaign` function.
- The artifact panel receives updates via data refetching, not websockets.
