# Research: Copy Platform Preview

## R1: Platform Mockup Design Patterns

**Decision**: Use simple CSS-based mockups with Tailwind classes, not a mockup library.

**Rationale**: Platform preview mockups in marketing tools (Buffer, Hootsuite, Later) use lightweight CSS to approximate platform UIs. A full-fidelity replica isn't needed — users just need to "feel" the platform. CSS-only approach means zero bundle size impact and instant rendering.

**Alternatives considered**:

- Screenshot-based mockups: Requires external service, adds latency
- Third-party mockup library: Adds bundle size for a simple use case
- iframe embedding: CORS issues, overkill

## R2: WhatsApp Chat Bubble Design

**Decision**: Green bubble (#dcf8c6) with rounded corners, right-aligned, timestamp in bottom-right, double blue checkmarks. Header shows store name with WhatsApp green (#25D366) accent.

**Reference**: WhatsApp Web message layout — outgoing message style (right side, green background).

## R3: Instagram Post Preview Design

**Decision**: White card with profile header (circle avatar + name), image placeholder (gray area with camera icon), action icons row (heart, comment, share, bookmark), then caption text. Hashtags rendered in accent color.

**Reference**: Instagram app post layout. Simplified — no story ring, no follower count.

## R4: Meta Ad Card Design

**Decision**: White card with profile header (avatar + name + "Patrocinado" sublabel), ad text, then gray CTA bar at bottom with "Saiba Mais" button.

**Reference**: Facebook/Instagram feed ad format. The "Patrocinado" label in gray below the name is the key visual cue.

## R5: SMS Bubble Design

**Decision**: Gray bubble (#e5e5ea) left-aligned, rounded corners, simple phone-style timestamp above. Minimal design — just the bubble and text.

**Reference**: iOS Messages incoming message style.
