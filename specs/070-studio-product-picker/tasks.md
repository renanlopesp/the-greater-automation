---
description: 'Task list for 070-studio-product-picker'
---

# Tasks: Studio Product Picker

**Input**: Design documents from `/specs/070-studio-product-picker/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/products-api.md, quickstart.md

**Tests**: Vitest for the product normalizer (server-side unit) + Playwright for the 5 user stories (end-to-end). Both were explicitly listed in plan.md Testing.

**Organization**: Tasks are grouped by user story. Each story is independently testable against its acceptance criteria.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unfinished dependencies)
- **[Story]**: User story label (US1–US5 per spec.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the existing studio chat infrastructure is ready. No code changes; these are sanity checks so the feature work starts from a known-good state.

- [ ] T001 Verify `getStoreConnection(teamId, userId)` in `src/lib/studio/ecommerce-connection.ts` still returns the discriminated union documented in plan.md (no signature change since spec 069).
- [ ] T002 Verify `GET /api/studio/ecommerce` in `src/app/api/studio/ecommerce/route.ts` still returns `{ kind }` — the picker will fall back to it if the products route is down.
- [ ] T003 Verify `tasks.artifact_data` JSONB merge via `PATCH /api/tasks/:id` with `merge: true` still works for sibling keys (inspect `setChatArtifact` in `src/lib/studio/session-context.tsx`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The normalizer, the server endpoint, and the session-context extension. Every user story depends on all three.

**⚠️ CRITICAL**: No user-story work begins until T004–T011 complete.

- [ ] T004 [P] Create `src/lib/studio/product-normalizer.ts` exporting `NormalizedProduct` type + `NormalizedProductSchema` (zod) per data-model.md. Include two pure functions: `fromNuvemshop(raw): NormalizedProduct | null` and `fromShopifyComposio(raw): NormalizedProduct | null`, both returning `null` when required fields are missing. Handle localised-name (pt → es → first available), first-image extraction, and string-coerced id.
- [ ] T005 [P] Create `tests/unit/product-normalizer.test.ts` (vitest). Cover: Nuvemshop localised name fallback, Nuvemshop `images: []` → `image: null`, Nuvemshop missing variants → `price: null`, Shopify GID string coercion, Shopify missing `image.src` → `image: null`, invalid URL → `null` coercion. Run with `bun test tests/unit/product-normalizer.test.ts`.
- [ ] T006 Create `src/app/api/studio/products/route.ts` — `GET` handler per `contracts/products-api.md`: auth via `createServerClient`, `getActiveTeamId`, `getStoreConnection`, branch on `kind`, read `page`/`per_page`/`q` from query string, map through `product-normalizer`, return `{ kind, products, page, hasMore, warning?, error_code?, reauth_url? }`. Must NOT leak `accessToken` or `connectedAccountId`.
- [ ] T007 In `T006`, implement the Nuvemshop branch: fetch `https://api.nuvemshop.com.br/v1/{storeId}/products?per_page=X&page=Y&q=Z`, honour `r.status === 401/403 → NUVEMSHOP_AUTH_EXPIRED`, coerce the "Last page is 0" 404 to empty list + `hasMore: false`, parse `Link` header for `rel="next"` to compute `hasMore`.
- [ ] T008 In `T006`, implement the Composio Shopify branch: call `composio.tools.execute(userId, { slug: 'SHOPIFY_GET_PRODUCTS', arguments: { limit: per_page, page_info? } })`. For the MVP, ignore `q` server-side (client filters). Translate cursor → `page`/`hasMore` per research.md Decision 2.
- [ ] T009 Extend `StudioSession` interface in `src/lib/studio/session-context.tsx`: add `activeProduct: NormalizedProduct | null` and `setActiveProduct(p): void`. Mirror in `activeProductRef` for async-closure safety (same pattern as `taskIdRef`). Implement debounced (500 ms) `PATCH /api/tasks/:id` merge under `artifact_data.activeProduct` sub-key. Accept `initialActiveProduct?: NormalizedProduct | null` prop on `StudioSessionProvider`.
- [ ] T010 Update the task loader that hydrates `StudioSessionProvider` (find every `<StudioSessionProvider>` usage) to read `tasks.artifact_data.activeProduct` and pass it as `initialActiveProduct`.
- [ ] T011 Add `ProductPickerWarningCode` string-literal union type in `src/lib/studio/product-normalizer.ts` covering `'store_api_unavailable'`, `'NUVEMSHOP_AUTH_EXPIRED'`. Exported for the picker client to type-narrow on.

**Checkpoint**: `curl /api/studio/products?page=1&per_page=10 | jq '.products | length'` returns a number. Session context has `activeProduct` field visible in React DevTools. User story work can now begin.

---

## Phase 3: User Story 1 - Pick a real store product before generating (Priority: P1) 🎯 MVP

**Goal**: Click "Produto" → see real store products → click one → generations thereafter show that product (no hallucination).

**Independent Test**: Nuvemshop-connected team, open `/studio/create`, click "Produto", see products, click one, generate an image — output contains the selected product.

### Tests for User Story 1 ⚠️

- [ ] T012 [P] [US1] Create `tests/e2e/studio-product-picker.spec.ts` — Playwright. First scenario: "pick nuvemshop product → generation uses it". Seed step assumes a dev team with at least one Nuvemshop product. Verify the network payload to the image model contains the product image URL as a reference. Run with `bun test:e2e tests/e2e/studio-product-picker.spec.ts`.

### Implementation for User Story 1

- [ ] T013 [P] [US1] Create `src/components/asset-studio/StudioProductPicker.tsx` ("use client"). Uses shadcn `Sheet` + `SheetContent` (side="right"). Renders a grid of `NormalizedProduct`. Accepts props: `open: boolean`, `onOpenChange(open): void`, `onPick(product: NormalizedProduct): void`. Fetches via TanStack React Query hook `useStudioProducts({ page, q })`. Skeleton placeholders during loading. Selected-highlight border on the currently active product if provided via `activeProductId` prop.
- [ ] T014 [P] [US1] Create `src/components/asset-studio/ActiveProductChip.tsx` — renders a compact chip with `<img>` thumb (24px), product name truncated at 20 chars, and an "X" button. Accepts `product: NormalizedProduct | null`, `onRemove(): void`. Returns `null` when product is `null`.
- [ ] T015 [US1] Create the React Query hook in `src/components/asset-studio/StudioProductPicker.tsx` (colocated, small): `useStudioProducts(params)` wrapping `fetch('/api/studio/products?page=X&per_page=50')`. Return `{ products, page, hasMore, kind, warning, error_code, isLoading, refetch }`. Key: `['studio-products', teamId, params.page, params.q ?? '']`. staleTime 5 min, gcTime 15 min.
- [ ] T016 [US1] Modify `src/components/asset-studio/StudioChatPanel.tsx`: change the "Produto" button from `<label><input type="file"/></label>` to `<button onClick={() => setPickerOpen(true)}>`. Render `<StudioProductPicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={...} activeProductId={session.activeProduct?.id} />`. Render `<ActiveProductChip product={session.activeProduct} onRemove={() => session.setActiveProduct(null)} />` above the textarea.
- [ ] T017 [US1] `onPick` handler in `StudioChatPanel.tsx`: call `studioSession.setActiveProduct(product)` and close the sheet. This single call must cascade into `AssetCreatorModal` effects (next task).
- [ ] T018 [US1] In `src/components/asset-studio/AssetCreatorModal.tsx`: subscribe to `studioSession.activeProduct`. On change (new product set), run the three legacy-state updates atomically: `setActiveImageUrl(product.image ?? '')`, `setSelectedProducts([product.id])`, `chatProductImageUrlRef.current = product.image`. On clear (null), reset those three fields. Use `useEffect` with `session.activeProduct` in deps.
- [ ] T019 [US1] In `src/components/asset-studio/AssetCreatorModal.tsx`: update `generateImageWithPrompt` — when `session.activeProduct?.image` exists, push it into `allImages[]` before Gemini call (this supersedes the existing `chatProductImageUrlRef.current` path). Keep the ref path as a fallback for chat-driven anchoring.
- [ ] T020 [US1] Replace the `products` prop currently passed to `StudioChatPanel` (today: `allProducts.slice(0, 8).map(...)`) with a derivation sourced from the picker's latest catalog page, so the inline `pick-product` activity card also shows REAL products. Preserve shape `{ id, name, image }`.

**Checkpoint**: A user on a Nuvemshop-connected team can click Produto, pick a product, see a chip, and generate an image that uses that product. Hallucination rate drops (SC-005).

---

## Phase 4: User Story 2 - Search & browse a large catalog (Priority: P2)

**Goal**: Picker supports 500+ products via pagination + search under 500 ms for 3-char queries.

**Independent Test**: With a 500-product dev store, open picker, type "body" — filtered grid appears in under 500 ms. Scroll to bottom — next page loads.

### Tests for User Story 2 ⚠️

- [ ] T021 [P] [US2] Add a Playwright scenario to `tests/e2e/studio-product-picker.spec.ts`: "500-product catalog → search filters under 500 ms → scroll loads next page".

### Implementation for User Story 2

- [ ] T022 [P] [US2] Add a search `<Input>` above the grid in `src/components/asset-studio/StudioProductPicker.tsx`. Debounce 250 ms. When query length ≥ 2, pass `q` into `useStudioProducts`. When query length < 2, omit `q`.
- [ ] T023 [US2] Add infinite-scroll or "carregar mais" button in `StudioProductPicker.tsx`. When `hasMore` is true: button at the end of the grid that calls `setPage(p => p + 1)` and merges results into a local array, OR use an IntersectionObserver on a sentinel `<div>` at the bottom. Merge strategy: concat pages, deduplicate by `product.id`.
- [ ] T024 [US2] Empty-search state: when `q.length >= 2` and the page returns 0 products, render "Nenhum produto encontrado para '{q}'" + a "Limpar busca" button that clears `q`.
- [ ] T025 [US2] For the Composio Shopify path: in the picker, if `kind === 'shopify-composio'` and `q.length >= 2`, client-side filter the already-fetched pages by `name.toLowerCase().includes(q.toLowerCase())` before rendering (per research.md Decision 4). Do NOT refetch for Shopify search.

**Checkpoint**: Search + pagination work on both backends. No scroll-jank on a 500-product catalog.

---

## Phase 5: User Story 3 - Combine product anchor with a style reference (Priority: P2)

**Goal**: When BOTH an active product AND an uploaded reference image exist, generation sends both to the image model.

**Independent Test**: Pick a product. Upload a reference image via "Referência de imagem". Generate. Inspect the outgoing image-model call: it must contain 2 reference images (product first, user-reference second).

### Tests for User Story 3 ⚠️

- [ ] T026 [P] [US3] Add a Playwright scenario to `tests/e2e/studio-product-picker.spec.ts`: "active product + reference image → generation request contains both images in order".

### Implementation for User Story 3

- [ ] T027 [US3] In `src/components/asset-studio/AssetCreatorModal.tsx` `generateImageWithPrompt`, reorder the `allImages` assembly to guarantee the product image is pushed BEFORE any user reference image already handled by the existing `referenceImages` branch. Confirm the existing branch that reads `referenceImages` still runs after the product push.
- [ ] T028 [US3] Verify no regression in the existing `useProductReference` branch at `AssetCreatorModal.tsx:8500` (T018's logic supersedes it only when `session.activeProduct` is set). When both exist, picker product wins and `useProductReference` is ignored.

**Checkpoint**: Dual-anchor generation works (FR-011). No regression on reference-only flows.

---

## Phase 6: User Story 4 - Empty / disconnected store (Priority: P3)

**Goal**: Friendly empty states for both "no store connected" and "store connected but zero products".

**Independent Test**: Log in as a team with no store → picker shows "Nenhuma loja conectada" + CTA to `/apps`. Log in as a team with an empty store → picker shows "Sua loja não tem produtos publicados".

### Tests for User Story 4 ⚠️

- [ ] T029 [P] [US4] Add two Playwright scenarios to `tests/e2e/studio-product-picker.spec.ts`: "no store connected → picker shows apps CTA" and "connected but empty → picker shows publish hint".

### Implementation for User Story 4

- [ ] T030 [US4] In `src/components/asset-studio/StudioProductPicker.tsx`, branch render on API response: when `kind === null`, render empty state with `<Button asChild><a href="/apps">Conectar loja</a></Button>`. When `kind !== null && products.length === 0 && !q`, render "Sua loja não tem produtos publicados" with a subtle hint to publish in the store admin.
- [ ] T031 [US4] When the API returns `error_code === 'NUVEMSHOP_AUTH_EXPIRED'`, render a "Reautorizar Nuvemshop" CTA linking to `reauth_url` (`/api/nuvemshop/connect`).
- [ ] T032 [US4] When the API returns `warning === 'store_api_unavailable'`, render "Loja temporariamente indisponível" with a "Tentar novamente" button calling `refetch()`.

**Checkpoint**: All three degraded states have clear recovery paths.

---

## Phase 7: User Story 5 - Persistence across chat turns (Priority: P3)

**Goal**: Active product survives page refresh within the same task.

**Independent Test**: Pick a product. Copy URL. Refresh. Chip is still there.

### Tests for User Story 5 ⚠️

- [ ] T033 [P] [US5] Add a Playwright scenario to `tests/e2e/studio-product-picker.spec.ts`: "pick product → refresh task URL → chip still present with same product".

### Implementation for User Story 5

- [ ] T034 [US5] Validate T009's debounced PATCH actually writes `activeProduct` into `tasks.artifact_data` via a smoke test: network tab shows `PATCH /api/tasks/:id` with body `{ artifact_data: { activeProduct: {...} }, merge: true }` within 1 s of picking.
- [ ] T035 [US5] Validate T010's loader actually passes `initialActiveProduct` — on task reload, React DevTools shows `StudioSession.activeProduct` populated from the DB. If missing, add the missing hydration call site.
- [ ] T036 [US5] Orphan-product handling: in `ActiveProductChip.tsx`, when the active product's id is NOT in the latest fetched page for the team's store, surface a subtle "produto não existe mais" tag inside the chip with a one-click remove (calls `onRemove`). Detection logic lives in `StudioChatPanel.tsx` where it already has access to both `session.activeProduct` and `useStudioProducts()` results.

**Checkpoint**: Refresh preserves selection; deleted products fail gracefully.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T037 [P] Accessibility pass on `StudioProductPicker.tsx`: `Sheet` gets an accessible title via `<SheetTitle>`, search input has a `<label>`, product cards are focusable buttons with keyboard-selectable state. Run through with keyboard only — must tab through all interactive elements.
- [ ] T038 [P] Visual polish: ensure picker uses only Tailwind v4 theme tokens (`bg-background`, `border-border`, `text-muted-foreground`, `text-foreground`). No inline hex/rgb (constitution Principle III).
- [ ] T039 [P] Update `docs/CODEBASE_MAP.md` to mention the new picker + `/api/studio/products` route.
- [ ] T040 Run `bun run lint` and `bun run build` — must pass with zero errors and zero warnings (constitution Quality Gates).
- [ ] T041 Walk through `specs/070-studio-product-picker/quickstart.md` end-to-end on a dev store. Confirm every step matches reality; amend quickstart if needed.
- [ ] T042 Capture one before/after screenshot of a "cria campanha com body bordado rosa" generation (before: perfume bottle hallucination; after: real body bordado). Attach to the PR description.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: T001–T003 are read-only sanity checks; run once, immediately.
- **Phase 2 (Foundational)**: BLOCKS Phase 3+. T004 and T005 can run in parallel. T006 depends on T004. T007 and T008 depend on T006. T009 and T010 depend on T006's response shape (they share the `NormalizedProduct` type). T011 parallel with T009.
- **Phase 3 (US1)**: Depends on Phase 2 completion.
- **Phase 4–7 (US2–US5)**: Each depends on Phase 3 because they all extend the picker component or reuse its hook. Within each phase, tests parallel-ready with implementation.
- **Phase 8 (Polish)**: Depends on all desired user stories being complete.

### Parallel Opportunities

- T004 + T005 (normalizer + its tests): parallel.
- T012 + T013 + T014 (test spec + picker component + chip component): parallel.
- T021, T026, T029, T033 (Playwright scenarios across stories): parallel.
- T037 + T038 + T039 (accessibility + visual + docs): parallel.

### Within Each User Story

- Tests before implementation (vitest fails without the normalizer until T004 lands; Playwright scenarios fail until the picker is wired).
- Models/types before components.
- Components before wiring into `StudioChatPanel` / `AssetCreatorModal`.

---

## Parallel Example: Foundational Phase

```bash
# T004 + T005 can run together:
Task: "Create src/lib/studio/product-normalizer.ts with zod schema + fromNuvemshop/fromShopifyComposio"
Task: "Create tests/unit/product-normalizer.test.ts covering all edge cases"
```

## Parallel Example: User Story 1

```bash
# T012 + T013 + T014 can run together:
Task: "Create tests/e2e/studio-product-picker.spec.ts US1 scenario"
Task: "Create src/components/asset-studio/StudioProductPicker.tsx"
Task: "Create src/components/asset-studio/ActiveProductChip.tsx"
```

---

## Implementation Strategy

### MVP (Phase 1 → Phase 3)

1. Phase 1: Setup checks pass.
2. Phase 2: Normalizer + API route + session context extension.
3. Phase 3: Picker UI + chip + wiring.
4. **STOP and VALIDATE**: QA passes US1 acceptance scenarios manually.
5. Ship MVP behind the existing `/studio/create` route (no feature flag — constitution Simplicity).

### Incremental Delivery

- MVP (US1) → merge → demo
- - US2 (search + pagination) → merge → demo
- - US3 (dual-anchor) → merge → demo
- - US4 (empty states) → merge → demo
- - US5 (persistence validation) → merge → demo
- Polish → final merge

### Parallel Team Strategy

With two developers:

- Dev A: Phase 2 (T004, T006, T007, T008, T011)
- Dev B: Phase 2 (T005, T009, T010)
- After Phase 2: Dev A takes US1 (picker UI + wiring), Dev B takes US4 + US5 (empty states + persistence).
- US2 and US3 can be picked up by whichever dev finishes first.

---

## Notes

- T020 is the only non-obvious task: it changes the data source for the existing inline product-picker activity card so the whole studio points at real products, not demo seeds. Without it, the spec's assumption (data-source note) leaks.
- T028 is the non-regression guard for spec 051 (Smart Product Selection) — the picker must not break the existing `useProductReference` flow.
- The orphan-product detection in T036 relies on a single fetched page; for very large catalogs this is best-effort, which is explicitly acceptable per spec Edge Cases.
- Follow Git Workflow from CLAUDE.md: all commits on branch `070-studio-product-picker`; open PR when the MVP (Phase 3) is green.
