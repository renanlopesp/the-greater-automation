# Implementation Plan — 066 Studio Chat Replacement

**Branch**: `066-studio-chat-replacement` | **Date**: 2026-04-14 | **Spec**: [spec.md](./spec.md)

## Summary

Port the complete Snew Studio experience from the Vite prototype (`snew-ai-core`, `localhost:8080`) to the relay Next.js 16 app (`localhost:3000`). The port covers 14 components (12 drifted + 2 new), 1 new landing page (1,043 lines), supporting config/hooks/data, 10 edge functions, and 5 DB objects (4 buckets + 3 tables). The goal is byte-for-byte parity on the visible UI, with only the minimum adjustments required for Next.js App Router, React 19, and Tailwind v4. The new studio replaces the legacy `chat`/`tarefa` entry points.

**Technical approach**: Literal copy of prototype files, mechanically adjusted for Next.js (`'use client'`, `next/navigation`, `searchParams` + `sessionStorage` bridge for non-serializable state, `next/image` only where safe). Backend stays on the prototype's Supabase (`plkhvlnqjihonpzeeybh`) for the P1 ship (keeps the current `studioSupabase` client), then migrates to relay's Supabase (`apsfeutbqvgfgznmaesg`) in P2 with dedicated migrations and function deployments.

## Technical Context

- **Language/Version**: TypeScript 5 (strict), Next.js 16.1.6 (App Router), React 19.2.3
- **Primary Dependencies**: `@supabase/supabase-js`, `framer-motion`, `lucide-react`, `html2canvas`, `sonner`, `@radix-ui/*`, Tailwind CSS v4, shadcn/ui (new-york)
- **New deps required**: verify `framer-motion` (prototype uses it for capability cards + gallery motion); `mp4-muxer` is intentionally dropped in favour of `MediaRecorder` (WebM) — keep relay's decision.
- **Storage**: Supabase (`plkhvlnqjihonpzeeybh` for P1, `apsfeutbqvgfgznmaesg` for P2) — tables: `image_styles`, `product_catalog`, `store_products`, `brand_dna`, `conversations`, `conversation_messages`, `skills`. Buckets: `product-images`, `brand-references`, `temp-videos`, `coworker-avatars` (in prototype project today).
- **Testing**: Vitest + Testing Library for unit, Playwright for visual/e2e. Target: DOM parity with prototype (pixel-diff on 3 viewports + 5 scenarios).
- **Target Platform**: Modern evergreen browsers; `/studio` is a desktop-first workflow (prototype's home page does not ship a mobile layout).
- **Project Type**: Web (single Next.js app). No backend service added.
- **Performance Goals**: Home TTI < 2s on localhost; Studio modal first paint < 1.5s; chat "send" → first streamed token < 1.2s (unchanged from prototype baseline).
- **Constraints**: No visual redesign allowed; any deviation from the prototype must have an inline comment explaining why.
- **Scale/Scope**: ~13k lines ported across 14 component files + 1 page (1k lines) + ~500 lines of config/hooks/data + 11 edge functions (P2) + 4 migrations (P2). ~35 task items total.

## Constitution Check

Checked against `.specify/memory/constitution.md`:

| Principle                                      | Status           | Notes                                                                                             |
| ---------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| **I. Spec-first**                              | ✅ Pass          | spec.md + plan.md + tasks.md being produced before implementation.                                |
| **II. Component parity**                       | ✅ Pass          | This is literally a 1:1 port. Every adjustment is Next.js adapter only.                           |
| **III. Supabase migration for schema changes** | ✅ Pass          | All new tables/buckets in P2 will have migration files under `supabase/migrations/`.              |
| **IV. No backwards-compat shims**              | ✅ Pass          | Legacy `/chat` redirects to `/studio` outright; no legacy code kept in parallel.                  |
| **V. Observability**                           | ⚠️ Requires plan | Add structured events for chat send / image generate / style apply / schedule. Defined in FR-026. |
| **VI. Single-branch workflow**                 | ✅ Pass          | All work on `066-studio-chat-replacement`.                                                        |

## Project Structure

### Documentation

```text
specs/066-studio-chat-replacement/
├── plan.md              # this file
├── spec.md              # user-facing spec
├── tasks.md             # ordered task list (/speckit.tasks)
├── data-model.md        # (optional P2 — DB entity diagrams)
├── contracts/           # (optional P2 — edge function request/response shapes)
└── quickstart.md        # (optional — dev setup for studio-supabase env)
```

### Source Code

```text
src/
├── app/
│   └── (dashboard)/
│       └── studio/
│           ├── page.tsx                   # REPLACES the modal wrapper — now the landing (port of SnewStudioHomePage)
│           ├── create/
│           │   └── page.tsx               # NEW — port of SnewStudioPage (modal workspace)
│           └── calendar/
│               └── page.tsx               # P3 — port of PostCalendarPage
├── components/
│   └── asset-studio/
│       ├── AssetCreatorModal.tsx          # REWRITE (12,846 lines from prototype)
│       ├── StudioChatPanel.tsx            # REWRITE (1,632 lines)
│       ├── CanvasPreview.tsx              # REWRITE (127 lines)
│       ├── FloatWindowHeader.tsx          # NEW (41 lines)
│       ├── ImageUploadPanel.tsx           # NEW (388 lines)
│       ├── FontCategorySelector.tsx       # REWRITE (150 lines)
│       ├── Step1Campaign.tsx              # REWRITE
│       ├── Step2Products.tsx              # REWRITE
│       ├── Step3Studio.tsx                # REWRITE (keeps 'use client')
│       ├── Step4Export.tsx                # REWRITE
│       ├── StudioProgressBar.tsx          # REWRITE
│       ├── StudioSidebar.tsx              # REWRITE
│       └── StudioTopBar.tsx               # REWRITE
├── hooks/
│   └── useFloatWindow.ts                  # NEW — port of prototype hook
├── config/
│   ├── imageStyles.ts                     # NEW — loadImageStyles, seeds, STYLES_STORAGE_KEY
│   ├── storeContext.ts                    # NEW — buildKBInline, buildBrandContextBody
│   └── designSystem.ts                    # EXTEND — add getGradient + 5 gradient families
├── data/
│   ├── assetStudioData.ts                 # VERIFY parity (mockProducts, colorThemes, StudioState)
│   ├── seasonalCalendar.ts                # VERIFY parity
│   └── seasonalL3Content.ts               # VERIFY parity
├── lib/
│   ├── historyKey.ts                      # NEW — getHistoryKey, migrateLegacyHistory
│   └── studio/
│       └── store-context.ts               # NEW — loadStoreContext, loadBrandReferencesBase64
└── lib/supabase/
    └── studio-client.ts                   # KEEP for P1; REMOVE in P2 (replace with main client)

supabase/
├── functions/
│   ├── studio-chat/                       # UPDATE (245 → 311 lines, new prompt)
│   ├── gemini-generate/                   # NEW (P2)
│   ├── generate-copy/                     # NEW (P2)
│   ├── generate-carousel/                 # NEW (P2)
│   ├── generate-video/                    # NEW (P2)
│   ├── check-video-status/                # NEW (P2)
│   ├── generate-legenda/                  # NEW (P2)
│   ├── conversion-scanner/                # NEW (P2)
│   ├── freepik-generate/                  # NEW (P2)
│   ├── freepik-icon/                      # NEW (P2)
│   └── convert-video/                     # NEW (P2)
└── migrations/                            # 4 new migrations in P2 (image_styles, product_catalog decision, buckets, seed)
```

## Phase 0 — Research & Decisions

No open unknowns about framework choice (Next.js) or language (TS). Open decisions are captured in spec.md's "Open Questions" and resolved here with defaults we can proceed against:

| Decision                              | Default (this plan)                                                                                                                                                                                    | Rationale                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Studio Supabase target                | **Keep prototype project for P1**. Migrate in P2 as a separate deliverable.                                                                                                                            | De-risks the initial ship; the prototype's DB is already populated with styles, brand refs, and prompt-compatible data.                |
| `product_catalog` vs `store_products` | **Keep `product_catalog` for studio in P1.** Consolidate into `store_products` in P2 as a rename migration + client swap.                                                                              | `useProductCatalog.ts` already references `product_catalog`; prototype code assumes it. Deferring consolidation keeps the port linear. |
| Chat persistence                      | **Write studio sessions to `conversations` + `conversation_messages`** (spec 063 tables). localStorage keeps the history cache and restore items.                                                      | Reuses the hybrid-chat infra and preserves history across devices.                                                                     |
| `coworker_avatars`                    | **Out of scope** for 066. Only port the bucket policies if needed by other flows; do not introduce the table.                                                                                          | Prototype-era baggage; studio does not depend on it.                                                                                   |
| Task-chat bridge                      | **Hard redirect** `/chat`, `/chat/task/[id]`, `/chat/[id]` → `/studio` (with task id in `?restoreTask=`), surfacing a "continued in Studio" banner on first open. Defer data migration to a follow-up. | Keeps the cutover atomic; data migration risk is contained.                                                                            |
| Image component                       | Continue `<img>` for dynamic Supabase URLs inside the studio (same as prototype); use `<Image>` from `next/image` only where the URL is known at build time (feature card SVGs are inline).            | Prevents Next.js image optimization breaking hover-slideshow crossfades and prototype's inline styles.                                 |

Output: inline decisions above; if any are disputed, `/speckit.clarify` will reopen them.

## Phase 1 — Design

### Data model

P1 uses prototype Supabase; no new entities in relay. P2 adds:

- `public.image_styles` — see spec FR-015.
- `public.product_catalog` — see spec FR-016 (or the rename decision).
- Storage buckets: `brand-references`, `temp-videos`, `product-images` (policies: public read, insert, update, delete).
- Seeds: 20+ style rows + the hover image set currently hosted in `plkhvlnqjihonpzeeybh`.

### Contracts (edge functions)

- `studio-chat`: input `{ messages, creativeState }` → output JSON `{ message, actions[], follow_ups[] }`. Prompt upgraded to the creative-director persona with product anchoring, people/models rules, and style adaptation (spec FR-020).
- `gemini-generate`: input `{ type, prompt, images?, styleRef? }` → output `{ dataUrl, mimeType, width, height }` (exact shape taken from prototype).
- `generate-copy`: input `{ channel, tone, context, product }` → output `{ heading, description, cta, versions }`.
- `generate-carousel`: input `{ count, styleRef, brandContext }` → output `{ slides: Array<{ prompt, image }> }`.
- `generate-video` + `check-video-status`: async job-submit + poll.
- `generate-legenda`: input `{ asset, product, brand }` → output `{ caption }`.
- `conversion-scanner`: input `{ url }` → output `{ insights[] }`.
- `freepik-generate`, `freepik-icon`, `convert-video`: contracts copied verbatim from prototype.

Contracts will be committed as `supabase/functions/<name>/README.md` sections during P2 (task T-B.\*).

### Quickstart

1. `cp .env.example .env.local` and set `NEXT_PUBLIC_STUDIO_SUPABASE_URL` + `NEXT_PUBLIC_STUDIO_SUPABASE_ANON_KEY` to the prototype project.
2. `bun install`.
3. `bun dev`.
4. Visit `/studio` and `/studio/create` for smoke tests.
5. Compare against `http://localhost:8080/studio/create` in a second browser window.

### Observability

Emit events via the existing telemetry helper (extend if missing) for:

- `studio.chat.send` `{ mode: studio|agent, actions: string[] }`
- `studio.image.generate` `{ model, dnaRefs: n, durationMs }`
- `studio.video.generate` `{ durationMs, status }`
- `studio.style.apply` `{ styleId, source: 'chat'|'picker'|'home' }`
- `studio.schedule.save` `{ channel, scheduledAt }`

## Phase 2 — Tasks (see tasks.md)

Tasks are organized into six phases, each with clear dependencies and test exit criteria. See [tasks.md](./tasks.md).

## Risks & Mitigations

| Risk                                                                                                            | Severity       | Mitigation                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Copy-paste breaks subtle behaviours (ref-forwarding, portals, `createPortal`).                                  | High           | After each file copy, diff the JSX root and verified exported refs. Keep the prototype file open side-by-side while testing.                         |
| `react-router-dom` vs `next/navigation` state semantics differ (location.state object vs URL + sessionStorage). | High           | Centralize state bridge in a single helper `src/lib/studio/route-state.ts`; all call sites use it.                                                   |
| framer-motion SSR hydration mismatch in App Router.                                                             | Medium         | All animated surfaces live in `'use client'` components already; no SSR motion.                                                                      |
| 13k-line AssetCreatorModal is hard to review.                                                                   | Medium         | Land the copy in one commit dedicated to "port AssetCreatorModal (no logic changes)", then follow with separate commits for each Next.js adjustment. |
| Edge function secrets differ between prototype and relay Supabase (P2).                                         | High (P2 only) | Inventory secrets in the task list; require `supabase secrets set` doc in quickstart.                                                                |
| Regression in legacy chat users during redirect.                                                                | Medium         | Keep the legacy routes for 1 release cycle behind a redirect banner; monitor SC-005.                                                                 |

## Acceptance gates

- **After Phase 1 (modal port)**: visual diff on 3 canned scenarios passes against prototype.
- **After Phase 2 (home port)**: home page renders gallery + history + capabilities identically.
- **After Phase 3 (redirect)**: sidebar + legacy routes all land on `/studio*`; no dead links.
- **After Phase 4 (backend migration, P2)**: `NEXT_PUBLIC_STUDIO_SUPABASE_*` removed; all edge functions live in relay project; schema migrations in source control.
- **Final**: SC-001..SC-006 from spec.md all measured and within tolerance.
