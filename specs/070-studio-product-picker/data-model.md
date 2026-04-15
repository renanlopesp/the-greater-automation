# Phase 1 Data Model: Studio Product Picker

**Feature**: 070-studio-product-picker
**Date**: 2026-04-15

## Entities

### NormalizedProduct

The canonical product shape the picker and every downstream generation consumer reads from. Both Nuvemshop and Composio Shopify rows are projected into this shape at the server boundary.

| Field    | Type                                | Required | Notes                                                                                                                              |
| -------- | ----------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `id`     | `string`                            | yes      | Backend-native id (Nuvemshop numeric id or Shopify GID) — stringified.                                                             |
| `name`   | `string`                            | yes      | Display name. Localised fields flattened to pt/es/first-available.                                                                 |
| `image`  | `string \| null`                    | yes      | First product image URL. `null` when the store has no image (FR-010 edge case).                                                    |
| `price`  | `string \| null`                    | yes      | Canonical price in the store's display currency as a string (avoids float rounding); `null` when the store has no default variant. |
| `handle` | `string \| undefined`               | no       | SEO handle. Present on both backends; optional because not every caller needs it.                                                  |
| `source` | `'nuvemshop' \| 'shopify-composio'` | yes      | Discriminator — useful for downstream analytics, not shown to users.                                                               |

**Validation rules**:

- `id` non-empty after `String()` coercion; reject entire row if empty (server-side filter before returning).
- `name` trimmed; fallback to `"Produto sem nome"` if the backend returns an empty title so the row is still selectable.
- `image` URL must start with `http://` or `https://`; otherwise coerced to `null`.
- `price` may include currency prefix; the picker renders it as-is. Downstream prompt-building may strip it.

**Zod schema** (lives in `src/lib/studio/product-normalizer.ts`):

```ts
export const NormalizedProductSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  image: z.string().url().nullable(),
  price: z.string().nullable(),
  handle: z.string().optional(),
  source: z.enum(['nuvemshop', 'shopify-composio']),
})
```

---

### ActiveProduct

A single `NormalizedProduct` elevated to "the user's current anchor". There is at most one at any time. Stored both in memory (React context) and server-side (task persistence).

Same shape as `NormalizedProduct`; no additional fields.

**State transitions**:

1. `null` → product A: user clicks product A in picker OR drags product A from sidebar. Side effects: set canvas image to A.image, set selectedProducts to [A.id], debounce-persist to `tasks.artifact_data.activeProduct`.
2. product A → product B: user picks B. Same side effects; canvas image overwritten.
3. product A → `null`: user clicks "X" on chip. Side effects: clear canvas image, clear selectedProducts, persist `null`.
4. Orphan state (persisted product id no longer exists in store): chip renders with cached data; user sees "produto não existe mais" affordance; clicking X transitions to `null`.

---

### StudioSession (extension)

The existing `StudioSession` context in `src/lib/studio/session-context.tsx` gains two fields:

```ts
export interface StudioSession {
  // ... existing fields ...
  activeProduct: NormalizedProduct | null
  setActiveProduct: (product: NormalizedProduct | null) => void
}
```

**Persistence shape** inside `tasks.artifact_data`:

```json
{
  "activeProduct": {
    "id": "12345",
    "name": "Body bordado rosa",
    "image": "https://.../1.jpg",
    "price": "R$ 129,90",
    "source": "nuvemshop"
  }
}
```

- Written via the existing PATCH `/api/tasks/:id` with `merge: true` — no new route.
- Written on setter calls, debounced 500 ms to match `snapshotCanvas`.
- Read on `StudioSessionProvider` mount via an `initialActiveProduct` prop supplied by the page-level loader (already passes `initialChatArtifact` from the same task row).

---

### CatalogSnapshot (transient, not persisted)

Held only in TanStack React Query cache. Not persisted to the DB.

| Field      | Type                                        | Notes                                        |
| ---------- | ------------------------------------------- | -------------------------------------------- |
| `products` | `NormalizedProduct[]`                       | One page's worth.                            |
| `page`     | `number`                                    | 1-indexed.                                   |
| `hasMore`  | `boolean`                                   | Whether the next page exists on the backend. |
| `kind`     | `'nuvemshop' \| 'shopify-composio' \| null` | `null` when no store connected.              |

Cache key: `['studio-products', teamId, page, q]`. Stale 5 min. Invalidated by the picker's "atualizar" button.
