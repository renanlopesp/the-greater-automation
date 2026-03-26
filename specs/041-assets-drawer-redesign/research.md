# Research: Assets Drawer Redesign

## R1: Product Image Availability from Nuvemshop

**Decision**: Fetch product images via a new API route that queries `store_products` table + Nuvemshop API for image URLs.

**Rationale**: The Nuvemshop products API returns image arrays per product (`images[].src`). The `store_products` table currently stores `name` and `price` but not image URLs. Two options: (a) store image URLs during sync, or (b) fetch directly from Nuvemshop API at drawer open time. Option (b) is simpler and avoids schema changes to `store_products`.

**Alternatives considered**:

- Storing image URLs in store_products during sync — adds complexity to sync pipeline, requires migration
- Using Firecrawl to scrape product images — unnecessary, API already provides them

## R2: Font Extraction from Store Website

**Decision**: Expand the GPT vision analysis in `store-visual-analyzer.ts` to also extract font information from the screenshot. Add a `fonts` field to the visual analysis schema.

**Rationale**: Extracting fonts from raw CSS (via Firecrawl HTML scrape) is fragile — Nuvemshop themes load fonts dynamically, use embedded stylesheets, and vary per template. GPT vision can reliably identify fonts from the screenshot (font name, usage context). This reuses the existing screenshot infrastructure.

**Alternatives considered**:

- CSS parsing via Firecrawl HTML — fragile, theme-dependent, needs complex CSS parsing logic
- Google Fonts API reverse-lookup — only works for Google Fonts, not custom fonts
- Dual approach (CSS + vision) — over-engineered for MVP

## R3: Brand Text Snippet Extraction

**Decision**: Expand the GPT vision analysis to extract brand text snippets (slogan, tagline). For Instagram bio, use the Nuvemshop store info API which returns the Instagram URL, then optionally scrape the bio.

**Rationale**: The store homepage screenshot often contains slogans and taglines. The Nuvemshop `/store` endpoint returns `instagram` field with the Instagram handle. For MVP, extract texts from the homepage screenshot only — Instagram bio extraction can be a future enhancement.

**Alternatives considered**:

- Scraping Instagram API — requires auth, rate-limited, complex
- Only using Nuvemshop store description — often empty or generic
- Manual text input by user — defeats the purpose of AI analysis

## R4: Data Persistence Strategy

**Decision**: Add `fonts` (jsonb) and `brand_texts` (jsonb) columns to the `brand_dna` table. Store as arrays of objects.

**Rationale**: The brand_dna table already stores the analysis results. Adding two jsonb columns keeps everything in one place and accessible via the existing `useBrandDna` hook. No new tables needed.

**Alternatives considered**:

- Separate tables for fonts/texts — over-normalized for 2-3 items each
- Storing in a generic `metadata` jsonb column — less explicit, harder to query

## R5: Tab Component for Drawer

**Decision**: Use shadcn/ui Tabs component inside the Sheet drawer for tab switching.

**Rationale**: shadcn/ui provides a Tabs component (Radix-based) that follows the constitution's requirement to use shadcn primitives. It handles accessibility (keyboard nav, ARIA) automatically.

**Alternatives considered**:

- Custom tab implementation (current approach) — doesn't use shadcn primitives, violates constitution principle II
- Separate routes/pages — drawer should be a panel, not navigation
