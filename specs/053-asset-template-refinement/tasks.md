# Tasks: Asset Template Refinement

**Input**: Design documents from `/specs/053-asset-template-refinement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested. No test tasks included.

**Organization**: Tasks grouped by user story. US1 (multiple products) and US4 (download fix) are P1. US2 (layout) and US3 (template quality) are P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type changes that all user stories depend on

- [x] T001 Add `product_name?: string` field to `CampaignAsset` interface in `src/data/campaign-data.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Rewrite asset generator to produce per-product assets — all UI stories depend on this

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Refactor `generateAssets()` in `src/lib/ai/asset-generator.ts` to accept products array and generate one asset per product per format. Change from single `heroProduct` to iterating all products with images. Make one `generateObject` AI call per format returning `z.array(AssetTemplateSchema).length(N)` where N = products with images. Each returned asset includes `product_name`.
- [x] T003 Fix `buildAssetHtml()` in `src/lib/ai/asset-generator.ts` — increase subtext font size (20px vertical, 18px horizontal), increase CTA font size (17px vertical, 15px horizontal), increase CTA padding, ensure CTA is centered via flexbox `align-items: center`, increase headline sizes (48px vertical, 40px square, 32px wide).
- [x] T004 Update asset mapping in `src/app/api/skills/seasonal-calendar/generate-deliverable/route.ts` to pass `product_name` from generated assets through to the `CampaignAsset[]` stored in artifact_data.

**Checkpoint**: Asset generation now produces N assets per format (one per product). Template text is larger and properly aligned.

---

## Phase 3: User Story 1 — Multiple Product Assets Per Format (Priority: P1) MVP

**Goal**: Each format contains one asset per curated product instead of just 1 hero image.

**Independent Test**: Generate assets for a campaign with 5+ curated products. Verify each format has 5+ assets, each with a different product image.

### Implementation for User Story 1

- [x] T005 [US1] Update `AssetsSection` in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — replace flat `campaign.assets.map()` with grouping by `asset.label` (format name). Create a `Map<string, CampaignAsset[]>` grouped by label. Render each group as a separate section.
- [x] T006 [US1] Add product name display to each asset card in `AssetsSection` in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — show `asset.product_name` below the preview thumbnail, styled as `text-xs text-muted-foreground truncate`.
- [x] T007 [US1] Handle edge case: if no curated products have images, show empty state message "Nenhum produto com imagem disponível para gerar assets. Adicione imagens aos seus produtos." in `AssetsSection` in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx`.

**Checkpoint**: Assets are grouped by format, each showing multiple product variants with product names.

---

## Phase 4: User Story 4 — Correct Download Dimensions (Priority: P1)

**Goal**: Downloaded PNG has exact pixel dimensions matching the format — no stretching.

**Independent Test**: Download an asset from each format, check dimensions are exactly 1080x1920, 1080x1080, 1200x400.

### Implementation for User Story 4

- [x] T008 [US4] Fix `downloadAsImage()` in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — set offscreen container `style.width` and `style.height` to the asset's native pixel dimensions (`${width}px`, `${height}px`). Ensure the inner HTML element also gets these dimensions. Keep `html2canvas` options: `width`, `height`, `scale: 1`, `useCORS: true`.

**Checkpoint**: Downloads produce pixel-perfect PNG files matching format specifications.

---

## Phase 5: User Story 2 — Format-Grouped Layout with Horizontal Scroll (Priority: P2)

**Goal**: Each format section displays its assets in a horizontally scrollable row.

**Independent Test**: View assets section, verify 4 format groups each with horizontal scroll of cards.

### Implementation for User Story 2

- [x] T009 [US2] Implement horizontal scroll layout per format group in `AssetsSection` in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — each format section uses a flex row with `overflow-x-auto`, `flex-nowrap`, `gap-3`, snap scroll. Cards have fixed width proportional to format ratio (e.g., 180px wide for 9:16, 200px for 1:1, 300px for 3:1). Section heading shows format label and asset count.
- [x] T010 [US2] Add format section header with icon and count in `AssetsSection` in `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` — each section shows format label (e.g., "Stories 9:16"), number of variants (e.g., "7 variantes"), styled with `text-sm font-medium text-foreground`.

**Checkpoint**: Assets display as 4 horizontal-scroll sections, each with format heading and scrollable product cards.

---

## Phase 6: User Story 3 — Fixed HTML Template Quality (Priority: P2)

**Goal**: Template text is larger, CTA is centered, proportions are correct.

**Independent Test**: Generate assets, visually confirm text is readable and CTA is centered in all 4 formats.

### Implementation for User Story 3

- [x] T011 [US3] Already addressed in T003 (foundational phase). Verify by visual inspection that subtext ≥ 18px, CTA centered, headline prominent in all 4 formats. If any format still has issues, apply targeted fixes in `buildAssetHtml()` in `src/lib/ai/asset-generator.ts`.

**Checkpoint**: All generated assets have professional-quality text layout.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T012 Run `bun run build` to verify zero TypeScript errors
- [x] T013 Visual verification: generate assets for a campaign and check all 4 formats display correctly with multiple products, horizontal scroll, and working downloads

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — type changes only
- **Phase 2 (Foundational)**: Depends on Phase 1 — generator rewrite
- **Phase 3 (US1)**: Depends on Phase 2 — needs per-product assets to group
- **Phase 4 (US4)**: Depends on Phase 2 — can run parallel with Phase 3
- **Phase 5 (US2)**: Depends on Phase 3 — needs grouped layout to add scroll
- **Phase 6 (US3)**: Depends on Phase 2 — covered by T003
- **Phase 7 (Polish)**: Depends on all phases

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — core grouping logic
- **US4 (P1)**: Depends on Foundational only — download fix is independent
- **US2 (P2)**: Depends on US1 — horizontal scroll builds on grouped layout
- **US3 (P2)**: Depends on Foundational only — template fixes in generator

### Parallel Opportunities

- T001 is standalone (type change)
- T002 and T003 can run in parallel (different functions in same file)
- T005, T006, T007 are sequential (same component, same section)
- T008 can run parallel with T005-T007 (different function)
- T009, T010 are sequential (build on T005 grouping)

---

## Parallel Example: After Phase 2

```bash
# These can run in parallel after foundational phase:
Agent A: T005 → T006 → T007 (US1: grouping + product names)
Agent B: T008 (US4: download fix)
```

---

## Implementation Strategy

### MVP First (US1 + US4)

1. Phase 1: Type change (T001)
2. Phase 2: Generator rewrite + template fix (T002, T003, T004)
3. Phase 3: Grouped layout + product names (T005-T007)
4. Phase 4: Download fix (T008)
5. **VALIDATE**: Multiple products per format, correct downloads

### Incremental Delivery

1. Setup + Foundational → Generator produces per-product assets
2. US1 → Grouped by format with product names → Testable
3. US4 → Downloads have correct dimensions → Testable
4. US2 → Horizontal scroll per format → Polish
5. US3 → Template quality verified → Polish
6. Build verification + visual test

---

## Notes

- Total: 13 tasks across 7 phases
- US1: 3 tasks, US2: 2 tasks, US3: 1 task (covered by foundational), US4: 1 task
- Foundational: 3 tasks, Setup: 1 task, Polish: 2 tasks
- Key parallel opportunity: US1 and US4 can run simultaneously after Phase 2
- All changes are in 4 existing files — no new files needed
