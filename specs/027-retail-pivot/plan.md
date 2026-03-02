# Implementation Plan: Retail Pivot

**Branch**: `027-retail-pivot` | **Date**: 2026-02-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/027-retail-pivot/spec.md`

## Summary

Pivot Snew from a generic workflow automation platform to a retail-focused AI assistant for Brazilian store owners. The implementation adds: (1) a multi-step onboarding flow that creates a store + 4 specialized agents, (2) Nuvemshop OAuth integration with product/order sync, (3) pre-built alert workflows that push notifications via Telegram, and (4) retail-specific AI tools so the Telegram bot can answer stock/sales queries with real data.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, @supabase/ssr, Vercel AI SDK, TanStack React Query, Zod
**Storage**: Supabase PostgreSQL (production: `djohaxwfketlsjurwqne`, test: `ejqumzvclfkbbzzdvmmi`)
**Testing**: Vitest + @testing-library/react + happy-dom (unit), Playwright (e2e)
**Target Platform**: Web (Next.js on Vercel) + Telegram Bot
**Project Type**: Web application (Next.js App Router, monolith)
**Performance Goals**: Product sync < 30s for 500 products, stock alerts < 2 min delivery, Telegram response < 10s
**Constraints**: Nuvemshop rate limit 2 req/sec sustained (40 burst), single OAuth token per store (no expiry)
**Scale/Scope**: Target 100 stores in first wave, up to 5000 products per store

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                            | Status | Notes                                                                                          |
| ------------------------------------ | ------ | ---------------------------------------------------------------------------------------------- |
| I. Next.js App Router First          | PASS   | All new pages use App Router. Onboarding is a new route group `(onboarding)`.                  |
| II. shadcn/ui Component System       | PASS   | Onboarding steps use shadcn Card, Button, Input, Checkbox. Retail home uses shadcn components. |
| III. Tailwind CSS v4 + OKLCH Theming | PASS   | All styling via Tailwind. No hex/rgb.                                                          |
| IV. TypeScript Strict Mode           | PASS   | All new code in strict TS. Zod for Nuvemshop API responses and onboarding form.                |
| V. Simplicity and YAGNI              | PASS   | No unnecessary abstractions. Thin fetch client for Nuvemshop (no SDK). Single store per team.  |
| VI. Supabase as Backend              | PASS   | All new tables in Supabase with RLS. OAuth tokens stored in Supabase.                          |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/027-retail-pivot/
├── spec.md
├── plan.md              # This file
├── research.md          # Nuvemshop API research, architecture decisions
├── data-model.md        # 6 new tables, 1 modified table
├── quickstart.md        # Setup guide
├── contracts/
│   └── api-routes.md    # API routes, Telegram AI tools, pages
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (onboarding)/              # NEW: Onboarding route group
│   │   ├── layout.tsx             # Minimal layout (no sidebar)
│   │   ├── onboarding/
│   │   │   └── page.tsx           # Multi-step form (store name, segment, platform, priorities)
│   │   └── onboarding/telegram/
│   │       └── page.tsx           # Telegram linking step
│   ├── (dashboard)/
│   │   ├── layout.tsx             # MODIFIED: Add store check → redirect to /onboarding
│   │   └── home/
│   │       └── page.tsx           # NEW: Retail home page
│   └── api/
│       ├── onboarding/
│       │   └── route.ts           # NEW: POST create store, GET status
│       ├── nuvemshop/
│       │   ├── connect/route.ts   # NEW: GET initiate OAuth
│       │   ├── callback/route.ts  # NEW: GET OAuth callback
│       │   ├── sync/route.ts      # NEW: POST trigger sync
│       │   └── webhook/route.ts   # NEW: POST receive Nuvemshop events
│       └── store/
│           ├── products/route.ts  # NEW: GET products with stock
│           └── sales/route.ts     # NEW: GET sales summary
├── lib/
│   ├── nuvemshop/
│   │   ├── client.ts              # NEW: Typed Nuvemshop API client
│   │   ├── types.ts               # NEW: Nuvemshop API response types
│   │   ├── sync.ts                # NEW: Product sync logic
│   │   └── webhooks.ts            # NEW: Webhook verification + handlers
│   ├── retail/
│   │   ├── provision-store.ts     # NEW: Create store + agents + workflows
│   │   ├── stock-alerts.ts        # NEW: Stock threshold check + Telegram alert
│   │   ├── sales-summary.ts       # NEW: Generate daily sales summary
│   │   └── segment-skills.ts      # NEW: Segment-specific agent skills
│   └── ai/
│       └── retail-tools.ts        # NEW: STORE_* tools for Telegram AI
└── components/
    └── onboarding/
        ├── store-name-step.tsx     # NEW
        ├── segment-step.tsx        # NEW
        ├── platform-step.tsx       # NEW
        ├── priorities-step.tsx     # NEW
        └── telegram-step.tsx       # NEW

supabase/migrations/
├── 2026XXXX_create_stores_table.sql
├── 2026XXXX_create_store_products_table.sql
├── 2026XXXX_create_store_stock_alerts_table.sql
├── 2026XXXX_create_store_orders_table.sql
├── 2026XXXX_create_store_price_monitors_table.sql
└── 2026XXXX_create_nuvemshop_webhooks_table.sql
```

**Structure Decision**: Follows existing monolith pattern. New route groups `(onboarding)` for pre-dashboard pages. New `lib/nuvemshop/` for platform client, `lib/retail/` for business logic, `lib/ai/retail-tools.ts` for Telegram integration. All new components under `components/onboarding/`.

## Implementation Phases

### Phase 1: Database + Onboarding (P1)

**Goal**: New user can sign up, complete onboarding, and have store + agents created.

1. Create all migration files (6 new tables + teams.has_store column)
2. Build `provision-store.ts` — creates store record, 4 agents with segment-specific skills, and auto-workflows based on priorities
3. Build `segment-skills.ts` — knowledge skill templates per segment (8 segments × 4 agents = 32 skill sets)
4. Build onboarding API route (`POST /api/onboarding`, `GET /api/onboarding/status`)
5. Build onboarding UI — 5 step components + layout
6. Modify `(dashboard)/layout.tsx` — check `has_store`, redirect to `/onboarding` if false
7. Build Telegram linking step (reuse existing `/api/messaging/link` flow)
8. Build retail home page (`/home`) — store status card, recent alerts, quick stats

### Phase 2: Nuvemshop Integration (P2)

**Goal**: User can connect Nuvemshop and see their real products.

1. Build `lib/nuvemshop/client.ts` — typed fetch wrapper with rate limiting
2. Build `lib/nuvemshop/types.ts` — Zod schemas for Nuvemshop API responses
3. Build OAuth routes (`/api/nuvemshop/connect`, `/api/nuvemshop/callback`)
4. Build `lib/nuvemshop/sync.ts` — full sync + incremental sync logic
5. Build `/api/nuvemshop/sync` route — manual trigger
6. Build `/api/nuvemshop/webhook` route — HMAC verification + event handlers
7. Register webhooks on Nuvemshop after OAuth (product/updated, order/created, order/paid)
8. Build cron job for 15-minute sync fallback

### Phase 3: Alerts + Telegram Tools (P2-P3)

**Goal**: User receives automated alerts and can query store data via Telegram.

1. Build `lib/retail/stock-alerts.ts` — check stock vs thresholds, send Telegram alerts
2. Build `lib/retail/sales-summary.ts` — aggregate daily sales, format Telegram message
3. Build `lib/ai/retail-tools.ts` — STORE_QUERY_STOCK, STORE_QUERY_SALES, STORE_UPDATE_ALERT, STORE_TRIGGER_SYNC, STORE_LIST_ORDERS, STORE_UPDATE_SCHEDULE
4. Integrate retail tools into `buildPlatformTools()` when store exists
5. Update Telegram system prompt with retail context (store name, segment, connected platform)
6. Build stock alert workflow executor — triggered by product sync when stock drops below threshold
7. Build daily summary scheduled workflow — fires at configured time
8. Build new order notification — triggered by Nuvemshop order/created webhook

## Key Technical Decisions

1. **Single Telegram bot, multiple internal agents**: User talks to "Snew". The AI routes to the right domain via tool selection. No separate conversations per agent.

2. **Nuvemshop client via native fetch**: No SDK. Thin typed class with `Authentication: bearer TOKEN` header (not `Authorization`). Rate-limited at 500ms per request for bulk operations.

3. **Stock change detection**: `product/updated` webhook + `order/paid` webhook + 15-min cron sync. No dedicated inventory webhook exists in Nuvemshop API.

4. **OAuth tokens don't expire**: Nuvemshop tokens are permanent until merchant uninstalls. No refresh logic needed. Store once in `stores.platform_access_token`.

5. **Webhook payloads are minimal**: Nuvemshop sends only `{store_id, event, id}`. We fetch full resource data on each webhook event.

6. **Segment-specific skills**: 8 segments × 4 agents = 32 knowledge skill templates. Stored as constants in `segment-skills.ts`, inserted into `agent_skills` during provisioning.

7. **Onboarding redirect**: Dashboard layout checks `has_store` flag on team. If false, redirect to `/onboarding`. This is a lightweight check (no extra query — team data already fetched in layout).

## Risks & Mitigations

| Risk                                               | Impact                     | Mitigation                                                                                    |
| -------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| Nuvemshop rate limit (2 req/sec)                   | Slow sync for large stores | Paginate at 200/page, 500ms spacing. 5000 products = ~12s.                                    |
| Nuvemshop webhook delivery failure                 | Missed stock changes       | 15-min cron sync as fallback. Nuvemshop retries 18 times over 48h.                            |
| Store has 10K+ products                            | Memory/query issues        | Paginated sync + partial stock queries. Index on low_stock.                                   |
| OAuth token invalidation (merchant uninstalls app) | Broken sync                | Check for 401 responses, mark store as disconnected, alert user via Telegram.                 |
| AI misroutes queries (asks Estoquista about sales) | Wrong/no answer            | Tools are domain-specific (STORE_QUERY_STOCK vs STORE_QUERY_SALES). AI picks tool, not agent. |
