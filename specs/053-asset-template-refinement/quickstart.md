# Quickstart: Asset Template Refinement

## Prerequisites

- `bun install` (project dependencies)
- Running dev server: `bun dev`
- A campaign with curated products (5+ with images) in the seasonal calendar

## Testing the Feature

### 1. Generate Assets

1. Open the seasonal calendar in the chat artifact panel
2. Navigate to a campaign with curated products
3. Click the "Assets" section → click "Gerar" (Generate)
4. Verify: Loading state appears, then assets populate

### 2. Verify Multiple Products Per Format

1. After generation, check each format section (Stories, Feed, Banner, Meta Ad)
2. Each section should have as many asset cards as curated products with images
3. Each card should display the product name below the preview

### 3. Verify Horizontal Scroll

1. If a format section has more cards than fit on screen, scroll horizontally
2. Verify smooth scroll on both desktop (mouse wheel / trackpad) and mobile (touch swipe)

### 4. Verify Template Quality

1. Check that subtext is readable (larger font than before)
2. Check that CTA button is centered and proportional
3. Check that product image fills background without distortion

### 5. Verify Download

1. Click "Baixar" on any asset card
2. Open the downloaded PNG file
3. Verify exact pixel dimensions:
   - Stories 9:16: 1080 x 1920
   - Feed 1:1: 1080 x 1080
   - Banner 3:1: 1200 x 400
   - Meta Ad 9:16: 1080 x 1920
4. Verify no stretching — content matches the preview

## Key Files

| File                                                                 | Role                                         |
| -------------------------------------------------------------------- | -------------------------------------------- |
| `src/lib/ai/asset-generator.ts`                                      | Generates HTML assets per product per format |
| `src/data/campaign-data.ts`                                          | CampaignAsset type definition                |
| `src/components/chat/artifacts/seasonal-calendar-artifact.tsx`       | AssetsSection UI component                   |
| `src/app/api/skills/seasonal-calendar/generate-deliverable/route.ts` | API route for asset generation               |
