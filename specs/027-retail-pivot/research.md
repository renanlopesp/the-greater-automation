# Research: 027-retail-pivot

## Decision 1: Nuvemshop API Integration Approach

**Decision**: Use native `fetch` with a thin typed client. No third-party SDK.

**Rationale**: The only npm package (`tienda-nube-js-sdk` v0.0.10) is abandoned (3 years, no TS types). Nuvemshop's own Node.js template uses plain `axios`. The API is straightforward REST — a typed client class is sufficient.

**Alternatives**: tienda-nube-js-sdk (abandoned), axios (unnecessary dependency when fetch exists)

## Decision 2: Nuvemshop OAuth Flow

**Decision**: Standard OAuth 2 Authorization Code flow. Tokens do NOT expire — store once, no refresh needed.

**Key Details**:

- Auth URL: `https://www.tiendanube.com/apps/{app_id}/authorize?state={csrf}`
- Token exchange: `POST https://www.tiendanube.com/apps/authorize/token`
- Scopes needed: `write_products,write_orders` (covers products, variants, stock, orders)
- Auth header: `Authentication: bearer TOKEN` (NOT `Authorization`)
- Required: `User-Agent` header or API returns 400
- `user_id` in token response = Nuvemshop store ID (needed for all API calls)

## Decision 3: Stock Change Detection

**Decision**: Use `product/updated` webhook + periodic sync fallback (every 15 min).

**Rationale**: Nuvemshop has NO dedicated stock/inventory webhook event. The `product/updated` event fires on any product change including stock. Combined with `order/paid` (stock decrements on order), we can detect most stock changes in real-time. A 15-minute sync catches anything missed.

**Webhook verification**: HMAC-SHA256 via `x-linkedstore-hmac-sha256` header, using client_secret as key.

## Decision 4: Onboarding Architecture

**Decision**: New `(onboarding)` route group with multi-step form. Dashboard layout checks for store existence and redirects.

**Rationale**: The existing auto-onboarding (team + profile creation via DB triggers) stays. We add a store-setup layer on top: after signup, user hits `(dashboard)` layout which checks if store exists. If not, redirect to `/onboarding`. This avoids modifying the existing auth flow.

**Key pattern**: Dashboard layout at `src/app/(dashboard)/layout.tsx` already does auth check + data prefetch. We add a store existence check there.

## Decision 5: Agent Routing in Telegram

**Decision**: Single Snew bot with intent classification in the system prompt. No separate agent conversations.

**Rationale**: The current Telegram webhook uses a single conversation per user with platform-level tools. For routing, we add retail-specific tools (STORE_QUERY_STOCK, STORE_QUERY_SALES, etc.) that internally know which agent's domain they serve. The AI routes via tool selection, not explicit agent routing.

## Decision 6: Product Sync Storage

**Decision**: New `store_products` table with denormalized variant data (JSONB). Full sync on connect, incremental via webhooks + cron.

**Rationale**: Storing products locally enables fast AI queries without hitting Nuvemshop API on every Telegram message. Variants stored as JSONB array within the product row (not a separate table) keeps queries simple for the AI.

## Decision 7: Nuvemshop API Rate Limits

**Decision**: Implement basic rate limiting with 500ms spacing for bulk operations.

**Details**: 40 req burst capacity, 2 req/sec sustained (leaky bucket). For initial sync of 500 products at 200/page = 3 pages = 3 requests (no issue). For stores with 5000+ products = 25 pages — need 500ms spacing = ~12 seconds total.

## Decision 8: Webhook Payload Handling

**Decision**: Nuvemshop webhooks are minimal (just `store_id` + `event` + `id`). We must fetch full resource data on each webhook.

**Rationale**: This is by design in the Nuvemshop API. Webhook fires → we get resource ID → fetch full product/order data → process. This adds one API call per webhook but ensures we always have fresh data.
