# API Contracts: Real Onboarding + Brand DNA

## New Endpoints

### POST /api/onboarding/analyze

Runs the 3-step analysis pipeline. Returns Server-Sent Events (SSE) stream with progress.

**Request**:

```json
{ "storeId": "uuid" }
```

**Response**: SSE stream

```
event: step
data: {"step":1,"status":"running","message":"Sincronizando produtos..."}

event: step
data: {"step":1,"status":"completed","message":"247 produtos sincronizados","count":247}

event: step
data: {"step":2,"status":"running","message":"Gerando Brand DNA..."}

event: step
data: {"step":2,"status":"completed","message":"Brand DNA gerado"}

event: step
data: {"step":3,"status":"running","message":"Mapeando datas sazonais..."}

event: step
data: {"step":3,"status":"completed","message":"32 datas mapeadas","count":32}

event: done
data: {"brandDnaId":"uuid","redirect":"/onboarding/brand-dna"}
```

**Error events**:

```
event: error
data: {"step":1,"message":"Falha ao sincronizar produtos. Tente novamente."}
```

**Pipeline steps**:

1. Sync products from platform (Nuvemshop API or Composio Shopify)
2. Analyze catalog via LLM → generate Brand DNA → save to `brand_dna` table
3. Extract seasonal opportunities from Brand DNA (already part of LLM output)

### POST /api/onboarding/complete

Activates selected skills and marks onboarding as complete.

**Request**:

```json
{
  "teamId": "uuid",
  "selectedSkillSlugs": ["seasonal-calendar", "copywriter", "image-generator"]
}
```

**Response**:

```json
{
  "success": true,
  "activatedSkills": 3,
  "redirect": "/"
}
```

### GET /api/store/brand-dna

Fetches the Brand DNA for the current team.

**Response**:

```json
{
  "id": "uuid",
  "store_name": "Milkes",
  "niche": "moda bebê",
  "average_ticket": 225,
  "tone": "Caloroso e próximo — sobre memórias, nunca sobre preço.",
  "audience": "Mães 25-40 anos, classe A/B",
  "words_to_use": ["memória", "afeto", "único"],
  "words_to_avoid": ["promoção", "corra", "barato"],
  "positioning": "Premium emocional — compete por significado, não por preço.",
  "strengths": [...],
  "alerts": [...],
  "opportunities": [...],
  "revenue_projection": { "current": 89000, "projected": 215000, "delta": 126000 },
  "recommended_skills": [...],
  "owner_name": "Aline",
  "greeting": "Oi, Aline. Sou o Snew, seu novo CMO.",
  "intro": "Acabei de analisar a Milkes de ponta a ponta..."
}
```

## Modified Endpoints

### GET /api/nuvemshop/callback

**Change**: After saving token and triggering sync, redirect to `/onboarding/analyzing?storeId=xxx` instead of dashboard.

### POST /api/chat (orchestrator)

**Change**: Load `brand_dna` from DB and include in system prompt when it exists for the team. Add to `buildOrchestratorSystemPrompt()`:

```
## Brand DNA
Niche: {niche}
Tone: {tone}
Audience: {audience}
Words to use: {words_to_use}
Words to avoid: {words_to_avoid}
Positioning: {positioning}
```

## Client Hooks

### useOnboardingAnalysis

Client hook that connects to the SSE stream and tracks progress.

```typescript
function useOnboardingAnalysis(storeId: string) {
  return {
    steps: Array<{step: number, status: string, message: string, count?: number}>,
    isComplete: boolean,
    error: string | null,
    brandDnaId: string | null,
    start: () => void,
    retry: () => void,
  }
}
```

### useBrandDna

Fetches Brand DNA for the current team.

```typescript
function useBrandDna() {
  return {
    brandDna: BrandDNA | null,
    isLoading: boolean,
  }
}
```

## LLM Analysis Contract

### Input (sent to LLM)

```
You are a CMO AI analyzing an e-commerce store. Based on the catalog data below, generate a complete brand analysis.

Store: {store_name}
Platform: {platform}
Segment: {segment}
Owner: {owner_name}

Product Catalog Summary:
- Total products: {count}
- Categories: {category_breakdown}
- Price range: R${min} - R${max} (avg: R${avg})
- Top products:
{top_20_products_with_names_and_short_descriptions}

Generate a JSON with: niche, tone, audience, positioning, words_to_use, words_to_avoid, strengths, alerts, opportunities (with seasonal dates and estimated revenue), revenue_projection, recommended_skills, greeting, intro.
```

### Output (Zod schema validated)

All fields matching the `brand_dna` table + `recommended_skills`.
