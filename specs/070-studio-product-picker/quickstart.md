# Quickstart: Studio Product Picker

**Feature**: 070-studio-product-picker
**Date**: 2026-04-15

Run the feature locally from scratch. Assumes the repo is cloned and `bun` is installed.

## 1. Check out the branch

```bash
git checkout 070-studio-product-picker
bun install
```

## 2. Start the dev server

```bash
bun dev
```

The app runs on `http://localhost:3000`.

## 3. Ensure a connected store

Log in as a user whose active team has EITHER a Nuvemshop connection OR a Composio Shopify connection. Both paths go through the same picker UI.

- **Nuvemshop**: existing row in `stores` with `platform='nuvemshop'`, `platform_store_id`, and `platform_access_token` populated. The dev seed "Milkes" team already has this.
- **Composio Shopify**: an `ACTIVE` connected account with `toolkit.slug='shopify'` on the user's Composio workspace.

If neither is configured, the picker's empty state will point you to `/apps`.

## 4. Walk the core flow

1. Open `http://localhost:3000/studio/create`.
2. Click the **Produto** button above the prompt input. A sheet slides in from the right showing the first page of products.
3. Type part of a product name in the search box. The grid filters.
4. Click a product. Sheet closes; the active-product chip appears next to the prompt input.
5. Type "cria uma campanha pro stories" in the prompt and press Enter.
6. When the image arrives, verify visually that it depicts the selected product (no hallucinated replacement).

## 5. Persistence check (FR-013)

After step 4, copy the URL (e.g., `/studio/create/{taskId}`) and refresh. The active-product chip must re-appear with the same product.

## 6. Empty-state check (FR-014 / FR-015)

- **No store connected**: sign in as a team with no `stores` row and no Composio Shopify account. Open the picker. Expect "Nenhuma loja conectada" with a button to `/apps`.
- **Zero products**: connect a store with an empty catalog (Nuvemshop test store works). Expect "Sua loja não tem produtos publicados".

## 7. E2E tests

```bash
bun test:e2e tests/e2e/studio-product-picker.spec.ts
```

Covers the five user stories from `spec.md`. Requires a pre-seeded dev team with products in the local Supabase instance.

## 8. Unit tests

```bash
bun test tests/unit/product-normalizer.test.ts
```

Covers the Nuvemshop-and-Composio-to-NormalizedProduct mapping, including the localised-name fallback, missing-image coercion to `null`, and the price-variant-missing case.

## Troubleshooting

- **Picker opens but is empty on a connected store**: check `GET /api/studio/products` in the network tab. If `kind: null`, `getStoreConnection` is not finding the connection — re-check `stores` row and Composio account.
- **Chip disappears after refresh**: check `tasks.artifact_data.activeProduct` — persistence is server-side via PATCH `/api/tasks/:id` with `merge: true`. A 403 in the PATCH means RLS is blocking the write; check the active team.
- **Generated image still hallucinates the product**: the active-product setter must update all three legacy fields (`activeImageUrl`, `selectedProducts`, chat product ref). If only the chip updates but generations stay hallucinated, the wiring in `AssetCreatorModal.tsx` that reads from the new context field is missing.
- **Composio Shopify empty search**: the MVP client-side filters one fetched page (research.md, Decision 4). For catalogs over ~500 products on Composio Shopify, SC-006 may degrade — upgrade to server-side filter if QA shows the issue.
