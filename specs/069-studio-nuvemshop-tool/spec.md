# Feature Specification: Nuvemshop as First-Class Studio Chat Tool (mutually exclusive with Composio Shopify)

**Feature Branch**: `069-studio-nuvemshop-tool`
**Created**: 2026-04-14
**Status**: Draft
**Input**: User description: "precisa ser adicionado a tool da nuvemshop no chat do studio... como ele nao vem do composio e é implementacao propria, precisa ser adicionado, lembrando que no app so é permitido ou um ou outro, se a nuvemshop estiver conectada ele nao pode pedir o composio shopify"

## Problem Context

The full Nuvemshop integration **already exists** in the codebase and is in production use (verified: `stores` table has live rows with `platform='nuvemshop'` and valid access tokens). What's missing is **only the wiring from the new Studio chat into it**.

**Existing assets we will reuse, not rewrite:**

- **OAuth + DB**: `/api/nuvemshop/{connect,callback,sync,cron,webhook}` — connection lives in `stores.platform='nuvemshop'` with `platform_access_token` + `platform_store_id`, scoped by `team_id` (UNIQUE).
- **Client library**: `src/lib/nuvemshop/client.ts` — `NuvemshopClient` exposes products, orders, customers, coupons, stock, webhooks, write-paths.
- **Retail analytics**: `src/lib/ai/retail-tools.ts` (RFM scoring, repurchase intervals, customer segmentation), `src/lib/ai/platform-tools.ts`, `src/lib/nuvemshop/product-analyzer.ts`, `src/lib/retail/abandoned-cart.ts`.
- **Tool surface for the OLD chat (`/api/chat`)**: `src/lib/chat/tool-definitions.ts` already declares `STORE_QUERY_STOCK`, `STORE_QUERY_SALES`, `STORE_LIST_ORDERS` and they hit Nuvemshop end-to-end through the helpers above.

**The gap is in the NEW Studio chat (`/studio/create/[id]`):**

- `src/app/api/studio/tools/route.ts` has stubs for `snew_query_sales`/`snew_query_stock`/`snew_list_orders` that return `no_data` instead of delegating to the existing retail tooling.
- `snew_connect_app` / `snew_post_to_app` with `app='shopify'` are offered regardless of whether the team is on Nuvemshop (server fallbacks at `supabase/functions/studio-chat/index.ts` `detectApp` + `POST_INTENT`; client handler at `AssetCreatorModal.tsx`).
- No helper answers "which e-commerce is this team on?" — the platform dimension is absent from every tool dispatch in the studio path.

**Snew's invariant** (already enforced socially, not in code): a team uses **either Nuvemshop OR Composio Shopify, never both**. We must encode that invariant in `/api/studio/tools` and the studio-chat edge function.

Result this feature targets: a Nuvemshop-connected team gets real data in Studio chat (porting the existing tools, not reimplementing them) and is **never** nagged to connect Composio Shopify.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Studio chat answers Nuvemshop retail questions (Priority: P1)

A team connected to Nuvemshop opens the Studio and asks the chat "mostra meu estoque dos 5 produtos mais vendidos" or "qual a receita dos últimos 7 dias?". The AI emits `snew_query_stock` / `snew_query_sales`. The tool route reads the team's Nuvemshop connection, calls `NuvemshopClient`, returns structured data, and the chat renders a compact result card (no hallucinated numbers).

**Why this priority**: This is the capability gap. Without it the Nuvemshop connection is invisible inside Studio and the retail tools are dead weight.

**Independent Test**: With a Nuvemshop-connected test team, type "quantos pedidos essa semana?" in `/studio/create/<id>`. Verify the response cites actual Nuvemshop order numbers and that `/api/studio/tools` logs a successful Nuvemshop API call.

**Acceptance Scenarios**:

1. **Given** a team has `stores.platform='nuvemshop'` with a valid `platform_access_token`, **When** the user asks a stock question in studio chat, **Then** `snew_query_stock` returns real product/variant stock from Nuvemshop and the chat renders it.
2. **Given** the same team, **When** the user asks a sales question over a date range, **Then** `snew_query_sales` returns `{ period, revenue, order_count, top_products }` computed from Nuvemshop orders in that window.
3. **Given** the same team, **When** the user asks "últimos pedidos", **Then** `snew_list_orders` returns the N most recent orders with status, customer, total.

---

### User Story 2 — Nuvemshop-connected teams never see the "Connect Shopify" button (Priority: P1)

A Nuvemshop-connected team must never be prompted to connect Composio Shopify. Suggestions, chips, activity cards and free-text replies must all suppress Shopify.

**Why this priority**: Conflicting connections produce duplicate/stale data and confuse the user. The rule is **one e-commerce backend per team, ever**.

**Independent Test**: With a Nuvemshop-connected team, in studio chat type "conecta a shopify" or "vou precisar integrar a shopify". The AI must respond that the team is already connected to Nuvemshop and offer no `snew_connect_app` action with `app='shopify'`. Network panel shows zero Composio `toolkits.authorize` calls for `shopify`.

**Acceptance Scenarios**:

1. **Given** `stores.platform='nuvemshop'` for the active team, **When** the user's message mentions Shopify or the AI considers connecting e-commerce, **Then** `snew_connect_app({app:'shopify'})` is suppressed both at the edge function (server fallback) and at `/api/studio/tools` (server enforcement).
2. **Given** the same team, **When** the AI still returns `snew_post_to_app({app:'shopify'})` by hallucination, **Then** the tool route rejects the action with a typed error surfaced in chat as "Sua loja é Nuvemshop — não há publicação via Shopify aqui."
3. **Given** a team with **no** Nuvemshop connection, **When** they ask to connect Shopify, **Then** the existing Composio flow works unchanged.

---

### User Story 3 — Single source of truth for "which e-commerce?" (Priority: P2)

A helper `getStoreConnection(teamId)` returns `{ kind: 'nuvemshop' | 'shopify-composio' | null, accessToken?, storeId? }` and is the **only** place in the code that resolves this question. Every caller (edge function preflight, `/api/studio/tools`, `snew_check_connections`) uses it.

**Why this priority**: Without the helper the mutual-exclusion rule is re-implemented inconsistently in three places and will drift.

**Independent Test**: Unit-test the helper against four fixtures (no connection, nuvemshop only, composio shopify only, both) and assert the returned discriminator. Grep the repo for direct `stores.platform === 'nuvemshop'` checks outside the helper — should return the helper's own file only.

**Acceptance Scenarios**:

1. **Given** only Nuvemshop is connected, **When** the helper runs, **Then** it returns `kind='nuvemshop'`.
2. **Given** only Composio Shopify is connected (no row in `stores`), **When** the helper runs, **Then** it returns `kind='shopify-composio'`.
3. **Given** both exist (legacy state), **When** the helper runs, **Then** it returns `kind='nuvemshop'` (Nuvemshop wins — matches the DB-backed source of truth).

---

### User Story 4 — `snew_check_connections` is platform-aware (Priority: P2)

When the chat's `snew_check_connections` runs, its payload distinguishes "e-commerce: nuvemshop" vs "e-commerce: shopify" vs "e-commerce: not connected", and the AI uses that field to pick the right call next. Today the action just lists Composio apps.

**Why this priority**: Required so the AI stops treating Nuvemshop as "unknown/not connected" and stops offering Shopify connections.

**Independent Test**: Call `/api/studio/tools` with `{action:'snew_check_connections'}` for three test teams (nuvemshop, shopify-composio, none). Response must include an `ecommerce` field with the discriminator + metadata.

**Acceptance Scenarios**:

1. **Given** a Nuvemshop-connected team, **When** the AI triggers `snew_check_connections`, **Then** the response contains `{ ecommerce: { kind:'nuvemshop', storeName } }` alongside the existing Composio app list.
2. **Given** a team with no e-commerce, **When** the action runs, **Then** `ecommerce: { kind: null }` is returned.

---

### Edge Cases

- **Nuvemshop token expired / 401 from Nuvemshop API**: Tools must surface a typed "reauthorize" error and the chat offers a button linking to `/api/nuvemshop/connect`, NOT to Composio.
- **Nuvemshop connected, user literally types "conecta shopify"**: The AI must refuse and explain why (FR-008). It must NOT silently upgrade the request to something else.
- **Team has `stores.platform='manual'` or `'mercadolivre'`**: These do not match either path — retail tools return `no_data` and `snew_connect_app` for Shopify is still allowed (future work).
- **Legacy row with both a `stores.platform='nuvemshop'` and an active Composio `shopify` connectedAccount**: Nuvemshop wins in the helper, and the UI MUST expose a way for the user to disconnect the stale Composio Shopify (out of scope for this feature — document as a known gap).
- **No active team on the session**: All tools return auth errors before reaching Nuvemshop; same behavior as today.
- **User asks "postar no shopify"**: There is no Shopify publishing API via Composio today (it's order-mgmt). Tool rejects unless a real publish tool is added; this spec does not add one.
- **Nuvemshop webhooks arrive mid-request**: Irrelevant here — the Studio tool reads on-demand; cache is not introduced in this feature.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The codebase MUST expose exactly one helper `getStoreConnection(teamId: string)` returning a discriminated union `{ kind:'nuvemshop'|'shopify-composio'|null, ... }`. It MUST be the sole reader of the `stores.platform` + Composio `connectedAccounts.list` signals.
- **FR-002**: `/api/studio/tools` for actions `snew_query_stock` / `snew_query_sales` / `snew_list_orders` MUST delegate to the **existing** retail tooling (`src/lib/ai/retail-tools.ts`, `src/lib/ai/platform-tools.ts`, `src/lib/nuvemshop/product-analyzer.ts`, `src/lib/nuvemshop/client.ts`) — i.e. the same code path the OLD chat uses through `STORE_QUERY_STOCK` / `STORE_QUERY_SALES` / `STORE_LIST_ORDERS` in `src/lib/chat/tool-definitions.ts`. **No reimplementation.**
- **FR-003**: `snew_query_stock` MUST accept the same filter shape as the existing `STORE_QUERY_STOCK` and return its existing payload shape — only the transport changes (Studio chat instead of `/api/chat`).
- **FR-004**: `snew_query_sales` MUST accept the same date-range shape as the existing `STORE_QUERY_SALES` and return its existing payload (period, revenue, order_count, top_products).
- **FR-005**: `snew_list_orders` MUST accept the same args as the existing `STORE_LIST_ORDERS` and return its existing payload.
- **FR-006**: `/api/studio/tools` for action `snew_connect_app` with `app='shopify'` MUST return a structured error when `getStoreConnection(teamId).kind === 'nuvemshop'`; the error code (e.g. `ECOMMERCE_ALREADY_CONNECTED`) MUST be machine-readable so the client can render a "already on Nuvemshop" card.
- **FR-007**: `/api/studio/tools` for action `snew_post_to_app` with `app='shopify'` MUST return the same `ECOMMERCE_ALREADY_CONNECTED` error when a Nuvemshop connection is present; it MUST NOT execute any Composio call.
- **FR-008**: The `studio-chat` edge function's server-side post/connect intent injection (`POST_INTENT`, `CONNECT_INTENT`, `detectApp` in `supabase/functions/studio-chat/index.ts`) MUST receive the team's e-commerce discriminator (passed through `creativeState` from the client) and MUST NOT synthesize `snew_connect_app({app:'shopify'})` or `snew_post_to_app({app:'shopify'})` when `ecommerceKind === 'nuvemshop'`.
- **FR-009**: The system prompt of the studio-chat edge function MUST state the rule: "se `ecommerceKind === 'nuvemshop'`, NUNCA emita snew_connect_app ou snew_post_to_app com app='shopify'; use snew_query_stock / snew_query_sales / snew_list_orders para perguntas de loja."
- **FR-010**: Studio client (`AssetCreatorModal.tsx`) MUST include the e-commerce kind in the `creativeState` payload it POSTs to `studio-chat`.
- **FR-011**: `snew_check_connections` MUST include an `ecommerce: { kind, ... }` field in its return, using the same helper.
- **FR-012**: When a Nuvemshop API call inside any retail tool returns 401/403, the tool MUST surface `error_code='NUVEMSHOP_AUTH_EXPIRED'` and the chat MUST render a reauth CTA pointing at `/api/nuvemshop/connect`. It MUST NOT offer to connect Composio Shopify as a fallback.
- **FR-013**: The retail tools MUST NEVER return stubbed/placeholder data when a Nuvemshop connection exists. Either real data or a typed error.
- **FR-014**: No new schema changes. All e-commerce state is already in `stores` + Composio.

### Key Entities

- **StoreConnection** _(helper return type, not a DB entity)_: discriminated union over `'nuvemshop' | 'shopify-composio' | null`; carries the token + store id when `nuvemshop`; carries the Composio connected account id when `shopify-composio`.
- **`stores` row** _(existing)_: `team_id` (FK, UNIQUE), `platform`, `platform_store_id`, `platform_access_token`, `connected_at`. Unchanged by this feature.
- **Composio connectedAccount** _(external)_: queried via `composio.connectedAccounts.list({ userIds: [userId] })`, filtered to `status==='ACTIVE'` and `toolkit.slug==='shopify'`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On a Nuvemshop-connected test team, 3/3 of the canonical retail prompts ("qual meu estoque", "vendas dessa semana", "últimos pedidos") return real Nuvemshop data in ≤2s p95 (excluding LLM latency).
- **SC-002**: On the same team, 10/10 attempts to connect or publish to Shopify in chat are suppressed (no Composio network call, clear UI message).
- **SC-003**: Zero direct reads of `stores.platform` or Composio `shopify` outside `getStoreConnection` — enforced by a grep-based test or CI script.
- **SC-004**: `snew_check_connections` response includes the `ecommerce` field 100% of the time and matches the DB state under integration tests for all four fixtures (no conn, nuvemshop, shopify-composio, both).
- **SC-005**: No regression in non-ecommerce tool flows (Instagram/Telegram/Gmail) — verified by replaying the existing studio chat smoke tests.
- **SC-006**: A 401 from the Nuvemshop API produces a single, consistent `NUVEMSHOP_AUTH_EXPIRED` error in 100% of tool call paths, rendered as a reauth CTA in the chat (not a silent empty state).

### Out of Scope

- Migrating teams from Composio Shopify → Nuvemshop (UI for disconnect is not built here; legacy dual-state is documented, not auto-reconciled).
- Adding Shopify support via Nuvemshop (they are different platforms).
- Creating/updating products, coupons, or stock from chat (write-path is a separate feature).
- Publishing to Nuvemshop pages (Nuvemshop has `createPage`, but no chat surface for it here).
- Caching / materializing Nuvemshop data in the relay DB beyond what already happens in `/api/nuvemshop/sync`.
