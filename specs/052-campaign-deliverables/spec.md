# Feature Specification: Campaign Deliverables — Lazy Generation with Product Curation

**Feature Branch**: `052-campaign-deliverables`
**Created**: 2026-04-02
**Status**: Draft
**Input**: "Lazy generation of campaign deliverables (email template, assets, video scripts) with product curation. When a campaign is created for a seasonal date, only the concept + product selection is generated upfront. The user can then curate products (add/remove from the AI selection) before generating each deliverable separately. Email templates are real HTML with store branding, product images, and selected products. Assets are actual images (AI-generated or template-based) not CSS gradients. Video scripts reference the curated products. Each deliverable is generated on-demand when the user clicks into that section."

## Context

Currently, when a campaign is generated for a seasonal date, the system generates **everything at once**: concept, products, email subject/preview, 5 copies, 4 assets (CSS gradients), 2 video scripts, and a timeline. This has several problems:

1. **No product curation** — The AI selects products and the user cannot change them before generating deliverables
2. **Email is text-only** — Only subject line and preview text, no actual HTML template with branding and product images
3. **Assets are fake** — CSS gradients with labels, not real visual assets the user can download and use
4. **All-or-nothing generation** — Every section is generated at once, wasting AI tokens for sections the user may not need
5. **No progressive workflow** — User can't review concept, curate products, then generate deliverables sequentially

This spec introduces a **two-phase campaign workflow**: Phase 1 generates the concept and suggests products; Phase 2 lets the user curate products and generate each deliverable on-demand.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Product Curation (Priority: P1)

After a campaign concept is generated, the user can review the AI-suggested products and curate the selection: remove products that don't fit, add products from the full store catalog, and reorder them by priority. This curated product list becomes the basis for all subsequent deliverables.

**Why this priority**: Without product curation, all other deliverables use AI-guessed selections. This is the foundation for every other story.

**Independent Test**: Generate a campaign for Dia das Mães. In the products section, remove one product, add a different one from the catalog, and verify the updated list persists.

**Acceptance Scenarios**:

1. **Given** a generated campaign with AI-suggested products, **When** the user clicks "Editar produtos", **Then** they see the full product list with checkboxes (selected products checked, others unchecked).
2. **Given** the product editor is open, **When** the user unchecks a product, **Then** it's removed from the campaign selection and the count updates.
3. **Given** the product editor is open, **When** the user checks an unselected product, **Then** it's added to the campaign selection with its real data (image, price, tag, stock).
4. **Given** the user has curated the product list, **When** they click "Salvar seleção", **Then** the campaign's product list is updated and persisted.
5. **Given** a curated product list, **When** the user generates any deliverable (email, copies, etc.), **Then** the deliverable uses the curated products, not the original AI selection.

---

### User Story 2 — Lazy Deliverable Generation (Priority: P1)

Campaign creation generates only the concept and product selection upfront. Each deliverable section (email, copies, assets, video scripts, timeline) shows an empty state with a "Generate" button. Deliverables are created on-demand when the user clicks into the section.

**Why this priority**: Reduces initial generation time from ~60s to ~20s (concept only), saves AI tokens, and lets users generate only what they need.

**Independent Test**: Create a new campaign. Verify only concept + products are generated. Click into "Copies" section and verify it generates on demand. Verify other sections still show empty state.

**Acceptance Scenarios**:

1. **Given** the user clicks "Gerar Campanha" on a seasonal date, **When** generation completes, **Then** only the concept (slogan + description) and product selection are populated. All other sections show "Not generated" with a generate button.
2. **Given** a campaign with concept but no copies, **When** the user clicks the "Copies" section, **Then** they see a "Generate" button (not empty content).
3. **Given** the user clicks "Generate" on the Copies section, **When** generation completes, **Then** 5 copies appear (WhatsApp VIP, WhatsApp Geral, Instagram, Meta Ad, SMS) using the curated products.
4. **Given** the user generates copies but not email, **When** they navigate to the email section, **Then** it still shows "Not generated" independently.
5. **Given** the user regenerates the concept, **When** they return to a previously generated section, **Then** the system warns that the concept changed and offers to regenerate.

---

### User Story 3 — Real Email Template (Priority: P2)

The email section generates a complete, branded HTML email template — not just subject line and preview text. The template includes the store's brand colors, tone, product images with prices, a call-to-action button, and responsive layout that works on mobile.

**Why this priority**: A real email template that the user can copy into their email platform (Mailchimp, RD Station, etc.) is the most immediately actionable deliverable.

**Independent Test**: Generate the email deliverable for a Dia das Mães campaign with 5 curated products. Verify the output includes a visual preview and copyable HTML with product images.

**Acceptance Scenarios**:

1. **Given** a campaign with curated products, **When** the user generates the email deliverable, **Then** the system produces an HTML email template with: store branding (colors, tone), campaign slogan, product images with prices, and a CTA button.
2. **Given** a generated email template, **When** the user views it in the artifact panel, **Then** they see a visual preview of how the email looks.
3. **Given** a generated email template, **When** the user clicks "Copy HTML", **Then** the full HTML is copied to their clipboard, ready to paste into an email platform.
4. **Given** a store without a logo, **When** the email template is generated, **Then** it uses the store name as text in the header instead of an image.

---

### User Story 4 — Real Visual Assets (Priority: P2)

The assets section generates actual images — either AI-generated visuals or template-based compositions with product photos overlaid on branded backgrounds. Each asset respects the required format (Stories 9:16, Feed 1:1, Banner 3:1, etc.).

**Why this priority**: Visual assets are critical for social media campaigns but currently only show CSS gradient placeholders.

**Independent Test**: Generate assets for a Black Friday campaign. Verify 4 images are produced in correct aspect ratios with product photos embedded.

**Acceptance Scenarios**:

1. **Given** a campaign with curated products, **When** the user generates the assets deliverable, **Then** the system produces images in 4 formats: Stories 9:16, Feed 1:1, Banner Email 3:1, Stories Meta Ad 9:16.
2. **Given** generated assets, **When** the user views the assets section, **Then** they see visual previews of each asset with the correct aspect ratio.
3. **Given** generated assets, **When** the user clicks "Download" on an asset, **Then** the image file is downloaded in the correct resolution for its intended use.
4. **Given** products with images, **When** assets are generated, **Then** the product photos are composed into the visual (not just text labels).

---

### User Story 5 — Contextual Video Scripts (Priority: P3)

Video scripts are generated on-demand and reference the curated products by name, showing specific product shots and features. Scripts include timestamps, scene descriptions, and on-screen text callouts.

**Why this priority**: Video scripts are useful but less immediately actionable than email and assets. The current text-based scripts already work but need product context.

**Independent Test**: Generate video scripts after curating products. Verify the Reels 30s script mentions specific curated products by name.

**Acceptance Scenarios**:

1. **Given** a campaign with curated products, **When** the user generates video scripts, **Then** the Reels 30s and Reels 60s scripts reference specific curated products by name and price.
2. **Given** generated video scripts, **When** a product is removed from the curated list and scripts are regenerated, **Then** the new scripts no longer reference the removed product.

---

### Edge Cases

- Store has no products with images — Email template and assets use text-only product listings
- User curates products to an empty list — System prevents generation and shows warning "Select at least one product"
- User generates email, then changes products, then views email — Banner warns "Products changed since this was generated" with option to regenerate
- AI generation fails mid-deliverable — The specific section shows an error with retry button; other sections are unaffected
- Store has no Brand DNA — Email and assets use neutral/generic branding with a prompt to complete Brand DNA setup
- Campaign has only 1 product — Templates adapt layout (no grid, single product hero)
- User navigates away during generation — Generation continues in background; result appears when user returns

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Campaign creation MUST generate only concept (slogan + description) and product selection. All other sections MUST remain in "not generated" state.
- **FR-002**: Users MUST be able to curate the product selection: add products from the full catalog, remove products, and reorder products.
- **FR-003**: The curated product list MUST persist and be used as input for all subsequent deliverable generations.
- **FR-004**: Each deliverable section MUST be independently generable via an on-demand "Generate" button.
- **FR-005**: The email deliverable MUST produce a complete HTML template with store branding, product images, prices, campaign slogan, and a call-to-action.
- **FR-006**: The email HTML MUST be copyable to clipboard in a single click.
- **FR-007**: Visual assets MUST produce actual images (not CSS placeholders) in the 4 required formats and aspect ratios.
- **FR-008**: Assets MUST be downloadable as image files.
- **FR-009**: Video scripts MUST reference curated products by name and include product-specific scene descriptions.
- **FR-010**: If the concept or product list changes after a deliverable is generated, the system MUST show a "stale" indicator on affected sections.
- **FR-011**: Deliverable generation failures MUST be isolated — a failure in one section MUST NOT affect other sections.
- **FR-012**: The system MUST show generation progress (loading state) for each section independently.

### Key Entities

- **Campaign**: Extended with a generation status per deliverable section (not_generated, generating, generated, stale) instead of a monolithic status
- **CuratedProductList**: User's curated selection of products for the campaign, separate from the AI's initial suggestion
- **EmailTemplate**: HTML template with rendered preview, copyable source, and metadata (subject, preview text)
- **VisualAsset**: Generated image with format metadata (ratio, resolution, intended platform)
- **DeliverableSection**: Each campaign section with its own generation lifecycle (status, content, generated_at)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Initial campaign creation (concept + products only) completes in under 25 seconds, down from 60+ seconds for full generation.
- **SC-002**: 100% of generated email templates render correctly in a visual preview within the artifact panel.
- **SC-003**: Users can curate products (add/remove) in under 30 seconds for a typical selection of 5-10 products.
- **SC-004**: Each individual deliverable section generates in under 20 seconds.
- **SC-005**: Generated visual assets are actual image files downloadable in correct aspect ratios.
- **SC-006**: Users can copy email HTML to clipboard and paste into an external email platform without manual editing.

## Assumptions

- Brand DNA (colors, tone, audience) is available for the store — used for email branding and asset generation.
- Product images from Nuvemshop are of sufficient quality for use in email templates and visual assets.
- The full product catalog (up to 200 products) is available for the curation picker via the existing ProductAnalyzer.
- Email HTML templates follow responsive best practices for major email clients (Gmail, Outlook, Apple Mail).
- AI image generation for assets is available through an external service.
