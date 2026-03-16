# 034 — Home Header Spacing & Metric Cards Alignment

## Problem Statement

The home dashboard header area (date/time row, greeting heading, and metric cards) currently uses `space-y-16` (64px) uniform spacing between ALL major sections in `home-client-new.tsx`. This creates a disconnected visual hierarchy where the greeting header and metric cards feel like separate, unrelated sections instead of a cohesive header block.

The reference design shows these elements tightly grouped as a single visual unit with minimal internal spacing, while larger gaps separate the header block from the rest of the page content (ask bar, coworkers, opportunities).

## Reference vs Current

### Reference Design (target)

- Date/time row → greeting heading: ~12px gap
- Greeting heading → metric cards: ~32px gap
- Metric cards → next section (ask bar): ~64px gap
- Metric cards: flat, neumorphic/soft style — light gray background (`~#f5f5f5`), subtle border, no conic-border animation, no pulse glow
- First card ("Active agents now") has a simple green dot indicator, not animated pulse
- Card content: label (small muted), value (large bold), subtitle (small muted) — clean and minimal
- All 5 cards same height, evenly distributed in a single row
- Overall feel: calm, informational, dashboard-like

### Current Implementation (problem)

- `space-y-16` (64px) between greeting → metrics → ask bar → all sections — everything equally spaced
- First metric card uses `conic-border` class with animated spinning gradient border + pulsing green dot
- Cards have `bg-background border-border` styling (white background, thin border)
- Two card rendering paths: pulse (conic-border) vs regular (plain border)
- The large uniform gap makes the greeting and metrics feel disconnected

## User Stories

### US-1: Cohesive Header Block

**As a** user viewing the dashboard
**I want** the date, greeting, and metric cards to feel like one header unit
**So that** I can quickly scan the top-level status at a glance

**Acceptance Criteria:**

- Date row and greeting have tight spacing (~12px / `space-y-3`)
- Greeting and metric cards have moderate spacing (~32px / `gap-8`)
- Header block (date + greeting + metrics) is visually separated from rest of page by larger gap (~64px)

### US-2: Simplified Metric Cards

**As a** user viewing metric cards
**I want** a clean, calm card design without animated borders
**So that** the dashboard feels professional and scannable, not distracting

**Acceptance Criteria:**

- Remove `conic-border` animated gradient from first card
- All cards use the same flat style: soft background, subtle border/shadow
- Active indicator is a simple static green dot (no `animate-pulse`)
- Cards have consistent padding and height across all 5

## Scope

### In Scope

1. **Spacing refactor** in `home-client-new.tsx`: Replace uniform `space-y-16` with grouped spacing — tight within header block, larger between page sections
2. **Metric card style** in `metrics-cards.tsx`: Unify card rendering (remove dual pulse/non-pulse paths), apply neumorphic/soft card style to all cards
3. **Remove conic-border dependency** from metric cards (keep the CSS class for potential use elsewhere)

### Out of Scope

- Metric data/labels (those come from database or scenarios — not changing)
- Other home page sections (ask bar, coworkers, opportunities)
- Sidebar, top bar, or layout shell changes
- Mobile responsive breakpoints (preserve existing `grid-cols-2 md:grid-cols-5`)
- i18n or greeting text changes

## Technical Approach

### Files to Modify

1. **`src/components/home/home-client-new.tsx`**
   - Replace `space-y-16` on outer container with explicit spacing
   - Group greeting + metrics into a header `<section>` with `space-y-8` (32px internal)
   - Use `space-y-16` (or `mt-16`) only between major page sections (header → ask bar → coworkers → etc.)

2. **`src/components/home/metrics-cards.tsx`**
   - Remove the conditional `conic-border` / `conic-border-inner` rendering path
   - Single card style for all metrics: soft background, subtle border, rounded-2xl
   - Replace animated pulse dot with static green dot for "active" metrics
   - Keep the `pulse` field in the `Metric` type to control whether the green dot shows (but no animation)

### Proposed Card Style

```tsx
// All cards use the same style:
<div className="bg-muted/50 border-border/50 flex flex-col gap-1 rounded-2xl border p-5">
  <p className="text-muted-foreground text-[11px] font-medium">{label}</p>
  <p className="text-foreground text-2xl font-semibold">{value}</p>
  <p className="text-muted-foreground flex items-center gap-1 text-xs">
    {m.pulse && (
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: 'var(--green)' }}
      />
    )}
    {sub}
  </p>
</div>
```

### Proposed Layout Structure

```tsx
// home-client-new.tsx
<div className="bg-background h-full overflow-y-auto">
  <div className="mx-auto max-w-5xl px-6 py-10">
    {/* Header block — tight internal spacing */}
    <section className="space-y-8">
      <GreetingSectionNew ... />
      <MetricsCards ... />
    </section>

    {/* Page sections — larger gaps */}
    <div className="mt-16">
      <AskBar />
    </div>
    <div className="border-border mt-16 border-t" />
    <div className="mt-16">
      <CoworkerRecommendation />
    </div>
    {/* ... etc */}
  </div>
</div>
```

## Success Criteria

1. Date/greeting/metrics form a visually cohesive header block
2. No animated conic-border on metric cards
3. All 5 metric cards have the same flat/soft style
4. Spacing between header block and rest of page is visually larger than spacing within the header
5. No regressions in mobile layout (2-col grid still works)
6. Active indicator dot is visible but not animated

## Phases

### Phase 1: Spacing Refactor (home-client-new.tsx)

- Replace `space-y-16` with grouped layout
- Wrap greeting + metrics in a `<section>` with `space-y-8`
- Apply `mt-16` between remaining sections

### Phase 2: Metric Card Simplification (metrics-cards.tsx)

- Remove conic-border conditional path
- Apply unified soft card style
- Replace animated pulse with static dot

### Phase 3: Visual Verification

- Compare with reference screenshot
- Verify mobile responsiveness
- Verify dark mode compatibility
