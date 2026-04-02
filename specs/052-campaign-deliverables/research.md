# Research: Campaign Deliverables

## Email HTML Generation

**Decision**: AI generates inline-CSS HTML email directly via `generateObject` with a string schema for the HTML body.

**Rationale**: Email clients (Gmail, Outlook, Apple Mail) handle CSS differently. Inline CSS is the safest approach. The AI can produce responsive HTML with:

- Inline styles on every element (Outlook compatibility)
- `<style>` block with media queries (Gmail/Apple Mail responsive support)
- Table-based layout (maximum compatibility)
- Product images as `<img>` with fallback alt text

**Alternatives considered**:

- MJML → Adds build dependency, requires transpilation step, limits AI creativity
- React Email → Build-time rendering, not suitable for dynamic AI generation
- Handlebars templates → Too rigid, can't adapt to varying product counts

**Best practices**:

- Max width 600px for desktop, fluid on mobile
- All images have explicit width/height to prevent layout shift
- Preheader text hidden but visible in inbox preview
- Unsubscribe link placeholder at bottom

## Visual Asset Generation

**Decision**: Use OpenAI image generation (gpt-image-1 or dall-e-3) for campaign visuals. Product photos composited via prompt engineering (describe the product, reference the brand aesthetic).

**Rationale**: Real marketing assets need to look professional. AI image generation can create branded backgrounds with campaign themes. Product images from the store are passed as context in the prompt.

**Alternatives considered**:

- Server-side Canvas/Sharp composition → Limited to basic overlays, no creative styling
- Canva API → External dependency, paid, API limitations
- Template-based SVG → Rigid layouts, poor visual quality

**Constraints**:

- Image generation takes 10-30s per image
- 4 assets per campaign = 40-120s if sequential, ~30s if parallelized
- Generated images stored in Supabase Storage (existing bucket pattern)

## Product Curation UX

**Decision**: Inline editing within the artifact panel — the products section becomes an editable list with toggle checkboxes.

**Rationale**: The user is already looking at the campaign in the artifact panel. No need to navigate away. A simple "Edit" button toggles the product list into edit mode with:

- Checked = included in campaign
- Unchecked = available but not included
- Search/filter for large catalogs
- Drag to reorder (optional, P3)

**Alternatives considered**:

- Full-screen modal → Too disruptive for a quick toggle operation
- Separate page → Breaks context, user loses sight of the campaign
- Sidebar drawer → Artifact panel already IS the sidebar

## Per-Section Generation Status

**Decision**: Extend `artifact_data` JSONB with a `deliverables` object that tracks each section's status independently.

**Structure**:

```json
{
  "concept": { "slogan": "...", "description": "..." },
  "curatedProducts": [...],
  "deliverables": {
    "copies": { "status": "generated", "generated_at": "...", "data": [...] },
    "email": { "status": "not_generated" },
    "assets": { "status": "generating" },
    "video": { "status": "not_generated" },
    "timeline": { "status": "stale", "generated_at": "...", "data": [...] }
  }
}
```

**Status transitions**: `not_generated` → `generating` → `generated` → `stale` (when concept/products change)

No new DB tables needed — everything fits in the existing `tasks.artifact_data` JSONB column.
