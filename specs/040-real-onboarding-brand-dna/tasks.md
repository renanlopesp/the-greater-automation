# Tasks: Real Onboarding + Brand DNA

**Input**: Design documents from `/specs/040-real-onboarding-brand-dna/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested.

**Organization**: Tasks grouped by user story. This is the core Fase 1 feature — the first real backend/AI logic.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Database + Infrastructure)

**Purpose**: Migration and shared services that all stories depend on.

- [x] T001 Create migration to add columns `recommended_skills jsonb default '[]'`, `owner_name text`, `greeting text`, `intro text` to `brand_dna` table. Apply via Supabase MCP. File: `supabase/migrations/20260324100000_alter_brand_dna_add_onboarding_fields.sql`
- [x] T002 [P] Create `src/lib/retail/catalog-summarizer.ts` — function `summarizeCatalog(products: StoreProduct[])` that takes synced products and returns a compact summary for LLM input: total count, category breakdown (%), price stats (min/max/avg/median), top 20 product names with truncated descriptions (100 chars each). Output fits in ~4000 tokens.
- [x] T003 [P] Create `src/lib/ai/brand-dna-analyzer.ts` — function `analyzeBrandDna(summary: CatalogSummary, storeInfo: {name, segment, platform, ownerName})` that calls LLM via Vercel AI SDK `generateObject()` with Zod schema. Returns complete Brand DNA: niche, tone, audience, positioning, words_to_use/avoid, strengths[], alerts[], opportunities[] (with estimated_revenue and color), revenue_projection, recommended_skills[], greeting, intro. Use model `gpt-5.2`. Include the full system prompt for the CMO analysis.

**Checkpoint**: LLM analysis service ready. Can generate Brand DNA from product data.

---

## Phase 2: Foundational — Analysis Pipeline (Blocking)

**Purpose**: The 3-step pipeline that runs during onboarding. All UI stories depend on this.

- [x] T004 Create `src/lib/onboarding/analysis-pipeline.ts` — function `runAnalysisPipeline(storeId, teamId, onProgress)` that orchestrates 3 steps: (1) sync products from platform via existing NuvemshopClient or Composio Shopify, (2) call `summarizeCatalog` + `analyzeBrandDna`, (3) save result to `brand_dna` table. The `onProgress` callback reports step status for SSE streaming. Handle errors per-step with retry capability.
- [x] T005 Create `src/app/api/onboarding/analyze/route.ts` — POST endpoint that authenticates user, gets teamId + storeId, creates a ReadableStream for SSE, calls `runAnalysisPipeline` with progress callback that writes SSE events (`event: step`, `event: done`, `event: error`). Returns streaming Response with `Content-Type: text/event-stream`. Read `src/app/api/nuvemshop/sync/route.ts` for auth pattern reference.
- [x] T006 Create `src/hooks/use-onboarding-analysis.ts` — `"use client"` hook that connects to SSE endpoint via `EventSource` or `fetch` with ReadableStream. Tracks: `steps[]` (step number, status, message, count), `isComplete`, `error`, `brandDnaId`. Provides `start()` and `retry()` methods. Auto-starts when storeId is provided.

**Checkpoint**: Pipeline runs end-to-end. SSE streams progress to client. Brand DNA saved to DB.

---

## Phase 3: User Story 1 — Lojista conecta loja e recebe Brand DNA real (Priority: P1) MVP

**Goal**: Full flow from OAuth → sync → LLM analysis → Brand DNA saved.

**Independent Test**: Connect a real Nuvemshop store → verify products synced + brand_dna populated in DB.

### Implementation

- [x] T007 [US1] Modify `src/app/api/nuvemshop/callback/route.ts` — after saving token and triggering sync, redirect to `/onboarding/analyzing?storeId=xxx` instead of current redirect target. Read the file first to understand current redirect logic. Keep existing sync trigger (fire-and-forget) but add storeId to redirect URL.
- [x] T008 [US1] Modify `src/components/onboarding/analyzing-screen.tsx` — replace mock timer animation with real SSE connection. Read URL param `storeId` (from callback redirect). Call `useOnboardingAnalysis(storeId)` hook. Each step shows real message from SSE (not hardcoded text). Show real counts (products, dates). On error, show error message + retry button. On complete, show Continue button → navigate to `/onboarding/brand-dna`.
- [x] T009 [US1] Verify end-to-end: Nuvemshop OAuth → callback → redirect → analyzing with real SSE → brand_dna saved. Check `store_products` count matches real store. Check `brand_dna` fields are populated with coherent data.

**Checkpoint**: MVP — connect store and get real Brand DNA.

---

## Phase 4: User Story 2 — Brand DNA gerado por análise LLM (Priority: P1)

**Goal**: LLM analysis produces accurate, niche-specific Brand DNA.

**Independent Test**: Call `analyzeBrandDna()` with real product data → verify output is coherent.

### Implementation

- [x] T010 [US2] Refine LLM prompt in `src/lib/ai/brand-dna-analyzer.ts` — the system prompt must instruct the LLM to: (a) detect the niche from product names/categories/prices, (b) infer tone from product descriptions (formal vs informal, emotional vs technical), (c) identify the target audience from price range + niche, (d) generate Portuguese language output for all text fields, (e) be specific to the store (use store name, reference actual products), (f) generate seasonal opportunities with BR calendar dates relevant to the niche, (g) estimate revenue projections based on average_ticket × seasonal benchmarks.
- [x] T011 [US2] Define Zod schema in `brand-dna-analyzer.ts` matching `brand_dna` table + `recommended_skills`. All string fields in Portuguese. opportunities[] must have `title`, `description`, `estimated_revenue` (number), `color` ('green' | 'amber'). strengths/alerts must have `title` + `description`. recommended_skills must reference valid skill slugs from `src/data/skills.ts`.
- [x] T012 [US2] Handle edge cases in `catalog-summarizer.ts`: (a) 0 products → return minimal summary with flag, (b) products without descriptions → use names only, (c) products without prices → exclude from price stats, (d) > 5000 products → sample top 50 by recent + random 50.

**Checkpoint**: LLM generates accurate, store-specific Brand DNA for different niches.

---

## Phase 5: User Story 3 — Tela Analyzing com progresso real (Priority: P2)

**Goal**: Analyzing screen shows real numbers from the pipeline.

**Independent Test**: Run pipeline → verify UI shows correct product count and date count.

### Implementation

- [x] T013 [US3] In `analysis-pipeline.ts`, ensure step 1 progress callback includes actual product count from sync result. Step 3 includes actual opportunity count from LLM output. Messages in Portuguese: "Sincronizando produtos...", "X produtos sincronizados", "Gerando Brand DNA...", "Brand DNA gerado", "Mapeando datas sazonais...", "Y oportunidades mapeadas".
- [x] T014 [US3] In `analyzing-screen.tsx`, handle error state per step: if step 1 fails (sync error), show "Falha ao sincronizar. Verifique a conexão com a loja." + "Tentar novamente" button. If step 2 fails (LLM error), show "Falha na análise. Tente novamente." + retry. If step 3 fails, show partial result message.
- [x] T015 [US3] Style the analyzing screen to match prototype exactly: green check circles for completed, spinner for running, gray dots for pending. Use the exact CSS from `snew-ai-core/src/pages/onboarding/OnboardingAnalyzing.tsx` (already in docs/ONBOARDING_IMPLEMENTATION.md).

**Checkpoint**: Analyzing screen shows accurate real-time progress with error handling.

---

## Phase 6: User Story 4 — Tela Brand DNA exibe dados reais (Priority: P2)

**Goal**: Brand DNA page reads from DB and shows personalized data.

**Independent Test**: Generate Brand DNA → open page → verify all 8 sections show real store data.

### Implementation

- [x] T016 [US4] Create `src/app/api/store/brand-dna/route.ts` — GET endpoint. Authenticate user, get teamId, query `brand_dna` table where `team_id = teamId`. Return JSON. If not found, return 404.
- [x] T017 [US4] Create `src/hooks/use-brand-dna.ts` — `"use client"` hook using TanStack React Query. Fetches from `GET /api/store/brand-dna`. Returns `{ brandDna, isLoading, error }`.
- [x] T018 [US4] Modify `src/components/onboarding/brand-dna-screen.tsx` — replace mock data import (`@/data/mock-brand-dna`) with `useBrandDna()` hook. Map DB fields to the 8 sections: greeting (owner_name + greeting + intro), identity (positioning + niche), tone (tone + words_to_use/avoid), diagnostic (strengths + alerts), opportunities, alert paragraph, revenue projection, recommended skills. Show loading state while fetching. Handle missing data gracefully.
- [x] T019 [US4] Ensure the "ver assets →" button and Assets drawer work with real data or are hidden when no assets available. For MVP, keep the drawer but show a "Disponível em breve" message instead of mock Milkes assets.

**Checkpoint**: Brand DNA page shows real, personalized data from the database.

---

## Phase 7: User Story 5 — Ativa skills reais (Priority: P2)

**Goal**: Skill toggles persist to DB. Onboarding marks as complete.

**Independent Test**: Toggle skills → click "Começar" → verify skills table + stores.onboarding_completed.

### Implementation

- [x] T020 [US5] Create `src/app/api/onboarding/complete/route.ts` — POST endpoint. Receives `{ selectedSkillSlugs: string[] }`. For each slug, calls `activateSkill(teamId, slug)` from `src/lib/actions/skills.ts`. Then updates `stores` table: `onboarding_completed = true`. Returns `{ success: true, activatedSkills: N }`.
- [x] T021 [US5] Modify `src/components/brand-dna/skill-activation-list.tsx` (or equivalent component in brand-dna-screen) — the "Começar com essas habilidades" button calls `POST /api/onboarding/complete` with the selected skill slugs. On success, redirect to `/`. Show loading state on button while processing. Handle error with toast.
- [x] T022 [US5] Ensure skill recommendations from Brand DNA (`recommended_skills[]` field) are used to populate the toggle list. Map each `{ slug, reason }` to the toggle UI. If Brand DNA has no recommendations, fall back to default: seasonal-calendar, campaign-copywriter, brand-dna-agent.

**Checkpoint**: Skills activated in DB. Onboarding complete. Redirect to home.

---

## Phase 8: User Story 6 — Brand DNA alimenta o chat (Priority: P3)

**Goal**: Snew's system prompt includes Brand DNA context.

**Independent Test**: Generate Brand DNA → send chat message → verify response reflects brand tone.

### Implementation

- [x] T023 [US6] Modify `src/app/api/chat/route.ts` — after loading team context (skills, store), also query `brand_dna` table for the team. If exists, pass to `buildOrchestratorSystemPrompt()`.
- [x] T024 [US6] Modify `buildOrchestratorSystemPrompt()` in `src/lib/ai/platform-tools.ts` — add a new parameter `brandDna?: { niche, tone, audience, words_to_use, words_to_avoid, positioning }`. If provided, add a "## Brand DNA" section to the system prompt with: niche, tone, audience, positioning, words to use/avoid. This makes the Snew respond on-brand.
- [x] T025 [US6] Test: send a chat message like "escreve uma copy para Instagram" and verify the response tone matches the Brand DNA (uses words_to_use, avoids words_to_avoid).

**Checkpoint**: Chat is brand-aware. Responses reflect the store's identity.

---

## Phase 9: Store Connection Flow (Priority: P2)

**Goal**: OAuth redirect flow works correctly for both platforms.

### Implementation

- [x] T026 Modify `src/components/onboarding/connect-screen.tsx` — "Connect via Nuvemshop" button calls `/api/nuvemshop/connect?team_id=xxx` (real OAuth redirect, not client-side navigation). "Connect via Shopify" button initiates Composio connection flow. Read existing Composio connection code in the project to understand the pattern.
- [x] T027 Add onboarding state guard: in `src/app/(onboarding)/onboarding/layout.tsx` or in each page, check if `stores.onboarding_completed === true` → redirect to `/`. Check if no store exists → show welcome. Check if store exists but no brand_dna → redirect to `/onboarding/analyzing`.
- [x] T028 Ensure the onboarding/connect page passes the correct `team_id` to the OAuth URL. Read how the existing system gets `team_id` from the session.

**Checkpoint**: Full connection flow works. State guards prevent invalid navigation.

---

## Phase 10: Polish & Cross-Cutting

- [x] T029 [P] Handle edge case: store with 0 products — `catalog-summarizer.ts` returns a minimal summary, `brand-dna-analyzer.ts` generates partial Brand DNA with alert "Nenhum produto encontrado. Adicione produtos para uma análise completa."
- [x] T030 [P] Handle LLM failure/timeout — `analysis-pipeline.ts` step 2 catches errors, saves partial Brand DNA if possible, reports error via SSE.
- [x] T031 [P] Remove mock data dependencies — grep for `mock-brand-dna` imports across `src/`, replace with `use-brand-dna` hook or remove.
- [x] T032 Run `bun run build` — verify zero errors.
- [x] T033 Run `bun run lint` — verify no new warnings.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Pipeline)**: Depends on Phase 1 (needs analyzer + summarizer)
- **Phase 3 (US1 — Connect + Brand DNA)**: Depends on Phase 2 (needs pipeline + SSE)
- **Phase 4 (US2 — LLM accuracy)**: Depends on Phase 1 (needs analyzer)
- **Phase 5 (US3 — Analyzing UI)**: Depends on Phase 2 (needs SSE hook)
- **Phase 6 (US4 — Brand DNA page)**: Depends on Phase 3 (needs brand_dna in DB)
- **Phase 7 (US5 — Skill activation)**: Depends on Phase 6 (needs brand DNA page working)
- **Phase 8 (US6 — Chat)**: Depends on Phase 3 (needs brand_dna in DB)
- **Phase 9 (Connection)**: Depends on Phase 2 (needs pipeline to redirect to)
- **Phase 10 (Polish)**: Depends on all previous

```
Phase 1 (Setup)
  ↓
Phase 2 (Pipeline) ← BLOCKING
  ↓
  ├── Phase 3 (US1 — Full flow) ← MVP
  │     ↓
  │     ├── Phase 6 (US4 — Brand DNA page)
  │     │     ↓
  │     │     └── Phase 7 (US5 — Skill activation)
  │     └── Phase 8 (US6 — Chat integration)
  │
  ├── Phase 4 (US2 — LLM accuracy) ← can parallel with Phase 3
  ├── Phase 5 (US3 — Analyzing UI) ← can parallel with Phase 3
  └── Phase 9 (Connection flow) ← can parallel with Phase 3
  ↓
Phase 10 (Polish)
```

### Parallel Opportunities

- **Phase 1**: T002 + T003 can run in parallel (different files)
- **Phase 3 + 4 + 5 + 9**: Can all start once Phase 2 completes
- **Phase 10**: T029 + T030 + T031 can run in parallel

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1: Migration + catalog summarizer + LLM analyzer
2. Phase 2: Pipeline + SSE endpoint + client hook
3. Phase 3: Connect callback redirect + analyzing screen with real SSE
4. **STOP and VALIDATE**: Connect real Nuvemshop store → Brand DNA generated with real data

This is the critical validation — if the LLM generates accurate Brand DNA from a real catalog, the product works. Everything else builds on this.

### Full Delivery

1. MVP (Phases 1-3): Real pipeline working
2. LLM refinement (Phase 4): Improve prompt for accuracy
3. UI polish (Phases 5-6): Real data in all screens
4. Completion (Phase 7): Skills activate for real
5. Chat (Phase 8): Brand-aware Snew
6. Connection (Phase 9): OAuth flow polished
7. Polish (Phase 10): Error handling, cleanup

---

## Notes

- Total tasks: **33**
- Tasks per story: US1=3, US2=3, US3=3, US4=4, US5=3, US6=3, Connection=3, Setup=3, Foundation=3, Polish=5
- MVP scope: Phases 1-3 (9 tasks) — real pipeline generating Brand DNA from connected store
- Key risk: LLM output quality — if the Brand DNA is generic/inaccurate, the product loses its "wow moment"
- The LLM prompt (T010) is the most important single task. It determines the quality of everything downstream.
