# Quickstart: Seasonal Calendar Skill

## Prerequisites

- Existing `skills` table in Supabase (already exists)
- Existing skill detail page at `src/app/(dashboard)/skills/[slug]/page.tsx`
- Existing `fetchSkillsAction` server action (added in 042)

## Implementation Order

### Phase 1: Reusable SkillWorkspace (P1)

1. Create `src/components/skill-workspace/artifact-nav-context.tsx` — React context for artifact navigation stack
2. Create `src/components/skill-workspace/draggable-divider.tsx` — Pointer-event-based resizable divider
3. Create `src/components/skill-workspace/skill-chat-panel.tsx` — Left panel with messages, input, quick actions
4. Create `src/components/skill-workspace/skill-artifact-panel.tsx` — Right panel with nav bar and content area
5. Create `src/components/skill-workspace/skill-workspace.tsx` — Main layout composing all panels

### Phase 2: Seasonal Calendar Data (P1)

6. Create `src/data/campaign-data.ts` — Static campaign data (15 dates, 3 full campaigns)
7. Add `seedSeasonalCalendar` to `src/lib/actions/skills.ts`

### Phase 3: Calendar Artifact (P1)

8. Create `src/components/skills/seasonal-calendar/calendar-hero-card.tsx` — Hero card with stats
9. Create `src/components/skills/seasonal-calendar/calendar-level1.tsx` — Date list view
10. Create `src/components/skills/seasonal-calendar/calendar-level2.tsx` — Campaign detail view
11. Create `src/components/skills/seasonal-calendar/calendar-level3.tsx` — Section content view
12. Create `src/components/skills/seasonal-calendar/calendar-artifact.tsx` — Orchestrator for 3 levels

### Phase 4: Integration (P1)

13. Update `src/app/(dashboard)/skills/[slug]/page.tsx` — Render SkillWorkspace for seasonal-calendar slug

### Phase 5: Polish (P2)

14. Add section content renderers (Copies, Assets, Video, Timeline, Products, Email)
15. Add Copy to clipboard, Regenerate concept cycling
16. Add chat quick actions with static responses

## Dev Commands

```bash
bun dev                    # Start dev server
bun run build              # Verify build
bun run vitest run         # Run tests
```

## Key Files to Reference

- Prototype workspace: `/home/renanl/Projects/snew-ai-core/src/components/SkillWorkspace.tsx`
- Prototype calendar: `/home/renanl/Projects/snew-ai-core/src/pages/skills/SeasonalCalendarSkillPage.tsx`
- Prototype data: `/home/renanl/Projects/snew-ai-core/src/data/campaignData.ts`
- Existing skill detail: `src/app/(dashboard)/skills/[slug]/page.tsx`
- Existing skill actions: `src/lib/actions/skills.ts`
- CSS variables: `src/app/globals.css` (--green, --green-bg, --amber, --amber-bg, etc.)
