# Implementation Plan: Real Onboarding + Brand DNA

**Branch**: `040-real-onboarding-brand-dna` | **Date**: 2026-03-24 | **Spec**: [spec.md](./spec.md)

## Summary

Implement the real onboarding pipeline: OAuth store connection (Nuvemshop own + Shopify via Composio), product sync, LLM-powered Brand DNA analysis (niche, tone, strengths, opportunities, revenue projection), real-time progress via SSE, data-driven Brand DNA page, skill recommendations and activation, and Brand DNA injection into the orchestrator's system prompt.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, Vercel AI SDK (generateObject, streamText), Zod, TanStack React Query, Composio SDK
**Storage**: Supabase PostgreSQL (stores, store_products, brand_dna, skills tables — all exist)
**Testing**: `bun run build` + `bun run lint`
**Target Platform**: Web (Next.js App Router)
**Performance Goals**: Full analysis pipeline < 30s. Brand DNA page loads < 2s.
**Constraints**: Nuvemshop API rate limits (2 req/sec). LLM must handle 0-5000 products.
**Scale/Scope**: ~15 files new/modified. 3 new API routes. 1 LLM service. 2 new hooks.

## Constitution Check

| Principle                      | Status | Notes                                                       |
| ------------------------------ | ------ | ----------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | New API routes use Route Handlers. SSE via native Response. |
| II. shadcn/ui Component System | PASS   | UI exists from 039. Minor updates for real data.            |
| III. Tailwind CSS v4 + OKLCH   | PASS   | No new styling needed.                                      |
| IV. TypeScript Strict Mode     | PASS   | Zod schemas for LLM output validation.                      |
| V. Simplicity and YAGNI        | PASS   | Single LLM call, SSE for progress.                          |
| VI. Supabase as Backend        | PASS   | All data in existing tables. Minor migration.               |

## Project Structure

```text
src/
├── app/api/
│   ├── onboarding/
│   │   ├── analyze/route.ts          # NEW — SSE pipeline (sync → LLM → save)
│   │   └── complete/route.ts         # NEW — Activate skills + mark complete
│   └── store/
│       └── brand-dna/route.ts        # NEW — GET brand DNA for team
├── lib/
│   ├── ai/
│   │   └── brand-dna-analyzer.ts     # NEW — LLM analysis with Zod schema
│   ├── onboarding/
│   │   └── analysis-pipeline.ts      # NEW — 3-step pipeline orchestrator
│   └── retail/
│       └── catalog-summarizer.ts     # NEW — Summarize products for LLM
├── hooks/
│   ├── use-onboarding-analysis.ts    # NEW — SSE client hook
│   └── use-brand-dna.ts             # NEW — Fetch brand DNA
└── components/onboarding/
    ├── analyzing-screen.tsx          # MODIFY — Connect to real SSE
    └── brand-dna-screen.tsx          # MODIFY — Read from DB

# Modified:
src/app/api/nuvemshop/callback/route.ts   # Redirect to /onboarding/analyzing
src/app/api/chat/route.ts                  # Brand DNA in system prompt
src/lib/ai/platform-tools.ts              # Brand DNA in orchestrator prompt
```

## Design Decisions

- **D1**: Single LLM call for complete Brand DNA (generateObject + Zod schema). See [research.md#r1](./research.md).
- **D2**: SSE for real-time progress (3 steps streamed to client). See [research.md#r4](./research.md).
- **D3**: Platform-agnostic analysis (normalize products before LLM). See [research.md#r5](./research.md).
- **D4**: Implicit onboarding state (no separate table). See [research.md#r7](./research.md).

## Implementation Phases

### Phase 1: Database + LLM Service

1. Migration: add `recommended_skills`, `owner_name`, `greeting`, `intro` to `brand_dna`
2. Create `catalog-summarizer.ts` — normalize products for LLM input
3. Create `brand-dna-analyzer.ts` — LLM call with Zod output schema

### Phase 2: Analysis Pipeline + SSE

1. Create `analysis-pipeline.ts` — orchestrate 3 steps with progress callbacks
2. Create `POST /api/onboarding/analyze` — SSE endpoint
3. Create `use-onboarding-analysis.ts` — SSE client hook
4. Modify `analyzing-screen.tsx` — connect to real SSE

### Phase 3: Store Connection

1. Modify Nuvemshop callback redirect → `/onboarding/analyzing`
2. Add Shopify via Composio on connect screen
3. Onboarding state redirects

### Phase 4: Brand DNA Page + Completion

1. Create `GET /api/store/brand-dna` endpoint
2. Create `use-brand-dna.ts` hook
3. Modify `brand-dna-screen.tsx` — real data from hook
4. Create `POST /api/onboarding/complete` — activate skills + mark done

### Phase 5: Chat Integration

1. Load `brand_dna` in chat route
2. Include in `buildOrchestratorSystemPrompt()`

### Phase 6: Polish

1. Error handling + retry
2. Onboarding guard redirects
3. Build + lint

## Artifacts

| Artifact      | Path                                                                      |
| ------------- | ------------------------------------------------------------------------- |
| Research      | [research.md](./research.md) — 7 decisions                                |
| Data Model    | [data-model.md](./data-model.md) — brand_dna additions                    |
| API Contracts | [contracts/api.md](./contracts/api.md) — 3 endpoints + SSE + LLM contract |
| Quickstart    | [quickstart.md](./quickstart.md) — end-to-end test flow                   |
