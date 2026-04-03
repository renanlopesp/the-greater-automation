# Feature Specification: Copy Platform Preview

**Feature Branch**: `054-copy-platform-preview`
**Created**: 2026-04-03
**Status**: Draft
**Input**: Redesign the campaign copies section to show platform-specific visual mockups instead of plain text cards. Each copy channel should render as a realistic preview of how the message would look on that platform.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - WhatsApp Message Preview (Priority: P1)

As a store owner viewing campaign copies, I want WhatsApp copies (VIP and Geral) to render as realistic WhatsApp chat bubbles so I can visualize exactly how the message will look when sent to customers.

**Why this priority**: WhatsApp is the primary marketing channel for Brazilian e-commerce. Store owners need to see the exact look-and-feel before sending messages to VIP lists or broadcast groups. This is the most common copy type.

**Independent Test**: Can be tested by generating copies for any campaign and verifying the WhatsApp channels render with green chat bubble styling, timestamp, read checkmarks, and WhatsApp-style header.

**Acceptance Scenarios**:

1. **Given** a campaign with a "WhatsApp VIP" copy, **When** the user views the copies section, **Then** the copy renders as a green chat bubble with the message text, a timestamp (e.g., "10:42"), and double blue checkmarks.
2. **Given** a campaign with a "WhatsApp Geral" copy, **When** the user views the copies section, **Then** the copy renders with the same WhatsApp bubble style, with a header showing the store name.
3. **Given** any WhatsApp copy preview, **When** the user clicks "Copiar", **Then** only the message text is copied (not the visual mockup elements like timestamp or checkmarks).

---

### User Story 2 - Instagram Caption Preview (Priority: P2)

As a store owner viewing campaign copies, I want the Instagram Caption copy to render as an Instagram post preview so I can see how the caption will look beneath a product photo.

**Why this priority**: Instagram is the second most important channel. The preview should show the post structure — profile avatar, like/comment/share icons, and the caption text with hashtags visible.

**Independent Test**: Can be tested by verifying the Instagram copy renders with a post header (avatar + store name), action icons row (heart, comment, share, bookmark), and the caption text below.

**Acceptance Scenarios**:

1. **Given** a campaign with an "Instagram Caption" copy, **When** the user views the copies section, **Then** the copy renders as an Instagram post with a profile header (store name + avatar placeholder), an image placeholder area, action icons (heart, comment, share, bookmark), and the caption text.
2. **Given** an Instagram Caption preview with hashtags, **When** the user views it, **Then** the hashtags appear in a visually distinct style (e.g., colored text) within the caption.
3. **Given** the Instagram Caption preview, **When** the user clicks "Copiar", **Then** only the caption text (including hashtags) is copied.

---

### User Story 3 - Meta Ad Preview (Priority: P2)

As a store owner viewing campaign copies, I want the Meta Ad copy to render as a Facebook/Instagram ad card so I can visualize the sponsored post format before launching the campaign.

**Why this priority**: Meta Ads are a key paid channel. The preview should show the ad format with "Sponsored" label and CTA button to help users understand the ad structure.

**Independent Test**: Can be tested by verifying the Meta Ad copy renders with a "Sponsored" label, store name header, ad text, and a CTA button at the bottom.

**Acceptance Scenarios**:

1. **Given** a campaign with a "Meta Ad" copy, **When** the user views the copies section, **Then** the copy renders as an ad card with: store name header with "Sponsored" sublabel, ad text body, and a "Learn More" or similar CTA button at the bottom.
2. **Given** the Meta Ad preview, **When** the user clicks "Copiar", **Then** only the ad text is copied (not the "Sponsored" label or CTA button text).

---

### User Story 4 - SMS Message Preview (Priority: P3)

As a store owner viewing campaign copies, I want the SMS copy to render as a phone message bubble so I can see how the SMS will look on customers' devices.

**Why this priority**: SMS is a simpler channel but still benefits from realistic preview. A phone-style message bubble provides quick visual context.

**Independent Test**: Can be tested by verifying the SMS copy renders as a gray/blue message bubble similar to iOS Messages or Android style.

**Acceptance Scenarios**:

1. **Given** a campaign with an "SMS" copy, **When** the user views the copies section, **Then** the copy renders as a phone message bubble with the text content, styled as an incoming message.
2. **Given** the SMS preview, **When** the user clicks "Copiar", **Then** only the message text is copied.

---

### Edge Cases

- What happens when the copy text is very long (500+ characters)? The preview should show the full text with appropriate scrolling or expansion within the mockup, without breaking the layout.
- What happens when the copy text contains emojis? Emojis should render correctly within all platform mockups.
- What happens when a copy channel is not one of the known types (WhatsApp, Instagram, Meta Ad, SMS)? It falls back to the current plain card style.
- What happens when the store name is not available for platform headers? A generic placeholder ("Sua Loja") is used.
- What happens on mobile viewport? The platform mockups should be responsive and readable on small screens.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The copies section MUST render each copy as a platform-specific visual mockup based on the channel name.
- **FR-002**: WhatsApp copies MUST display as green chat bubbles with a timestamp, read indicators (double checkmarks), and a header with the store name.
- **FR-003**: Instagram Caption copies MUST display as an Instagram post preview with a profile header (avatar + store name), action icons row, and caption text area.
- **FR-004**: Meta Ad copies MUST display as an ad card with "Patrocinado" (Sponsored) label, store name, ad text, and a CTA button.
- **FR-005**: SMS copies MUST display as a phone-style message bubble.
- **FR-006**: Each mockup MUST retain the existing "Copiar" button that copies only the message text to the clipboard.
- **FR-007**: Each mockup MUST display the channel name and timing badge (e.g., "D-7", "D-0") in a consistent position.
- **FR-008**: The "Copiar" function MUST copy only the raw message text, not any visual mockup elements (timestamps, labels, icons).
- **FR-009**: Unknown or unrecognized channel types MUST fall back to the current plain card layout.
- **FR-010**: All platform mockups MUST support emojis within the message text.
- **FR-011**: All platform mockups MUST be responsive and readable on both desktop and mobile viewports.

### Key Entities

- **Copy Channel**: The platform or delivery method for a campaign copy (WhatsApp VIP, WhatsApp Geral, Instagram Caption, Meta Ad, SMS). Determines which visual mockup template to use.
- **Campaign Copy**: A piece of marketing text for a specific channel, with channel name, timing (days before event), and text content. The underlying data structure remains unchanged — only the visual presentation changes.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can instantly identify which platform each copy is intended for by visual appearance alone, without reading the channel label.
- **SC-002**: All 5 recognized channel types (WhatsApp VIP, WhatsApp Geral, Instagram Caption, Meta Ad, SMS) render with distinct, platform-accurate mockups.
- **SC-003**: The "Copiar" button continues to work on all mockups, copying only raw text with 100% accuracy.
- **SC-004**: Mockups render within 100ms of the copies section loading — no additional network requests required.
- **SC-005**: Platform mockups are visually recognizable as the target platform to at least 90% of users familiar with those platforms.

## Assumptions

- The copy data structure (`CampaignCopy` with `channel`, `timing`, and `text` fields) remains unchanged — this is a purely visual/UI change.
- Channel names from the AI follow a consistent pattern: "WhatsApp VIP", "WhatsApp Geral", "Instagram Caption", "Meta Ad", "SMS". Channel matching can use string includes/startsWith for robustness.
- The store name for mockup headers can be derived from existing brand data or use a generic fallback.
- No actual integration with social platforms is needed — these are purely visual mockups/previews.
- The mockup designs are approximate representations, not pixel-perfect replicas. The goal is to give users a feel for the format, not an exact copy of each platform's UI.
