# Implementation Plan: Assets Drawer Redesign

**Branch**: `041-assets-drawer-redesign` | **Date**: 2026-03-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/041-assets-drawer-redesign/spec.md`

## Summary

Redesign the Assets Drawer component in the brand-dna onboarding screen from a simple text-based 3-tab layout (Paleta/Tom de voz/Textos) to a rich media drawer with 3 new tabs: **Imagens** (product image grid), **Fontes** (font previews + color palette), and **Textos** (brand text snippets). Data is sourced from Nuvemshop product catalog (images), Firecrawl visual analysis (fonts, texts), and the existing brand DNA record (colors).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, shadcn/ui (Sheet), Tailwind CSS v4, TanStack React Query, Vercel AI SDK (generateObject), Firecrawl JS SDK, Zod
**Storage**: Supabase PostgreSQL (brand_dna table — new jsonb columns for fonts + texts; store_products for image URLs)
**Testing**: Manual via Playwright MCP; build validation via `bun run build`
**Target Platform**: Web (desktop + mobile responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Drawer opens in <500ms, images lazy-load, visual analysis completes in <30s
**Constraints**: Non-blocking — if any data source fails, fallback UI is shown
**Scale/Scope**: Single drawer component, 1 API enhancement, 1 analyzer expansion, 1 migration

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status | Notes                                                                               |
| ------------------------------ | ------ | ----------------------------------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | Drawer is client component (needs interactivity), data fetched via React Query hook |
| II. shadcn/ui Component System | PASS   | Uses Sheet from shadcn/ui, Tabs component for tab switching                         |
| III. Tailwind CSS v4 + OKLCH   | PASS   | All styling via Tailwind + CSS variables                                            |
| IV. TypeScript Strict Mode     | PASS   | All new code in strict TS, Zod for external data validation                         |
| V. Simplicity and YAGNI        | PASS   | Minimal additions — expand existing analyzer, rewrite 1 component                   |
| VI. Supabase as Backend        | PASS   | Data persisted in brand_dna table, product images from store_products               |

## Project Structure

### Documentation (this feature)

```text
specs/041-assets-drawer-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── brand-dna/
│       └── assets-drawer.tsx          # REWRITE — 3 new tabs (Imagens, Fontes, Textos)
├── lib/
│   ├── ai/
│   │   ├── brand-dna-analyzer.ts      # MODIFY — add fonts + texts to schema
│   │   └── store-visual-analyzer.ts   # MODIFY — extract fonts + texts in addition to colors
│   └── onboarding/
│       └── analysis-pipeline.ts       # MODIFY — persist fonts + texts to brand_dna
├── hooks/
│   └── use-brand-dna.ts               # EXISTING — already returns brand_dna (no changes needed)
└── app/
    └── api/
        └── store/
            └── products/
                └── route.ts           # NEW — API to fetch product images for the drawer

supabase/
└── migrations/
    └── 20260326200000_add_fonts_texts_to_brand_dna.sql  # NEW — add columns
```

**Structure Decision**: Follows existing project structure. The drawer component is rewritten in place. Visual analyzer is expanded. One new API route for product images.
