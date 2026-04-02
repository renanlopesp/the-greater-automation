# Implementation Plan: Asset Template Refinement

**Branch**: `053-asset-template-refinement` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/053-asset-template-refinement/spec.md`

## Summary

Refine campaign visual asset generation to produce one asset per curated product per format (instead of 1 per format), fix HTML template quality (larger text, centered CTA), reorganize the UI to group assets by format with horizontal scroll, and fix download dimensions to prevent stretching.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, Vercel AI SDK (generateObject), Zod, html2canvas, shadcn/ui, Tailwind CSS v4
**Storage**: Supabase PostgreSQL (tasks.artifact_data JSONB — existing, no schema changes)
**Testing**: Visual verification via Playwright
**Target Platform**: Web (desktop + mobile responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Asset generation for 10 products x 4 formats within 30 seconds
**Constraints**: Single AI call per format to batch all product texts; CORS-accessible product images
**Scale/Scope**: Up to 20 curated products per campaign, 4 formats, 80 max assets

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status | Notes                                                                                                            |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | API route already exists at `/api/skills/seasonal-calendar/generate-deliverable/route.ts`. No new routes needed. |
| II. shadcn/ui Component System | PASS   | UI will use existing shadcn primitives (ScrollArea, Button, Card patterns).                                      |
| III. Tailwind CSS v4 + OKLCH   | PASS   | All styling via Tailwind classes and CSS variables.                                                              |
| IV. TypeScript Strict Mode     | PASS   | All code in strict TS. CampaignAsset type will be extended with `product_name` field.                            |
| V. Simplicity and YAGNI        | PASS   | Modifying existing files only. No new abstractions. Batch AI call per format keeps it simple.                    |
| VI. Supabase as Backend        | PASS   | No schema changes. Assets stored in existing `tasks.artifact_data` JSONB.                                        |

All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/053-asset-template-refinement/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (files to modify)

```text
src/
├── lib/ai/
│   └── asset-generator.ts           # MODIFY: generate per-product, batch AI call, fix template HTML
├── data/
│   └── campaign-data.ts             # MODIFY: add product_name to CampaignAsset
├── components/chat/artifacts/
│   └── seasonal-calendar-artifact.tsx # MODIFY: AssetsSection grouped by format, horizontal scroll, fix download
└── app/api/skills/seasonal-calendar/
    └── generate-deliverable/route.ts # MODIFY: pass product_name through from asset generator
```

## Key Design Decisions

### 1. Batch AI Call Per Format (not per product)

Generate text for ALL products in a single AI call per format. For 10 products x 4 formats = 4 AI calls (not 40). The AI returns an array of {headline, subtext, cta, colors} per product.

**Rationale**: Keeps generation under 30s. Per-product calls would take 5+ minutes.

### 2. CampaignAsset Gets product_name Field

Add `product_name?: string` to the CampaignAsset interface so the UI can display which product each asset features. No DB migration needed — it's stored in JSONB.

### 3. Assets Grouped by Format in UI

The AssetsSection component will:

- Group `campaign.assets` by `label` (format name)
- Render each group as a section with a heading
- Each section has a horizontal scroll row of asset cards
- Each card shows the product name and a download button

### 4. Download Fix: Render at Native Resolution

The html2canvas call must render the offscreen element at its actual pixel dimensions (e.g., 1080x1920), not the scaled preview size. The current bug is that the container may inherit scaled dimensions. Fix: explicitly set the offscreen container width/height to match the asset's native dimensions.

### 5. HTML Template Fixes

- Increase subtext font size: 20px for vertical (was 16px), 18px for horizontal (was 14px)
- Increase CTA font size and padding proportionally
- Ensure CTA button is centered via flexbox `align-items: center` on the parent
- Increase headline size for better hierarchy
