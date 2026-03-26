# Feature Specification: Assets Drawer Redesign

**Feature Branch**: `041-assets-drawer-redesign`
**Created**: 2026-03-26
**Status**: Draft
**Input**: User description: "Assets Drawer redesign for brand-dna onboarding screen. 3 tabs: Imagens (product images grid with labels), Fontes (font previews + color palette swatches), Textos (slogan, bio Instagram, email signature). Data comes from Nuvemshop API (product images), Firecrawl visual analysis (fonts, key texts), and brand DNA (colors). Drawer is opened from Card2 'ver assets' link in the brand-dna carousel."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Product Images in Assets Drawer (Priority: P1)

During onboarding, after Snew analyzes the store, the user taps "ver assets" on the Brand Identity card. The drawer opens showing the **Imagens** tab with a grid of product images from their store. Each image has the product name and a category label (Produto, Banner, Lifestyle, etc.). This gives the user confidence that Snew actually understands their catalog.

**Why this priority**: Product images are the most visually impactful tab and the first thing users see when opening the drawer. It validates that the system connected to their store correctly.

**Independent Test**: Can be tested by opening the drawer on the brand-dna screen and verifying product images load in a grid with correct labels.

**Acceptance Scenarios**:

1. **Given** the user is on the brand-dna carousel Card 2, **When** they tap "ver assets", **Then** the drawer opens on the Imagens tab showing a grid of product images from their store.
2. **Given** the store has products with images, **When** the Imagens tab is active, **Then** each image shows the product name as filename and a category label (e.g., "Produto").
3. **Given** a product has no image, **When** the Imagens tab renders, **Then** a placeholder is shown with an image icon (not a broken image).
4. **Given** the store has more than 6 products, **When** the Imagens tab loads, **Then** only the first 6 images are shown (curated selection).

---

### User Story 2 - View Fonts and Color Palette (Priority: P2)

The user switches to the **Fontes** tab and sees the typography used on their store (heading font and body font) with "Aa Bb Cc" previews, plus the color palette swatches extracted from their store's visual identity.

**Why this priority**: Fonts and colors are the core brand identity elements. Showing real fonts and colors proves Snew deeply analyzed the store's visual identity, not just the catalog.

**Independent Test**: Can be tested by switching to the Fontes tab and verifying font previews render with correct font names and usage labels, and color swatches match the brand DNA palette.

**Acceptance Scenarios**:

1. **Given** the drawer is open, **When** the user switches to the Fontes tab, **Then** they see font preview cards with "Aa Bb Cc" sample text, font name, and usage label (e.g., "Titulos e headings", "Corpo e UI").
2. **Given** the visual analysis extracted fonts, **When** the Fontes tab is active, **Then** the font names shown are the real fonts detected from the store.
3. **Given** visual analysis is unavailable, **When** the Fontes tab loads, **Then** fallback fonts are shown (e.g., system default fonts with a note).
4. **Given** the brand DNA has a color palette, **When** the Fontes tab is active, **Then** a "Paleta de cores" section shows the color swatches at the bottom.

---

### User Story 3 - View Brand Text Snippets (Priority: P3)

The user switches to the **Textos** tab and sees key brand text snippets extracted from the store: slogan, Instagram bio, and email signature. Each is displayed in a card with a label.

**Why this priority**: Text snippets round out the brand identity picture. They show Snew understands the store's voice, not just visuals. This is lower priority because it depends on text extraction which may not always succeed.

**Independent Test**: Can be tested by switching to the Textos tab and verifying text cards render with correct labels and content.

**Acceptance Scenarios**:

1. **Given** the drawer is open, **When** the user switches to the Textos tab, **Then** they see cards with brand text snippets labeled as "SLOGAN", "BIO INSTAGRAM", "ASSINATURA E-MAIL".
2. **Given** some text snippets are unavailable, **When** the Textos tab loads, **Then** only the available snippets are shown (no empty cards).
3. **Given** no text snippets were extracted, **When** the Textos tab loads, **Then** a message indicates text analysis is not yet available.

---

### Edge Cases

- What happens when the store has no product images? Show empty state with message.
- What happens when Firecrawl/visual analysis fails completely? Fonts tab shows fallback fonts, Textos tab shows unavailable message, Imagens tab still works from product data.
- What happens when the user's internet is slow? Images should lazy-load with placeholder states.
- What happens when the drawer is opened before brand DNA analysis completes? Show loading skeletons.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display 3 tabs in the drawer: Imagens (with image icon), Fontes (with type icon), Textos (with text icon).
- **FR-002**: Imagens tab MUST show a 3-column grid of product images with product name and category label below each image.
- **FR-003**: System MUST fetch product images from the store's product catalog (up to 6 curated images).
- **FR-004**: Fontes tab MUST show font preview cards with "Aa Bb Cc" sample text, font name, and usage description.
- **FR-005**: Fontes tab MUST show the color palette swatches in a "Paleta de cores" section below the font previews.
- **FR-006**: Textos tab MUST show extracted brand text snippets (slogan, Instagram bio, email signature) in labeled cards.
- **FR-007**: System MUST gracefully handle missing data for any tab (show fallback states, not errors).
- **FR-008**: The drawer header MUST show "Assets da [Store Name]" with subtitle "Extraidos do site e Instagram".
- **FR-009**: The visual analysis pipeline MUST be expanded to extract fonts and key text snippets from the store's website.
- **FR-010**: Font and text data MUST be persisted in the brand DNA record for future access.

### Key Entities

- **Product Image**: Product name, image URL, category label (Produto, Banner, Colecao, Lifestyle). Sourced from store product catalog.
- **Brand Font**: Font name, usage (headings/body/UI), sample text. Extracted via visual analysis of the store website.
- **Brand Text**: Type (slogan, bio, signature), content. Extracted via visual analysis of the store website.
- **Color Palette**: Array of hex colors with labels. Already exists in brand DNA from visual analysis.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users see real product images from their store within 2 seconds of opening the drawer.
- **SC-002**: At least 2 of the 3 tabs show real store data (not fallbacks) for stores with complete integration.
- **SC-003**: The drawer correctly displays brand colors that match the store's actual visual identity.
- **SC-004**: Users can view all 3 tabs without errors, even when some data is unavailable.
- **SC-005**: The visual analysis step completes within 30 seconds (screenshot + font/text extraction).

## Assumptions

- Product images are available via the Nuvemshop API product endpoint (already confirmed working).
- Font extraction requires analyzing the store's HTML/CSS via Firecrawl scrape (markdown + screenshot).
- Text snippets (slogan, bio, signature) are extracted via GPT vision analysis of the store's homepage and social links.
- The existing `store-visual-analyzer.ts` will be expanded to extract fonts and texts in addition to colors.
- The brand_dna table will need new columns for fonts and texts data (jsonb fields).
- Instagram bio extraction depends on the store having an Instagram link in their Nuvemshop profile.
