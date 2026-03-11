# Research: Layout Redesign & Full Page Conversion

**Date**: 2026-03-10
**Branch**: `031-layout-redesign`

## R1: Color System Migration (HSL → OKLCH)

**Decision**: Convert the Vite prototype's HSL color variables to OKLCH to match the relay project's existing theming convention.

**Rationale**: The relay constitution mandates OKLCH color space (`globals.css`). The Vite prototype uses HSL. Since both are CSS variable-based, the conversion is a one-time mapping during theme variable setup. OKLCH provides better perceptual uniformity, which is the reason the relay project adopted it.

**Alternatives considered**:

- Keep HSL alongside OKLCH: Rejected — violates constitution principle III, creates dual color systems.
- Use hex/rgb values: Rejected — explicitly forbidden by constitution.

## R2: i18n Implementation Approach

**Decision**: Implement i18n as a React Context provider (`LanguageContext`) matching the Vite prototype pattern, stored in `src/contexts/language-context.tsx`.

**Rationale**: The Vite prototype already has a working LanguageContext with 100+ translation keys for EN and PT-BR. This is the simplest approach (constitution principle V — YAGNI). No third-party i18n library needed for 2 languages with ~100 keys. The context will be a client component (`"use client"`) since it requires localStorage and state.

**Alternatives considered**:

- next-intl or next-i18next: Rejected — over-engineered for 2 languages, adds dependency, requires complex routing.
- Server-side i18n with cookies: Rejected — adds complexity for no benefit, language switching should be instant.

## R3: Sidebar Implementation Strategy

**Decision**: Replace the existing `AppSidebar` (Radix SidebarProvider-based) with a new lightweight custom sidebar matching the Vite prototype design (56px/240px, 5 nav items, localStorage persistence).

**Rationale**: The current relay sidebar uses Radix SidebarProvider with complex team switcher, usage bars, and 7+ nav items. The prototype has a fundamentally different design (simpler, icon-based, 5 items). Adapting the existing component would require more effort than building new, and the result would be harder to maintain.

**Alternatives considered**:

- Adapt existing AppSidebar: Rejected — too much divergence in structure, nav items, and behavior.
- Use Radix SidebarProvider with new design: Possible but adds unnecessary abstraction for a simple collapse/expand toggle.

## R4: Data Strategy — Static vs. Dynamic

**Decision**: Use static/mock data files (ported from Vite prototype) initially for all new page sections. Existing dynamic data fetching (agents from Supabase, conversations, etc.) should be preserved where the data shapes align.

**Rationale**: The prototype uses fully static data (27 agents, 25 coworkers, mock notifications, etc.). Converting all to Supabase queries in this feature would vastly expand scope. The spec explicitly states "use static/mock data initially where real backend data is not yet available" (FR-016). Real data integration can be a follow-up feature per spec assumptions.

**Alternatives considered**:

- Full Supabase integration: Rejected — scope explosion, different feature.
- Hybrid from day one: Partially acceptable — use real agent data from existing queries where available, mock for new sections (metrics, opportunities, notifications content).

## R5: Layout Architecture — DashboardShell Replacement

**Decision**: Replace `DashboardShell` internals (sidebar, top bar) while keeping the route group structure `(dashboard)/layout.tsx` and server-side data fetching pattern.

**Rationale**: The `(dashboard)/layout.tsx` server component that fetches user, profile, teams data is valuable infrastructure. Only the client-side shell (sidebar + top bar rendering) needs to change. The route group pattern and Supabase auth checks must be preserved (FR-015).

**Alternatives considered**:

- Replace entire layout stack: Rejected — would break auth, data fetching, and middleware.
- Add new layout group: Rejected — parallel layouts create confusion and maintenance burden.

## R6: Page Component Strategy

**Decision**: Create new client components for each page that match the Vite prototype design, placed alongside or replacing existing page components. Use `"use client"` only for interactive sections; keep page-level server components where possible.

**Rationale**: Constitution principle I mandates Server Components as default. For pages like Home (complex interactivity, scenario switcher, animations) the main content will be a client component. For simpler pages like History or Notifications, the page can be a server component rendering client sub-components.

**Alternatives considered**:

- All pages as client components: Rejected — violates constitution principle I.
- Full server component approach: Not practical — most pages have significant interactivity.

## R7: Existing Page Preservation

**Decision**: Existing page implementations at conflicting routes will be replaced, not maintained in parallel. Old components that are no longer used will be removed.

**Rationale**: The spec explicitly states "they need to be REPLACED with the new design, not added alongside." Maintaining both old and new creates confusion. However, existing API routes, server actions, and hooks should be preserved — they may be reused.

**Alternatives considered**:

- Feature flag toggling: Rejected — over-engineering per constitution principle V.
- Gradual migration (page by page): This IS the approach — each user story is a page that can be migrated independently.

## R8: TopBar Component Approach

**Decision**: Create a new `TopBar` client component in `src/components/top-bar.tsx` matching the Vite prototype (48px height, action buttons, notifications, avatar dropdown, language switcher).

**Rationale**: The current relay project doesn't have an explicit TopBar — the sidebar header area handles some of these functions. The Vite prototype has a distinct top bar with different functionality (Feedback, Documentos, Perguntar buttons, language switcher). This is new UI surface that doesn't exist in the current codebase.

**Alternatives considered**:

- Embed in sidebar: Rejected — prototype clearly shows separate top bar above main content.
- Extend existing header: No existing header component to extend.

## R9: Agent Data File Structure

**Decision**: Port the `agents.ts` and `coworkers.ts` data files from the Vite prototype to `src/data/` in the relay project, adapting TypeScript types to strict mode.

**Rationale**: These static data files define the 27 agents and their metadata. They serve as the data source until Supabase integration. The data shapes are well-defined in the prototype and can be typed strictly.

**Alternatives considered**:

- Inline data in components: Rejected — creates duplication across pages.
- Fetch from Supabase immediately: Rejected — scope creep per R4 decision.

## R10: CSS Animations (Conic Gradient)

**Decision**: Port the conic-gradient animation from the Vite prototype's `index.css` to `globals.css`, converting from HSL to OKLCH color space and using `@property` for CSS custom property animation.

**Rationale**: The animated border on the "live" metric card is a key visual element of the home page. The CSS animation is pure CSS (no JS library needed), aligns with constitution principle V (simplest solution), and is already implemented in the prototype.

**Alternatives considered**:

- framer-motion animation: Rejected — adds dependency for a single CSS animation.
- Remove animation: Rejected — key visual indicator in the prototype design.
