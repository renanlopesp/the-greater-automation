# Quickstart: Assets Drawer Redesign

## Prerequisites

- `bun dev` running on port 3000
- Nuvemshop store connected (via onboarding)
- `FIRECRAWL_API_KEY` set in `.env.local`
- Brand DNA analysis completed (run onboarding flow)
- Migration applied: `fonts` and `brand_texts` columns on `brand_dna` table

## Migration

Run in Supabase SQL Editor:

```sql
ALTER TABLE brand_dna
  ADD COLUMN IF NOT EXISTS fonts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_texts jsonb DEFAULT '[]'::jsonb;
```

## Development Flow

1. Expand `store-visual-analyzer.ts` — add fonts + brand_texts to Zod schema and GPT vision prompt
2. Update `brand-dna-analyzer.ts` — add fonts + brand_texts fields
3. Update `analysis-pipeline.ts` — persist fonts + brand_texts to brand_dna table
4. Create `GET /api/store/products/images` — fetch product images from Nuvemshop
5. Add shadcn Tabs component: `npx shadcn@latest add tabs`
6. Rewrite `assets-drawer.tsx` — 3 tabs: Imagens, Fontes, Textos

## Testing

1. Run full onboarding flow (connect store → analyzing → brand-dna)
2. On Card 2 (Brand Identity), click "ver assets"
3. Verify Imagens tab shows product images in grid
4. Verify Fontes tab shows font cards + color palette
5. Verify Textos tab shows brand text snippets
6. Test fallback: disconnect Firecrawl and verify drawer still works with fallback states
7. `bun run build` must pass with zero errors
