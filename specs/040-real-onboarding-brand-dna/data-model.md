# Data Model: Real Onboarding + Brand DNA

## Existing Entities (no schema changes needed)

### stores

Already exists. Key fields used by onboarding:

- `team_id` (FK → teams)
- `name`, `segment`, `platform` ('nuvemshop' | 'shopify')
- `platform_store_id`, `platform_access_token`
- `onboarding_completed` (boolean, default false)

### store_products

Already exists. Synced from platform. Key fields for analysis:

- `store_id` (FK → stores)
- `name`, `description`, `price`, `category`
- `platform_product_id`

### brand_dna

Already exists (created in branch 039). All fields needed are present:

- `team_id` (FK, unique)
- `store_name`, `niche`, `average_ticket`, `platform`
- `tone`, `audience`, `positioning`
- `words_to_use[]`, `words_to_avoid[]`
- `strengths` (jsonb), `alerts` (jsonb), `opportunities` (jsonb)
- `revenue_projection` (jsonb: `{ current, projected, delta }`)
- `is_confirmed` (boolean)

### skills

Already exists (created in branch 038). Key fields:

- `team_id`, `slug`, `name`, `status` ('available' | 'active')
- `emoji`, `description`, `category`

## New Fields

### brand_dna — add recommended_skills

```sql
ALTER TABLE public.brand_dna ADD COLUMN IF NOT EXISTS recommended_skills jsonb DEFAULT '[]'::jsonb;
```

Stores the LLM-recommended skill slugs with reasons:

```json
[
  { "slug": "seasonal-calendar", "reason": "Nicho com forte sazonalidade" },
  { "slug": "copywriter", "reason": "Tom de voz emocional requer copies alinhadas" },
  { "slug": "image-generator", "reason": "Catálogo visual precisa de banners on-brand" }
]
```

### brand_dna — add greeting fields

```sql
ALTER TABLE public.brand_dna ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE public.brand_dna ADD COLUMN IF NOT EXISTS greeting text;
ALTER TABLE public.brand_dna ADD COLUMN IF NOT EXISTS intro text;
```

For the personalized CMO greeting: "Oi, [owner_name]. Sou o Snew, seu novo CMO."

## Data Flow

```
1. OAuth callback → stores (platform_access_token saved)
2. Product sync → store_products (catalog populated)
3. LLM analysis → brand_dna (all fields populated)
4. User activates skills → skills (status → 'active')
5. Complete → stores (onboarding_completed → true)
```

## Brand DNA JSON Structures

### strengths / alerts

```json
[
  {
    "title": "Marca forte com diferencial emocional",
    "description": "Barreira que a concorrência não copia.",
    "type": "strength"
  }
]
```

### opportunities

```json
[
  {
    "title": "Dia das Mães em 47 dias",
    "description": "Maior data do nicho, sem campanha ativa.",
    "estimated_revenue": 35000,
    "color": "amber"
  }
]
```

### revenue_projection

```json
{
  "current": 89000,
  "projected": 215000,
  "delta": 126000,
  "disclaimer": "Projeção baseada em benchmarks do nicho."
}
```
