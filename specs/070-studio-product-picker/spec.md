# Feature Specification: Studio Product Picker

**Feature Branch**: `070-studio-product-picker`
**Created**: 2026-04-15
**Status**: Draft
**Input**: User description: "Product Picker as Starting Point for Studio Campaigns — the 'Produto' button in the studio chat must open a picker showing the user's real store products. Clicking a product sets it as the anchor for every subsequent image, campaign, carousel, or video generation, so the image model preserves the real product instead of hallucinating one."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Pick a real store product before generating (Priority: P1)

A connected-store user opens the studio, clicks the **Produto** button, sees their real store catalog with thumbnails, picks one (e.g., "body bordado rosa"), then types any prompt ("cria uma campanha pro stories"). The resulting generation shows that exact product, not a generic look-alike.

**Why this priority**: This is the core reason the button exists. Today the button uploads a file (wrong), and every "cria campanha" prompt produces a hallucinated product because the image model has no real reference. This breaks the single most common studio workflow for a connected merchant.

**Independent Test**: Open `/studio/create` with a store connected. Click "Produto". Verify a picker appears with real store products. Click one. Verify the product appears as an active-product chip near the input. Send any generation prompt. Verify the generated image contains the selected product and nothing else.

**Acceptance Scenarios**:

1. **Given** a Nuvemshop-connected store with at least one product, **When** the user clicks "Produto" in the studio chat, **Then** a picker opens showing the store's products with name, image, and price.
2. **Given** the product picker is open, **When** the user clicks a product, **Then** the picker closes, an "active product" chip appears next to the input showing the product's thumb and name, and any subsequent generation uses that product's image as the visual reference.
3. **Given** a product is active, **When** the user clicks the "X" on the chip, **Then** the product is deselected and generations revert to no product anchor.
4. **Given** a Composio Shopify-connected store with at least one product, **When** the user clicks "Produto", **Then** the picker opens with the Shopify catalog (same UX as Nuvemshop).

---

### User Story 2 - Search & browse a large catalog (Priority: P2)

A merchant with 500+ SKUs needs to find one specific product quickly without scrolling an infinite list.

**Why this priority**: Without search, the picker is unusable beyond small catalogs. Pagination alone is insufficient because merchants usually remember a product by name, not position.

**Independent Test**: Open the picker with a catalog of more than 50 products. Type a fragment of a product name in the search box. Verify the grid filters to matching products in under 1 second. Scroll the full list; verify pagination does not block interaction.

**Acceptance Scenarios**:

1. **Given** the picker is open and the store has more than 50 products, **When** the user types into the search box, **Then** the grid filters to products whose name matches the query (case-insensitive, substring match).
2. **Given** the search yields no results, **When** the user sees the empty list, **Then** a "nenhum produto encontrado" state appears with a clear button to reset the search.
3. **Given** the catalog has more products than fit in one page, **When** the user scrolls to the end of the grid, **Then** the next page loads automatically (or a "carregar mais" button appears).

---

### User Story 3 - Combine product anchor with a style reference (Priority: P2)

A user wants the campaign to feature their real product in a specific mood (e.g., moody candlelit scene). They pick a product from the picker AND upload a separate mood-reference image.

**Why this priority**: Keeping the two reference roles distinct ("this is my product" vs "this is the mood I want") is what makes a studio feel professional. It is not P1 because most first-time users will only use one anchor at a time, but it is table-stakes for repeat users.

**Independent Test**: Pick a product from the picker. Upload a mood reference via "Referência de imagem". Send a generation prompt. Inspect the outgoing request to the image model: it must contain BOTH images as references (the product photo + the mood image).

**Acceptance Scenarios**:

1. **Given** a product is active AND a reference image is uploaded, **When** the user generates an image, **Then** both images are sent to the image generator and the output contains the real product rendered in the mood of the reference.
2. **Given** a product is active, **When** the user removes the reference image but keeps the product, **Then** subsequent generations still anchor on the product.

---

### User Story 4 - Empty / disconnected store (Priority: P3)

A user without a connected store clicks "Produto".

**Why this priority**: Edge case but visible. A silent failure or empty picker would be confusing.

**Independent Test**: Log into an account with no store connected. Open the studio. Click "Produto". Verify an empty state appears with a call-to-action linking to the Apps page.

**Acceptance Scenarios**:

1. **Given** no store is connected, **When** the user clicks "Produto", **Then** the picker shows "Nenhuma loja conectada" with a button that takes the user to `/apps` to connect one.
2. **Given** a store is connected but has zero products, **When** the user opens the picker, **Then** it shows "Sua loja não tem produtos publicados" with a hint to publish one.

---

### User Story 5 - Persistence across chat turns (Priority: P3)

A user picks a product, generates an image, asks for a caption, asks for another variation — the product stays selected the whole time and survives a page refresh within the same task.

**Why this priority**: Without persistence the picker is a one-shot tool and the user re-picks on every prompt. Annoying but recoverable.

**Independent Test**: Pick a product. Refresh the page (same task URL). Verify the active-product chip is still there and a new generation still uses the same anchor image.

**Acceptance Scenarios**:

1. **Given** a product is active inside a task, **When** the user sends multiple chat turns, **Then** the product remains active until the user explicitly deselects it or starts a new task.
2. **Given** a product is active, **When** the user refreshes the page, **Then** the product is still active after reload.

---

### Edge Cases

- Product has no image → the picker must still show the product (placeholder thumb), and picking it must surface a friendly message saying this product has no image so generations will not be anchored visually.
- Store API is slow or errors on catalog fetch → picker shows a skeleton for a short window, then a retry button.
- Active product is deleted in the store between two chat turns → the active-product chip remains (shows cached thumb), but a new fetch would not find it; the chip should offer "este produto não existe mais — remover".
- User drops a product onto the canvas via the existing sidebar drag (preserved flow) — that interaction must keep working unchanged and must set the same active-product state as the picker (no divergent states).
- Product image URL returns 403/expired → skeleton then fallback placeholder; generation uses the prompt text only and warns the user the anchor failed.
- More than one image per product (e.g., Nuvemshop returns `images: [{ src }]` array) — the picker uses the first image; this spec does not cover picking a specific variant image.
- User has BOTH Nuvemshop and Composio Shopify connected — the picker honours the system-wide tie-breaker already in place (Nuvemshop wins), and does not present a store selector in this release.
- User opens the picker, then closes it without selecting — no state changes, existing selection (if any) is preserved.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The "Produto" button above the studio prompt input MUST open a product picker surface, NOT a file upload dialog.
- **FR-002**: The picker MUST display the user's real connected-store products (Nuvemshop or Composio Shopify) with thumbnail, name, and price.
- **FR-003**: The picker source MUST resolve from the team's active ecommerce connection (single source of truth, same rule as the rest of the studio: Nuvemshop wins over Composio Shopify when both exist).
- **FR-004**: The picker MUST provide a text search field that filters products by name (case-insensitive substring).
- **FR-005**: The picker MUST load catalog data lazily (on first open) and cache it for the current task session to avoid re-fetching on subsequent opens in the same session.
- **FR-006**: The picker MUST handle catalogs with more than 50 products via pagination or incremental loading without freezing the UI.
- **FR-007**: Clicking a product in the picker MUST close the picker and mark that product as "active product" for the studio session.
- **FR-008**: Setting the active product MUST update three pieces of studio state atomically: the canvas's active image source (to the product photo), the selected-products list (to `[productId]`), and the chat product reference used for image-model anchoring.
- **FR-009**: A chip MUST render near the prompt input showing the active product's thumb and name, with an "X" affordance to deselect.
- **FR-010**: While a product is active, any image, carousel, video, or campaign generation MUST pass the product's image to the image model as a visual reference.
- **FR-011**: When BOTH an active product AND a user-uploaded reference image exist, the generation MUST send both images, with the product image taking precedence as the primary anchor.
- **FR-012**: Deselecting the active product MUST clear only those three state fields (canvas image, selected-products, chat product reference). It MUST NOT reset prompts, style, channel, or other user input.
- **FR-013**: Active-product state MUST persist to the task's server-side storage so the chip survives a page refresh within the same task URL.
- **FR-014**: When no store is connected, the picker MUST show an empty state with a CTA that navigates to `/apps`.
- **FR-015**: When the store is connected but has zero products, the picker MUST show an empty state explaining this and pointing the user to publish a product.
- **FR-016**: The existing drag-a-product-onto-the-canvas flow from the sidebar MUST continue working unchanged and MUST share the same active-product state as the picker (selecting a product via either path updates the other).
- **FR-017**: The "Referência de imagem" button MUST remain a file upload button and MUST NOT be affected by this change.
- **FR-018**: If the active product is later deleted from the store, the chip MUST surface a "produto não existe mais" state with a one-click remove action. It MUST NOT crash the studio or silently hide the selection.
- **FR-019**: The picker MUST visibly distinguish the currently active product (if any) in the grid so the user can see what was picked last time.
- **FR-020**: Opening the picker MUST NOT interrupt an in-flight generation; the picker opens above the chat, and any in-progress work continues.

### Key Entities

- **Active Product**: The one product the user has picked as the anchor for this studio session. Attributes: id, name, image URL, price. Exactly zero or one active product at any time.
- **Catalog Snapshot**: The list of store products fetched for the picker. Attributes: product id, name, first-image URL, price, handle. Cached per task session, refreshable.
- **Store Connection**: Existing entity — the team's active ecommerce backend (Nuvemshop or Composio Shopify). This spec reads from it but does not change it.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For users with a connected store, the picker MUST show the first page of products within 2 seconds on a typical broadband connection.
- **SC-002**: A user can go from opening the studio to having a real product selected in fewer than 3 clicks (open studio → click Produto → click a product).
- **SC-003**: When an active product is set, 100% of image, campaign, carousel, and video generations MUST include the product image in the reference inputs sent to the image model (measurable by inspecting the outgoing request payload).
- **SC-004**: After refreshing a task page, the previously selected active product MUST reappear as the chip in 100% of cases where the task was persisted.
- **SC-005**: Hallucinated-product rate (generations where the output depicts a product visibly different from the selected one) MUST drop below 5%, measured by sampled QA across 20 generations each anchored to a named product.
- **SC-006**: For a catalog with 500 products, typing a 3-character search fragment MUST filter the visible grid in under 500 ms.
- **SC-007**: Merchants successfully complete a "campaign from store product" task (pick product → generate → see real product in output) on the first attempt in at least 90% of sessions, measured via usability testing or funnel analytics.
- **SC-008**: The picker MUST handle a 1000-product catalog without scroll-jank (no frame below 30fps during scroll or search).

## Assumptions

- The existing store connection middleware already distinguishes Nuvemshop vs Composio Shopify (`/api/studio/ecommerce`) and returns a stable `kind` field the picker can branch on.
- The Nuvemshop products endpoint returns `images: [{ src }]` and the first entry is the canonical hero image (matches what existing chat-surfaced product cards already use).
- Composio Shopify returns product images in an equivalent first-image-is-hero shape; any normalisation lives at a single server-side layer.
- The existing chat-driven product-anchor mechanism in `AssetCreatorModal` (where the first image from a `snew_nuvemshop_api` products call is captured and fed into the image model as a reference) is the same state the picker will drive — the spec does NOT introduce a new anchoring concept, it adds a deterministic UI entry point to the same state.
- The studio session context already supports merge-based persistence of auxiliary artifact state to `tasks.artifact_data`; active-product persistence will live in a sibling sub-key and requires no schema change.
- A single-product anchor is sufficient for the first release. Multi-product generation (e.g., a "bundle" campaign) is explicitly out of scope.
- The existing `allProducts` prop in `AssetCreatorModal` today is seeded from demo data + uploaded catalog images — this spec treats that prop as the _legacy_ source for the sidebar drag; the picker MUST read from the real connected store instead, to avoid showing fake data to a real merchant.

## Out of Scope

- Creating, editing, or deleting products from the picker.
- Inventory or stock editing.
- Multi-product selection in a single generation.
- A separate admin "product library" page — this feature is the studio-side entry point only.
- Changing the drag-a-product-onto-canvas sidebar flow (it stays, but must share state).
- Cross-store product merging when a team has more than one connection.
- Variant or SKU-level selection inside a product.
- AI-driven product suggestions ("pick a product for me") — future work.
