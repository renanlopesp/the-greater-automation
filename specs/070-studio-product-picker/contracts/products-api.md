# API Contract: GET /api/studio/products

**Feature**: 070-studio-product-picker
**Route**: `src/app/api/studio/products/route.ts` (Next.js Route Handler, Node runtime)
**Auth**: Cookie-based (existing `createServerClient` → `auth.getUser()`)
**Method**: `GET`

## Purpose

Return a page of the team's real store products in a backend-agnostic shape for the studio product picker. Enforces the mutual-exclusion rule already centralised in `getStoreConnection()` (Nuvemshop wins over Composio Shopify when both exist).

## Query Parameters

| Name       | Type    | Required | Default | Notes                                                                                |
| ---------- | ------- | -------- | ------- | ------------------------------------------------------------------------------------ |
| `page`     | integer | no       | `1`     | 1-indexed. Values below 1 coerced to 1.                                              |
| `per_page` | integer | no       | `50`    | Capped at `100`.                                                                     |
| `q`        | string  | no       | —       | Trimmed; queries below 2 chars ignored server-side (returned as if `q` were absent). |

## Response — Connected Store

**Status**: `200 OK`

```json
{
  "kind": "nuvemshop",
  "products": [
    {
      "id": "12345",
      "name": "Body bordado rosa",
      "image": "https://acdn.nuvemshop.com.br/.../1.jpg",
      "price": "129.90",
      "handle": "body-bordado-rosa",
      "source": "nuvemshop"
    }
  ],
  "page": 1,
  "hasMore": true
}
```

- `kind` — always `"nuvemshop"` or `"shopify-composio"` when products are present.
- `products` — array of `NormalizedProduct` (data-model.md). May be empty.
- `page` — echo of the input page.
- `hasMore` — true when the backend indicates another page exists (Nuvemshop: `Link` header `rel="next"`; Composio: `pageInfo.hasNextPage`).

## Response — Disconnected Store

**Status**: `200 OK`

```json
{ "kind": null, "products": [], "page": 1, "hasMore": false }
```

Intentionally not a 4xx: the picker needs a benign empty state with a CTA, not an error toast.

## Response — Unauthenticated

**Status**: `401 Unauthorized`

```json
{ "error": "Unauthorized" }
```

## Response — Upstream Errors

Upstream Nuvemshop 5xx or Composio failures return `200` with `products: []` and a top-level `warning` field for the client to surface in the picker ("loja temporariamente indisponível, tente novamente"):

```json
{
  "kind": "nuvemshop",
  "products": [],
  "page": 1,
  "hasMore": false,
  "warning": "store_api_unavailable"
}
```

Rationale: the picker UI is degraded but functional (empty grid + retry) rather than broken. Matches how `nuvemshopApi` already coerces Nuvemshop's "Last page is 0" 404 into an empty list in `src/app/api/studio/tools/route.ts`.

## Response — Nuvemshop Token Expired

**Status**: `200 OK` with the specific error code so the client can surface a reconnect CTA:

```json
{
  "kind": "nuvemshop",
  "products": [],
  "page": 1,
  "hasMore": false,
  "error_code": "NUVEMSHOP_AUTH_EXPIRED",
  "reauth_url": "/api/nuvemshop/connect"
}
```

## Caching

- Server emits `Cache-Control: private, max-age=0, must-revalidate`.
- Client caches via TanStack React Query (5 min staleTime, 15 min gcTime), key `['studio-products', teamId, page, q]`.
- Manual invalidation via the picker's "atualizar" button.

## Security

- Route requires an authenticated user; returns 401 otherwise.
- Team resolution via existing `getActiveTeamId(supabase, user.id)`.
- Nuvemshop access token is never returned to the client — server fetches the store API, normalises, and returns only the shape above.
- Composio connected-account id is never returned to the client either; server uses `getComposio()` internally.

## Non-goals

- No `POST`/`PUT`/`DELETE` — this route is strictly read-only.
- No variant listing — the picker works at the product level. Variant selection is future work.
