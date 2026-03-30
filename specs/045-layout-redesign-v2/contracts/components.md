# Component Contracts: Home Page Layout Redesign V2

## New Components

### `src/config/design-system.ts`

```ts
// Exports
export const BRAND: {
  gradients: Record<BrandGradientKey, GradientFamily>
  categoryGradient: Record<string, BrandGradientKey>
  white: string
  surface: string
  border: string
  borderHov: string
  ink: string
  inkMuted: string
  inkDim: string
}

export type BrandGradientKey = 'sageHaze' | 'duskRose' | 'aurora' | 'mist' | 'blueDusk'

export function getGradient(skillName: string): GradientFamily
export function BubbleAvatar(props: {
  skillName: string
  size?: number
  animated?: boolean
}): JSX.Element
export function SVGFilters(): JSX.Element
```

### `src/components/home/hero-rotating-title.tsx`

```ts
// "use client" — needs useEffect for interval, framer-motion for animation
// No props — self-contained with hardcoded HEADLINES array
export default function HeroRotatingTitle(): JSX.Element
```

**Behavior**: Cycles through 5 headlines every 5 seconds with opacity cross-fade. Starts at random index. Container has `minHeight: 30px` to prevent layout shift.

### `src/components/home/activity-cards.tsx`

```ts
// Server Component — static mock data, no interactivity
// No props — self-contained with hardcoded AUTONOMOUS_CARDS array
export default function ActivityCards(): JSX.Element
```

**Renders**: Section title "O que o Snew fez pela sua loja" + 3-column grid of clickable cards.

### `src/components/home/skill-actions-grid.tsx`

```ts
// "use client" — needs useState for filter tab selection, framer-motion for card animations
// No props — self-contained with hardcoded CARDS and FILTER_TABS arrays
export default function SkillActionsGrid(): JSX.Element
```

**Behavior**: Filter tabs filter cards client-side. Cards animate in/out with `AnimatePresence mode="popLayout"`. Footer shows filtered count.

## Modified Components

### `src/app/(dashboard)/dashboard/page.tsx`

```ts
// Server Component
// Changes: maxWidth 720px → 880px, gap 12 → 64px, padding update
// Sections: HeroRotatingTitle + AskBarNew + QuickSuggestions | Divider | ActivityCards | Divider | SkillActionsGrid
export default function DashboardPage(): JSX.Element
```

### `src/components/home/ask-bar-new.tsx`

```ts
// Changes to wrapper div:
//   - Remove border-color transparent override
//   - Add: borderRadius 16px, boxShadow, maxWidth 680px
//   - Focus state: darker border + stronger shadow
// Textarea remains same behavior (send on Enter, navigate to /chat?q=)
```

### `src/components/home/quick-suggestions.tsx`

```ts
// Changes:
//   - fontSize: 12 → 13
//   - padding: px-3.5 py-1.5 → padding 6px 16px
//   - color: text-muted-foreground → #6B6760
//   - border: border-border → 1px solid #E5E3DC
//   - Layout: mt-4 flex-wrap → flex-wrap justify-center gap-2
```

### `src/components/layout/app-sidebar-new.tsx`

```ts
// Changes:
//   - Nav items: replace History with Tarefas (ClipboardList icon)
//   - Move Apps to position 5
//   - SidebarSkillPills: replace emoji with BubbleAvatar orbs
//   - Add credits section at bottom
```

### `src/components/layout/top-bar.tsx`

```ts
// Changes:
//   - Remove: Feedback button, Support button, Folder icon, theme toggle
//   - Keep: Bell notification (add red dot 6x6px), User avatar (28px, blue bg)
//   - Remove: border-b class
```
