# Quickstart: Seasonal Calendar AI Integration

**Feature**: 044-seasonal-calendar-ai
**Date**: 2026-03-27 (v2 — personalized calendar)

## Prerequisites

- Supabase running with `skills`, `skill_executions`, `brand_dna`, `store_products` tables
- At least one store with completed brand DNA analysis (onboarding done)
- `OPENAI_API_KEY` set in `.env.local`

## Dev Commands

```bash
bun dev          # Start dev server
bun run build    # Build check
bun run lint     # Lint
```

## Implementation Order

### Phase 0: Cleanup (no new features)

1. Extract shared types (`ChatMessage` → `types.ts`)
2. Extract shared components (`ProductThumb`, `StatusBadge` → `shared.tsx`)
3. Fix `ArtifactNavProvider` re-renders (useCallback/useMemo)
4. Remove dead code (unused props, wrappers, imports)
5. Replace hardcoded hex/hsl with CSS variables
6. Remove redundant `"use client"`

### Phase 1: Calendar Generation Engine

1. Create Zod schema for `PersonalizedCalendar` + `PersonalizedDate`
2. Create `generateCalendar(brandDna, products, currentDate, year)` function
3. Create API route `POST /api/skills/seasonal-calendar/generate-calendar`
4. Create server actions `loadCalendar`, `loadTeamCampaigns`, `loadCampaign`

### Phase 2: Campaign Generation Engine

1. Create Zod schemas for `FullCampaign` and all sub-types
2. Create `generateCampaign(date, brandDna, products)` function
3. Create `regenerateSection(sectionType, existingCampaign, brandDna)` function
4. Create API route `POST /api/skills/seasonal-calendar/generate`
5. Create API route `POST /api/skills/seasonal-calendar/regenerate`

### Phase 3: React Query Hooks

1. Create `useSeasonalCalendar()` hook — queries + mutations for calendar and campaigns
2. Create `useSkillChat('seasonal-calendar')` hook — chat wrapper

### Phase 4: UI — Calendar View (US1 + US3)

1. Update `seasonal-calendar-workspace.tsx` — wire hooks
2. Update `calendar-artifact.tsx` — personalized data from hook
3. Update `calendar-level1.tsx` — personalized dates, time-aware status, Generate button
4. Update `calendar-hero-card.tsx` — real stats from personalized calendar
5. Add loading states and brand DNA guard
6. Add "next year" banner when >70% dates passed

### Phase 5: UI — Campaign View (US2 + US4)

1. Update `calendar-level2.tsx` — real campaign data, Regenerate concept
2. Update `calendar-level3.tsx` — real section data, Regenerate section
3. Add skeleton loading states per section

### Phase 6: Chat Integration (US5)

1. Update `skill-workspace.tsx` — accept chat props
2. Update `skill-chat-panel.tsx` — real messages
3. Wire everything in `seasonal-calendar-workspace.tsx`

### Phase 7: Polish

1. Remove static `CAMPAIGN_DATA` and `SEASONAL_DATES` from `campaign-data.ts`
2. Add `next/dynamic` for CalendarLevel2 and CalendarLevel3
3. Verify build and lint pass

## Testing the Feature

### Calendar Generation

1. Open the app → Skills → Seasonal Calendar
2. First visit → should show loading (5-10s) → then personalized dates
3. Dates should be relevant to the store's niche
4. Dates should be chronological, only future dates as actionable
5. Pet shop should see "Dia dos Animais", fashion store should see "Dia dos Namorados"

### Campaign Generation

1. Click any upcoming date → click "Generate Campaign"
2. Wait 10-20s (skeleton) → full campaign appears
3. Verify campaign references real products from the store
4. Verify copies match brand tone

### Persistence

1. Refresh the page → reopen skill
2. Calendar should load instantly
3. Generated campaigns should load instantly
4. Status badges should be correct (generated vs upcoming vs past)

### Section Regeneration

1. Drill into a section (e.g., Copies)
2. Click "Regenerate" → only that section reloads (3-8s)
3. Other sections unchanged

### Chat

1. Type a message → AI responds with calendar context
2. Click quick action pill → AI responds

### Time-Awareness

1. If >70% of dates have passed → "Generate Calendar for Next Year" banner visible
2. Past dates show "past" status, not actionable

## Key Files

| File                                                              | Purpose                                           |
| ----------------------------------------------------------------- | ------------------------------------------------- |
| `src/lib/ai/seasonal-campaign-generator.ts`                       | AI generation: calendar + campaigns + Zod schemas |
| `src/app/api/skills/seasonal-calendar/generate-calendar/route.ts` | POST — personalized calendar                      |
| `src/app/api/skills/seasonal-calendar/generate/route.ts`          | POST — full campaign                              |
| `src/app/api/skills/seasonal-calendar/regenerate/route.ts`        | POST — section regeneration                       |
| `src/lib/actions/seasonal-calendar.ts`                            | Server actions for DB read/write                  |
| `src/hooks/use-seasonal-calendar.ts`                              | React Query hook for calendar + campaigns         |
| `src/hooks/use-skill-chat.ts`                                     | Chat hook wrapper                                 |
| `src/components/skill-workspace/types.ts`                         | Shared types                                      |
| `src/components/skills/seasonal-calendar/shared.tsx`              | Shared components                                 |
