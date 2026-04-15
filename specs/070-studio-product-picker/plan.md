# Implementation Plan: Studio Product Picker

**Branch**: `070-studio-product-picker` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/070-studio-product-picker/spec.md`

## Summary

Replace the "Produto" file-upload stub above the studio prompt input with a real product picker sourced from the team's connected store (Nuvemshop or Composio Shopify). Selecting a product makes it the studio's "active product": its image becomes the canvas source, its id populates the selected-products list, and its photo becomes the visual reference passed to every subsequent image-model call — ending the hallucinated-product problem on any "cria campanha com o body bordado rosa" style request.

Technical approach: one new normalised server endpoint (`GET /api/studio/products`) that unifies the two backend shapes, one new client component (`StudioProductPicker`, shadcn `Sheet`), and promotion of the in-flight `chatProductImageUrl`/`activeImageUrl`/`selectedProducts` tuple into a single `activeProduct` slice on the existing `StudioSession` context so the picker, the sidebar drag, and the chat auto-anchor all drive the same state. Persistence piggybacks on the existing `tasks.artifact_data` JSONB merge under a new `activeProduct` sub-key — no schema change.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6 (App Router), React 19.2.3, shadcn/ui (new-york), Tailwind CSS v4, TanStack React Query (for picker fetch cache), `@supabase/ssr`, lucide-react
**Storage**: Supabase PostgreSQL — existing `tasks.artifact_data` JSONB (merge under `activeProduct` sub-key); existing `stores` row for Nuvemshop credentials; Composio Shopify connected accounts (existing)
**Testing**: Playwright for end-to-end user stories; Vitest for the server route's Nuvemshop → Composio normalizer
**Target Platform**: Web (desktop + mobile browsers); server routes on Next.js Node runtime
**Project Type**: single (Next.js web app — `src/` at repo root)
**Performance Goals**: Picker first-paint under 200 ms after data arrives; typed search filter under 500 ms for 500 products; product-list fetch under 2 s on broadband (SC-001, SC-006)
**Constraints**: No DB schema change (use existing `tasks.artifact_data` merge); must honour the spec 069 mutual-exclusion rule (Nuvemshop wins over Composio Shopify) via the existing `getStoreConnection` helper; must not regress the existing sidebar drag flow; must keep "Referência de imagem" upload intact
**Scale/Scope**: One new API route, one new client component, one context field added to `StudioSession`, one wiring change in `StudioChatPanel`, one persistence hook in `AssetCreatorModal`. Target ~600 LOC total across the feature.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                            | Status | Notes                                                                                                                                                                                                                                    |
| ------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Next.js App Router First          | PASS   | New route is a `GET` in `src/app/api/studio/products/route.ts` (Route Handler). Picker client component lives under `src/components/asset-studio/` and is marked `"use client"` because it uses Sheet + TanStack Query + event handlers. |
| II. shadcn/ui Component System       | PASS   | Picker composes `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `Input` (search), `Button`, and `Skeleton`. No parallel component reimplementations.                                                                               |
| III. Tailwind CSS v4 + OKLCH Theming | PASS   | All styling via Tailwind utilities + existing theme tokens (`bg-background`, `border-border`, `text-muted-foreground`). No inline hex/rgb.                                                                                               |
| IV. TypeScript Strict Mode           | PASS   | No `any` leaks — Nuvemshop and Composio product shapes are normalised via Zod-validated `NormalizedProduct` type at the API boundary.                                                                                                    |
| V. Simplicity and YAGNI              | PASS   | One unified endpoint rather than two; one context slice rather than duplicated refs; no feature flag; no premature virtualisation (paginate at 50-per-page, add windowing only if QA shows scroll-jank).                                 |
| VI. Supabase as Backend              | PASS   | No new table. Active-product state merges into existing `tasks.artifact_data` via the already-established PATCH merge path. RLS on `tasks` remains the authority.                                                                        |

**Result**: All gates PASS. No constitutional violations; Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/070-studio-product-picker/
├── plan.md              # This file
├── research.md          # Phase 0 — normalizer shape + cache strategy
├── data-model.md        # Phase 1 — NormalizedProduct, ActiveProduct, session persistence shape
├── quickstart.md        # Phase 1 — how to run the feature locally end-to-end
├── contracts/
│   └── products-api.md  # Phase 1 — GET /api/studio/products contract
├── checklists/
│   └── requirements.md  # Already produced by /speckit.specify
└── tasks.md             # Phase 2 — produced by /speckit.tasks (not this command)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       └── studio/
│           └── products/
│               └── route.ts          # NEW — GET, normalises Nuvemshop + Composio Shopify
├── components/
│   └── asset-studio/
│       ├── StudioProductPicker.tsx   # NEW — Sheet + grid + search (client component)
│       ├── ActiveProductChip.tsx     # NEW — small chip near prompt input
│       ├── StudioChatPanel.tsx       # MODIFIED — "Produto" button opens picker; renders chip
│       └── AssetCreatorModal.tsx     # MODIFIED — consume activeProduct from session context
├── lib/
│   └── studio/
│       ├── session-context.tsx       # MODIFIED — add activeProduct slice + setter + persistence
│       └── product-normalizer.ts     # NEW — zod schema + nuvemshop/composio → NormalizedProduct
└── components/ui/
    └── sheet.tsx                     # EXISTS — consumed only

tests/
├── e2e/
│   └── studio-product-picker.spec.ts # NEW — Playwright for the 5 user stories
└── unit/
    └── product-normalizer.test.ts    # NEW — vitest for the two-backend normalizer
```

**Structure Decision**: Single Next.js project (`src/` at repo root). Feature fits cleanly as one new server route, one new client component pair, and additive context fields — no new top-level directories. The normalizer lives beside the existing `ecommerce-connection.ts` so the two-backend-union logic stays co-located.

## Phase 0 — Research

Unknowns resolved in [research.md](./research.md):

1. **Composio Shopify product list shape** — we have existing Composio calls for auth but no product-list call. Research captures which tool slug returns products and which fields map to `NormalizedProduct`.
2. **Pagination contract for the picker** — Nuvemshop supports `page` + `per_page` up to 200; Composio returns cursor-based pages. The unified endpoint exposes a simple `page` integer and maps internally.
3. **Cache strategy** — TanStack React Query with `staleTime: 5 minutes` keyed by `[teamId, 'studio-products', page, search]`. Manual refresh button bypasses cache.
4. **Search mode** — MVP filters client-side across pages already fetched; server-side `?q=` forwarded to Nuvemshop `q` param for larger catalogs. Composio requires client-side filter (no search param on that tool).
5. **Active-product persistence** — piggyback on `setChatArtifact` pattern (merge `artifact_data.activeProduct`), debounced 500 ms like the canvas snapshot.

Output: `research.md` with five Decision/Rationale/Alternatives blocks.

## Phase 1 — Design & Contracts

### Data Model ([data-model.md](./data-model.md))

- **NormalizedProduct** — `{ id: string; name: string; image: string | null; price: string | null; handle?: string; source: 'nuvemshop' | 'shopify-composio' }`
- **ActiveProduct** — a `NormalizedProduct` stored on the session context; exactly zero or one at a time
- **StudioSession (extended)** — add `activeProduct: NormalizedProduct | null`, `setActiveProduct(p: NormalizedProduct | null): void`. Persistence: merge into `tasks.artifact_data.activeProduct`.

### API Contract ([contracts/products-api.md](./contracts/products-api.md))

- **GET `/api/studio/products`** — auth via cookie; returns `{ kind, products: NormalizedProduct[], page, hasMore }` or `{ kind: null, products: [] }` when disconnected. Query params: `page` (int, default 1), `per_page` (int, default 50, max 100), `q` (optional string).

### Quickstart ([quickstart.md](./quickstart.md))

Steps to run locally: check out branch, `bun dev`, connect Nuvemshop in `/apps` (or use an existing dev team), open `/studio/create`, click "Produto", verify products appear. Playwright command for the e2e suite.

### Agent Context Update

Run `.specify/scripts/bash/update-agent-context.sh claude` after Phase 1 artifacts are in place so `CLAUDE.md` picks up the new tech markers (TanStack React Query is already listed; Playwright + Vitest are already listed — expected to be a no-op append, but run it to be safe).

### Constitution Re-check (post-design)

All six principles still PASS after the design phase:

- Next.js App Router: the new route is a standard `GET` Route Handler. No Pages Router.
- shadcn: confirmed only `Sheet`, `Input`, `Button`, `Skeleton` used.
- Tailwind + OKLCH: no inline colours in any new file.
- TypeScript strict: `NormalizedProduct` Zod schema validates both backends at the boundary; no `any` in the component tree.
- Simplicity: single unified endpoint (not two); single context slice (not parallel refs); no premature virtualisation.
- Supabase: re-uses existing `tasks.artifact_data` merge; no migrations.

## Complexity Tracking

No constitutional violations — section intentionally empty.
