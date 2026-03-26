# Data Model: Assets Drawer Redesign

## Existing Entity: brand_dna (modified)

### New Columns

| Column      | Type  | Default     | Description                                           |
| ----------- | ----- | ----------- | ----------------------------------------------------- |
| fonts       | jsonb | '[]'::jsonb | Array of detected fonts from the store                |
| brand_texts | jsonb | '[]'::jsonb | Array of brand text snippets extracted from the store |

### fonts JSON Structure

```json
[
  {
    "name": "Cormorant Garamond",
    "usage": "Titulos e headings",
    "category": "serif"
  },
  {
    "name": "Inter",
    "usage": "Corpo e UI",
    "category": "sans-serif"
  }
]
```

### brand_texts JSON Structure

```json
[
  {
    "type": "slogan",
    "label": "SLOGAN",
    "content": "Cada peca, uma memoria."
  },
  {
    "type": "bio",
    "label": "BIO INSTAGRAM",
    "content": "Tricot infantil artesanal com bordado personalizado. Feito com afeto, desde 2017."
  },
  {
    "type": "signature",
    "label": "ASSINATURA E-MAIL",
    "content": "Com carinho, Milkes — porque cada bebe merece algo unico."
  }
]
```

## Existing Entity: store_products (read-only)

Used to fetch product images via Nuvemshop API. No schema changes.

Relevant fields for image fetching:

- `store_id` — links to the store
- `name` — product name (used as image label)
- `platform_product_id` — Nuvemshop product ID (used to fetch images from API)

## Product Image (transient, not persisted)

Product images are fetched on-demand from Nuvemshop API when the drawer opens. Not stored in the database.

```json
{
  "name": "romper-vanilla.jpg",
  "url": "https://d2r9epyceweg5n.cloudfront.net/stores/...",
  "label": "Produto",
  "productName": "Romper Vanilla"
}
```

## Visual Analysis (expanded)

The `VisualAnalysis` type returned by `store-visual-analyzer.ts` is expanded:

```typescript
interface VisualAnalysis {
  color_palette: Array<{ hex: string; label: string }>
  palette_description: string
  visual_style: string
  logo_description: string | null
  // NEW
  fonts: Array<{ name: string; usage: string; category: string }>
  brand_texts: Array<{ type: string; label: string; content: string }>
}
```

## Migration

```sql
ALTER TABLE brand_dna
  ADD COLUMN IF NOT EXISTS fonts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_texts jsonb DEFAULT '[]'::jsonb;
```
