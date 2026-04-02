# Implementation Plan: Campaign Deliverables — Lazy Generation with Product Curation

**Branch**: `052-campaign-deliverables` | **Date**: 2026-04-02 | **Spec**: [spec.md](./spec.md)

## Summary

Restructure campaign generation into a two-phase workflow: Phase 1 generates concept + product selection only (~20s). Phase 2 lets users curate products and generate each deliverable (email HTML, visual assets, copies, video scripts, timeline) on-demand. Requires changes to campaign data model, generation API, artifact component, and new deliverable generators.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, Vercel AI SDK (generateObject), shadcn/ui, TanStack React Query, Zustand
**Storage**: Supabase PostgreSQL — `tasks.artifact_data` JSONB (existing), no new tables
**Testing**: Vitest + Playwright
**Target Platform**: Web (desktop + mobile responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Concept generation < 25s, individual deliverable generation < 20s
**Constraints**: Nuvemshop API rate limit (2 req/s), AI token budget per campaign
**Scale/Scope**: ~200 products per store, 5 deliverable sections per campaign

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status | Notes                                                                                          |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | All API routes in `src/app/api/`, artifact component is client component (needs interactivity) |
| II. shadcn/ui Component System | PASS   | Product curation modal uses shadcn Dialog/Checkbox, section cards use existing patterns        |
| III. Tailwind CSS v4 + OKLCH   | PASS   | All styling via Tailwind, brand colors from CSS variables                                      |
| IV. TypeScript Strict Mode     | PASS   | All new types strictly typed, Zod for AI output validation                                     |
| V. Simplicity and YAGNI        | PASS   | No new DB tables — uses existing artifact_data JSONB. No abstractions beyond what's needed     |
| VI. Supabase as Backend        | PASS   | Artifact data persisted in tasks table via existing PATCH endpoint                             |

## Project Structure

### Documentation (this feature)

```text
specs/052-campaign-deliverables/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── app/api/skills/seasonal-calendar/
│   ├── generate/route.ts              # MODIFY: generate concept + products only
│   ├── generate-deliverable/route.ts  # NEW: on-demand deliverable generation
│   └── regenerate/route.ts            # EXISTING: section regeneration
├── components/chat/artifacts/
│   └── seasonal-calendar-artifact.tsx # MODIFY: lazy sections + product curation
├── lib/ai/
│   ├── seasonal-campaign-generator.ts # MODIFY: split into concept + deliverable generators
│   ├── email-template-generator.ts    # NEW: HTML email generation
│   └── asset-generator.ts            # NEW: visual asset generation
├── lib/nuvemshop/
│   └── product-analyzer.ts           # EXISTING: enriched product data
└── data/
    └── campaign-data.ts              # MODIFY: extend types for per-section status
```

## Phases

### Phase 1: Data Model Changes + Lazy Generation

**Goal**: Campaign creation generates only concept + products. Sections have independent status.

1. Extend `FullCampaign` type with per-section generation status
2. Split `generateCampaign()` into `generateConcept()` (concept + products only)
3. Update `generate/route.ts` to use concept-only generation
4. Update artifact component: sections show "Generate" button when not yet generated
5. Create `/api/skills/seasonal-calendar/generate-deliverable` endpoint for on-demand generation

### Phase 2: Product Curation

**Goal**: User can add/remove products from the AI selection before generating deliverables.

1. Add product curation UI in artifact panel (checkbox list with search)
2. Store curated product list in `artifact_data.curatedProducts`
3. All deliverable generators read from `curatedProducts` (not `concept.products`)
4. PATCH endpoint to save curated selection

### Phase 3: Real Email Template

**Goal**: Generate branded HTML email with product images, not just subject + preview.

1. Create `email-template-generator.ts` — generates responsive HTML email
2. Email includes: store branding (colors from Brand DNA), campaign slogan, curated products with images/prices, CTA button
3. Visual preview in artifact panel (iframe sandbox)
4. "Copy HTML" button for clipboard

### Phase 4: Visual Assets

**Goal**: Generate actual images instead of CSS gradients.

1. Create `asset-generator.ts` — generates images via AI image service or template composition
2. Products overlaid on branded backgrounds in correct aspect ratios (9:16, 1:1, 3:1)
3. Generated images stored as URLs (Supabase Storage or external CDN)
4. Download button per asset

### Phase 5: Polish

1. Stale indicators when concept/products change after deliverable generation
2. Error handling per section (isolated failures)
3. Generation progress per section
4. Mobile responsive layout for curation modal

## Research Notes

### Email HTML Generation

- **Decision**: Use AI to generate inline-CSS HTML email (no external stylesheets for email compatibility)
- **Rationale**: Email clients strip `<style>` tags; inline CSS is the only reliable approach. AI can generate responsive layouts with media queries in `<style>` tag (Gmail supports it) plus inline fallbacks.
- **Alternative rejected**: MJML/React Email templates — adds build dependency and limits AI creativity

### Visual Asset Generation

- **Decision**: Use AI image generation (DALL-E / GPT-image) for campaign visuals with product image composition
- **Rationale**: CSS gradients are not usable assets. AI-generated images with product photos provide real marketing materials.
- **Alternative rejected**: Canvas-based template composition (server-side) — limited creativity, requires maintaining templates per format

### Product Curation UX

- **Decision**: Inline panel with checkbox list, not a separate page/modal
- **Rationale**: User stays in the campaign context. Quick toggle on/off without navigation.
- **Alternative rejected**: Full product management page — too heavy for a toggle operation

## Complexity Tracking

No constitution violations. All changes fit within existing patterns.
