# Research: New Layout + Onboarding Flow

## R1: Layout Architecture — Replace vs Extend Current Layout

**Decision**: Replace the current dashboard layout entirely. The new layout (icon sidebar + topbar) is fundamentally different from the existing sidebar layout.

**Rationale**: The current layout uses an expanded sidebar with text labels and a different navigation structure (agents-focused). The prototype uses icon-only sidebar (56px/240px toggle) with completely different nav items. Extending would create more complexity than replacing.

**Alternatives considered**:

- Extend current layout with collapse mode → rejected, too many structural differences (footer skills, topbar, nav items)
- Keep old layout as fallback → rejected, maintaining two layouts adds complexity for no benefit

## R2: Prototype Translation — Vite+React Router → Next.js App Router

**Decision**: Port the visual design from the prototype but rewrite using Next.js App Router patterns (Server Components, route groups, layouts).

**Rationale**: The prototype is Vite + React Router (SPA). Relay is Next.js App Router (SSR/SSG). Direct code copy won't work — need to translate routing patterns, data fetching, and component architecture. Use the prototype as a visual spec, not a code source.

**Key translations**:

- React Router `<Route>` → Next.js `src/app/(group)/page.tsx`
- `useState` for routing state → URL params + searchParams
- Client-side data → Server Components with async data fetching
- Context providers → Server-side data passing + client providers only when needed

## R3: Onboarding Flow — Route Structure

**Decision**: Onboarding pages live under `src/app/(onboarding)/onboarding/` route group with its own layout (no sidebar/topbar). Regular pages stay under `src/app/(dashboard)/`.

**Rationale**: The prototype shows onboarding as fullscreen (no sidebar). Using a separate route group with a minimal layout achieves this cleanly in Next.js App Router. The `(onboarding)` group gets a layout with just a centered container — no sidebar, no topbar.

## R4: Skill Categories — PT-BR Mapping

**Decision**: The skill registry keeps English category slugs in the database (`campaign`, `retention`, etc.) but adds a PT-BR label mapping for the UI.

**Rationale**: DB schema should be language-agnostic. The PT-BR labels ("Marketing & Campanhas", "Retenção & Churn") are a display concern. The mapping lives in the skill registry code alongside `skillCategoryLabels`.

**New PT-BR categories (from prototype)**:
| DB category | PT-BR label | Count |
|------------|-------------|-------|
| campaign | Marketing & Campanhas | 7 |
| retention | Retenção & Churn | 3 |
| analytics | Analytics & Inteligência | 6 |
| ads | Ads & Performance | 4 |
| operations | Visibilidade & IA | 6 |
| scale | Atendimento & Experiência | 3 |
| content | Redes Sociais | 4 |
| foundation | Produto & Catálogo | 3 |
| cart | Carrinho & Conversão | 4 |

Note: Some categories need expansion. The prototype has 10 categories vs our current 8. We need to add `cart` and split `operations` further.

## R5: Skill Data Expansion — 31 → 38 Skills

**Decision**: Add 7 new skills to the registry to match the prototype's 38 skills. These are skills present in the prototype but missing from our current registry.

**New skills to add**: Email Sequencer, SMS Scheduler, Hashtag Generator, Influencer Finder, Upsell Recommender, Checkout Optimizer, Segment Builder.

## R6: Brand DNA Page — Conversational Format

**Decision**: The Brand DNA page is implemented as a static conversational page (not a real chat). The content is structured sections that look like a conversation with Snew, but are rendered as pre-built components with mock data.

**Rationale**: In this feature, Brand DNA is visual-only. The real analysis (scraping, catalog analysis) comes in Fase 1 CMO. Building it as static sections allows us to nail the visual design now and swap in real data later without changing the UI structure.

## R7: Activity Feed — Data Source

**Decision**: The activity feed on the home page reads from `skill_executions` table for running/completed items, and from a new lightweight `activity_items` concept for actionable items (briefings to approve, campaigns without action).

**Rationale**: Skill executions already track running/completed states. Actionable items (approve briefing, generate campaign) are a new concept that will be fully implemented in Fase 1. For now, we show mock activity items alongside real skill execution data.
