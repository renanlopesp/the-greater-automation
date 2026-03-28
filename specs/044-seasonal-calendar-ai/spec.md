# Feature Specification: Seasonal Calendar AI Integration

**Feature Branch**: `044-seasonal-calendar-ai`
**Created**: 2026-03-27
**Status**: Draft (v2 — personalized calendar)
**Input**: User description: "AI integration for the Seasonal Calendar skill. Personalized date generation based on brand DNA and product catalog. Campaign generation engine, chat integration, data persistence, section regeneration."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate Personalized Calendar (Priority: P1)

A store owner activates the Seasonal Calendar skill. The system analyzes their brand DNA (niche, audience, products) and the current date to generate a personalized list of relevant seasonal dates for the remainder of the year. A fashion store sees Dia dos Namorados, Dia das Mães, and Black Friday. A pet shop sees Dia dos Animais, Outubro Pet, and Natal. A dental clinic sees Dia do Dentista, Mês da Saúde Bucal, and Dia do Sorriso. Each date includes an estimated revenue potential based on the store's average ticket and niche.

The calendar includes two types of dates:

- **Universal commercial dates**: Black Friday, Natal, Dia das Mães, etc. — relevant to most stores, filtered by niche
- **Niche-specific dates**: Dia do Dentista, Dia da Consciência Negra, Semana do Bebê, etc. — generated based on brand DNA and product catalog

**Why this priority**: Without personalized dates, the calendar is generic and irrelevant. A baby store doesn't need "Dia dos Namorados" prominently featured. Personalization is the fundamental differentiator.

**Independent Test**: Can be tested by having two stores with different niches (e.g., moda feminina vs pet shop), activating the skill for each, and verifying the generated date lists are meaningfully different.

**Acceptance Scenarios**:

1. **Given** a store with brand DNA activated in March, **When** user opens the Seasonal Calendar for the first time, **Then** the system generates a personalized list of 10-20 relevant dates from today through December, ordered chronologically.
2. **Given** a store with brand DNA activated in October, **When** user opens the calendar, **Then** the system shows only remaining dates (Black Friday, Natal, etc.) plus a suggestion to generate a calendar for the next year.
3. **Given** a store without brand DNA, **When** user tries to open the calendar, **Then** the system shows a message explaining brand DNA analysis is required first.
4. **Given** the calendar is being generated (~5-10 seconds), **When** user waits, **Then** the system shows a loading state with a message like "Analisando seu nicho e gerando datas relevantes..."
5. **Given** a pet shop brand DNA, **When** calendar is generated, **Then** it includes niche dates like "Dia dos Animais (4 Out)", "Outubro Pet" alongside universal dates like "Black Friday", but excludes irrelevant dates like "Dia dos Namorados" (low relevance for pets).
6. **Given** a calendar was already generated, **When** user reopens the skill, **Then** the saved calendar loads instantly from the database.

---

### User Story 2 - Generate Campaign for a Date (Priority: P1)

A store owner selects a date from their personalized calendar and clicks "Generate Campaign". The system creates a full campaign briefing personalized to the store's brand, products, and the specific seasonal date.

**Why this priority**: This is the core deliverable — actionable campaign content. The personalized calendar (US1) selects WHICH dates matter; this story generates WHAT to do for each date.

**Independent Test**: Can be tested by having a store with a generated calendar, selecting any date, clicking Generate, and verifying a complete campaign appears with store-specific content.

**Acceptance Scenarios**:

1. **Given** a store with brand DNA, products, and a generated calendar, **When** user selects a date and clicks "Generate Campaign", **Then** the system generates a full campaign with concept, products, copies, email, assets, video scripts, and timeline — all personalized to the store's brand and the specific date.
2. **Given** a store with brand DNA but no products, **When** user generates a campaign, **Then** the system generates the campaign with generic product suggestions based on the store's niche.
3. **Given** a campaign is being generated (~10-20 seconds), **When** user waits, **Then** the system shows a skeleton loading state.

---

### User Story 3 - View Saved Campaigns & Calendar (Priority: P1)

A store owner opens the Seasonal Calendar and sees their personalized dates with clear status indicators: which dates have campaigns generated, which are upcoming, and which have passed. They click on a previously generated date and see the full campaign instantly.

**Why this priority**: Without persistence, users lose all work on page refresh. The calendar must function as a living planning tool across sessions.

**Independent Test**: Can be tested by generating a calendar and campaigns, refreshing the page, and verifying everything loads instantly.

**Acceptance Scenarios**:

1. **Given** a calendar and some campaigns were previously generated, **When** user opens the Seasonal Calendar, **Then** the calendar loads instantly with correct statuses: "generated" for dates with campaigns, "upcoming" for future dates without campaigns, "past" for dates that have passed.
2. **Given** a date has a saved campaign, **When** user clicks on it, **Then** the campaign loads instantly from the database.
3. **Given** >70% of the year's dates have passed, **When** user opens the calendar, **Then** a banner suggests generating a calendar for next year.

---

### User Story 4 - Regenerate Individual Sections (Priority: P2)

A store owner views a generated campaign and wants to improve a specific section. They click "Regenerate" on that section and only that section is re-generated while the rest remains unchanged.

**Why this priority**: Fine-grained iteration on campaign content without losing approved sections.

**Independent Test**: Can be tested by generating a campaign, clicking Regenerate on Copies, and verifying only copies change.

**Acceptance Scenarios**:

1. **Given** a date has a generated campaign, **When** user clicks "Regenerate" on the Copies section, **Then** only the copies are regenerated; all other sections remain unchanged.
2. **Given** user regenerates a section, **When** regeneration completes, **Then** the updated section is persisted to the database.
3. **Given** a section is being regenerated, **When** user waits, **Then** only that section shows a loading state.

---

### User Story 5 - Chat with AI about Campaigns (Priority: P2)

A store owner uses the chat panel to ask questions, request modifications, or get strategic advice about their seasonal calendar and campaigns.

**Why this priority**: Natural language interface makes the tool conversational and flexible beyond structured buttons.

**Independent Test**: Can be tested by typing a message and verifying the AI responds with calendar context.

**Acceptance Scenarios**:

1. **Given** user is in the Seasonal Calendar workspace, **When** they type a message, **Then** the AI responds with context about their store's calendar and campaigns.
2. **Given** quick action pills are shown, **When** user clicks a pill, **Then** the message is sent and AI responds.
3. **Given** the AI is streaming a response, **Then** it renders incrementally.

---

### User Story 6 - Regenerate Full Campaign Concept (Priority: P3)

A store owner wants a completely different creative direction. They click "Regenerate" on the concept card, and all sections are regenerated to match the new concept.

**Why this priority**: Provides a fresh creative start without regenerating each section individually.

**Independent Test**: Can be tested by clicking Regenerate on concept and verifying new concept + all sections change.

**Acceptance Scenarios**:

1. **Given** a date has a generated campaign, **When** user clicks "Regenerate" on the concept card, **Then** a new concept and all sections are regenerated.
2. **Given** a full regeneration is in progress, **Then** a loading state covers the entire campaign view.

---

### User Story 7 - Regenerate Calendar with More Dates (Priority: P3)

A store owner wants to refresh their calendar — perhaps the year has progressed, they changed their product line, or they want to generate a calendar for next year with more coverage. They click "Regenerate Calendar" and the system produces a new personalized date list.

**Why this priority**: The calendar should evolve with the business. New products, new year, new opportunities.

**Independent Test**: Can be tested by regenerating the calendar and verifying new dates appear reflecting the current date and brand DNA.

**Acceptance Scenarios**:

1. **Given** a store with an existing calendar, **When** user clicks "Regenerate Calendar", **Then** a new set of personalized dates is generated based on current brand DNA and today's date.
2. **Given** user clicks "Generate Calendar for Next Year" banner, **When** generation completes, **Then** the calendar shows dates for the next full year.

---

### Edge Cases

- What happens when the AI generation fails mid-way? Preserve existing data, show error with retry.
- What happens when brand DNA is outdated or incomplete? Generate with available data, note limitations.
- What happens when user activates on Dec 31? Show only next year's dates.
- What happens when brand DNA changes significantly (e.g., store pivots niche)? Suggest regenerating the calendar.
- What happens with concurrent generation from team members? Last write wins.
- What happens when a seasonal date is tomorrow but no campaign was generated? Show urgency indicator.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST generate a personalized list of 10-20 seasonal dates based on brand DNA (niche, audience, positioning), store products, and the current date.
- **FR-002**: System MUST include both universal commercial dates (filtered by relevance) and niche-specific dates generated by AI.
- **FR-003**: System MUST be time-aware — only include future dates from today onward. Past dates shown as historical only.
- **FR-004**: System MUST suggest generating next year's calendar when >70% of current year dates have passed.
- **FR-005**: System MUST generate a complete campaign (concept, products, copies, email, assets, video scripts, timeline) for any date in the personalized calendar.
- **FR-006**: System MUST persist both the personalized calendar and generated campaigns in the database per team.
- **FR-007**: System MUST load saved calendar and campaigns instantly from the database on subsequent visits.
- **FR-008**: System MUST allow regeneration of individual campaign sections without affecting other sections.
- **FR-009**: System MUST allow regeneration of the full campaign concept, cascading to all sections.
- **FR-010**: System MUST allow regeneration of the calendar itself to refresh dates.
- **FR-011**: System MUST show appropriate loading states during all generation operations.
- **FR-012**: System MUST prevent any generation when brand DNA does not exist, with a clear message.
- **FR-013**: System MUST connect the chat panel to the AI orchestrator with seasonal calendar context.
- **FR-014**: System MUST support quick action pills in the chat.
- **FR-015**: System MUST visually distinguish date statuses: generated (has campaign), upcoming (no campaign yet), past (date has passed).
- **FR-016**: System MUST generate all content in Portuguese (PT-BR), matching the store's brand voice.
- **FR-017**: System MUST handle failures gracefully, preserving existing data and offering retry options.
- **FR-018**: System MUST estimate revenue potential per date based on the store's average ticket and niche positioning.

### Key Entities

- **Personalized Calendar**: A generated list of seasonal dates specific to a store/team. Contains 10-20 dates with name, date, emoji, estimated revenue, and relevance reason. Stored per team per year. Generated by AI from brand DNA analysis.
- **Campaign Execution**: A generated campaign for a specific date. Contains full campaign data (concept, all 7 sections). Linked to a team and a date from the personalized calendar.
- **Brand DNA**: Existing entity. Primary input for both calendar generation and campaign generation. Fields used: niche, tone, audience, positioning, words_to_use, words_to_avoid, opportunities, average_ticket.
- **Store Products**: Existing entity. Used to suggest real products for campaigns and to identify niche-specific dates. Optional.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Personalized calendar generation completes in under 10 seconds.
- **SC-002**: Two stores with different niches receive meaningfully different seasonal date lists (at least 30% different dates).
- **SC-003**: Users can generate a complete campaign for any date in under 20 seconds.
- **SC-004**: Saved calendars and campaigns load instantly (under 1 second) on subsequent visits.
- **SC-005**: Individual section regeneration completes in under 8 seconds.
- **SC-006**: Generated content is personalized — references real products, matches brand tone, includes niche-specific dates.
- **SC-007**: 100% of generated campaigns contain all 7 sections with no empty content.
- **SC-008**: Time-awareness works correctly — only future dates shown as actionable.
- **SC-009**: Chat responses are contextually relevant to the store's calendar and campaigns.

## Assumptions

- Brand DNA analysis is implemented and functional. The `brand_dna` table contains `niche`, `audience`, `positioning`, `opportunities`, `average_ticket` for stores that completed onboarding.
- The existing `skill_executions` table supports storing both calendar data and campaign data as JSON in the `output` column. Calendar stored as `input: { type: "calendar", year: 2026 }`, campaigns as `input: { type: "campaign", dateId: "..." }`.
- The orchestrator chat endpoint (`/api/chat`) accepts skill context.
- Store products are available via `store_products` table.
- Campaign generation uses OpenAI (same provider as the rest of the platform).
- The brand DNA `opportunities` field already contains AI-identified seasonal opportunities for the niche — this serves as a seed for calendar generation.
