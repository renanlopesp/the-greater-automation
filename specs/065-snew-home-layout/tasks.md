# Tasks 065 — Snew Home Layout (1:1 port)

## Phase 0 — Foundation

- [ ] T001 Add `DM_Serif_Display` + `IBM_Plex_Mono` to `next/font/google` in `src/app/layout.tsx`. Apply `${inter.variable} ${dmSerif.variable} ${ibmMono.variable}` to `<body>`.
- [ ] T002 [P] Add `@keyframes fadeSlideUp`, `@keyframes conic-spin`, `@keyframes avatar-breathe`, `@keyframes snew-pulse`, `@property --conic-angle`, `.hide-scrollbar` utility, and `@theme` font vars to `src/app/globals.css`.
- [ ] T003 [P] Create Supabase Storage bucket `snew-assets` (public, 10MB limit) on project `apsfeutbqvgfgznmaesg` via Supabase MCP or dashboard.
- [ ] T004 Download 52 style thumbnails from `plkhvlnqjihonpzeeybh.supabase.co/storage/v1/object/public/brand-references/style-thumbs/` (13 styles × ~4 images each) and re-upload to `apsfeutbqvgfgznmaesg.supabase.co/storage/v1/object/public/snew-assets/style-thumbs/`. Naming: `{styleId}-{n}.jpg` where n=0 is the primary thumb and 1..3 are hover slideshow images.
- [ ] T005 [P] Create `src/lib/design-system/brand-gradients.ts` with `BRAND_GRADIENTS` (5 families: sageHaze, duskRose, aurora, mist, blueDusk), `CATEGORY_GRADIENT` map, and `getGradient(category: string)` helper. Copy exact color stops from snew-ai-core designSystem.tsx lines 20-93.

**Checkpoint**: `bun dev` builds without errors, fonts load, bucket is public, `brand-gradients.ts` is importable.

## Phase 1 — Data layer

- [ ] T006 [P] Create `src/lib/snew-home/default-styles.ts` with 13 style templates: `ecommerce-photography`, `advertising-product`, `advertising-hold`, `advertising-portrait`, `fashion-on-model`, `ghost-mannequin`, `product-lifestyle`, `flat-lay-editorial`, `unboxing`, `material-detail`, `product-attributes`, `product-infographic`, `pop-illustration`. Each entry has `thumbnailUrl` + `hoverImages[]` pointing to Snew's Supabase bucket. Copy `description` + `promptBase` from snew-ai-core `imageStyles.ts`.
- [ ] T007 [P] Create `src/lib/snew-home/default-capabilities.ts` with `buildCapCards(storeCtx)` that returns 12 `CapabilityCard` entries (c1-c12). Copy exact titles + autoPrompts from snew-ai-core SnewStudioHomePage.tsx lines 258-271. Uses `{storeName}`, `{niche}`, `{tone}`, `{product}`, `{kw1}`, `{kw2}` interpolations.
- [ ] T008 [P] Create `src/lib/snew-home/load-store-context.ts` with `loadStoreContext(teamId)` async function. Reads `stores` table (name, segment, platform) + `brand_dna` table (niche, tone, audience, keywords, store_name) and returns merged `StoreContext`. Returns `null` if neither exists.

**Checkpoint**: unit-level verify each file compiles, exports types, imports work.

## Phase 2 — Sidebar [US2]

- [ ] T009 [US2] Create `src/components/snew-layout/svg-filters.tsx` (Server Component) with `dangerouslySetInnerHTML` containing the 5 `feTurbulence` + `feDisplacementMap` filter defs for `snew-f-sageHaze`, `snew-f-duskRose`, `snew-f-aurora`, `snew-f-mist`, `snew-f-blueDusk`. Copy SVG_FILTERS_HTML from snew-ai-core designSystem.tsx lines 158-164.
- [ ] T010 [US2] Create `src/components/snew-layout/app-sidebar-snew.tsx` ('use client'). Floating panel with:
  - Outer wrapper: `padding: 12px 0 12px 12px`, `transition-[width] duration-300 ease-in-out`, `w-[68px]` collapsed / `w-[252px]` expanded
  - Inner aside: `background: #FFFFFF`, `borderRadius: 8`, `boxShadow: 0 1px 3px rgba(0,0,0,0.06)`
  - Logo row (h-[48px], click toggles collapse): "S" badge collapsed / "Snew" text expanded, hover reveals toggle-icon (opacity 0.15s)
  - Nav: 5 items (Home/Board/Skills/Tarefas/Apps) with Radix Tooltip when collapsed
  - Persist collapse in `localStorage['sidebar_collapsed']`
  - Use `usePathname()` for active state (Board never active; `/` exact match; others `startsWith`)
- [ ] T011 [US2] Modify `src/app/(dashboard)/layout.tsx`:
  - Replace current sidebar with `<AppSidebarSnew />`
  - Inject `<SVGFilters />` once inside the layout
  - Remove existing old sidebar import
  - Keep ThemeProvider / QueryProvider / existing auth logic

**Checkpoint**: Navigate to `/` (or any dashboard route), sidebar renders floating white panel, collapse toggle works, persists on refresh, tooltips show when collapsed, active item highlights.

## Phase 3 — Home shell [US1]

- [ ] T012 [US1] Replace `src/app/(dashboard)/page.tsx` content:
  - Keep as Server Component (no `'use client'`)
  - Read `teamId` from cookies/session via existing auth helper
  - Call `loadStoreContext(teamId)`, pass as prop to children
  - Layout: `<main>` with `maxWidth: 1100, margin: 0 auto, padding: 52px 40px 80px, background: hsl(40, 7%, 96%)`
  - Render `<HeroPrompt storeCtx={...} />`, `<FeatureCards storeCtx={...} />`, `<TemplatesSection />`, `<CapabilitiesSection storeCtx={...} />`, `<RecentsEmpty />`
- [ ] T013 [US1] Create `src/components/snew-home/hero-prompt.tsx` ('use client'):
  - h1 "O que você quer criar hoje?" or "O que criar para {storeName} hoje?" — `fontSize: 26; fontWeight: 500; letterSpacing: -0.02em; color: #1A1A1A; margin: 0 0 24px; text-align: center`
  - Chat box: `maxWidth: 580; margin: 0 auto 14px; background: #FFFFFF; borderRadius: 14; padding: 14px 18px; boxShadow: 0 2px 12px rgba(0,0,0,0.07); border: 1px solid #E8E8E4; minHeight: 80`
  - Textarea `rows={2}; fontSize: 14; lineHeight: 1.6; paddingBottom: 32`; Enter (no Shift) submits
  - Submit button `bottom: 12; right: 12; width/height: 32; borderRadius: 50%`; `#1A1A1A` when text / `#E0E0DC` when empty; ArrowUp size 14
  - On submit: `router.push('/studio/create?autoPrompt=' + encodeURIComponent(text))`
- [ ] T014 [P] [US1] Create `src/components/snew-home/feature-card-icons.tsx` (Server Component). 6 SVG components (36×36): `IconGerarImagem`, `IconCriarVideo`, `IconCarrossel`, `IconEscreverCopy`, `IconCampanha`, `IconRelatorio`. Copy exact SVG path data from snew-ai-core SnewStudioHomePage.tsx lines 604-687.
- [ ] T015 [US1] Create `src/components/snew-home/feature-cards.tsx` ('use client'). Row of 6 buttons:
  - Container: `margin: 32px 0 0`; row: `display: flex; gap: 12`
  - Button: `flex: 1; display: flex; flexDirection: row; alignItems: center; gap: 8; padding: 10px 12px; borderRadius: 12; border: none; background: #FFFFFF; transition: background 0.15s; animation: fadeSlideUp 0.3s ease both; animationDelay: ${i * 40}ms`
  - Hover: `background: #F0F0EE`
  - Label: `fontSize: 12; fontWeight: 500; color: #1A1A1A; letterSpacing: -0.01em; lineHeight: 1.3; whiteSpace: nowrap`
  - Each card has `dest: 'studio' | 'agent'` + `prompt` — route accordingly with `router.push('/studio/create?autoPrompt=...')` or `router.push('/agent?autoPrompt=...')`

**Checkpoint**: Visit `/`, see h1 + chatbox + 6 feature cards appearing with 40ms stagger. Click "Gerar imagem" → routes to `/studio/create?autoPrompt=...`.

## Phase 4 — Templates [US3]

- [ ] T016 [US3] Create `src/components/snew-home/style-card.tsx` ('use client'):
  - `width: 216` wrapper, button with `flex-shrink: 0`
  - Image container: `width: 100%; height: 384; borderRadius: 14; overflow: hidden; background: #E8E6E2; position: relative`
  - 2 `<Image>` layers (next/image, `fill sizes="216px" quality={85}`): each `position: absolute; inset: 0; objectFit: cover; transition: opacity 0.25s ease; willChange: opacity`
  - Slideshow: `setInterval(650)` when `isHovered && slides.length > 1`; swap activeLayer (0/1) using 30ms setTimeout pattern from snew-ai-core
  - Dots (only shown when isHovered && slides.length > 1): `absolute bottom: 10; left: 50%; transform: translateX(-50%); display: flex; gap: 4; zIndex: 2`; each dot `width: i === activeSlide ? 14 : 5; height: 5; borderRadius: 99; background: rgba(255,255,255,0.9); transition: width 0.2s ease; opacity: i === activeSlide ? 1 : 0.5`
- [ ] T017 [US3] Create `src/components/snew-home/templates-section.tsx` ('use client'):
  - Heading: "Comece agora" (`fontSize: 14; fontWeight: 500; color: #1A1A1A; margin: 0 0 24px`)
  - Scroll container (ref for `scrollLeft`/`clientWidth`/`scrollWidth` tracking): `display: flex; gap: 14; overflowX: auto; padding: 8px 4px 12px`, class `hide-scrollbar`
  - Map `DEFAULT_STYLES`, group by category, render `StyleCard` for each + caption wrapper (hover opacity 0→1, translateY 4→0, `transition: opacity 0.18s ease, transform 0.18s ease`)
  - Each card wrapper: `animation: fadeSlideUp 0.35s ease both; animationDelay: ${idx * 40}ms`
  - Scroll arrows (shown conditionally): 36×36 circle, white/black on hover, ChevronLeft/Right size 16
  - Gradient fades: `position: absolute; top/bottom 0; width: 60; background: linear-gradient(to left/right, transparent, hsl(40, 7%, 96%)); pointerEvents: none; zIndex: 3`
  - On card click: `router.push('/studio/create?autoPrompt={prompt}&styleId={id}&styleName={name}&styleDesc={description}')`

**Checkpoint**: Templates scroll horizontally, each card shows a thumbnail via next/image, hovering plays a slideshow with 3-4 images crossfading every 650ms, dots appear at bottom and highlight active slide. Click routes to `/studio/create`.

## Phase 5 — Capabilities [US4]

- [ ] T018 [US4] Create `src/components/snew-home/capability-card.tsx` ('use client'):
  - `motion.div` with `layout`, `initial/animate/exit/transition` (0.18s), and `whileHover={{ backgroundPosition: '100% 100%' }}`
  - Style: `borderRadius: 20; overflow: hidden; position: relative; background: grad.card; backgroundSize: 200% 200%; backgroundPosition: 0% 0%; display: flex; flexDirection: column; minHeight: 220; cursor: pointer; transition: background-position 0.9s ease`
  - Top: `padding: 28px 28px 0; position: relative; zIndex: 2`
    - Skill label: `margin: 0 0 10px; fontSize: 10; fontWeight: 500; letterSpacing: 0.02em; color: grad.ink; opacity: 0.5`
    - Title: `margin: 0; fontSize: 17; fontWeight: 500; lineHeight: 1.25; color: grad.ink; letterSpacing: -0.01em`
  - Bottom glow: `flex: 1; marginTop: 20; position: relative; overflow: hidden; minHeight: 100`; inner div `absolute bottom: -30%; left: 50%; transform: translateX(-50%); width: 80%; height: 120%; borderRadius: 50%; background: radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, transparent 70%); pointerEvents: none`
  - Click: `router.push(card.route + '?autoPrompt=' + encoded)`
- [ ] T019 [US4] Create `src/components/snew-home/capabilities-section.tsx` ('use client'):
  - Heading wrapper: `textAlign: center; marginBottom: 20`
  - Heading: "What Snew can do for you" (`fontSize: 16; fontWeight: 500; color: #1A1A1A; margin: 0 0 16px`)
  - 5 tab pills (All/Campaigns/Content/Analytics/Retention): `fontSize: 13; padding: 6px 16px; borderRadius: 100; border: 1px solid #E0E0DC; transition: all 0.15s`; active `#1A1A1A bg, #FFF text`; hover inactive borderColor #999
  - Grid: `display: grid; gridTemplateColumns: repeat(3, 1fr); gap: 16`
  - `<AnimatePresence mode="popLayout">` wrapping visible cards
  - State: `activeFilter`, `showAll`; visible = first 6 if !showAll, else all filtered
  - "Ver mais (N)" button (hidden when showAll): `padding: 8px 24px; borderRadius: 10; border: 1px solid #E0E0DC; background: #FFFFFF; color: #555; fontSize: 13; transition: all 0.12s; marginTop: 20`; hover `#1A1A1A bg, #FFF text`
  - Container: `marginBottom: 52`

**Checkpoint**: 6 capability cards render initially. Switch tabs, `AnimatePresence` animates reflow. Hover over a card, gradient flows (backgroundPosition animates 900ms). Click "Ver mais (6)", all 12 cards render. Click a card, navigates with `autoPrompt`.

## Phase 6 — Recents + polish

- [ ] T020 Create `src/components/snew-home/recents-empty.tsx` (Server Component):
  - Section wrapper with h2 "Recentes" (`fontSize: 14; fontWeight: 600; color: #1A1A1A; margin: 0`); flex row with spaceBetween for future actions, `marginBottom: 24`
  - Empty state: `textAlign: center; padding: 60px 20px; color: #AAA`; Clock icon `size={32} strokeWidth={1.2}` with `marginBottom: 12, opacity: 0.5`; text "Seus criativos aparecerão aqui depois de gerados" (`fontSize: 13`)
- [ ] T021 Verify all navigation: click each feature card (routes to studio/create or agent), each style card (routes with styleId), each capability card (routes with autoPrompt). Check dev console: no Next.js warnings, no hydration errors.
- [ ] T022 Dark mode sanity check: toggle via theme provider, verify capability gradients still render (they're hardcoded light by design), sidebar + feature cards adapt via Tailwind dark utilities.

## Phase 7 — Visual QA

- [ ] T023 Start both dev servers: `bun dev` at :3000 (Snew) and `npm run dev` at :8080 (snew-ai-core). Playwright: navigate both to `/`, screenshot at 1440×900.
- [ ] T024 Pixel-diff per section: hero, feature cards, templates strip, capabilities grid, sidebar. Expect < 2% deviation. Fix any mismatches (values, animations, spacing).
- [ ] T025 Lighthouse perf on `/`: target ≥ 85. Optimize if below (defer non-critical JS, lazy-load below-fold sections).
- [ ] T026 Interactive tests: textarea submit, feature card click, style card hover + slideshow (verify 250ms crossfade, 650ms interval, dots), capability card hover (verify backgroundPosition animation), sidebar collapse (verify localStorage + transition 300ms).

## Dependencies / ordering

- Phase 0 blocks everything (fonts, bucket, gradients)
- Phase 1 blocks Phase 3 (Home needs store context), Phase 4 (templates needs DEFAULT_STYLES), Phase 5 (capabilities needs buildCapCards)
- Phase 2 blocks Phase 3 (dashboard layout must have new sidebar before Home renders inside it)
- Phase 3 can proceed after Phase 2
- Phase 4, 5, 6 are independent after Phase 3 is done
- Phase 7 is last

## Parallel execution suggestions

Within each phase, tasks marked [P] can be parallelized. Recommended parallel runs:

- **Phase 0**: T002 (globals.css) ∥ T003 (bucket) ∥ T005 (gradients) while T001 (fonts) and T004 (upload) are sequential
- **Phase 1**: T006 ∥ T007 ∥ T008
- **Phase 3**: T014 (feature-card-icons, Server) can be done in parallel with T013 (hero-prompt, client)

## MVP scope (absolute minimum to ship)

- T001-T005 (foundation)
- T006-T008 (data)
- T009-T011 (sidebar)
- T012-T015 (home shell + hero + feature cards)
- T020 (recents empty)
- T021 (nav sanity)

Templates + capabilities can ship as a follow-up if time runs out — the Home is usable without them, just has less visual density.
