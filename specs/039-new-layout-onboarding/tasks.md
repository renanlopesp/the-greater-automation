# Tasks: New Layout + Onboarding Flow

**Input**: Design documents from `/specs/039-new-layout-onboarding/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested.

**Organization**: Tasks grouped by user story. Reference prototype at `/home/renanl/Projects/snew-ai-core/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US6)

---

## Phase 1: Setup (Database + Data Layer)

**Purpose**: Migrations, skill data expansion, static data files.

- [x] T001 Create migration `alter_skills_add_detail_columns` — add columns `emoji text`, `stats jsonb default '[]'`, `what_it_does jsonb default '[]'`, `expected_results text[] default '{}'`, `config_schema jsonb`, `connected_skills jsonb default '[]'`, `outputs jsonb default '[]'` to `skills` table in `supabase/migrations/`
- [x] T002 Create migration `alter_skills_expand_categories` — update category check constraint to include `'cart'` and `'social'` in `supabase/migrations/`
- [x] T003 Create migration `create_brand_dna_table` — create `brand_dna` table with fields from data-model.md (team_id, store_name, niche, average_ticket, platform, tone, audience, words_to_use, words_to_avoid, positioning, strengths, alerts, opportunities, revenue_projection, is_confirmed) with RLS in `supabase/migrations/`
- [x] T004 Update `src/data/skills.ts` — add `emoji` field to `SkillDefinition` type and all 31 entries. Add 7 new skills (email-sequencer, sms-scheduler, hashtag-generator, influencer-finder, upsell-recommender, checkout-optimizer, segment-builder). Expand categories: add `'cart'` and `'social'`. Update `skillCategoryLabels` with PT-BR labels from research.md. Total: 38 skills.
- [x] T005 Create migration `update_skills_with_detail_data` — populate emoji, stats, what_it_does, expected_results, config_schema, connected_skills, outputs for all 38 skills using data from the prototype (`/home/renanl/Projects/snew-ai-core/src/data/skills.ts`) in `supabase/migrations/`
- [x] T006 [P] Create `src/data/apps.ts` — static catalog of 13 connectable apps: shopify, gmail, google-analytics, meta-ads, google-ads, klaviyo, slack, notion, airtable, stripe, hubspot, whatsapp-business, telegram. Each entry: `{ slug, name, emoji, description }`. Export `AppDefinition` type and `apps` array.
- [x] T007 [P] Create `src/data/mock-brand-dna.ts` — mock Brand DNA data for onboarding (based on Milkes simulation). Includes: store_name, niche, tone, audience, words_to_use/avoid, strengths (3), alerts (3), opportunities (4 with colored borders), revenue_projection (current: R$89k, projected: R$215k, delta: +R$126k), recommended_skills (3 with toggles).

**Checkpoint**: Database ready. Skill registry expanded to 38 with detail data. Static data files in place.

---

## Phase 2: Foundational — Layout Shell (Blocking)

**Purpose**: New sidebar + topbar layout that ALL pages depend on.

**CRITICAL**: No user story pages can render correctly until the layout shell is complete.

- [x] T008 Read prototype sidebar component `/home/renanl/Projects/snew-ai-core/src/components/AppSidebar.tsx` for visual reference. Create `src/components/layout/app-sidebar-new.tsx` — icon-only sidebar (56px collapsed, 240px expanded). Nav items: Home (/), New Chat (/chat), Skills (/skills), Apps (/apps), History (/history). Logo "S" collapsed / "Snew" expanded. Toggle on logo click. localStorage for collapse state. Tooltip on hover (collapsed mode). Mobile: overlay with backdrop blur.
- [x] T009 Read prototype topbar `/home/renanl/Projects/snew-ai-core/src/components/TopBar.tsx`. Create `src/components/layout/top-bar.tsx` — right-aligned bar with: Feedback button, Support button, notifications icon (with badge), avatar with user initials.
- [x] T010 Create `src/components/layout/sidebar-skill-pills.tsx` — shows active skills with emoji in sidebar footer. Uses `useActiveSkillsForSidebar` hook. Each pill: emoji + skill name, clickable → navigates to `/skills/[slug]`.
- [x] T011 Create `src/hooks/use-active-skills-sidebar.ts` — lightweight hook fetching active skills (slug, name, emoji) for sidebar.
- [x] T012 Rewrite `src/app/(dashboard)/layout.tsx` — replace current layout with new: `<div flex h-screen>` → `<AppSidebarNew />` + `<div flex-1 flex-col>` → `<TopBar />` + `<main>{children}</main>`. Import new components. Remove old sidebar references.
- [x] T013 Create `src/app/(onboarding)/onboarding/layout.tsx` — fullscreen layout (no sidebar, no topbar). Simple centered container with subtle background pattern.

**Checkpoint**: Layout shell works. All pages render inside new sidebar + topbar. Onboarding pages render fullscreen.

---

## Phase 3: User Story 1 — New Layout (Priority: P1) MVP

**Goal**: Sidebar icon-only + topbar renders on all pages. Navigation works. Active skills in footer.

**Independent Test**: Open any page → sidebar + topbar visible. Click nav items → routing works. Resize to mobile → overlay sidebar.

### Implementation

- [x] T014 [US1] Verify sidebar renders on all existing dashboard pages — open /, /skills, /chat, /history. Fix any layout conflicts with existing page components.
- [x] T015 [US1] Verify sidebar collapse/expand animation — click logo, verify smooth transition. Verify localStorage persistence (refresh preserves state).
- [x] T016 [US1] Verify mobile responsive — resize to <768px, verify hamburger menu appears, sidebar opens as overlay, backdrop blur works, clicking outside closes sidebar.
- [x] T017 [US1] Verify topbar renders correctly — Feedback/Support buttons functional (link to external or modal). Notifications badge shows count. Avatar shows user initials.
- [x] T018 [US1] Verify active skills in sidebar footer — pills show emoji + name for each active skill. Click navigates to skill detail.

**Checkpoint**: Layout complete. MVP deliverable — all pages render with new layout.

---

## Phase 4: User Story 2 — New Home Page (Priority: P1)

**Goal**: Home shows ask bar, quick suggestions, activity feed, active skills row.

**Independent Test**: Open / → see ask bar centered, 3 suggestions, activity items, skill pills.

### Implementation

- [x] T019 [P] [US2] Read prototype home `/home/renanl/Projects/snew-ai-core/src/pages/Home.tsx`. Create `src/components/home/ask-bar.tsx` — centered textarea with placeholder "Ask something about your store...", send button (arrow icon). On submit, navigates to /chat with the message.
- [x] T020 [P] [US2] Create `src/components/home/quick-suggestions.tsx` — 3 pill buttons with suggestion text (e.g. "Quais são as melhores oportunidades sazonais?"). Clicking fills the ask bar or navigates to /chat with that message.
- [x] T021 [P] [US2] Create `src/components/home/activity-feed.tsx` — list of activity items. Each item: status icon (⚠ warning amber, ◌ running gray, ✓ completed green), description text, action button (Approve/Generate) or timestamp. Uses `useActivityFeed` hook.
- [x] T022 [P] [US2] Create `src/components/home/active-skills-row.tsx` — horizontal row of pill badges. Each: green dot + skill name + time since last execution (e.g. "Seasonal Calendar · 2h"). Clickable → /skills/[slug].
- [x] T023 [US2] Create `src/hooks/use-activity-feed.ts` — returns mock activity items for now (4 items matching prototype: approve briefing, generate campaign, generating briefing, analyzing patterns). Will be connected to real data in Fase 1.
- [x] T024 [US2] Rewrite `src/app/(dashboard)/page.tsx` — compose: AskBar → QuickSuggestions → ActivityFeed → ActiveSkillsRow. Centered layout with max-width. Remove all old dashboard content (agent cards, workflows, etc.).

**Checkpoint**: Home page matches prototype. Ask bar, suggestions, activity, active skills all render.

---

## Phase 5: User Story 3 — Skills Library Redesigned (Priority: P2)

**Goal**: /skills shows redesigned library with PT-BR categories, emoji cards, search, tabs.

**Independent Test**: Open /skills → filter sidebar visible, 38 skills rendered, search works, category filter works.

### Implementation

- [x] T025 [P] [US3] Read prototype skills page `/home/renanl/Projects/snew-ai-core/src/pages/SkillsPage.tsx`. Create `src/components/skills/skill-filter-sidebar.tsx` — left panel with: tabs (All with count, Active with count, Recommended with count), "Category" section with PT-BR category labels and counts. Uses query params for filter state (not local state).
- [x] T026 [P] [US3] Create `src/components/skills/skill-card-new.tsx` — card with: emoji icon (large), "Active" badge (green, top-right, only if active), skill name (bold), description (truncated 2 lines). Clickable → /skills/[slug]. No border when inactive, subtle border when active.
- [x] T027 [US3] Create `src/components/skills/skill-library-new.tsx` — main content area. Header: "Skills" h1 + "N capabilities... M active" + search bar. Grid of SkillCardNew (responsive: 1 col mobile, 2 cols tablet, 2 cols desktop). Integrates with filter sidebar via URL searchParams.
- [x] T028 [US3] Rewrite `src/app/(dashboard)/skills/page.tsx` — server component. Layout: SkillFilterSidebar (aside, 240px) + SkillLibraryNew (main). Pass teamId. Fetch skills server-side.

**Checkpoint**: Skills page matches prototype. Filters, search, cards all work.

---

## Phase 6: User Story 4 — Rich Skill Detail (Priority: P2)

**Goal**: /skills/[slug] shows comprehensive detail page matching prototype.

**Independent Test**: Open /skills/seasonal-calendar → all 8 sections render correctly.

### Implementation

- [x] T029 [P] [US4] Read prototype skill detail `/home/renanl/Projects/snew-ai-core/src/pages/SkillDetailPage.tsx`. Create `src/components/skills/skill-detail-header.tsx` — emoji icon (large) + h1 name + subtitle + Active badge (green outline button with check icon). Back button.
- [x] T030 [P] [US4] Create `src/components/skills/skill-about-section.tsx` — "ABOUT" label + long description paragraph.
- [x] T031 [P] [US4] Create `src/components/skills/skill-stats-bar.tsx` — 3 stat items side by side (e.g. "30+" / "dates mapped", "D-60" / "advance briefing", "auto" / "campaign trigger"). Large value + small label.
- [x] T032 [P] [US4] Create `src/components/skills/skill-actions-list.tsx` — "WHAT IT DOES" label + list of action items. Each: description text + frequency badge (e.g. "Setup", "Anual", "D-60", "Configurável").
- [x] T033 [P] [US4] Create `src/components/skills/skill-expected-results.tsx` — "EXPECTED RESULT" label + bullet list with green dots.
- [x] T034 [US4] Create `src/components/skills/skill-config-panel.tsx` — "CONFIGURATION" label + config options. Autonomy level: segmented control (With approval / Automatic). Briefing advance: segmented control (D-90/D-60/D-45/D-30). Custom dates: list with "Add date" button. Reads/writes via `updateSkillConfig` server action.
- [x] T035 [P] [US4] Create `src/components/skills/skill-connections-section.tsx` — "REQUIRED CONNECTIONS" with app emoji + name + "Connected" indicator. "CONNECTED SKILLS" with skill name + reason + active indicator.
- [x] T036 [P] [US4] Create `src/components/skills/skill-outputs-section.tsx` — "OUTPUTS" label + list of clickable output items (title + description + arrow). Each links to the output view.
- [x] T037 [US4] Create `src/components/skills/skill-detail-new.tsx` — compose all sections: Header → About → StatsBar → ActionsList → ExpectedResults → ConfigPanel → ConnectionsSection → OutputsSection. Single scrollable page.
- [x] T038 [US4] Rewrite `src/app/(dashboard)/skills/[slug]/page.tsx` — server component. Fetch skill by slug, pass to SkillDetailNew. Handle 404 if skill not found.
- [x] T039 [US4] Add `updateSkillConfig` server action to `src/lib/actions/skills.ts` — saves config_schema changes for a skill.

**Checkpoint**: Skill detail page matches prototype for all sections.

---

## Phase 7: User Story 5 — Onboarding Flow (Priority: P2)

**Goal**: 4-step onboarding flow from welcome to Brand DNA, fullscreen.

**Independent Test**: Navigate /onboarding → /onboarding/connect → /onboarding/analyzing → /onboarding/brand-dna. All screens render correctly.

### Implementation

- [x] T040 [P] [US5] Read prototype welcome `/home/renanl/Projects/snew-ai-core/src/pages/onboarding/OnboardingWelcome.tsx`. Create `src/components/onboarding/welcome-screen.tsx` — centered: Snew logo "S", "Snew" text, h1 "Your AI-powered CMO", description text, "Connect your store" button (black, full-width), "Already have an account? Sign in" link.
- [x] T041 [P] [US5] Read prototype connect `/home/renanl/Projects/snew-ai-core/src/pages/onboarding/OnboardingConnect.tsx`. Create `src/components/onboarding/connect-screen.tsx` — back button, h1 "Connect your store", description, 2 platform cards (Shopify with green icon, Nuvemshop with blue "N" icon), each with "Connect via [platform]" button. Footer text about supported platforms.
- [x] T042 [P] [US5] Read prototype analyzing `/home/renanl/Projects/snew-ai-core/src/pages/onboarding/OnboardingAnalyzing.tsx`. Create `src/components/onboarding/analyzing-screen.tsx` — back button, h1 "Analyzing your store...", animated checklist (3 items: scanning products with spinner → check, extracting brand identity → check, mapping seasonal opportunities → check). "Continue" button appears when all complete. Uses setTimeout for simulated progress.
- [x] T043 [US5] Read prototype brand DNA `/home/renanl/Projects/snew-ai-core/src/pages/onboarding/OnboardingBrandDNA.tsx`. Create `src/components/onboarding/brand-dna-screen.tsx` — scrollable page composing sub-components with mock data from `mock-brand-dna.ts`.
- [x] T044 [P] [US5] Create `src/components/brand-dna/brand-identity-card.tsx` — "IDENTIDADE DA MARCA" label + description paragraph + "ver assets →" link.
- [x] T045 [P] [US5] Create `src/components/brand-dna/tone-of-voice-card.tsx` — "TOM DE VOZ" label + description + two rows: "Usar:" with green tags (memória, afeto, único...) and "Evitar:" with red tags (promoção, corra, barato...).
- [x] T046 [P] [US5] Create `src/components/brand-dna/diagnostic-list.tsx` — "DIAGNÓSTICO DE PERFORMANCE" label + list of items. Strengths: green ✓ icon + text. Alerts: amber ! icon + text.
- [x] T047 [P] [US5] Create `src/components/brand-dna/opportunities-list.tsx` — "O QUE EU IDENTIFIQUEI" label + cards with colored left border (green for positive, amber for opportunity). Each: bold title + description paragraph.
- [x] T048 [P] [US5] Create `src/components/brand-dna/revenue-projection.tsx` — "O QUE EU PROJETO" label + paragraph with bold R$ values (current, projected, delta in green). Disclaimer text below.
- [x] T049 [P] [US5] Create `src/components/brand-dna/skill-activation-list.tsx` — "O QUE EU RECOMENDO" label + intro text + 3 skill items. Each: colored dot + skill name + description + Switch toggle (default on). "Começar com essas habilidades" button at bottom.
- [x] T050 [US5] Create onboarding pages: `src/app/(onboarding)/onboarding/page.tsx` (welcome), `src/app/(onboarding)/onboarding/connect/page.tsx`, `src/app/(onboarding)/onboarding/analyzing/page.tsx`, `src/app/(onboarding)/onboarding/brand-dna/page.tsx`. Each renders the corresponding screen component.
- [x] T051 [US5] Create `src/lib/actions/onboarding.ts` — `completeOnboarding(teamId, selectedSkillSlugs)` activates selected skills and redirects to home.

**Checkpoint**: Full onboarding flow works end-to-end. Brand DNA page shows all sections from prototype.

---

## Phase 8: User Story 6 — Apps Page (Priority: P3)

**Goal**: /apps shows 13 connectable apps with search and security notice.

**Independent Test**: Open /apps → 13 app cards visible, search filters them.

### Implementation

- [x] T052 [P] [US6] Read prototype apps `/home/renanl/Projects/snew-ai-core/src/pages/AppsPage.tsx`. Create `src/components/apps/app-card.tsx` — card with: emoji icon (large), app name (bold), description text, arrow icon (right). Clickable. If connected, shows "Connected" indicator.
- [x] T053 [P] [US6] Create `src/components/apps/apps-grid.tsx` — header: h1 "Apps" + description. Security notice (lock icon + "Credentials are encrypted..."). Search bar. Grid of AppCard components. Filters by search text.
- [x] T054 [US6] Create `src/app/(dashboard)/apps/page.tsx` — server component rendering AppsGrid. Fetches connected apps from Composio to show connection status.

**Checkpoint**: Apps page matches prototype.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, responsive testing, visual comparison.

- [x] T055 [P] Remove or mark deprecated old layout components: `src/components/home/home-client-new.tsx`, `src/components/home/greeting-section-new.tsx`, old sidebar imports, old agent grid references.
- [x] T056 [P] Remove old `/agents` page references from navigation. Ensure `/agents` redirects to `/skills`.
- [x] T057 [P] Audit for "agent" / "co-worker" text in new components — zero references in user-facing text.
- [x] T058 Test mobile responsive: sidebar overlay, single-column skill cards, onboarding screens stack vertically, topbar adapts.
- [x] T059 Visual comparison: compare each page with prototype screenshots (`ref-home.png`, `ref-skills.png`, `ref-skill-detail-seasonal.png`, `ref-onboarding.png`, `ref-onboarding-connect.png`, `ref-onboarding-analyzing.png`, `ref-onboarding-brand-dna.png`). Document differences.
- [x] T060 Run `bun run build` — verify zero errors.
- [x] T061 Run `bun run lint` — verify no new warnings.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Layout Shell)**: Depends on Phase 1 (needs skill data for sidebar pills)
- **Phase 3 (US1 — Layout)**: Depends on Phase 2 (layout must exist)
- **Phase 4 (US2 — Home)**: Depends on Phase 2 (needs layout)
- **Phase 5 (US3 — Skills Library)**: Depends on Phase 1 (needs expanded skill data)
- **Phase 6 (US4 — Skill Detail)**: Depends on Phase 1 (needs detail columns)
- **Phase 7 (US5 — Onboarding)**: Depends on Phase 2 (needs onboarding layout). Can parallel with Phases 4-6.
- **Phase 8 (US6 — Apps)**: Depends on Phase 2 (needs layout). Can parallel with everything else.
- **Phase 9 (Polish)**: Depends on all previous phases.

### User Story Dependencies

```
Phase 1 (Setup)
  ↓
Phase 2 (Layout Shell)  ← BLOCKING
  ↓
  ├── Phase 3 (US1 — Layout verification) ← MVP
  ├── Phase 4 (US2 — Home)               ┐
  ├── Phase 5 (US3 — Skills Library)      │ can run in parallel
  ├── Phase 6 (US4 — Skill Detail)        │
  ├── Phase 7 (US5 — Onboarding)          │
  └── Phase 8 (US6 — Apps)                ┘
  ↓
Phase 9 (Polish)
```

### Parallel Opportunities

**Phase 1**: T006, T007 can parallel with T001-T005 (different files)
**Phase 2**: T008-T011 write different files — T008/T009/T010 can parallel
**Phase 4**: T019-T022 are all independent components — full parallel
**Phase 5**: T025-T026 can parallel (different components)
**Phase 6**: T029-T036 are all independent sub-components — full parallel
**Phase 7**: T040-T042 can parallel (different screens). T044-T049 can parallel (brand DNA sub-components)
**Phase 8**: T052-T053 can parallel
**Phase 9**: T055-T057 can parallel

**Cross-phase parallel**: Phases 4-8 can ALL run in parallel once Phase 2 is complete.

---

## Parallel Example: Phase 6 (Skill Detail)

```
# All these sub-components have NO dependencies on each other:
Agent 1: T029 skill-detail-header.tsx
Agent 2: T030 skill-about-section.tsx
Agent 3: T031 skill-stats-bar.tsx
Agent 4: T032 skill-actions-list.tsx
Agent 5: T033 skill-expected-results.tsx
Agent 6: T035 skill-connections-section.tsx
Agent 7: T036 skill-outputs-section.tsx

# Then sequential:
T034 skill-config-panel.tsx (needs server action T039)
T037 skill-detail-new.tsx (composes all above)
T038 page.tsx (uses T037)
```

---

## Implementation Strategy

### MVP First (Layout Only)

1. Complete Phase 1: Setup (migrations + data)
2. Complete Phase 2: Layout Shell (sidebar + topbar + onboarding layout)
3. Complete Phase 3: US1 — Layout verification
4. **STOP and VALIDATE**: All pages render with new layout
5. This is the minimum — new visual identity is live

### Incremental Delivery

1. Setup + Layout Shell → visual foundation (**MVP**)
2. Add Home → chat-first landing page
3. Add Skills Library → redesigned catalog
4. Add Skill Detail → rich skill pages
5. Add Onboarding → wow moment for new users
6. Add Apps → connection catalog
7. Polish → production ready

### Parallel Team Strategy (5 agents)

After Phase 2 completes:

- Agent A: Phase 4 (Home)
- Agent B: Phase 5 (Skills Library)
- Agent C: Phase 6 (Skill Detail)
- Agent D: Phase 7 (Onboarding)
- Agent E: Phase 8 (Apps)

All 5 work independently, merge at Phase 9.

---

## Notes

- Total tasks: **61**
- Tasks per story: US1=5, US2=6, US3=4, US4=11, US5=12, US6=3, Setup=7, Foundation=6, Polish=7
- Parallel opportunities: 8 groups, up to 7 agents simultaneously in Phase 6
- MVP scope: Phases 1-3 (20 tasks) delivers new layout on all pages
- Reference prototype: `/home/renanl/Projects/snew-ai-core/` — all prototype components referenced by path
- Brand DNA uses mock data — real integration is Fase 1 CMO scope
