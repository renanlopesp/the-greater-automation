# Research: Real Onboarding + Brand DNA

## R1: Brand DNA Analysis — LLM Prompt Strategy

**Decision**: Single LLM call with structured output (JSON schema) that receives a summary of the store's catalog and returns the complete Brand DNA.

**Rationale**: Making multiple LLM calls (one for nicho, one for tom, one for oportunidades) adds latency and complexity. A single well-structured prompt with all product data summarized can extract everything in one pass. The Vercel AI SDK supports `generateObject()` with Zod schema validation, ensuring the output matches the `brand_dna` table structure.

**Input to LLM**:

- Store name, platform, segment
- Product sample (top 50 products by recent sales, or all if <50): name, description, price, category
- Category distribution (% of products per category)
- Price range (min, max, average, median)
- Total product count

**Output from LLM** (structured JSON):

- niche, average_ticket, tone, audience, positioning
- words_to_use[], words_to_avoid[]
- strengths[] (3-5 items with title + description)
- alerts[] (3-5 items with title + description)
- opportunities[] (3-5 items with title + description + estimated_revenue + color)
- revenue_projection { current, projected, delta }
- recommended_skills[] (3 slugs with reason)

**Alternatives considered**:

- Multiple LLM calls (one per section) → rejected, too slow (3-5s × 7 sections = 20-35s)
- RAG with product embeddings → overkill for catalog analysis, adds infrastructure
- Rule-based analysis (no LLM) → can't extract tone of voice or generate insights

## R2: Product Data for Analysis — What to Send to LLM

**Decision**: Send a summarized catalog, not raw product data. Max ~4000 tokens of product context.

**Rationale**: Sending 200+ full product descriptions would exceed context limits and add noise. Instead, summarize:

1. Category breakdown (e.g., "60% Rompers, 20% Bodies, 10% Mantas, 10% Acessórios")
2. Top 20 product names + short descriptions (first 100 chars each)
3. Price statistics (min, max, avg, median)
4. Total count

This gives the LLM enough signal to detect nicho, tom, and positioning without overwhelming context.

## R3: Seasonal Date Mapping — LLM vs Database

**Decision**: LLM generates seasonal dates based on the detected nicho. No curated database for MVP.

**Rationale**: A curated database of dates per nicho would be more accurate but requires maintenance. For MVP, the LLM already knows Brazilian seasonal dates (Dia das Mães, Páscoa, Black Friday, Natal, etc.) and can reason about which are relevant to each nicho. The output includes estimated_revenue per date based on the store's average ticket.

**Future**: Can add a curated `seasonal_dates` table as a knowledge base that the LLM references.

## R4: Analyzing Pipeline — Real-time Progress

**Decision**: Server-Sent Events (SSE) from a single API endpoint that runs the 3-step pipeline and streams progress updates.

**Rationale**: The analyzing screen needs real-time feedback ("Sincronizando 247 produtos...", "Brand DNA gerado"). Options:

- Polling (client polls status) → works but laggy
- WebSocket → overkill for a one-time pipeline
- SSE (Server-Sent Events) → lightweight, one-direction (server→client), native browser support

The endpoint `POST /api/onboarding/analyze` returns an SSE stream:

```
event: step
data: {"step": 1, "status": "running", "message": "Sincronizando produtos..."}

event: step
data: {"step": 1, "status": "completed", "message": "247 produtos sincronizados", "count": 247}

event: step
data: {"step": 2, "status": "running", "message": "Gerando Brand DNA..."}

event: step
data: {"step": 2, "status": "completed", "message": "Brand DNA gerado"}

event: step
data: {"step": 3, "status": "running", "message": "Mapeando datas sazonais..."}

event: step
data: {"step": 3, "status": "completed", "message": "32 datas mapeadas", "count": 32}

event: done
data: {"brandDnaId": "uuid", "redirect": "/onboarding/brand-dna"}
```

**Alternatives considered**:

- Return immediately + poll → works but UX is worse
- WebSocket → unnecessary bidirectional communication
- Supabase Realtime → would need a progress table, overcomplicated

## R5: Shopify via Composio — Connection Flow

**Decision**: Use Composio's `initiateConnection()` for Shopify. After connection, fetch products via Composio's Shopify actions.

**Rationale**: The system already uses Composio for app connections. Shopify through Composio means:

1. User clicks "Connect via Shopify" → calls Composio `initiateConnection('shopify')`
2. Composio handles OAuth redirect → Shopify authorize → callback
3. After connection, use Composio actions to list products: `SHOPIFY_LIST_PRODUCTS`
4. Normalize Shopify product data to match Nuvemshop format for the analysis pipeline

The analysis pipeline is platform-agnostic — it receives normalized product data regardless of source.

## R6: Skill Recommendations — Niche-based Mapping

**Decision**: LLM generates skill recommendations as part of the Brand DNA analysis. No hardcoded mapping.

**Rationale**: Different niches benefit from different skills. Rather than maintaining a static mapping (moda → Seasonal Calendar, eletrônicos → Pricing Engine), the LLM can reason about which 3 skills are most impactful based on the full analysis. The recommended_skills are included in the Brand DNA output.

**Default recommendations if LLM doesn't specify**: Seasonal Calendar + Copywriter + Campaign Engine (the Fase 1 trio from the roadmap).

## R7: Onboarding State Management

**Decision**: Use the `stores` table fields (`onboarding_completed`, `platform`) plus the existence of `brand_dna` record to track onboarding state.

**Rationale**: No need for a separate onboarding state table. The state is implicit:

- No store record → show /onboarding (welcome)
- Store exists, no brand_dna → show /onboarding/analyzing (or /onboarding/connect if no token)
- Store exists + brand_dna exists + onboarding_completed=false → show /onboarding/brand-dna
- Store exists + onboarding_completed=true → show dashboard (redirect from /onboarding)
