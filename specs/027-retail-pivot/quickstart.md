# Quickstart: 027-retail-pivot

## Prerequisites

- Nuvemshop Partner account + App credentials (APP_ID, CLIENT_SECRET)
- Env vars: `NUVEMSHOP_APP_ID`, `NUVEMSHOP_CLIENT_SECRET`
- Existing Telegram bot configured (already done in feat/native-messaging)
- Supabase project with existing schema (agents, workflows, messaging_links)

## Setup Steps

1. **Run migrations**: Apply new tables (stores, store_products, store_stock_alerts, store_orders, store_price_monitors, nuvemshop_webhooks)
2. **Add env vars**: `NUVEMSHOP_APP_ID`, `NUVEMSHOP_CLIENT_SECRET` to `.env.local`
3. **Deploy webhook endpoint**: `/api/nuvemshop/webhook` must be publicly accessible for Nuvemshop to send events

## Dev Server

```bash
bun dev
```

## Test Flow

1. Sign up new account → should redirect to `/onboarding`
2. Fill store details (name, segment, platform)
3. Select priorities
4. Link Telegram (or skip)
5. Land on `/home` retail dashboard
6. Connect Nuvemshop (if selected) → OAuth flow → sync products
7. Send "como ta meu estoque?" in Telegram → get real stock data

## Key Files

```
src/app/(onboarding)/          # New onboarding route group
src/app/(dashboard)/home/      # New retail home page
src/app/api/onboarding/        # Onboarding API
src/app/api/nuvemshop/         # Nuvemshop OAuth + webhook
src/lib/nuvemshop/             # Nuvemshop API client
src/lib/retail/                # Retail business logic (agents, sync, alerts)
src/lib/ai/retail-tools.ts     # Telegram AI tools for retail queries
```
