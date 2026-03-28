# Research: Seasonal Calendar AI Integration

**Feature**: 044-seasonal-calendar-ai
**Date**: 2026-03-27 (v2 — personalized calendar)

## Decision 1: Personalized Calendar Generation

**Decision**: Use `generateObject()` to produce a personalized list of 10-20 seasonal dates based on brand DNA, store products, and current date. The calendar is generated once when the skill is activated and stored in `skill_executions`.

**Rationale**: A static list of 15 dates is irrelevant — a pet shop doesn't care about Dia dos Namorados, and a dental clinic needs Dia do Dentista. The brand DNA already contains an `opportunities` field with AI-identified seasonal opportunities for the niche. We use this as a seed and expand with universal commercial dates filtered by relevance.

**Alternatives considered**:

- Static curated list per niche category — rejected because niches are too varied and the list would need manual maintenance.
- User manually picks dates — rejected because users don't know which dates have highest revenue potential for their niche.
- Generate calendar on every visit — rejected because it's wasteful (5-10s wait each time) and results should be deterministic for a given brand DNA.

## Decision 2: Two-Tier Date System

**Decision**: Calendar dates are classified as `universal` (commercial dates relevant to most stores) or `niche` (specific to the store's market). The AI decides which universal dates are relevant and generates niche dates.

**Rationale**: Universal dates like Black Friday and Natal are relevant to almost everyone but should still be filtered (a B2B SaaS store doesn't need Dia das Crianças). Niche dates (Dia do Dentista, Dia da Consciência Negra, Semana do Bebê) are the real differentiator and can only be identified by analyzing the brand DNA and products.

**Input signals for date selection**:

- `brand_dna.niche` → primary filter (e.g., "moda bebê" → Dia do Bebê, Semana do Bebê)
- `brand_dna.audience` → demographic filter (e.g., audience is women 25-40 → Dia da Mulher)
- `brand_dna.opportunities` → seed dates already identified by the brand DNA analyzer
- `store_products[].category` → product-based dates (e.g., pet products → Dia dos Animais)
- `brand_dna.average_ticket` → revenue estimates per date

## Decision 3: Time-Awareness & Year Boundary

**Decision**: Calendar is time-aware — only future dates are shown as actionable. Past dates appear in a "historical" section (if they have campaigns). When >70% of dates have passed, a banner suggests generating next year's calendar.

**Rationale**: A user activating in October shouldn't see Dia das Mães (May) as something to prepare for. They need to focus on Black Friday and Natal. If most of the year is gone, the real value is planning ahead for next year with full coverage.

**Implementation**:

- `PersonalizedDate.status` is derived client-side: `date < today → 'past'`, `date >= today && campaign exists → 'generated'`, else `'upcoming'`
- `PersonalizedCalendar.nextYearSuggested` is set when `pastCount / totalCount > 0.7`
- `daysUntil` computed client-side for urgency indicators

## Decision 4: Campaign Generation Approach (unchanged from v1)

**Decision**: Use `generateObject()` with Zod schemas for full campaign generation. Single call produces all 7 sections.

**Rationale**: Same pattern as `brand-dna-analyzer.ts`. Type-safe, validated, consistent.

## Decision 5: Data Persistence Strategy (updated)

**Decision**: Store both calendar and campaigns in `skill_executions`. Calendar uses `input: { type: "calendar", year: 2026 }`. Campaigns use `input: { type: "campaign", dateId: "dia-das-maes-2026" }`. One record each, upserted on regeneration.

**Rationale**: No migration needed. The `type` field in input distinguishes record types. Querying by `input->>'type'` is efficient with a GIN index on jsonb.

**Alternatives considered**:

- New `seasonal_calendars` table — rejected per YAGNI. `skill_executions` is sufficient.
- Calendar stored in brand_dna — rejected because calendar is a separate concern and shouldn't pollute brand DNA.

## Decision 6: Chat Integration (unchanged from v1)

**Decision**: `useSkillChat()` wraps `useOrchestratorChat()` with `skillContext: 'seasonal-calendar'`.

## Decision 7: Section Regeneration (unchanged from v1)

**Decision**: Separate API route, section-specific Zod schema, existing concept as context for coherence.

## Decision 8: Code Cleanup (unchanged from v1)

**Decision**: Address all HIGH/MEDIUM issues from Vercel React audit as Phase 0 before new features.

## Decision 9: Static Data Removal

**Decision**: Remove hardcoded `CAMPAIGN_DATA` and `SEASONAL_DATES` from `campaign-data.ts`. Keep only TypeScript type definitions. All data comes from AI generation + database.

**Rationale**: Static data was demo scaffolding. With real AI generation and persistence, the static data is dead weight that could confuse developers (which data is real? which is demo?). Types stay because they define the contract.

**Migration path**: Components that currently import `SEASONAL_DATES` and `getCampaignData()` will be updated to receive data from the `useSeasonalCalendar` hook instead.
