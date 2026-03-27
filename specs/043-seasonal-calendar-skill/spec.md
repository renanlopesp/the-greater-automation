# Feature Specification: Seasonal Calendar Skill

**Feature Branch**: `043-seasonal-calendar-skill`
**Created**: 2026-03-26
**Status**: Draft
**Input**: User description: "Seasonal Calendar Skill - A skill workspace for managing seasonal campaign dates with split-panel layout, 3-level navigable calendar artifact, activity feed, and chat with quick actions."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Reusable SkillWorkspace Layout (Priority: P1)

The split-panel workspace (chat left, artifact right) is built as a reusable component that any skill can use. The layout includes a draggable divider, a top bar with skill name/icon/status, and keyboard shortcut (Cmd+\) to toggle the artifact panel.

**Why this priority**: This is the foundation for ALL future skills. Building it correctly now means every subsequent skill (Campaign Engine, Revenue Intelligence, etc.) gets a consistent, polished workspace for free.

**Independent Test**: Can be tested by mounting the SkillWorkspace component with mock content and verifying the split layout, divider dragging, panel toggle, and top bar render correctly.

**Acceptance Scenarios**:

1. **Given** a skill is opened, **Then** the workspace shows a left chat panel and a right artifact panel, each taking approximately 50% width.
2. **Given** the workspace is visible, **When** the user drags the center divider, **Then** the panels resize proportionally.
3. **Given** the workspace is visible, **When** the user presses Cmd+\ (or Ctrl+\), **Then** the artifact panel toggles open/closed.
4. **Given** the artifact panel is open, **Then** a top bar shows navigation (back button with label) and a close button.

---

### User Story 2 - View Seasonal Calendar (Priority: P1)

A store owner opens the Seasonal Calendar skill to see all mapped seasonal dates for the year. Each date shows the event name, month, potential revenue, and current status (Concluído, Ativo, Pronto, Pendente). The calendar provides an at-a-glance view of the entire year's campaign opportunities.

**Why this priority**: This is the foundational view — without seeing the calendar, no other functionality makes sense. It establishes the core data model.

**Independent Test**: Can be fully tested by navigating to `/skills/seasonal-calendar`, seeing the hero card with summary stats, clicking it to open the artifact panel showing all dates in a scrollable list.

**Acceptance Scenarios**:

1. **Given** a store owner with an active Seasonal Calendar skill, **When** they navigate to `/skills/seasonal-calendar`, **Then** they see a hero card showing total dates mapped, total potential revenue, and the next upcoming action with countdown.
2. **Given** the hero card is visible, **When** the user clicks it, **Then** the artifact panel opens on the right side showing a scrollable list of all seasonal dates with month, day, name, potential revenue, and status badge.
3. **Given** the calendar list is open, **When** the user views the dates, **Then** dates are ordered chronologically and each shows the correct status: Concluído (gray), Ativo (green), Pronto (green), or Pendente (amber).

---

### User Story 3 - View Campaign Details for a Date (Priority: P1)

A store owner clicks on a specific date (e.g., "Dia das Mães") to see the campaign overview: the campaign concept with slogan and positioning, suggested products with tags (best-seller, liberar-estoque, etc.), and navigation to 6 content sections.

**Why this priority**: The campaign detail view is the core value proposition — showing the AI-generated campaign plan that the user can review and act on.

**Independent Test**: Can be tested by clicking any date in the calendar list and verifying the campaign concept card, product suggestions, and section navigation all render correctly.

**Acceptance Scenarios**:

1. **Given** the calendar list is open, **When** the user clicks on a date, **Then** the artifact panel navigates to the campaign detail view showing: date info (month, day), campaign name, status badge, potential revenue.
2. **Given** the campaign detail is visible, **Then** a concept card shows the campaign slogan (in quotes, italic), a brief description of the positioning, and up to 3 suggested products with name, price, and product tag.
3. **Given** the campaign detail is visible, **Then** 6 section navigation items are listed: Produtos selecionados, E-mail template, Copies por canal, Assets visuais, Script de vídeo, Timeline de disparo — each showing a count or status.

---

### User Story 4 - Drill into Campaign Sections (Priority: P2)

A store owner clicks on one of the 6 campaign sections to see detailed content. For example, "Copies por canal" shows copy text for each channel (WhatsApp VIP, WhatsApp Geral, Instagram, Meta Ad, SMS) with timing (D-7, D-1, etc.) and actions to Copy, Edit, or Regenerate each piece.

**Why this priority**: This is where the user gets actionable content they can use directly. Without drill-down, the campaign overview is informational but not actionable.

**Independent Test**: Can be tested by navigating to a date, clicking any section, and verifying the detailed content renders with appropriate actions.

**Acceptance Scenarios**:

1. **Given** the campaign detail is showing sections, **When** the user clicks "Copies por canal", **Then** the artifact panel navigates to show individual copy cards for each channel, each with channel name, timing tag, copy text, and action buttons.
2. **Given** a section detail view is open, **When** the user clicks "Copiar" on a copy card, **Then** the text is copied to clipboard.
3. **Given** a section detail view is open, **Then** the breadcrumb navigation updates to show the current path (e.g., "← Dia das Mães") and the user can navigate back.

---

### User Story 5 - Chat with Quick Actions (Priority: P2)

A store owner interacts with the Seasonal Calendar through a chat interface on the left panel. Before any message, quick action suggestions appear (e.g., "Qual a próxima data importante?", "Gerar briefing de Dia das Mães", "Mostrar calendário"). After a response, follow-up suggestions guide the next action.

**Why this priority**: The chat makes the skill interactive and conversational, but the calendar artifact itself delivers value even without chat functionality.

**Independent Test**: Can be tested by clicking quick action buttons and verifying suggestions appear, and that clicking them populates the chat input.

**Acceptance Scenarios**:

1. **Given** the user opens the Seasonal Calendar skill, **When** no messages exist yet, **Then** quick action pill buttons appear above the input field.
2. **Given** quick actions are visible, **When** the user clicks one, **Then** the action text is sent as a chat message.
3. **Given** a chat response is received, **Then** follow-up suggestion buttons appear below the response for continued interaction.

---

### User Story 6 - Seed Seasonal Calendar as First Real Skill (Priority: P1)

The Seasonal Calendar is inserted into the `skills` database table as the first real skill record, associated with the user's team. The skills page shows it from the database instead of the static fallback.

**Why this priority**: Without database seeding, the skill only exists in static code. Seeding establishes the pattern for all future skills and validates the data model end-to-end.

**Independent Test**: Can be tested by running the seed action, then navigating to `/skills` to see it listed from database data.

**Acceptance Scenarios**:

1. **Given** the team has no skills in the database, **When** the seed action runs, **Then** a Seasonal Calendar skill record is created with slug "seasonal-calendar", category, emoji, and status "active".
2. **Given** the skill exists in the database, **When** the user visits `/skills`, **Then** the Seasonal Calendar appears in the "Ativas" section with data from the database.
3. **Given** the skill exists in the database, **When** the user clicks on it, **Then** they navigate to `/skills/seasonal-calendar` and see the SkillWorkspace.

---

### Edge Cases

- What happens when the user has no seasonal dates mapped yet? Show an empty state with a call-to-action to generate the calendar.
- What happens when the artifact panel is toggled closed? Chat fills the full width; the hero card and quick actions remain functional.
- What happens when the user navigates back from level 3 to level 2 to level 1? Each back action pops one navigation level; closing the panel resets to level 1.
- What happens on mobile (< 768px)? The artifact panel opens as a full-screen overlay instead of a side panel.
- What happens when the concept "Regenerar" button is clicked? The concept cycles to the next alternate (up to 3 alternates per date).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a reusable SkillWorkspace component with split-panel layout (chat + artifact), draggable divider, and keyboard toggle (Cmd+\).
- **FR-002**: System MUST display a hero card on the Seasonal Calendar empty state showing total dates, total potential revenue, and next upcoming action with countdown.
- **FR-003**: System MUST render a scrollable list of seasonal dates in the artifact panel, ordered chronologically, each showing month, day, event name, potential revenue, and status badge.
- **FR-004**: System MUST support 3 levels of artifact navigation: Level 1 (date list), Level 2 (campaign detail with concept + sections), Level 3 (section content with actions).
- **FR-005**: System MUST display campaign concept with slogan, positioning description, and up to 3 suggested products with tags.
- **FR-006**: System MUST provide 6 navigable campaign sections: Produtos, E-mail, Copies, Assets, Vídeo, Timeline.
- **FR-007**: System MUST provide Copy, Edit, and Regenerate actions on content items in Level 3 views.
- **FR-008**: System MUST display quick action suggestion pills before the first chat message and follow-up suggestions after responses.
- **FR-009**: System MUST seed the Seasonal Calendar skill record into the `skills` database table with proper metadata.
- **FR-010**: System MUST show the Seasonal Calendar on the skills page from database data.
- **FR-011**: System MUST support breadcrumb-style back navigation in the artifact panel top bar.
- **FR-012**: System MUST display status badges with appropriate colors: Concluído (gray), Ativo (green), Pronto (green variant), Pendente (amber).

### Key Entities

- **Skill**: A capability that can be activated for a team — has slug, name, description, category, emoji, status, and configuration. Stored in `skills` table.
- **Seasonal Date**: A calendar date with event name, month/day, potential revenue estimate, and campaign status. Part of the skill's generated content.
- **Campaign**: The AI-generated plan for a seasonal date — includes concept (slogan, positioning, alternates), selected products, email template, channel copies, visual assets, video scripts, and dispatch timeline.
- **Campaign Section**: One of 6 content categories within a campaign (Produtos, E-mail, Copies, Assets, Vídeo, Timeline), each containing editable/regenerable items.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can view all seasonal dates and their campaign status within 2 seconds of opening the skill.
- **SC-002**: Users can navigate from the date list to a specific campaign section (3 levels deep) in under 3 clicks.
- **SC-003**: The SkillWorkspace component is reusable — can be mounted with different skill content without modification to the layout component.
- **SC-004**: The Seasonal Calendar skill appears on the skills page from database records, validating the end-to-end data flow.
- **SC-005**: Users can copy campaign content (copies, email text) to clipboard in a single click.
- **SC-006**: The artifact panel navigation supports forward/back transitions smoothly, with clear breadcrumb labels at each level.

## Assumptions

- Campaign data (dates, concepts, copies, etc.) will initially be static/mock data matching the prototype. Real AI generation will be added in a future iteration.
- The chat functionality in this iteration sends messages but responses are simulated. Real AI chat integration is out of scope for the initial implementation.
- The Seasonal Calendar is the first skill to use the SkillWorkspace, so the component API will be designed to accommodate future skills.
- Product suggestions in campaigns reference store products but do not require real product data in this iteration.
- The skill seed action will be triggered during onboarding or manually, not automatically for existing teams.
