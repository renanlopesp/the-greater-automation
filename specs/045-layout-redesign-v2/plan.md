# Implementation Plan: Home Page Layout Redesign V2

**Branch**: `feat/layout-redesign-v2` | **Date**: 2026-03-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/045-layout-redesign-v2/spec.md`

## Summary

Replace the current Home/Dashboard page with a new chat-first design matching the snew-ai-core prototype pixel-for-pixel. The implementation creates a design system config with 5 gradient families, a rotating hero title, a redesigned activity feed (3 horizontal cards), and a skill actions grid (12 gradient cards with filter tabs). All data is mock (hardcoded arrays). Sidebar and header receive minor adjustments (Tarefas nav item, BubbleAvatar orbs, credits section, simplified header).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19.2.3, Tailwind CSS v4, framer-motion 12.33+, lucide-react
**Storage**: N/A (all mock data — hardcoded TypeScript arrays)
**Testing**: Visual comparison with prototype via Playwright screenshots
**Target Platform**: Web (desktop-first, 1440px+ viewport)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: N/A (static mock content)
**Constraints**: Pixel-perfect match with prototype at `localhost:8080`
**Scale/Scope**: 1 page (Home), 4 new components, 7 modified components, 1 new config file

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                            | Status                      | Notes                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Next.js App Router First          | **PASS**                    | All components in `src/app/(dashboard)/` and `src/components/`. Server Components by default; `"use client"` only for interactive parts (chat input, filter tabs, rotating title).                                                                                                                                                |
| II. shadcn/ui Component System       | **PASS with justification** | Custom gradient cards and BubbleAvatar cannot be built from shadcn primitives — they are design-system-specific visual elements. All structural UI (buttons, tooltips, dropdowns) continues to use shadcn.                                                                                                                        |
| III. Tailwind CSS v4 + OKLCH Theming | **PASS with justification** | Gradient hex values (`#D0D8CC`, `#E4ECD8`, etc.) are design system tokens defined in a single config file (`src/config/design-system.ts`), not scattered inline. These are visual decoration gradients that don't map to semantic theme tokens. Layout/text colors use existing CSS variables (`--foreground`, `--border`, etc.). |
| IV. TypeScript Strict Mode           | **PASS**                    | All types defined: `ActionCard`, `FilterTab`, `AutonomousCard`, `BrandGradientKey`.                                                                                                                                                                                                                                               |
| V. Simplicity and YAGNI              | **PASS**                    | Mock data only. No API routes, no state management beyond `useState`. No abstractions beyond what the UI requires.                                                                                                                                                                                                                |
| VI. Supabase as Backend              | **N/A**                     | No backend calls — all mock data.                                                                                                                                                                                                                                                                                                 |

## Project Structure

### Documentation (this feature)

```text
specs/045-layout-redesign-v2/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal — mock data)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── components.md    # Component interface contracts
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── config/
│   └── design-system.ts          # NEW: BRAND tokens, gradients, BubbleAvatar, SVGFilters
├── app/
│   └── (dashboard)/
│       ├── layout.tsx             # MODIFY: inject SVGFilters
│       └── dashboard/
│           └── page.tsx           # MODIFY: new layout structure
├── components/
│   ├── home/
│   │   ├── hero-rotating-title.tsx  # NEW: animated headline
│   │   ├── activity-cards.tsx       # NEW: 3 horizontal cards
│   │   ├── skill-actions-grid.tsx   # NEW: filter tabs + gradient grid
│   │   ├── ask-bar-new.tsx          # MODIFY: 680px, shadow, border
│   │   └── quick-suggestions.tsx    # MODIFY: chip style updates
│   └── layout/
│       ├── app-sidebar-new.tsx      # MODIFY: Tarefas nav, orb icons, credits
│       ├── sidebar-skill-pills.tsx  # MODIFY: BubbleAvatar orbs
│       └── top-bar.tsx              # MODIFY: simplify to bell + avatar
└── dashboard-shell-new.tsx          # MODIFY: inject SVGFilters once
```

## Architecture

### Component Hierarchy

```
DashboardShellNew
├── SVGFilters (injected once)
├── AppSidebarNew
│   ├── Logo ("S" / "Snew")
│   ├── Nav: Home | New Chat | Skills | Tarefas | Apps
│   ├── SidebarSkillPills (BubbleAvatar orbs)
│   └── Credits section + Settings
├── TopBar (simplified: bell + avatar)
└── <main>
    └── DashboardPage
        └── Centered column (maxWidth 880px, gap 64px)
            ├── HeroRotatingTitle
            ├── AskBarNew (680px, shadow)
            ├── QuickSuggestions (chips)
            ├── Divider
            ├── ActivityCards (3 horizontal cards)
            ├── Divider
            └── SkillActionsGrid
                ├── FilterTabs (All/Campaigns/Content/Analytics/Retention)
                ├── 3-col gradient cards grid (12 cards)
                └── Footer count text
```

### Data Flow

```
Mock data (hardcoded arrays in each component)
  ↓
Components render statically
  ↓
User interactions:
  - Chat input → router.push('/chat?q=...')
  - Suggestion chip → router.push('/chat?q=...')
  - Activity card → router.push(card.route)
  - Skill card → router.push(card.route)
  - Filter tab → useState filtering (client-side)
  - Hero title → useEffect interval cycling
```

### Design System Integration

The `src/config/design-system.ts` file is the single source of truth for all gradient/color tokens:

```
getGradient(skillName) → { card, bubble, ink, seed }
  ↓ used by:
  - SkillActionsGrid (card backgrounds, text colors)
  - SidebarSkillPills (BubbleAvatar orbs)
  - ActivityCards (future: skill-specific styling)
```

## Phases

### Phase 1: Design System & Foundation

1. Create `src/config/design-system.ts` (BRAND tokens, gradient families, getGradient, BubbleAvatar, SVGFilters)
2. Inject SVGFilters in dashboard shell/layout
3. Add `@keyframes snew-float` to globals.css

### Phase 2: Home Page Core

4. Create `HeroRotatingTitle` component (framer-motion AnimatePresence)
5. Update `AskBarNew` (680px, shadow, border specs)
6. Update `QuickSuggestions` (13px, pill padding)
7. Update `DashboardPage` layout (880px, gap 64px, dividers)

### Phase 3: Activity & Skills Sections

8. Create `ActivityCards` component (3 horizontal cards)
9. Create `SkillActionsGrid` component (filter tabs + gradient grid)

### Phase 4: Sidebar & Header

10. Update `AppSidebarNew` (Tarefas nav, orb icons, credits)
11. Update `SidebarSkillPills` (BubbleAvatar orbs)
12. Update `TopBar` (simplify to bell + avatar)

### Phase 5: Visual QA

13. Compare with prototype screenshots pixel-by-pixel
14. Fix any discrepancies in spacing, colors, typography

## Risks & Mitigations

| Risk                                                 | Impact | Mitigation                                                                            |
| ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| Gradient hex values don't match existing OKLCH theme | Low    | Gradients are decorative, not semantic — justified in constitution check              |
| SVG filters cause performance issues                 | Low    | Filters only affect small orb elements (20-44px), not full page                       |
| framer-motion bundle size                            | Low    | Already installed (v12.33+), tree-shaking handles unused exports                      |
| Prototype uses inline styles, relay uses Tailwind    | Medium | Use Tailwind for layout/spacing, inline `style={{}}` only for dynamic gradient values |
