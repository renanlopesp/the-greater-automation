# Plan 065 — Implementation Plan

## Technical context

- **Stack**: Next.js 16.1.6 (App Router), React 19.2.3, Tailwind CSS v4, shadcn/ui (new-york), Framer Motion 12.33, Supabase
- **Current state**: Snew has an existing Home/Dashboard at `(dashboard)/dashboard/page.tsx` with a different layout. Existing sidebar at `components/app-sidebar.tsx` + `app-sidebar-new.tsx`. Must replace both.
- **Source of truth**: `/home/renanl/Projects/snew-ai-core/src/pages/SnewStudioHomePage.tsx` (923 lines), `AppSidebar.tsx` (142 lines), `AppLayout.tsx` (89 lines), `designSystem.tsx` (358 lines)

## File map

### New files

```
src/app/(dashboard)/
  layout.tsx                          MODIFY — wrap with new sidebar + SVGFilters
  page.tsx                            MODIFY — become the new Home (replace dashboard subfolder routing)

src/components/snew-home/
  hero-prompt.tsx                     NEW — h1 + textarea + submit ('use client')
  feature-cards.tsx                   NEW — 6 cards row ('use client' for stagger)
  feature-card-icons.tsx              NEW — 6 SVG components (Server)
  templates-section.tsx               NEW — "Comece agora" + scroll + arrows ('use client')
  style-card.tsx                      NEW — dual-layer crossfade with next/image ('use client')
  capabilities-section.tsx            NEW — tabs + grid + "Ver mais" ('use client')
  capability-card.tsx                 NEW — motion.div hover gradient ('use client')
  recents-empty.tsx                   NEW — empty state (Server)

src/components/snew-layout/
  app-sidebar-snew.tsx                NEW — floating sidebar ('use client')
  svg-filters.tsx                     NEW — feTurbulence defs (Server, dangerouslySet)

src/lib/design-system/
  brand-gradients.ts                  NEW — 5 families + helpers (Server)

src/lib/snew-home/
  default-styles.ts                   NEW — 13 style templates hardcoded
  default-capabilities.ts             NEW — 12 capability card generators (buildCapCards(ctx))
  load-store-context.ts               NEW — Supabase query for brand DNA + store

src/app/globals.css                   MODIFY — add @keyframes fadeSlideUp/conic-spin/avatar-breathe/snew-pulse, @property, .hide-scrollbar, @theme font vars

src/app/layout.tsx                    MODIFY — add DM_Serif_Display + IBM_Plex_Mono fonts, apply variables to body

next.config.ts                        UNCHANGED — already has `**.supabase.co` in remotePatterns
```

### Files to delete / deprecate

None in this phase. Old dashboard (`(dashboard)/dashboard/*`) stays accessible under `/dashboard` route if anything still points to it. Only `/` changes.

### Supabase resources

```
Bucket: snew-assets (public, 10MB limit)
Path convention: style-thumbs/{styleId}-{n}.{ext}
  n=0 → primary thumbnail
  n=1..3 → hover slideshow images
```

## Phase breakdown

### Phase 0 — Foundation (blocking)

**Goal**: Plumbing in place before any component work.

- Install fonts (DM Serif Display, IBM Plex Mono) via `next/font/google`
- Add global CSS keyframes + `@property --conic-angle` + `.hide-scrollbar` utility
- Create Supabase bucket `snew-assets`
- Download + upload 52 style thumbnail images from snew-ai-core bucket to Snew bucket
- Create `lib/design-system/brand-gradients.ts`

### Phase 1 — Data layer

- Create `lib/snew-home/default-styles.ts` (13 entries with Supabase URLs)
- Create `lib/snew-home/default-capabilities.ts` (12 entries, `buildCapCards(ctx)`)
- Create `lib/snew-home/load-store-context.ts` (Server Component friendly)

### Phase 2 — Sidebar (US2, blocking for US1)

- Create `components/snew-layout/app-sidebar-snew.tsx`
- Create `components/snew-layout/svg-filters.tsx`
- Modify `app/(dashboard)/layout.tsx` to use new sidebar + inject SVGFilters

### Phase 3 — Home shell (US1)

- Replace `app/(dashboard)/page.tsx` with new Home Server Component
- Fetch store + brand_dna, pass to children
- Create `hero-prompt.tsx` (client) + `feature-cards.tsx` + `feature-card-icons.tsx`

### Phase 4 — Templates (US3)

- Create `templates-section.tsx` with scroll arrows, gradient fades
- Create `style-card.tsx` with dual-layer next/image crossfade

### Phase 5 — Capabilities (US4)

- Create `capabilities-section.tsx` with tabs + AnimatePresence grid
- Create `capability-card.tsx` with motion.div gradient hover

### Phase 6 — Recents empty + polish

- Create `recents-empty.tsx`
- Verify all routes navigate correctly
- Dark mode check

### Phase 7 — Visual QA

- Playwright side-by-side: capture both localhost:8080/ and localhost:3000/
- Visual diff per section (hero, feature cards, templates, capabilities, sidebar)
- Fix any deviations

## Routing decisions

| Pathname         | Current                    | After                      |
| ---------------- | -------------------------- | -------------------------- |
| `/`              | Dashboard with agent cards | New Home (Snew studio)     |
| `/dashboard`     | Dashboard                  | Same dashboard (unchanged) |
| `/skills`        | Skills list                | unchanged                  |
| `/tarefas`       | Tasks list                 | unchanged                  |
| `/apps`          | Apps list                  | unchanged                  |
| `/studio/create` | Studio creator             | unchanged                  |

Sidebar nav navigates to these same paths.

## Component boundaries

- **Server Components**: `page.tsx`, `svg-filters.tsx`, `feature-card-icons.tsx`, `recents-empty.tsx`, `lib/**`
- **Client Components**: everything that has `useState`, `useEffect`, `localStorage`, `useRouter`, `motion.*`, event handlers

## Type contracts

```ts
// lib/design-system/brand-gradients.ts
export type BrandGradientKey = 'sageHaze' | 'duskRose' | 'aurora' | 'mist' | 'blueDusk'

export interface BrandGradient {
  name: string
  card: string // CSS linear-gradient string
  ink: string // text color hex
}

export const BRAND_GRADIENTS: Record<BrandGradientKey, BrandGradient>
export const CATEGORY_GRADIENT: Record<string, BrandGradientKey>
export function getGradient(category: string): BrandGradient
```

```ts
// lib/snew-home/default-styles.ts
export interface HomeStyleTemplate {
  id: string
  name: string
  category: string // "Produto isolado", "Com pessoa", etc.
  description: string
  thumbnailUrl: string // Supabase public URL
  hoverImages: string[] // 3-4 URLs
  prompt: string // for AssetCreator
}

export const DEFAULT_STYLES: HomeStyleTemplate[]
```

```ts
// lib/snew-home/default-capabilities.ts
export type FilterTab = 'all' | 'campaigns' | 'content' | 'analytics' | 'retention'

export interface CapabilityCard {
  id: string
  title: string
  skill: string // used for gradient lookup (e.g. "Seasonal Calendar")
  category: FilterTab[]
  route: string
  autoPrompt: string
}

export function buildCapCards(storeCtx: StoreContext | null): CapabilityCard[]
```

```ts
// lib/snew-home/load-store-context.ts
export interface StoreContext {
  name: string
  niche: string | null
  tone: string | null
  audience: string | null
  productTypes: string[]
  keywords: string[]
}

export async function loadStoreContext(teamId: string): Promise<StoreContext | null>
```

## Migration path: Vite → Next.js specifics

| Vite (snew-ai-core)                                | Next.js (Snew)                                              |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `useNavigate()`                                    | `useRouter().push()`                                        |
| `useLocation().pathname`                           | `usePathname()`                                             |
| `<img>`                                            | `<Image>` from `next/image`                                 |
| `BrowserRouter` routing                            | File-based `/app` routing                                   |
| `<link href="...fonts.google...">` in `index.html` | `next/font/google` in `layout.tsx`                          |
| `localStorage` direct                              | `localStorage` wrapped in `useEffect` to avoid SSR mismatch |
| Nested `style={{}}` + inline                       | Same approach preserved for 1:1 pixel match                 |

## Dark mode

snew-ai-core has `.dark` styles in `index.css` (lines ~140+). For MVP:

- Home background tokens: already handled by Tailwind's semantic classes (`bg-background`)
- Feature cards white bg: will adapt via existing Tailwind dark mode (`bg-card`)
- Capability cards: gradient families are hardcoded light pastels — they're intentionally same in dark mode (design choice from snew-ai-core)
- Sidebar: white bg even in dark mode initially (we can iterate later)

## Testing strategy

- **Visual regression**: Playwright screenshots of `/` at 1440×900 compared to snew-ai-core localhost:8080
- **Interaction**: click each feature card, verify navigation + `autoPrompt` in URL
- **Animation**: measure slideshow crossfade on hover (should complete in 250ms opacity + 650ms cycle)
- **Sidebar**: toggle, refresh, verify localStorage persistence

## Out of scope (deferred)

- Admin image styles CRUD (snew-ai-core has this; Snew will add in a later spec)
- Real recents history from Supabase (needs DB schema design)
- Mobile responsive polish beyond basic layout
- i18n (PT-BR only for now; EN path in snew-ai-core is copy-paste if needed later)
