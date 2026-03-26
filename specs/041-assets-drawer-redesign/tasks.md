# Tasks: Assets Drawer Redesign

**Input**: Design documents from `/specs/041-assets-drawer-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested. Omitted.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Database migration and shared dependencies

- [x] T001 Apply migration to add `fonts` and `brand_texts` jsonb columns to `brand_dna` table in `supabase/migrations/20260326200000_add_fonts_texts_to_brand_dna.sql`
- [x] T002 Add shadcn Tabs component via `npx shadcn@latest add tabs`

**Checkpoint**: Migration applied, Tabs component available

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Expand visual analyzer and brand DNA schema to capture fonts + texts data

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Expand `VisualAnalysis` type and Zod schema in `src/lib/ai/store-visual-analyzer.ts` to include `fonts` (array of `{name, usage, category}`) and `brand_texts` (array of `{type, label, content}`)
- [x] T004 Update GPT vision prompt in `src/lib/ai/store-visual-analyzer.ts` to extract fonts and brand text snippets from the store screenshot
- [x] T005 Add `fonts` and `brand_texts` fields to `BrandDnaResult` interface and Zod schema in `src/lib/ai/brand-dna-analyzer.ts`
- [x] T006 Update system prompt in `src/lib/ai/brand-dna-analyzer.ts` to generate fonts and brand texts (using visual analysis data when available, inferring when not)
- [x] T007 Update `analysis-pipeline.ts` to pass fonts + brand_texts from visual analysis to brand DNA analyzer, and persist both fields to the `brand_dna` table on save

**Checkpoint**: Running the onboarding pipeline now generates and persists fonts + brand_texts in brand_dna

---

## Phase 3: User Story 1 - Product Images Tab (Priority: P1) MVP

**Goal**: Imagens tab shows a 3-column grid of product images with names and labels

**Independent Test**: Open drawer from Card2 "ver assets", verify Imagens tab shows product images in grid

### Implementation for User Story 1

- [x] T008 [US1] Create API route `GET /api/store/products/images` in `src/app/api/store/products/images/route.ts` — fetch up to 6 products with images from Nuvemshop API, return `{images: [{name, url, label, productName}], storeName}`
- [x] T009 [US1] Create `useProductImages` hook in `src/hooks/use-product-images.ts` — React Query wrapper for the new API endpoint
- [x] T010 [US1] Rewrite `AssetsDrawer` in `src/components/brand-dna/assets-drawer.tsx` — new header ("Assets da {storeName}" + subtitle), 3 tabs using shadcn Tabs (Imagens, Fontes, Textos with icons), Imagens tab with 3-column image grid showing product images with name and "Produto" label
- [x] T011 [US1] Handle image fallback states in Imagens tab — placeholder icon for missing images, empty state message when no products have images, loading skeleton while fetching
- [x] T012 [US1] Update `AssetsDrawerProps` and Card2 usage in `src/components/onboarding/brand-dna-screen.tsx` to pass brand DNA data (color_palette, fonts, brand_texts) to the drawer

**Checkpoint**: Imagens tab fully functional with real product images from Nuvemshop

---

## Phase 4: User Story 2 - Fonts and Color Palette Tab (Priority: P2)

**Goal**: Fontes tab shows font preview cards with "Aa Bb Cc" and color palette swatches

**Independent Test**: Switch to Fontes tab, verify font cards render with names/usage, color palette shows swatches

### Implementation for User Story 2

- [x] T013 [US2] Implement Fontes tab content in `src/components/brand-dna/assets-drawer.tsx` — font preview cards with "Aa Bb Cc" sample text, font name, and usage label (e.g., "Titulos e headings", "Corpo e UI")
- [x] T014 [US2] Add "Paleta de cores" section to Fontes tab in `src/components/brand-dna/assets-drawer.tsx` — render color swatches from `brandDna.color_palette`
- [x] T015 [US2] Handle fallback states in Fontes tab — show default system fonts when no font data available, show fallback swatches when no color palette

**Checkpoint**: Fontes tab shows fonts + colors from brand DNA analysis

---

## Phase 5: User Story 3 - Brand Texts Tab (Priority: P3)

**Goal**: Textos tab shows brand text snippets (slogan, bio, signature) in labeled cards

**Independent Test**: Switch to Textos tab, verify text cards render with labels and content

### Implementation for User Story 3

- [x] T016 [US3] Implement Textos tab content in `src/components/brand-dna/assets-drawer.tsx` — cards with uppercase label header and text content, matching the reference design (dark cards with subtle borders)
- [x] T017 [US3] Handle fallback states in Textos tab — show only available snippets (no empty cards), show unavailable message when no texts extracted

**Checkpoint**: Textos tab shows extracted brand texts from visual analysis

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T018 Verify `bun run build` passes with zero errors
- [ ] T019 Run full onboarding flow end-to-end via Playwright — connect store, analyzing, brand-dna, open drawer, verify all 3 tabs
- [ ] T020 Verify drawer works with fallback states when visual analysis is unavailable (no FIRECRAWL_API_KEY)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (migration applied)
- **User Stories (Phase 3-5)**: All depend on Phase 2 completion
  - US1 (Imagens) can start independently after Phase 2
  - US2 (Fontes) can start independently after Phase 2
  - US3 (Textos) can start independently after Phase 2
- **Polish (Phase 6)**: Depends on all user stories complete

### Within Each User Story

- T008 (API) before T009 (hook) before T010 (UI) for US1
- T013 and T014 can run in parallel within US2
- T016 and T017 can run in parallel within US3

### Parallel Opportunities

- T003 + T005 can run in parallel (different files)
- T008 + T013 + T016 can run in parallel (different stories, after Phase 2)
- All user stories can proceed in parallel after Foundational phase

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (migration + tabs component)
2. Complete Phase 2: Foundational (analyzer expansion)
3. Complete Phase 3: User Story 1 (Imagens tab)
4. **STOP and VALIDATE**: Test Imagens tab independently
5. Continue with US2/US3 incrementally

### Incremental Delivery

1. Setup + Foundational → Pipeline captures fonts + texts
2. Add US1 (Imagens) → Product images visible → Demo
3. Add US2 (Fontes) → Fonts + colors visible → Demo
4. Add US3 (Textos) → Brand texts visible → Demo
5. Polish → Full validation

---

## Notes

- All drawer tabs must gracefully handle missing data (non-blocking fallbacks)
- Product images are fetched on-demand (not persisted), fonts + texts are persisted in brand_dna
- The shadcn Tabs component handles keyboard navigation and ARIA automatically
- Commit after each phase or logical task group
