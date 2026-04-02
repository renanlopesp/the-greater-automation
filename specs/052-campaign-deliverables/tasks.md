# Tasks: Campaign Deliverables — Lazy Generation with Product Curation

**Input**: Design documents from `/specs/052-campaign-deliverables/`
**Prerequisites**: plan.md, spec.md, research.md

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

**Purpose**: Extend data model for per-section status and curated products

- [ ] T001 Extend `FullCampaign` type with per-section deliverable status in `src/data/campaign-data.ts` — add `DeliverableStatus` type (`not_generated | generating | generated | stale`), `DeliverableSection` wrapper, and `deliverables` record to campaign data
- [ ] T002 Add `CuratedProduct` type and `curatedProducts` field to campaign artifact data in `src/data/campaign-data.ts`

**Checkpoint**: Types ready for all phases.

---

## Phase 2: Foundational — Concept-Only Generation

**Purpose**: Campaign creation generates ONLY concept + product selection. All other sections default to `not_generated`.

- [ ] T003 Create `generateConcept()` function in `src/lib/ai/seasonal-campaign-generator.ts` — extracts concept generation (slogan, description, intro, product selection) into its own function with a lighter Zod schema (no copies, email, assets, video, timeline)
- [ ] T004 Update `/api/skills/seasonal-calendar/generate/route.ts` to call `generateConcept()` instead of `generateCampaign()` — return concept + products + deliverables with all sections as `not_generated`
- [ ] T005 Update `SNEW_MODIFY_ARTIFACT` `generate_campaign` operation in `src/lib/ai/platform-tools.ts` to use `generateConcept()` instead of full generation

**Checkpoint**: Campaign creation is fast (~20s). Sections show `not_generated` status.

---

## Phase 3: User Story 1 — Product Curation (P1)

**Goal**: User can add/remove products from the AI selection before generating deliverables.

**Independent Test**: Generate campaign, open product editor, remove one product, add another, save — verify curated list persists.

- [ ] T006 [US1] Add product curation UI to `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — "Editar produtos" button on products section that toggles edit mode with checkbox list of all enriched products (selected = checked)
- [ ] T007 [US1] Add search/filter in product curation list — text input filters by product name
- [ ] T008 [US1] Add PATCH handler for curated products in `src/app/api/tasks/[id]/route.ts` — accepts `curatedProducts` array and saves to `artifact_data`
- [ ] T009 [US1] Save curated product selection to `artifact_data.curatedProducts` via PATCH and invalidate query on save
- [ ] T010 [US1] Mark existing deliverables as `stale` when curated products change in save handler

**Checkpoint**: Product curation works end-to-end. Curated list persists and marks deliverables stale.

---

## Phase 4: User Story 2 — Lazy Deliverable Generation (P1)

**Goal**: Each section has independent "Generate" button and generates on-demand.

**Independent Test**: Create campaign with concept only. Click Copies section, click Generate, verify copies appear. Other sections still show not_generated.

- [ ] T011 [US2] Update Level 2 sections grid in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — show generation status badge per section (not_generated, generated, stale)
- [ ] T012 [US2] Update Level 3 section view in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — show "Generate" button when section is `not_generated`, show "Regenerate" + stale warning when `stale`
- [ ] T013 [US2] Create `/api/skills/seasonal-calendar/generate-deliverable/route.ts` — accepts `{ dateId, sectionType, curatedProducts }`, generates ONLY that section using appropriate AI prompt, returns section data
- [ ] T014 [US2] Create per-section generation functions in `src/lib/ai/seasonal-campaign-generator.ts` — `generateCopies()`, `generateEmail()`, `generateAssets()`, `generateVideoScripts()`, `generateTimeline()` each with focused Zod schema and prompt
- [ ] T015 [US2] Wire generate button in artifact component to call `/api/skills/seasonal-calendar/generate-deliverable` and update `artifact_data.deliverables[section]` with result
- [ ] T016 [US2] Show loading skeleton per section during generation (reuse existing `Level3Skeleton`)

**Checkpoint**: Each section generates independently on-demand. Concept-only campaign is usable.

---

## Phase 5: User Story 3 — Real Email Template (P2)

**Goal**: Email section generates branded HTML template with product images, not just subject + preview.

**Independent Test**: Generate email deliverable, verify HTML preview renders in panel, copy HTML and paste in email tool.

- [ ] T017 [US3] Create `src/lib/ai/email-template-generator.ts` — generates responsive inline-CSS HTML email using `generateObject` with string schema for HTML body. Inputs: brand DNA (colors, tone), campaign concept, curated products with images, campaign slogan
- [ ] T018 [US3] Update `EmailSection` in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — render HTML preview in sandboxed iframe + "Copy HTML" button + subject/preview text above
- [ ] T019 [US3] Add "Copy HTML" clipboard functionality with toast feedback in email section
- [ ] T020 [US3] Handle edge cases: no product images (text fallback), no brand logo (store name text), single product (hero layout)

**Checkpoint**: Email HTML template is generated, previewed, and copyable.

---

## Phase 6: User Story 4 — Real Visual Assets (P2)

**Goal**: Assets section generates actual images instead of CSS gradients.

**Independent Test**: Generate assets deliverable, verify 4 images appear with correct aspect ratios, download one.

- [ ] T021 [US4] Create `src/lib/ai/asset-generator.ts` — generates campaign images using AI image generation (gpt-image-1). Creates 4 assets: Stories 9:16, Feed 1:1, Banner Email 3:1, Stories Meta Ad 9:16. Uses campaign concept + brand DNA for prompt
- [ ] T022 [US4] Add image upload to Supabase Storage in asset generator — store generated images and return public URLs
- [ ] T023 [US4] Update `AssetsSection` in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — render real images instead of CSS gradient divs, add download button per asset
- [ ] T024 [US4] Handle parallel image generation (4 images via Promise.all) with individual error handling per image

**Checkpoint**: 4 real images generated, displayed, and downloadable.

---

## Phase 7: User Story 5 — Contextual Video Scripts (P3)

**Goal**: Video scripts reference curated products by name and include product-specific scenes.

**Independent Test**: Generate video scripts after curating products, verify product names appear in script.

- [ ] T025 [US5] Update `generateVideoScripts()` in `src/lib/ai/seasonal-campaign-generator.ts` — pass curated products with names, prices, and images to prompt, instruct AI to reference specific products in scene descriptions
- [ ] T026 [US5] Update `VideoSection` in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — highlight product references in script text (bold product names)

**Checkpoint**: Video scripts reference actual curated products.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Add stale indicators on Level 2 section cards when concept or products changed after generation
- [ ] T028 [P] Add error handling per section — generation failure shows error with retry button, doesn't affect other sections
- [ ] T029 [P] Add performance logging for each deliverable generation in generate-deliverable route
- [ ] T030 Mobile responsive layout for product curation list in artifact panel
- [ ] T031 Migrate existing campaigns — add backward compatibility for old `FullCampaign` format (campaigns without `deliverables` field render as fully generated)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1
- **Phase 3 (US1 - Product Curation)**: Depends on Phase 2
- **Phase 4 (US2 - Lazy Generation)**: Depends on Phase 2, benefits from Phase 3
- **Phase 5 (US3 - Email)**: Depends on Phase 4
- **Phase 6 (US4 - Assets)**: Depends on Phase 4, can run parallel with Phase 5
- **Phase 7 (US5 - Video)**: Depends on Phase 4
- **Phase 8 (Polish)**: After all desired stories

### User Story Dependencies

- **US1 (Product Curation)**: Independent after Phase 2
- **US2 (Lazy Generation)**: Independent after Phase 2, uses US1 if available
- **US3 (Email HTML)**: Requires US2 (on-demand generation infrastructure)
- **US4 (Visual Assets)**: Requires US2, can run parallel with US3
- **US5 (Video Scripts)**: Requires US2

### Parallel Opportunities

- T001 + T002 (types) can run in parallel
- T006 + T008 (UI + API) can run in parallel within US1
- T017 + T021 (email + assets generators) can run in parallel after US2
- T025 + T027 + T028 + T029 (video + polish tasks) can run in parallel

---

## Implementation Strategy

### MVP First (Phases 1-4)

1. Phase 1: Types (T001-T002)
2. Phase 2: Concept-only generation (T003-T005)
3. Phase 3: Product curation (T006-T010)
4. Phase 4: Lazy deliverable generation (T011-T016)
5. **STOP and VALIDATE**: Concept + curation + on-demand sections working

### Incremental Delivery

1. MVP → Test independently → Deploy
2. Add Email HTML (Phase 5) → Most actionable deliverable
3. Add Visual Assets (Phase 6) → Marketing-ready images
4. Add Video Scripts (Phase 7) → Enhanced scripts
5. Polish (Phase 8) → Edge cases and UX improvements

---

## Notes

- Total: **31 tasks** across 8 phases
- MVP scope: Phases 1-4 (16 tasks)
- No new DB tables — all data in existing `tasks.artifact_data` JSONB
- Backward compatibility task (T031) ensures existing campaigns still render
