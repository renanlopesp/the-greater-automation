# Tasks — 066 Studio Chat Replacement

**Branch**: `066-studio-chat-replacement` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Conventions:

- `[P]` marks tasks safely parallelizable with their neighbors.
- File paths are absolute from `/home/renanl/Projects/relay/`.
- "Copy from prototype" = `cp` from `/home/renanl/Projects/snew-ai-core/...` then apply the minimum Next.js adjustments (see Phase 0.3).
- Each task's exit criterion is the DOM/behavior matching the prototype for the relevant surface; visual diff on prototype at `http://localhost:8080`.

---

## Phase 0 — Prep (pre-port)

- **T-000** Spec branch already created: `066-studio-chat-replacement`. ✅
- **T-001 [P]** Copy prototype studio files into a staging dir outside git (e.g. `/tmp/studio-port/`) so the diff is not polluted by unrelated prototype files. Use it as a read-only reference.
- **T-002 [P]** Verify `bun` deps: `framer-motion` is installed; `html2canvas` is installed; `sonner` is installed; confirm no `mp4-muxer` — relay keeps `MediaRecorder`. Install any missing dep via `bun add`.
- **T-003 [P]** Confirm envs in `.env.local`: `NEXT_PUBLIC_STUDIO_SUPABASE_URL` and `NEXT_PUBLIC_STUDIO_SUPABASE_ANON_KEY` point to `plkhvlnqjihonpzeeybh`. Document in `quickstart.md` (optional).
- **T-004** Add a shared helper for the Next.js route-state bridge: `src/lib/studio/route-state.ts` with `getStudioRouteState()` (reads searchParams + sessionStorage) and `setStudioRouteState(nextPath, state)` (writes to sessionStorage, navigates with searchParams). All route handoffs from home → `/studio/create` use this.
- **T-005** Add telemetry helper stub or confirm existing one (`src/lib/analytics.ts` or similar). Reserve event names per plan (§Observability).

---

## Phase 1 — Component Port (P1, MVP for `/studio/create`)

Goal: `/studio/create` renders the full prototype modal byte-for-byte (minus Next.js adapters).

### 1.1 — Scaffolding

- **T-101** Create `src/app/(dashboard)/studio/create/page.tsx`. Wrap `AssetCreatorModal` in embedded mode with `AppSidebar`, reading route state via T-004.
- **T-102** Port `src/hooks/useFloatWindow.ts` from prototype (`/home/renanl/Projects/snew-ai-core/src/hooks/useFloatWindow.ts` — read it first).
- **T-103 [P]** Port `src/config/imageStyles.ts` from prototype. Includes `loadImageStyles`, `STYLES_STORAGE_KEY`, `ImageStyleOption`, seed list.
- **T-104 [P]** Port `src/config/storeContext.ts` from prototype (`buildKBInline`, `buildBrandContextBody`).
- **T-105 [P]** Port `src/lib/studio/store-context.ts` housing `loadStoreContext`, `loadBrandReferencesBase64`, and `StoreContext` type (currently in prototype's `KnowledgeBasePage`). Do **not** recreate the full KnowledgeBasePage UI — just lift the helpers.
- **T-106 [P]** Port `src/lib/historyKey.ts` (`getHistoryKey`, `migrateLegacyHistory`).
- **T-107 [P]** Extend `src/lib/design-system/brand-gradients.ts` (already exists per spec 065) with `getGradient(skill: string)` helper + 5 gradient families (Sage Haze, Dusk Rose, Aurora, Mist, Blue Dusk) matching prototype's `config/designSystem.tsx`. If relay's gradient helper signature differs, add a new file `src/config/designSystem.ts` for parity.
- **T-108 [P]** Verify `src/data/assetStudioData.ts`, `src/data/seasonalCalendar.ts`, `src/data/seasonalL3Content.ts` are byte-equal to prototype. Update if drifted.

### 1.2 — New components

- **T-110** Create `src/components/asset-studio/FloatWindowHeader.tsx`. Copy from prototype (41 lines). Add `'use client'`.
- **T-111** Create `src/components/asset-studio/ImageUploadPanel.tsx`. Copy from prototype (388 lines). Add `'use client'`; swap `@/integrations/supabase/client` → `@/lib/supabase/studio-client`.

### 1.3 — Drifted components (rewrite from prototype)

- **T-120** Rewrite `src/components/asset-studio/CanvasPreview.tsx` from prototype. Add `'use client'`.
- **T-121** Rewrite `src/components/asset-studio/FontCategorySelector.tsx`. Add `'use client'`.
- **T-122** Rewrite `src/components/asset-studio/Step1Campaign.tsx`. Add `'use client'`.
- **T-123** Rewrite `src/components/asset-studio/Step2Products.tsx`. Add `'use client'`.
- **T-124** Rewrite `src/components/asset-studio/Step3Studio.tsx`. Add `'use client'` (already present in relay — keep).
- **T-125** Rewrite `src/components/asset-studio/Step4Export.tsx`. Add `'use client'`.
- **T-126** Rewrite `src/components/asset-studio/StudioProgressBar.tsx`. Add `'use client'`.
- **T-127** Rewrite `src/components/asset-studio/StudioSidebar.tsx`. Add `'use client'`.
- **T-128** Rewrite `src/components/asset-studio/StudioTopBar.tsx`. Add `'use client'`.

### 1.4 — Chat panel (largest delta)

- **T-130** Rewrite `src/components/asset-studio/StudioChatPanel.tsx` (1,632 lines). Port in one commit marked "(no logic changes)". Then:
  - Add `'use client'`.
  - Swap `@/integrations/supabase/client` → `@/lib/supabase/studio-client`.
  - Ensure `StudioChatPanelRef` exposes all 7 methods: `pushAssistantMessage`, `pushQualificationMessage`, `pushStylePickerMessage`, `setMessages`, plus any additional ref methods in the prototype.
  - Verify `ProductPicker` component, `StylePickerMessage` rendering, `chipFadeIn` keyframes, and `fadeInUp` keyframes compile.
  - Verify the dual invocation path (`studio-chat` and `gemini-generate`) works through `studioSupabase`.

### 1.5 — Modal (biggest file, 12,846 lines)

- **T-140** Rewrite `src/components/asset-studio/AssetCreatorModal.tsx` in a single "port (no logic changes)" commit. After copy:
  - Add `'use client'`.
  - Swap imports: `react-router-dom` → `next/navigation`; `@/integrations/supabase/client` → `@/lib/supabase/studio-client`.
  - Replace any `useNavigate()` with `useRouter()`; any `useLocation()` → `useSearchParams()` + the route-state helper (T-004).
  - Wire up `useFloatWindow` (T-102), `ImageUploadPanel` (T-111), `FloatWindowHeader` (T-110).
  - Confirm `createPortal` usage still works in App Router (client-only).
  - Remove any lingering `initialBoardMode` calls in relay that don't exist in prototype — then replace with prototype's semantics.

### 1.6 — Verification

- **T-150** Smoke test: load `/studio/create` empty. Chat welcome chips render with stagger. Canvas renders empty state.
- **T-151** Smoke test: `/studio/create?autoPrompt=foo` auto-fires the chat with `foo` as first message.
- **T-152** Side-by-side visual comparison at 1440×900 across 5 scenarios: empty / with-product / with-style / with-carousel / with-video. Document deltas > 2%.
- **T-153** Qualification flow test: send a first message, confirm `ProductPicker` appears with 6 items + search + load-more + skip; select one → `StylePickerMessage` renders; select style → canvas generates.
- **T-154** Reference image test: drag an image into the chat drop zone; confirm the overlay appears with "Solte para usar como referência" + subtext; after drop, the image attaches and next generation includes it.
- **T-155** Float-window test: open product selector → drag it → position persists until close; close via X.

Exit: Phase 1 done when T-150..T-155 all pass.

---

## Phase 2 — `/studio` Home Port (P1)

Goal: `/studio` renders the prototype's `SnewStudioHomePage`, replacing the current 40-line modal wrapper.

- **T-200** Replace `src/app/(dashboard)/studio/page.tsx` content with a Server Component shell + dynamically imported `StudioHomeClient` (a `'use client'` port of `SnewStudioHomePage`).
- **T-201** Create `src/app/(dashboard)/studio/_components/StudioHomeClient.tsx` with the 1,043-line port. Adjustments:
  - `useNavigate` → `useRouter`; `navigate(..., { state })` → T-004 bridge.
  - `<img>` kept as-is (prototype uses inline styles + crossfade opacity that `next/image` would break).
  - `window.addEventListener('storage', ...)` guarded by `typeof window !== 'undefined'`.
  - Import `loadStoreContext` from T-105, `loadImageStyles` from T-103, `getGradient` from T-107, `getHistoryKey`/`migrateLegacyHistory` from T-106.
  - Supabase read of `image_styles` uses `studioSupabase`.
- **T-202 [P]** Create the 6 hero feature SVG icons inline (Gerar imagem / Criar vídeo / Carrossel / Escrever copy / Campanha / Relatório) — copy from prototype (they are inline SVGs).
- **T-203 [P]** Verify `capabilities` data (12 cards, 4 categories) matches prototype payload exactly, including the dynamic `autoPrompt` with store context.
- **T-204 [P]** Port the `StyleCard` sub-component (dual-layer crossfade) exactly — pay attention to the 30ms layer-swap `setTimeout` pattern.
- **T-205** Wire the hero chatbox: `Enter` (no Shift) → navigate to `/studio/create?autoPrompt=<text>`; circular submit button uses `<ArrowUp size={14} />` with bg `#E0E0DC` (empty) / `#1A1A1A` (filled).
- **T-206 [P]** Wire history grid: click history card → navigate to `/studio/create` with `restoreItem` in sessionStorage (via T-004). Honour the 50-item cap on write.
- **T-207 [P]** Wire capability card click → `goCreate(autoPrompt)` routing.
- **T-208 [P]** Confirm gradient families (Sage Haze / Dusk Rose / Aurora / Mist / Blue Dusk) render identical to prototype on capability cards.

### 2.1 — Verification

- **T-210** Home renders at `/studio` with hero H1 personalized by `brand_dna.store_name`.
- **T-211** 6 feature cards stagger-animate on mount (40ms).
- **T-212** Style gallery: hover a card with `hover_images` length > 1, verify 650ms crossfade and dot indicators.
- **T-213** History grid: with 5+ items in localStorage (`snew_asset_history_<slug>`), verify top 3 show and click restores into `/studio/create`.
- **T-214** Capabilities filter tabs cycle through All / Campaigns / Content / Analytics / Retention without layout jitter (AnimatePresence popLayout).
- **T-215** Cross-tab sync: open two tabs, mutate localStorage in one, verify the other updates.

Exit: Phase 2 done when T-210..T-215 all pass.

---

## Phase 3 — Chat / Task Replacement (P1)

Goal: the sidebar and legacy routes funnel users into the studio.

- **T-301** Update `src/components/AppSidebar.tsx` (or whatever sidebar is active after spec 065) so the primary create / chat affordance routes to `/studio`.
- **T-302** Update `src/app/(dashboard)/chat/page.tsx` from `redirect('/dashboard')` → `redirect('/studio')`.
- **T-303** Update `src/app/(dashboard)/chat/[id]/page.tsx` + `src/app/(dashboard)/chat/task/[id]/page.tsx` to redirect to `/studio/create?restoreTask=<id>`. Studio reads this via the route-state bridge and opens with the task conversation loaded from `conversations` + `conversation_messages`.
- **T-304** Add a "continued in Studio" banner on first `/studio/create` visit originating from a legacy task URL. Dismissible; localStorage flag `snew:studio-migration-banner-dismissed`.
- **T-305** Audit `src/components/*` for any remaining links to `/chat` or `/tasks/[id]/chat`; update all to `/studio`.
- **T-306** Confirm e2e: click every sidebar item, navigate from every dashboard card/widget that references a chat — none should 404.

---

## Phase 4 — Backend Migration (P2, follow-up)

Goal: all studio backend runs in relay's Supabase (`apsfeutbqvgfgznmaesg`). Drop `studio-client.ts`.

### 4.1 — DB migrations

- **T-B-401** Create migration `YYYYMMDDHHMMSS_create_image_styles_table.sql` (mirroring prototype including `hover_images text[]`, `updated_at` trigger). Apply via Supabase MCP `apply_migration`.
- **T-B-402** Create migration to seed `image_styles` with the 20+ style rows currently in `plkhvlnqjihonpzeeybh` (dump → insert script).
- **T-B-403** Decide `product_catalog` vs `store_products` consolidation. If keeping `product_catalog` in relay: migration + RLS. If consolidating: rename + client adapter.
- **T-B-404** Create migrations to provision storage buckets: `brand-references`, `temp-videos`, `product-images`. Policies: public select/insert/update/delete matching prototype.
- **T-B-405** Migrate existing brand-references images from prototype bucket → relay bucket (script in `specs/066-studio-chat-replacement/scripts/`).

### 4.2 — Edge function deployments

- **T-B-410** Copy `supabase/functions/gemini-generate/` from prototype → relay. Deploy.
- **T-B-411** Copy `supabase/functions/generate-copy/` → deploy.
- **T-B-412** Copy `supabase/functions/generate-carousel/` → deploy.
- **T-B-413** Copy `supabase/functions/generate-video/` → deploy.
- **T-B-414** Copy `supabase/functions/check-video-status/` → deploy.
- **T-B-415** Copy `supabase/functions/generate-legenda/` → deploy.
- **T-B-416** Copy `supabase/functions/conversion-scanner/` → deploy.
- **T-B-417** Copy `supabase/functions/freepik-generate/` and `supabase/functions/freepik-icon/` → deploy.
- **T-B-418** Copy `supabase/functions/convert-video/` → deploy.
- **T-B-419** Update `supabase/functions/studio-chat/index.ts` (245 → 311 lines) to match prototype prompt.
- **T-B-420** Set Supabase secrets in relay project: `LOVABLE_API_KEY`, `GEMINI_API_KEY`, `FREEPIK_API_KEY`, `RUNWAY_API_KEY` (or whatever the functions need). Inventory from each function's code.

### 4.3 — Client swap

- **T-B-430** Replace all `studioSupabase` imports with the main `createClient()`. Delete `src/lib/supabase/studio-client.ts`.
- **T-B-431** Remove `NEXT_PUBLIC_STUDIO_SUPABASE_URL` + `NEXT_PUBLIC_STUDIO_SUPABASE_ANON_KEY` from `.env.example` and docs.
- **T-B-432** End-to-end smoke against relay Supabase: every of the 33 `supabase.functions.invoke` sites returns 200.

### 4.4 — Verification

- **T-B-440** `list_migrations` in relay shows all 4 new migrations.
- **T-B-441** `list_edge_functions` in relay shows 11 studio-related functions.
- **T-B-442** `grep -r 'STUDIO_SUPABASE' src/` returns nothing.

---

## Phase 5 — Observability & Cleanup (P3)

- **T-501** Emit the 5 telemetry events (plan §Observability) from their respective sites.
- **T-502** Port `/studio/calendar` from prototype `PostCalendarPage` as `src/app/(dashboard)/studio/calendar/page.tsx`.
- **T-503** After 1 release of monitoring `SC-005`, delete the dead legacy `/chat/task/[id]` pages if traffic is zero.
- **T-504** Update `CLAUDE.md` with the 066 feature summary.
- **T-505** Update `docs/CODEBASE_MAP.md` with the new studio structure.

---

## Dependency summary

```text
T-000 → T-001 → T-002 → T-003 → T-004 → T-005
                                    │
                                    ▼
                 T-101 ← (T-102, T-103, T-104, T-105, T-106, T-107, T-108) [P fan-out]
                   │
                   ▼
         (T-110, T-111) [P]
                   │
                   ▼
 (T-120..T-128) [P] — drifted components
                   │
                   ▼
               T-130 — chat panel
                   │
                   ▼
               T-140 — modal
                   │
                   ▼
  (T-150..T-155) — verification Phase 1
                   │
                   ▼
              (T-200..T-208) — Home
                   │
                   ▼
  (T-210..T-215) — verification Phase 2
                   │
                   ▼
              (T-301..T-306) — Chat/task replacement
                   │
                   ▼ [P2]
   (T-B-401..T-B-442) — backend migration
                   │
                   ▼ [P3]
              (T-501..T-505) — cleanup
```

## Notes

- Commits: one per phase section (e.g., "066: port asset-studio base components"), with small follow-up commits for Next.js adjustments and verification fixes.
- PRs: stack the phases — Phase 1 can merge before Phase 2 lands if `/studio/create` is behind a feature flag (`FEATURE_STUDIO_V2`) initially.
- Rollback: if Phase 3 redirect has regressions, revert only `T-302..T-305`; Phase 1/2 stay intact.
