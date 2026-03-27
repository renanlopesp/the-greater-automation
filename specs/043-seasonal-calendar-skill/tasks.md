# Tasks: Seasonal Calendar Skill

**Input**: Design documents from `/specs/043-seasonal-calendar-skill/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Directory structure and shared types

- [x] T001 Create skill-workspace component directory at `src/components/skill-workspace/`
- [x] T002 Create seasonal-calendar component directory at `src/components/skills/seasonal-calendar/`
- [x] T003 Create static campaign data types and data file at `src/data/campaign-data.ts` with SeasonalDate, Campaign, CampaignConcept, Product, ChannelCopy, Asset, VideoScript, TimelineItem types and 15 seasonal dates with 3 full campaigns (Liquidacao de Verao, Dia das Maes, Pascoa)

---

## Phase 2: Foundational — Reusable SkillWorkspace (US1, Priority: P1)

**Goal**: Build the reusable split-panel workspace that all future skills will use

**Independent Test**: Mount SkillWorkspace with mock content, verify split layout renders, divider drags, panel toggles via keyboard shortcut, top bar shows skill name and navigation

- [x] T004 [P] [US1] Create artifact navigation context with stack-based push/pop/reset and depth accessor at `src/components/skill-workspace/artifact-nav-context.tsx`
- [x] T005 [P] [US1] Create draggable divider component using pointer events, storing panel widths as percentages, at `src/components/skill-workspace/draggable-divider.tsx`
- [x] T006 [US1] Create skill chat panel component with message list, textarea input (auto-expanding, max 120px), quick action pills, and follow-up suggestions at `src/components/skill-workspace/skill-chat-panel.tsx`
- [x] T007 [US1] Create skill artifact panel component with top bar (back button with label, close button), content area, and empty state at `src/components/skill-workspace/skill-artifact-panel.tsx`
- [x] T008 [US1] Create main SkillWorkspace layout component composing chat panel, artifact panel, and draggable divider with Cmd+\ keyboard toggle at `src/components/skill-workspace/skill-workspace.tsx`

**Checkpoint**: SkillWorkspace renders with mock content, panels resize, toggle works

---

## Phase 3: View Seasonal Calendar (US2, Priority: P1)

**Goal**: Show hero card with summary stats, clicking opens artifact panel with scrollable list of 15 seasonal dates

**Independent Test**: Navigate to `/skills/seasonal-calendar`, see hero card, click it, artifact panel opens showing all dates ordered chronologically with correct status badges

- [ ] T009 [US2] Create calendar hero card component with emoji icon, title "Calendario Sazonal 2026", stats (dates count, total revenue, next action with countdown) at `src/components/skills/seasonal-calendar/calendar-hero-card.tsx`
- [ ] T010 [US2] Create calendar level 1 component rendering scrollable date list with month/day badge, event name, potential revenue, status badge (Concluido/Ativo/Pronto/Pendente), and click handler per row at `src/components/skills/seasonal-calendar/calendar-level1.tsx`
- [ ] T011 [US2] Create calendar artifact orchestrator that manages navigation between levels 1/2/3, consuming artifact nav context, at `src/components/skills/seasonal-calendar/calendar-artifact.tsx`

**Checkpoint**: Hero card renders, clicking opens date list in artifact panel with correct data

---

## Phase 4: Campaign Detail View (US3, Priority: P1)

**Goal**: Clicking a date shows campaign concept with slogan, products, and 6 section navigation items

**Independent Test**: Click any date in list, see campaign concept card with slogan/positioning, product suggestions with tags, and 6 sections with counts

- [ ] T012 [US3] Create calendar level 2 component with date header (month, day, name, status, revenue), concept card (slogan in quotes, description, regenerate button, up to 3 products with tags), and 6 section nav items (Produtos, E-mail, Copies, Assets, Video, Timeline) with icons and counts at `src/components/skills/seasonal-calendar/calendar-level2.tsx`
- [ ] T013 [US3] Add product tag config function (label, bg color, text color) for tags: best-seller, liberar-estoque, cross-sell, lancamento, alta-margem to `src/data/campaign-data.ts`
- [ ] T014 [US3] Wire level 2 into calendar-artifact.tsx — clicking a date row in level 1 pushes level 2 with the date's campaign data

**Checkpoint**: Full navigation from date list → campaign detail with concept card and section nav

---

## Phase 5: Drill into Campaign Sections (US4, Priority: P2)

**Goal**: Clicking a section shows detailed content with Copy/Edit/Regenerate actions per item

**Independent Test**: Navigate to a date, click "Copies por canal", see 5 channel cards with text, timing, and action buttons

- [ ] T015 [P] [US4] Create copies section renderer showing channel copy cards (channel name, timing badge, text, optional product, Copy/Edit/Regenerate buttons) at `src/components/skills/seasonal-calendar/sections/copies-section.tsx`
- [ ] T016 [P] [US4] Create products section renderer showing product cards with thumbnail, name, price, tag, stock info at `src/components/skills/seasonal-calendar/sections/products-section.tsx`
- [ ] T017 [P] [US4] Create email section renderer showing email subject, preview text, product grid at `src/components/skills/seasonal-calendar/sections/email-section.tsx`
- [ ] T018 [P] [US4] Create assets section renderer showing visual asset preview cards (Stories 9:16, Feed 1:1, Banner, Meta Ad) at `src/components/skills/seasonal-calendar/sections/assets-section.tsx`
- [ ] T019 [P] [US4] Create video section renderer showing script cards with title, duration, script text at `src/components/skills/seasonal-calendar/sections/video-section.tsx`
- [ ] T020 [P] [US4] Create timeline section renderer showing D-45 to D-Day milestones with completion state at `src/components/skills/seasonal-calendar/sections/timeline-section.tsx`
- [ ] T021 [US4] Create calendar level 3 component that renders the correct section based on section type, with section title header, at `src/components/skills/seasonal-calendar/calendar-level3.tsx`
- [ ] T022 [US4] Wire level 3 into calendar-artifact.tsx — clicking a section in level 2 pushes level 3 with section data
- [ ] T023 [US4] Implement copy-to-clipboard action on all "Copiar" buttons across section renderers
- [ ] T024 [US4] Implement concept regeneration — clicking "Regenerar" cycles through up to 3 alternate concepts in level 2

**Checkpoint**: Full 3-level navigation works: date list → campaign detail → section content with working Copy/Regenerate

---

## Phase 6: Chat with Quick Actions (US5, Priority: P2)

**Goal**: Quick action suggestions appear before first message, clicking sends a message with a static response and follow-up suggestions

**Independent Test**: Click quick action pill, message appears in chat with static response and follow-up buttons

- [ ] T025 [US5] Define quick actions array for Seasonal Calendar (3 actions: "Qual a proxima data importante?", "Gerar briefing de Dia das Maes", "Mostrar calendario") and static response map at `src/components/skills/seasonal-calendar/calendar-chat-config.ts`
- [ ] T026 [US5] Wire chat panel in SkillWorkspace to send quick action messages, display static responses with snippet cards that open the artifact, and show follow-up suggestions at `src/components/skill-workspace/skill-chat-panel.tsx`

**Checkpoint**: Quick actions work, static responses render, follow-ups guide next action

---

## Phase 7: Seed Skill in Database (US6, Priority: P1)

**Goal**: Seasonal Calendar exists as a real skill record in the `skills` table

**Independent Test**: Run seed action, verify skill appears on `/skills` page from database data

- [x] T027 [US6] Add `seedSeasonalCalendar` server action to `src/lib/actions/skills.ts` that upserts a skill record with slug "seasonal-calendar", name, description, category "marketing-campanhas", emoji "📅", status "active", is_native true
- [ ] T028 [US6] Update `src/app/(dashboard)/skills/[slug]/page.tsx` to detect skills with a workspace (slug === "seasonal-calendar") and render SkillWorkspace instead of the existing skill detail view
- [x] T029 [US6] Call `seedSeasonalCalendar` from the onboarding completion flow or add a temporary seed trigger to ensure the skill exists for the team

**Checkpoint**: Skill appears in database, shows on `/skills` page in "Ativas" section, clicking navigates to workspace

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Visual refinements and build verification

- [ ] T030 [P] Add status badge color styling (Concluido: gray, Ativo: green, Pronto: green variant, Pendente: amber) using CSS variables from globals.css
- [ ] T031 [P] Add mobile responsive behavior — artifact panel as full-screen overlay below 768px
- [ ] T032 Verify `bun run build` passes with zero errors
- [ ] T033 Verify `bun run lint` passes with zero warnings
- [ ] T034 Visual comparison with prototype at `http://localhost:8080/skills/seasonal-calendar` using Playwright

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (SkillWorkspace)**: Depends on Phase 1 — BLOCKS all subsequent phases
- **Phase 3 (Calendar View)**: Depends on Phase 2
- **Phase 4 (Campaign Detail)**: Depends on Phase 3
- **Phase 5 (Section Drill-down)**: Depends on Phase 4
- **Phase 6 (Chat)**: Depends on Phase 2 only — can run in parallel with Phases 3-5
- **Phase 7 (DB Seed)**: Depends on Phase 2 — can run in parallel with Phases 3-6
- **Phase 8 (Polish)**: Depends on all desired phases being complete

### User Story Dependencies

- **US1 (SkillWorkspace)**: Foundation — no dependencies on other stories
- **US2 (Calendar View)**: Depends on US1 (needs the workspace layout)
- **US3 (Campaign Detail)**: Depends on US2 (needs the date list to navigate from)
- **US4 (Section Drill-down)**: Depends on US3 (needs campaign detail to navigate from)
- **US5 (Chat)**: Depends on US1 only — independent of US2-US4
- **US6 (DB Seed)**: Depends on US1 only — independent of US2-US5

### Parallel Opportunities

- T004 and T005 can run in parallel (different files, no deps)
- T015-T020 can all run in parallel (6 independent section renderers)
- Phase 6 (Chat) and Phase 7 (DB Seed) can run in parallel with Phases 3-5
- T030 and T031 can run in parallel

---

## Parallel Example: Phase 5 (Section Renderers)

```bash
# Launch all 6 section renderers in parallel:
Task: "Create copies section renderer in sections/copies-section.tsx"
Task: "Create products section renderer in sections/products-section.tsx"
Task: "Create email section renderer in sections/email-section.tsx"
Task: "Create assets section renderer in sections/assets-section.tsx"
Task: "Create video section renderer in sections/video-section.tsx"
Task: "Create timeline section renderer in sections/timeline-section.tsx"
```

---

## Implementation Strategy

### MVP First (Phases 1-4 + Phase 7)

1. Complete Phase 1: Setup (types + data)
2. Complete Phase 2: SkillWorkspace (reusable layout)
3. Complete Phase 3: Calendar date list view
4. Complete Phase 4: Campaign detail view
5. Complete Phase 7: DB seed + page integration
6. **STOP and VALIDATE**: Navigate from `/skills` → click Seasonal Calendar → see workspace → click dates → see campaigns

### Incremental Delivery

1. Phases 1-4 + 7 → MVP with workspace + calendar + campaign detail
2. Add Phase 5 → Section drill-down with Copy/Edit/Regenerate
3. Add Phase 6 → Chat with quick actions
4. Add Phase 8 → Polish, mobile, visual verification

---

## Notes

- Campaign data is static/mock — 15 dates, 3 with full campaign data (Liquidacao, Dia das Maes, Pascoa)
- Chat responses are simulated — no AI integration in this iteration
- SkillWorkspace must be reusable — designed for future skills (Campaign Engine, Revenue Intelligence)
- Use CSS variables (--green, --green-bg, --amber, --amber-bg) for status badge colors
- Reference prototype at `/home/renanl/Projects/snew-ai-core/` for visual fidelity
