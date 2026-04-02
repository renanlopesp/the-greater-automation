# Feature Specification: Asset Template Refinement

**Feature Branch**: `053-asset-template-refinement`
**Created**: 2026-04-02
**Status**: Draft
**Input**: Refine campaign visual assets: (1) Generate multiple assets per format (one per curated product, at least 5 per format), not just 1 hero image. (2) Fix HTML template: larger bottom text, properly aligned CTA button, correct proportions for download. (3) Better component layout: organize assets by format (Stories, Feed, Banner, Meta Ad) as separate sections, each showing a horizontal scroll of product variants. (4) Fix download: ensure correct pixel dimensions without stretching. (5) Each asset uses a different product image as background with campaign text overlay.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Multiple Product Assets Per Format (Priority: P1)

As a store owner viewing campaign assets, I want each format (Stories, Feed, Banner, Meta Ad) to contain one asset per curated product so that I can choose the best product photo for each channel, rather than being limited to a single hero image across all formats.

**Why this priority**: The current system only generates 1 asset per format using a single product image. This is the core limitation — store owners with 5-10 curated products expect to see each product featured in every format, giving them creative variety and maximizing their product catalog exposure.

**Independent Test**: Can be tested by generating assets for a campaign with 5+ curated products and verifying that each format contains one asset per product, each with the product's own image as background.

**Acceptance Scenarios**:

1. **Given** a campaign with 7 curated products (each with an image), **When** the user generates assets, **Then** each of the 4 formats contains 7 assets — one per product — totaling 28 assets.
2. **Given** a campaign with 3 curated products where 1 has no image, **When** assets are generated, **Then** each format contains 2 assets (only products with images are used), and a message indicates 1 product was skipped due to missing image.
3. **Given** a campaign with 12 curated products, **When** assets are generated, **Then** all 12 products appear in each format (no artificial cap on product count).

---

### User Story 2 - Format-Grouped Layout with Horizontal Scroll (Priority: P2)

As a store owner browsing generated assets, I want assets organized by format (Stories, Feed, Banner, Meta Ad) as distinct sections, each displaying its product variants in a horizontal scrollable row, so I can quickly compare variants within each format and find the one I want to download.

**Why this priority**: With multiple assets per format, a flat grid becomes overwhelming. Grouping by format with horizontal scroll provides clear visual hierarchy and lets users focus on one format at a time while quickly scanning product variants.

**Independent Test**: Can be tested by verifying the assets section shows 4 clearly labeled format groups, each with a horizontally scrollable row of asset previews.

**Acceptance Scenarios**:

1. **Given** 28 generated assets (7 products x 4 formats), **When** the user views the assets section, **Then** they see 4 sections labeled "Stories 9:16", "Feed 1:1", "Banner Email 3:1", and "Stories Meta Ad 9:16", each containing 7 horizontally scrollable asset cards.
2. **Given** a format section with more assets than fit on screen, **When** the user scrolls horizontally within that section, **Then** the scroll is smooth and the other format sections remain in place (no vertical scroll interference).
3. **Given** any asset card in a format row, **When** the user looks at the card, **Then** they see the product name displayed on or below the card to identify which product is featured.

---

### User Story 3 - Fixed HTML Template Quality (Priority: P2)

As a store owner previewing an asset, I want the text overlay to be legible (larger bottom text), the CTA button to be properly centered and sized, and the overall proportions to look professional, so that the generated assets are usable without manual editing.

**Why this priority**: Even with multiple product variants, poor template quality (tiny text, misaligned buttons) makes assets unusable. This is tied to P2 because it applies to the same template used by all generated assets.

**Independent Test**: Can be tested by visually inspecting generated assets across all 4 formats and confirming text is readable, CTA is centered, and proportions match the target dimensions.

**Acceptance Scenarios**:

1. **Given** a generated Stories asset (1080x1920), **When** the user previews it, **Then** the subtext is at least 20px font size and the CTA button is horizontally centered with adequate padding.
2. **Given** a generated Banner asset (1200x400), **When** the user previews it, **Then** the headline, subtext, and CTA are all visible without overlapping and text is not truncated.
3. **Given** any generated asset, **When** the user previews it, **Then** the product image fills the background without distortion (object-fit cover) and the text overlay has sufficient contrast against the background.

---

### User Story 4 - Correct Download Dimensions (Priority: P1)

As a store owner downloading an asset, I want the downloaded image to have the exact pixel dimensions of the format (e.g., 1080x1920 for Stories) without any stretching or distortion, so I can upload it directly to social media or ad platforms without resizing.

**Why this priority**: Stretched or wrong-dimension downloads make assets unusable for their intended platform. This is a critical bug fix — the current download produces stretched images.

**Independent Test**: Can be tested by downloading an asset in each format and measuring the resulting image dimensions in pixels, confirming they match the format specification exactly.

**Acceptance Scenarios**:

1. **Given** a Stories 9:16 asset, **When** the user clicks download, **Then** the downloaded PNG image is exactly 1080x1920 pixels.
2. **Given** a Feed 1:1 asset, **When** the user clicks download, **Then** the downloaded PNG image is exactly 1080x1080 pixels.
3. **Given** a Banner Email 3:1 asset, **When** the user clicks download, **Then** the downloaded PNG image is exactly 1200x400 pixels.
4. **Given** any downloaded asset, **When** compared to the on-screen preview, **Then** the content (text, image, overlay) appears identical — no stretching, cropping, or repositioning.

---

### Edge Cases

- What happens when a campaign has 0 curated products with images? The system shows a message indicating no assets can be generated without product images, and suggests the user add images to their products.
- What happens when a product image URL is broken or returns 404? The asset for that product is skipped, and a warning is shown to the user. Other product assets still generate normally.
- What happens when the user scrolls a horizontal row on mobile (touch device)? The horizontal scroll supports touch/swipe gestures natively.
- What happens when the user downloads multiple assets quickly? Each download is independent and does not block or interfere with other downloads.
- How does the preview scale for very large assets (1080x1920) in a small panel? The preview is scaled down proportionally to fit the card width while maintaining the correct aspect ratio.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST generate one asset per curated product per format, resulting in (number of products with images) x 4 total assets.
- **FR-002**: Each generated asset MUST use its corresponding product's image as the background, not a shared hero image.
- **FR-003**: The asset generation MUST produce unique text content (headline, subtext, CTA) tailored to the specific product being featured.
- **FR-004**: The assets display MUST be organized into 4 format sections: Stories 9:16, Feed 1:1, Banner Email 3:1, and Stories Meta Ad 9:16.
- **FR-005**: Each format section MUST display its assets in a horizontally scrollable row.
- **FR-006**: Each asset card MUST display the product name to identify which product is featured.
- **FR-007**: The HTML template MUST render subtext at a minimum readable size (no smaller than 18px for vertical formats, 16px for horizontal).
- **FR-008**: The CTA button MUST be horizontally centered within the asset and sized proportionally to the format.
- **FR-009**: The download function MUST produce a PNG image with exact pixel dimensions matching the format (1080x1920 for Stories, 1080x1080 for Feed, 1200x400 for Banner, 1080x1920 for Meta Ad).
- **FR-010**: The download MUST render the asset at its native resolution (1:1 scale) before capturing, regardless of how it is scaled for preview.
- **FR-011**: Products without an image URL MUST be excluded from asset generation with a visible indicator to the user.
- **FR-012**: The system MUST display a loading state during asset generation, showing progress per format section.

### Key Entities

- **Asset Format**: A target visual format (Stories, Feed, Banner, Meta Ad) with defined label, aspect ratio, and pixel dimensions.
- **Campaign Asset**: A single visual asset combining a product image background with campaign text overlay. Belongs to one format and one product. Contains generated headline, subtext, CTA, and color scheme.
- **Curated Product**: A product selected for the campaign, with name, price, image URL, and product ID. Only products with valid image URLs participate in asset generation.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Each format section displays at least as many asset variants as there are curated products with images (minimum 5 for a typical campaign).
- **SC-002**: 100% of downloaded assets have pixel-perfect dimensions matching their format specification (no stretching, no wrong dimensions).
- **SC-003**: Users can identify which product is featured in each asset without opening or hovering — product name is visible on the card.
- **SC-004**: Users can scroll through all product variants within a format in under 3 seconds (smooth horizontal scroll).
- **SC-005**: Text in all generated assets is legible at the preview scale — no text smaller than 16px at native resolution.
- **SC-006**: Asset generation completes within 30 seconds for up to 10 products across all 4 formats.

## Assumptions

- Curated products typically number between 5-12 per campaign; the system should handle up to 20 without degradation.
- The existing AI text generation (headline, subtext, CTA) will be called once per format with all products, generating tailored text for each product in a single batch call to minimize latency.
- Product images are hosted externally (e.g., Nuvemshop CDN) and are assumed to support CORS for rendering in the asset template.
- The download mechanism (converting rendered content to PNG) runs client-side and depends on the product image being accessible cross-origin.
- Preview scaling uses CSS transform to show large-dimension assets in a compact card without affecting the actual template resolution.
