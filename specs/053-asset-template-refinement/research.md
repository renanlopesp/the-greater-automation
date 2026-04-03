# Research: Asset Template Refinement

## R1: Batch AI Text Generation for Multiple Products

**Decision**: Use a single `generateObject` call per format that returns an array of text content (one entry per product), rather than one call per product.

**Rationale**: With 10 products x 4 formats, individual calls would mean 40 AI requests (~2-3 seconds each = 80-120 seconds). Batching to 4 calls (one per format) with an array schema keeps total generation under 30 seconds.

**Alternatives considered**:

- Single call for ALL formats + products: Too much for one schema, risk of truncation/hallucination.
- Per-product calls: Too slow (40+ calls).

**Implementation**: The Zod schema changes from `z.array(AssetTemplateSchema).length(4)` to a per-format call with `z.array(AssetTemplateSchema).length(N)` where N = number of products with images.

---

## R2: html2canvas Download Dimension Fix

**Decision**: When creating the offscreen container for html2canvas capture, explicitly set the container's `width` and `height` to the asset's native pixel dimensions, and ensure `scale: 1` in html2canvas options.

**Rationale**: The current bug occurs because the offscreen container doesn't enforce the exact pixel dimensions of the template. html2canvas captures what it sees in the DOM, so if the container is a different size, the output stretches.

**Alternatives considered**:

- Using `devicePixelRatio` scaling: Adds complexity, produces files 2-4x larger than needed.
- Using a canvas-based renderer instead of html2canvas: Too much effort for this scope.

**Implementation**: Set `container.style.width = '${width}px'` and `container.style.height = '${height}px'` on the offscreen div. Keep `scale: 1` in html2canvas options.

---

## R3: Horizontal Scroll UX Pattern

**Decision**: Use native CSS `overflow-x: auto` with `flex-nowrap` for horizontal scroll rows. No carousel library needed.

**Rationale**: Tailwind's `overflow-x-auto` + `flex-nowrap` provides native touch/scroll support, no JS bundle cost, and works on all devices. A carousel library adds complexity for minimal benefit given the simple one-row layout.

**Alternatives considered**:

- Embla Carousel: Good but adds 8KB bundle for a feature that CSS handles natively.
- CSS scroll-snap: Could add for polish but not required for MVP.

---

## R4: Asset Card Preview Scaling

**Decision**: Use CSS `transform: scale()` to shrink large asset templates (e.g., 1080x1920) into compact card previews, with the card having a fixed height and `overflow: hidden`.

**Rationale**: This is already the pattern used in the current code. It renders the template at native resolution in a scaled-down view, preserving visual fidelity.

**Implementation**: Card width = container width (fits horizontal scroll), card height = fixed per format ratio. Scale factor = cardHeight / nativeHeight.
