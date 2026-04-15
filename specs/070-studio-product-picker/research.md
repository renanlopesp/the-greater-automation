# Phase 0 Research: Studio Product Picker

**Feature**: 070-studio-product-picker
**Date**: 2026-04-15

## 1. Composio Shopify product-list shape

**Decision**: Use the Composio Shopify toolkit action `SHOPIFY_GET_PRODUCTS` (`admin-api-product-index` equivalent) via `composio.tools.execute(userId, { slug: 'SHOPIFY_GET_PRODUCTS', arguments: { limit, page_info? } })`. Normalise each item: `id` → `String(node.id)`, `name` → `node.title`, `image` → `node.image?.src ?? node.images?.[0]?.src ?? null`, `price` → `node.variants?.[0]?.price ?? null`, `handle` → `node.handle`.

**Rationale**: Composio's Shopify toolkit exposes the Admin API's Products resource with the exact fields we need. Using the toolkit action keeps us aligned with the rest of the codebase (auth, rate-limit, error normalisation) instead of forging raw Admin calls.

**Alternatives considered**:

- Raw Shopify Admin REST via the connected account's access token — rejected: we'd duplicate auth and response-error handling that Composio already centralises, and we'd lose the existing mutual-exclusion guard.
- GraphQL `products` via Storefront API — rejected: Storefront API excludes unpublished/archived products and returns prices in locale strings we'd have to re-parse.

## 2. Pagination contract

**Decision**: Expose a simple integer `page` (1-indexed) + `per_page` (default 50, max 100) to clients. Internally:

- Nuvemshop: forward as `page` + `per_page` to `/v1/{storeId}/products`.
- Composio Shopify: translate `page` to cursor by calling sequentially and caching the cursor → page map in memory per request lifecycle. If Composio returns `pageInfo.hasNextPage === false`, the server responds `hasMore: false`.

**Rationale**: A 1-indexed integer is the simplest client abstraction and matches React Query's cursor-shaped paging when `hasMore` flags are exposed. The Nuvemshop case is already this shape; the Shopify cursor translation is contained to one server hop per page and is acceptable for catalogs in the hundreds-to-low-thousands range.

**Alternatives considered**:

- Pass-through cursor tokens — rejected: leaks backend detail into the client and forces the picker to branch per `source`.
- Offset only, no `hasMore` — rejected: Composio is strictly cursor-based; offset emulation on Shopify is brittle for large catalogs.

## 3. Cache strategy

**Decision**: TanStack React Query with `staleTime: 5 * 60 * 1000` (5 min), `gcTime: 15 * 60 * 1000`, keyed by `['studio-products', teamId, page, q]`. An explicit "atualizar catálogo" button calls `queryClient.invalidateQueries(['studio-products', teamId])`.

**Rationale**: 5 min stale time covers the typical "pick product → generate → pick another" window without hammering the store API. Team scoping prevents cross-tenant cache bleed when `QueryClient` is long-lived during a session. Manual invalidate gives merchants a recovery path when they publish a product mid-session.

**Alternatives considered**:

- SWR / no cache — rejected: every picker re-open would hit the store API for no gain; first-paint would be ~1.5 s on every open.
- Cache in `StudioSession` context — rejected: duplicates what React Query already does and couples fetch state with UI state.

## 4. Search mode

**Decision**: Hybrid search. For queries with length ≥ 2:

- Nuvemshop: forward `?q=<query>` to the products endpoint (Nuvemshop native search).
- Composio Shopify: no native search in the toolkit action, so server fetches first page up to 200 items and client-side filters by `name.toLowerCase().includes(q.toLowerCase())`.

Below 2 chars we do not fire a search — display the paginated default list.

**Rationale**: Nuvemshop's native `q` handles large catalogs well. Composio Shopify catalogs in the 100-500 range will perform adequately with client-side filtering of one fetched page; if customers exceed that, we upgrade to server-side filtering later. Keeps MVP simple (SC-006 target is 500ms for 500 products — one 200-item page plus substring is under that).

**Alternatives considered**:

- Forward `title:contains:{q}` to Shopify GraphQL — rejected: requires raw Admin GraphQL (see Decision 1 trade-off).
- Server-side full catalog index with trigram — rejected: over-engineered for the size bands we're targeting.

## 5. Active-product persistence

**Decision**: Merge `activeProduct` into `tasks.artifact_data` under its own sub-key via the existing `PATCH /api/tasks/:id` route with `merge: true`. Debounce the PATCH at 500 ms (matches the `snapshotCanvas` debounce already in `StudioSession`). On mount, `StudioSessionProvider` accepts an `initialActiveProduct` prop the same way it accepts `initialChatArtifact`.

**Rationale**: The merge pattern is already proven for `chatArtifact`; re-using it keeps the surface area tiny (no new route, no new table, no new migration). Debouncing at 500 ms matches the user's typing + click rhythm so we don't thrash the DB.

**Alternatives considered**:

- New `tasks.active_product_id` column — rejected: DB migration for what amounts to a JSONB field; violates Simplicity principle.
- Zustand-only (no server persistence) — rejected: fails FR-013 (survive page refresh).
- localStorage — rejected: multi-device / multi-tab inconsistency; task-scoped persistence belongs server-side.
