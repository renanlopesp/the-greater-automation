# Tasks: Seasonal Calendar AI Integration

**Input**: Design documents from `/specs/044-seasonal-calendar-ai/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not included (not requested).

**Organization**: Tasks grouped by user story. Calendar generation (US1) is the new MVP — without personalized dates, nothing else works.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Cleanup & Shared Infrastructure)

**Purpose**: Fix tech debt from Vercel React audit, extract shared code, prepare foundation.

- [x] T001 [P] Extract shared `ChatMessage` type into `src/components/skill-workspace/types.ts` and update imports in `skill-workspace.tsx` and `skill-chat-panel.tsx`
- [x] T002 [P] Extract shared `ProductThumb` and `StatusBadge` components into `src/components/skills/seasonal-calendar/shared.tsx`, remove duplicates from `calendar-level1.tsx`, `calendar-level2.tsx`, `calendar-level3.tsx`
- [x] T003 [P] Fix `ArtifactNavProvider` re-renders — wrap `push`, `pop`, `reset` in `useCallback` and context value in `useMemo` in `src/components/skill-workspace/artifact-nav-context.tsx`
- [x] T004 [P] Remove dead code: unused `initialPercent`/`containerRef` in `draggable-divider.tsx`, unused `handleQuickAction` in `skill-workspace.tsx`, unused `cn` import in `calendar-level3.tsx`, double arrow in `skill-artifact-panel.tsx`
- [x] T005 [P] Remove redundant `"use client"` from `src/components/skills/seasonal-calendar/seasonal-calendar-workspace.tsx`
- [x] T006 [P] Replace hardcoded hex/hsl colors in `productTagConfig()` in `src/data/campaign-data.ts` and `ProductThumb` gradient in `shared.tsx` with CSS variables
- [x] T007 [P] Hoist `sections` array outside component in `src/components/skills/seasonal-calendar/calendar-level2.tsx`

**Checkpoint**: All cleanup done. `bun run build` passes. Zero regressions.

---

## Phase 2: Foundational (AI Engine + Persistence)

**Purpose**: Calendar generation, campaign generation, and data persistence layer. Required by ALL user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T008 Create Zod schemas for `PersonalizedCalendar`, `PersonalizedDate` in `src/lib/ai/seasonal-campaign-generator.ts`
- [x] T009 Implement `generateCalendar(brandDna, products, currentDate, year)` function using `generateObject()` in `src/lib/ai/seasonal-campaign-generator.ts` — uses brand_dna.opportunities as seed, adds universal dates filtered by niche, adds niche-specific micro-dates from product categories, filters past dates, estimates revenue per date
- [x] T010 Create Zod schemas for `FullCampaign` and all sub-types (`CampaignConcept`, `CampaignCopy`, `CampaignAsset`, `CampaignVideoScript`, `CampaignTimelineItem`) in `src/lib/ai/seasonal-campaign-generator.ts`
- [x] T011 Implement `generateCampaign(date, brandDna, products)` function using `generateObject()` in `src/lib/ai/seasonal-campaign-generator.ts`
- [x] T012 Implement `regenerateSection(sectionType, existingCampaign, brandDna)` function for single-section regeneration in `src/lib/ai/seasonal-campaign-generator.ts`
- [x] T013 [P] Create server actions `loadCalendar(teamId, year)`, `loadTeamCampaigns(teamId)`, `loadCampaign(teamId, dateId)` in `src/lib/actions/seasonal-calendar.ts`
- [x] T014 [P] Create API route `POST /api/skills/seasonal-calendar/generate-calendar` in `src/app/api/skills/seasonal-calendar/generate-calendar/route.ts` — auth, fetch brand DNA + products, call `generateCalendar`, save to `skill_executions` with input `{type:"calendar", year}`, return calendar
- [x] T015 [P] Create API route `POST /api/skills/seasonal-calendar/generate` in `src/app/api/skills/seasonal-calendar/generate/route.ts` — auth, fetch brand DNA + products, call `generateCampaign`, save to `skill_executions` with input `{type:"campaign", dateId}`, return campaign
- [x] T016 Create API route `POST /api/skills/seasonal-calendar/regenerate` in `src/app/api/skills/seasonal-calendar/regenerate/route.ts` — auth, load existing campaign, handle concept (full regen) vs section (partial regen), merge + save, return updated campaign

**Checkpoint**: All 3 API routes functional. Test with curl: `POST /api/skills/seasonal-calendar/generate-calendar` returns personalized dates. `POST /api/skills/seasonal-calendar/generate {"dateId":"..."}` returns full campaign.

---

## Phase 3: User Story 1 — Generate Personalized Calendar (Priority: P1) MVP

**Goal**: User opens skill → AI generates personalized seasonal dates based on their brand DNA, products, and current date.

**Independent Test**: Two stores with different niches get meaningfully different date lists.

### Implementation for User Story 1

- [x] T017 [US1] Create `useSeasonalCalendar()` React Query hook in `src/hooks/use-seasonal-calendar.ts` — query `loadCalendar` on mount, mutation `generateCalendar(year)` calling the generate-calendar API route, query `loadTeamCampaigns` for campaign statuses
- [x] T018 [US1] Update `src/components/skills/seasonal-calendar/seasonal-calendar-workspace.tsx` to use `useSeasonalCalendar` hook, pass calendar data + functions to child components
- [x] T019 [US1] Update `src/components/skills/seasonal-calendar/calendar-artifact.tsx` to receive personalized dates from hook instead of static `SEASONAL_DATES`. Auto-trigger calendar generation on first visit if no calendar exists. Show brand DNA guard if missing.
- [x] T020 [US1] Update `src/components/skills/seasonal-calendar/calendar-level1.tsx` to render `PersonalizedDate[]` from hook — show type badge (universal/niche), relevance reason, time-aware status (past/upcoming/generated), revenue estimate, days-until countdown for upcoming dates
- [x] T021 [US1] Update `src/components/skills/seasonal-calendar/calendar-hero-card.tsx` with real stats from `PersonalizedCalendar.summary` (totalDates, totalPotentialRevenue, nextActionableDate)
- [x] T022 [US1] Add Skeleton loading state in `calendar-level1.tsx` for initial calendar generation (~5-10s)
- [x] T023 [US1] Add "next year" banner — when `calendar.nextYearSuggested === true`, show a CTA to generate next year's calendar. Wire to `generateCalendar(currentYear + 1)` mutation.
- [x] T024 [US1] Add brand DNA missing guard in `calendar-artifact.tsx` — if no brand DNA exists, show explanatory card with link to run brand DNA analysis skill

**Checkpoint**: Personalized calendar works end-to-end. Different stores get different dates. Time-awareness correct. Next-year banner shows when appropriate.

---

## Phase 4: User Story 2 — Generate Campaign for a Date (Priority: P1)

**Goal**: User selects a date from their personalized calendar and generates a full campaign.

**Independent Test**: Select a date → click Generate → complete campaign appears with store-specific content.

### Implementation for User Story 2

- [x] T025 [US2] Add `generateCampaign(dateId, dateName)` mutation to `useSeasonalCalendar` hook in `src/hooks/use-seasonal-calendar.ts`
- [x] T026 [US2] Update `src/components/skills/seasonal-calendar/calendar-level1.tsx` to add "Generate Campaign" button for dates with status `upcoming`. On click, call `generateCampaign` mutation then navigate to level 2.
- [x] T027 [US2] Update `src/components/skills/seasonal-calendar/calendar-level2.tsx` to render real campaign data from the hook (via `loadCampaign`) instead of static `getCampaignData()`
- [x] T028 [US2] Update `src/components/skills/seasonal-calendar/calendar-level3.tsx` to render real section data from the campaign in the hook
- [x] T029 [US2] Add Skeleton loading states in `calendar-level2.tsx` for campaign generation (~10-20s)
- [x] T030 [US2] Add error handling — inline alert with retry when generation fails

**Checkpoint**: Full campaign generation works. User sees personalized content. Skeleton loading during generation. Error handling works.

---

## Phase 5: User Story 3 — View Saved Campaigns & Calendar (Priority: P1)

**Goal**: Calendar and campaigns persist across sessions. Instant load on revisit.

**Independent Test**: Generate calendar + campaign, refresh page, reopen skill → everything loads <1s.

### Implementation for User Story 3

- [x] T031 [US3] Ensure `useSeasonalCalendar` queries run on mount with proper React Query caching in `src/hooks/use-seasonal-calendar.ts` — `staleTime` set to avoid unnecessary refetches
- [x] T032 [US3] Update `calendar-level1.tsx` to derive status from campaigns map: if `campaigns[dateId]` exists → `generated`, else if `date >= today` → `upcoming`, else → `past`. Show distinct visual badge for each status.
- [x] T033 [US3] Verify instant load path — clicking a date with saved campaign renders level2 immediately from React Query cache (no loading state, no API call)

**Checkpoint**: Persistence works. Refresh preserves everything. Statuses correct. Instant load for saved data.

---

## Phase 6: User Story 4 — Regenerate Individual Sections (Priority: P2)

**Goal**: Regenerate a single campaign section without affecting the rest.

**Independent Test**: Regenerate Copies → only copies change.

### Implementation for User Story 4

- [x] T034 [US4] Add `regenerateSection(dateId, sectionType)` mutation to `useSeasonalCalendar` hook in `src/hooks/use-seasonal-calendar.ts`
- [x] T035 [US4] Wire "Regenerate" buttons in `src/components/skills/seasonal-calendar/calendar-level3.tsx` to call `regenerateSection` mutation
- [x] T036 [US4] Add per-section Skeleton loading in `calendar-level3.tsx` — only the regenerating section shows skeleton
- [x] T037 [US4] Ensure React Query cache update after regeneration replaces only the affected campaign in `use-seasonal-calendar.ts`

**Checkpoint**: Section regeneration works. Only targeted section changes.

---

## Phase 7: User Story 5 — Chat with AI (Priority: P2)

**Goal**: Chat panel connected to orchestrator with seasonal calendar context.

**Independent Test**: Type message → AI responds with calendar-aware context.

### Implementation for User Story 5

- [x] T038 [US5] Create `useSkillChat(skillSlug)` hook in `src/hooks/use-skill-chat.ts` — wraps `useOrchestratorChat` with `skillContext` in request body
- [x] T039 [US5] Update `src/components/skill-workspace/skill-workspace.tsx` to accept chat props (`messages`, `isLoading`, `isStreaming`, `onSendMessage`, `onStopStreaming`) instead of internal static state
- [x] T040 [US5] Update `src/components/skill-workspace/skill-chat-panel.tsx` to render real `UIMessage` parts (text, streaming) using shared `ChatMessage` type from `types.ts`
- [x] T041 [US5] Update `src/components/skills/seasonal-calendar/seasonal-calendar-workspace.tsx` to use `useSkillChat('seasonal-calendar')` and pass chat props to `SkillWorkspace`
- [x] T042 [US5] Wire quick action pills to call `sendMessage(pillText)` for real AI responses

**Checkpoint**: Chat works end-to-end. Quick actions work. Streaming renders correctly.

---

## Phase 8: User Story 6 — Regenerate Full Concept (Priority: P3)

**Goal**: Regenerate entire campaign concept, cascading to all sections.

**Independent Test**: Click Regenerate on concept → new concept + all sections change.

### Implementation for User Story 6

- [x] T043 [US6] Wire "Regenerate" button on concept card in `src/components/skills/seasonal-calendar/calendar-level2.tsx` to call `regenerateSection(dateId, 'concept')` mutation
- [x] T044 [US6] Add full-campaign Skeleton loading in `calendar-level2.tsx` when concept is regenerating (covers entire view)
- [x] T045 [US6] Ensure regenerate API route handles `sectionType='concept'` by calling full `generateCampaign` in `src/app/api/skills/seasonal-calendar/regenerate/route.ts`

**Checkpoint**: Full concept regeneration works. New creative direction, all sections updated.

---

## Phase 9: User Story 7 — Regenerate Calendar (Priority: P3)

**Goal**: User can refresh their calendar for updated dates or next year.

**Independent Test**: Click Regenerate Calendar → new date list appears.

### Implementation for User Story 7

- [x] T046 [US7] Add "Regenerate Calendar" button to `calendar-hero-card.tsx` or `calendar-level1.tsx` header area
- [x] T047 [US7] Wire button to `generateCalendar(year)` mutation, with loading state during regeneration

**Checkpoint**: Calendar regeneration works. New dates appear reflecting current state.

---

## Phase 10: Polish & Cross-Cutting

**Purpose**: Final cleanup and verification.

- [x] T048 [P] Remove static `CAMPAIGN_DATA` and `SEASONAL_DATES` from `src/data/campaign-data.ts` — keep only type definitions
- [x] T049 [P] Add `next/dynamic` lazy loading for `CalendarLevel2` and `CalendarLevel3` in `calendar-artifact.tsx`
- [x] T050 Verify `bun run build` passes with zero errors
- [x] T051 Verify `bun run lint` passes with zero warnings
- [ ] T052 Run quickstart.md validation — follow all testing steps and verify each works

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Cleanup) ────────────────────────────────────────────────┐
     │                                                             │
Phase 2 (Foundation: AI Engine + Persistence + 3 API routes)       │
     │                                                             │
Phase 3 (US1: Personalized Calendar) ── MVP CHECKPOINT             │
     │                                                             │
Phase 4 (US2: Generate Campaign)                                   │
     │                                                             │
Phase 5 (US3: View Saved) ── PERSISTENCE CHECKPOINT                │
     │                                                             │
     ├──→ Phase 6 (US4: Regen Sections)  ──→ Phase 8 (US6: Regen Concept)
     │                                                             │
     ├──→ Phase 7 (US5: Chat) ←────────────────────────────────────┘
     │                                                             │
     └──→ Phase 9 (US7: Regen Calendar)                            │
                                                                   │
                                                     Phase 10 (Polish)
```

### Parallel Opportunities

- **Phase 1**: All 7 tasks parallel
- **Phase 2**: T013 + T014 + T015 parallel after T009-T012
- **Phase 3**: T020 + T021 parallel (different components)
- **Phase 6 + Phase 7 + Phase 9**: All independent, can run in parallel
- **Phase 10**: T048 + T049 parallel

### User Story Independence

- **US1 (Calendar)**: Standalone after Foundation — **MVP**
- **US2 (Generate Campaign)**: Needs US1 (dates must exist)
- **US3 (View Saved)**: Needs US2 (campaigns must exist)
- **US4 (Regen Sections)**: Needs Foundation only (regenerate API)
- **US5 (Chat)**: Needs Phase 1 only (shared types)
- **US6 (Regen Concept)**: Needs US4 (regeneration infrastructure)
- **US7 (Regen Calendar)**: Needs US1 (calendar must exist)

---

## Implementation Strategy

### MVP First (Phases 1-3: 24 tasks)

1. Cleanup → Foundation → Personalized Calendar
2. **STOP and VALIDATE**: Two different stores get different calendars
3. This alone is a demo-able, valuable feature

### Core Delivery (Phases 4-5: +9 tasks = 33 total)

4. Add campaign generation → campaigns persist → full planning tool
5. **STOP and VALIDATE**: Generate, refresh, load — all works

### Full Feature (Phases 6-9: +14 tasks = 47 total)

6. Section regeneration + Chat + Concept regen + Calendar regen
7. All iteration and conversation features

### Polish (Phase 10: +5 tasks = 52 total)

8. Remove static data, lazy loading, build verification

---

## Notes

- Brand DNA `opportunities` field is the seed for calendar generation — it already contains AI-identified seasonal opportunities
- `store_products[].category` used to identify niche-specific micro-dates (pet products → Dia dos Animais)
- `skill_executions.input->>'type'` distinguishes calendar vs campaign records
- All content generated in PT-BR matching store's brand voice from `brand_dna.tone`
