# Spec 065 — New Snew Home Layout (1:1 port from snew-ai-core)

## Context

The legacy prototype at `/home/renanl/Projects/snew-ai-core` (Vite + React 18 + React Router, running at `http://localhost:8080`) has a new Home page (`SnewStudioHomePage`) that we need to port **1:1, pixel-perfect** to the Snew Next.js app at `/home/renanl/Projects/relay` (running at `http://localhost:3000`).

User's explicit constraints:

- **CSS 1:1** — exact values, no approximations
- **Next.js `<Image>`** for all slideshow/thumb images (no `<img>`)
- **Supabase Storage** for static assets (bucket `snew-assets` on project `apsfeutbqvgfgznmaesg`)
- **No failures** — careful verification at each step

## Scope (this spec)

**In scope:**

- New Home at route `/` (replaces current `(dashboard)/dashboard/page.tsx` as default landing)
- New AppSidebar (floating panel) replacing existing sidebar inside `(dashboard)/layout.tsx`
- `<SVGFilters>` injection (once, in dashboard layout) for future bubble avatars
- Supabase Storage bucket `snew-assets` provisioned + 52 style thumbnails uploaded
- DM Serif Display + IBM Plex Mono fonts added via `next/font/google`
- Design tokens file `lib/design-system/brand-gradients.ts` with the 5 families + helpers

**Out of scope (future specs):**

- Internal pages (Skills, Tarefas, Apps, Studio/create detail) — separate specs
- Onboarding flow
- Real recents history (tabela não existe ainda; placeholder empty state)
- Admin image-styles CRUD

## User Stories

### US1 — Home hero (P1, MVP)

**As a logged-in user**, when I open `/` I see:

1. H1 `O que você quer criar hoje?` (or `O que criar para {storeName} hoje?` if brand_dna.store_name exists)
2. A chat input box (textarea 580px max-width, white, radius 14, shadow)
3. A submit button (circle 32px bottom-right, black when text, gray when empty)
4. Below the chat, **6 feature cards** in a row (flex gap-3): Gerar imagem / Criar vídeo / Carrossel / Escrever copy / Campanha / Relatório
5. Each card has an inline SVG icon (36×36) + label, stagger-animates on mount (40ms delay between each)
6. Clicking a card OR pressing Enter in the textarea navigates to the relevant page

**Independent test**: hit `/`, verify HTML matches screenshots of `localhost:8080/`, animations run, clicks route correctly.

### US2 — New Sidebar (P1, MVP)

**As a logged-in user**, when I use the sidebar:

1. Collapsed state: 56px wide floating white panel (12px margin around), 5 icon-only buttons
2. Expanded state: 252px with labels
3. Toggle: click the "Snew" logo/row
4. Persisted in `localStorage['sidebar_collapsed']`
5. 5 nav items: Home / Board / Skills / Tarefas / Apps
6. Active state highlighted via `bg-accent`
7. Tooltips (Radix, right-aligned, sideOffset=8) when collapsed
8. Logo row: hover shows a toggle icon (15ms fade)
9. Expand/collapse transition: 300ms ease-in-out width

**Independent test**: toggle collapse, verify localStorage persistence across refreshes, verify tooltips appear only when collapsed, verify active state matches pathname.

### US3 — "Comece agora" templates strip (P2)

**As a logged-in user**, below the feature cards I see a horizontal scrolling strip of style-template cards (216×384 each):

1. 13 templates (hardcoded data, assets from Supabase Storage)
2. Each card shows a thumbnail (Supabase Storage URL, via `<Image fill sizes="216px" />`)
3. On hover: slideshow crossfades through 3-4 hover images (650ms interval, 250ms opacity transition, dual-layer technique)
4. Dot indicators (5×5, active 14×5, 200ms width transition) appear at bottom during hover
5. Caption below card (title + description, text-xs, fade-in on hover via CSS sibling)
6. Left/right arrows appear when scroll position allows (36px circular, white bg with hover black)
7. Gradient overlays (60px) fade edges
8. Stagger-animates on mount (40ms delay per card, `fadeSlideUp 0.35s`)
9. Click navigates to `/studio/create` with `{ autoPrompt, styleId, styleName, styleDesc }` in URL params

**Independent test**: hover each card, verify slideshow plays (3 slides crossfade), verify dots update, verify scroll arrows activate on scroll, verify `next/image` is used.

### US4 — "What Snew can do for you" capabilities grid (P2)

**As a logged-in user**, below templates I see:

1. Centered label "What Snew can do for you" (16px, 500)
2. 5 filter tabs (pills): All / Campaigns / Content / Analytics / Retention
3. Grid 3 columns × N rows of pastel cards (radius 20, minHeight 220)
4. Each card uses one of 5 gradient families (sageHaze / duskRose / aurora / mist / blueDusk) based on the skill
5. On hover: `backgroundPosition` animates from `0% 0%` to `100% 100%` (900ms ease) — gradient "flows"
6. Radial white glow inside bottom (rgba(255,255,255,0.45) → transparent)
7. 6 cards visible initially ("Ver mais (N)" button reveals all)
8. Card content: skill label (10px, opacity 0.5) + title (17px, 500, color grad.ink)
9. Switching filters uses `AnimatePresence mode="popLayout"` for smooth reflow
10. Click navigates to the card's route with `autoPrompt` in URL params

**Independent test**: hover cards, verify gradient animates; switch tabs, verify AnimatePresence reflows; click "Ver mais", verify all 12 cards appear.

### US5 — "Recentes" empty state (P3)

**As a logged-in user**, at the bottom of the home page I see a "Recentes" section. Since no creative history table exists yet, show an empty state:

- Clock icon 32px (strokeWidth 1.2)
- Text: `Seus criativos aparecerão aqui depois de gerados` (13px)
- Centered, padding 60px 20px

**Independent test**: initial render shows empty state.

## Visual specs (literal values, extracted from snew-ai-core)

### Page shell

```
root: display: flex; width: 100vw; height: 100vh; overflow: hidden
main content bg: hsl(40, 7%, 96%) = #F6F5F4
content wrapper: maxWidth: 1100; margin: 0 auto; padding: 52px 40px 80px
```

### Hero

```
h1: fontSize: 26; fontWeight: 500 (Inter); letterSpacing: -0.02em; color: #1A1A1A; margin: 0 0 24px; text-align: center

chatbox:
  maxWidth: 580; margin: 0 auto 14px;
  background: #FFFFFF; borderRadius: 14;
  padding: 14px 18px;
  boxShadow: 0 2px 12px rgba(0,0,0,0.07);
  border: 1px solid #E8E8E4;
  minHeight: 80;

textarea:
  rows={2}; fontSize: 14; lineHeight: 1.6; color: #1A1A1A;
  padding: 0; paddingBottom: 32;
  border: none; outline: none; resize: none;
  background: transparent; fontFamily: inherit;

submit btn:
  position: absolute; bottom: 12; right: 12;
  width: 32; height: 32; borderRadius: 50%;
  background: #1A1A1A (when text) OR #E0E0DC (empty);
  color: #FFFFFF; transition: background 0.15s;
  icon: ArrowUp size={14}
```

### Feature cards (6)

```
container: margin: 32px 0 0
row: display: flex; gap: 12

card button:
  flex: 1;
  display: flex; flexDirection: row; alignItems: center; gap: 8;
  padding: 10px 12px; borderRadius: 12; border: none;
  background: #FFFFFF; cursor: pointer;
  transition: background 0.15s;
  animation: fadeSlideUp 0.3s ease both;
  animationDelay: ${i * 40}ms;

card hover: background: #F0F0EE

card icon: 36×36 SVG inline (see feature-card-icons.tsx)

card label:
  fontSize: 12; fontWeight: 500; color: #1A1A1A;
  letterSpacing: -0.01em; lineHeight: 1.3;
  whiteSpace: nowrap;

6 icons (literal SVG structure from snew-ai-core):
  1. image: rect 8,10 28×22 rx4 fill #E8E4FF stroke #C4BBFF + circle 14,17 r3 #9B8FFF + path #9B8FFF + overlay check 28,22 16×16 #4ADE80 + white check
  2. video: rect 6,13 28×22 rx5 #FFE4E1 stroke #FFBDB5 + play triangle 16,19→16,31→27,25 #FF6B5B + circle 38,22 r5 #FF6B5B 0.85 + white check
  3. carousel: 3 stacked rects (18×24, 18×28, 18×24) with #FEF3C7 fill + dots
  4. copy: rect 8,8 26×34 rx5 #E0F2FE stroke #7DD3FC + 3 lines + circle 36,34 r9 #0EA5E9 + white check
  5. campaign: circle 26,24 r16 #FCE7F3 stroke #F9A8D4 + path #EC4899 check + sub-circle 38,12 r7 #FDE68A + #92400E check
  6. report: rect 8,6 28×36 rx5 #F0FDF4 + 3 bars + circle 38,14 r8 #DCFCE7 + #16A34A check
```

### Style card (templates)

```
wrapper: width: 216; flex-shrink: 0; position: relative
  animation: fadeSlideUp 0.35s ease both; animationDelay: ${idx * 40}ms

image container:
  width: 100%; height: 384; borderRadius: 14;
  overflow: hidden; background: #E8E6E2;
  position: relative;

2 image layers (use next/image with fill sizes="216px"):
  position: absolute; inset: 0;
  objectFit: cover;
  transition: opacity 0.25s ease;
  willChange: opacity;
  active layer: opacity 1; inactive: opacity 0

slideshow interval: 650ms
layer swap: setTimeout(30) before flipping activeLayer

dot indicators (shown when isHovered && slides.length > 1):
  absolute bottom: 10; left: 50%; transform: translateX(-50%);
  display: flex; gap: 4; zIndex: 2;
  dot:
    width: ${i === activeSlide ? 14 : 5};
    height: 5; borderRadius: 99;
    background: rgba(255,255,255,0.9);
    transition: width 0.2s ease;
    opacity: ${i === activeSlide ? 1 : 0.5};

caption (fades in on hover via sibling CSS, see below):
  padding: 10px 2px 0;
  default: opacity 0; transform: translateY(4px);
  hover: opacity 1; transform: translateY(0);
  transition: opacity 0.18s ease, transform 0.18s ease;
  title p: fontSize 11 (?check font-normal text-xs); color #1A1A1A; margin 0 0 3px; letterSpacing: -0.01em; lineHeight: 1.3
  desc p: fontSize 11; color #999; margin 0; lineHeight 1.4
```

### Templates scroll row

```
wrapper: position: relative
outer: overflow: hidden; borderRadius: 14
inner scroll:
  display: flex; gap: 14; overflowX: auto;
  padding: 8px 4px 12px;
  class: hide-scrollbar (custom utility)

scroll arrows (left/right):
  position: absolute; top: 45%; transform: translate(-50% or 50%, -50%);
  zIndex: 10;
  width: 36; height: 36; borderRadius: 50%;
  border: 1px solid rgba(0,0,0,0.10);
  background: #FFFFFF;
  boxShadow: 0 2px 12px rgba(0,0,0,0.14);
  transition: all 0.12s;
  hover: background: #1A1A1A; color: #FFF
  icon: ChevronLeft/ChevronRight size={16}
  only shown when canScrollLeft / canScrollRight (scrollLeft + clientWidth < scrollWidth - 8)
  scrollBy: 696px with smooth behavior

gradients (edge fades):
  position: absolute; top: 0; bottom: 0; width: 60; pointerEvents: none; zIndex: 3;
  left: linear-gradient(to left, transparent, hsl(40, 7%, 96%))
  right: linear-gradient(to right, transparent, hsl(40, 7%, 96%))

section heading p:
  fontSize: 14; fontWeight: 500; color: #1A1A1A; margin: 0
  label: "Comece agora"
  marginBottom: 24
```

### Capabilities section

```
container: marginBottom: 52

heading wrapper: textAlign: center; marginBottom: 20
heading p: fontSize: 16; fontWeight: 500; color: #1A1A1A; margin: 0 0 16px
  text: "What Snew can do for you"

tabs row: display: flex; justifyContent: center; gap: 8
tab button (pill):
  fontSize: 13;
  fontWeight: 500 (active) / 400 (inactive);
  color: #FFFFFF (active) / #888 (inactive);
  background: #1A1A1A (active) / transparent (inactive);
  border: 1px solid #1A1A1A (active) / #E0E0DC (inactive);
  borderRadius: 100;
  padding: 6px 16px;
  transition: all 0.15s;
  hover (inactive): borderColor #999; color #1A1A1A

5 tabs: All | Campaigns | Content | Analytics | Retention

grid: display: grid; gridTemplateColumns: repeat(3, 1fr); gap: 16

capability card (motion.div):
  borderRadius: 20; overflow: hidden; position: relative;
  background: grad.card (from brand-gradients.ts — 5 families);
  backgroundSize: 200% 200%;
  backgroundPosition: 0% 0% (default);
  display: flex; flexDirection: column; minHeight: 220;
  cursor: pointer;
  transition: background-position 0.9s ease;
  whileHover (framer-motion): backgroundPosition: 100% 100%;
  AnimatePresence mode="popLayout":
    layout;
    initial: { opacity: 0, scale: 0.97 };
    animate: { opacity: 1, scale: 1 };
    exit: { opacity: 0, scale: 0.97 };
    transition: { duration: 0.18 };

card top:
  padding: 28px 28px 0; position: relative; zIndex: 2;
  skill label p: margin: 0 0 10px; fontSize: 10; fontWeight: 500; letterSpacing: 0.02em;
    color: grad.ink; opacity: 0.5;
  title p: margin: 0; fontSize: 17; fontWeight: 500; lineHeight: 1.25;
    color: grad.ink; letterSpacing: -0.01em;

bottom glow:
  flex: 1; marginTop: 20; position: relative; overflow: hidden; minHeight: 100;
  inner div absolute:
    bottom: -30%; left: 50%; transform: translateX(-50%);
    width: 80%; height: 120%; borderRadius: 50%;
    background: radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, transparent 70%);
    pointerEvents: none;

show all button:
  padding: 8px 24px; borderRadius: 10;
  border: 1px solid #E0E0DC; background: #FFFFFF;
  color: #555; fontSize: 13; transition: all 0.12s;
  hover: background #1A1A1A; color #FFF; border #1A1A1A;
  label: "Ver mais (N)"
  marginTop: 20 (centered)

INITIAL_VISIBLE: 6 (first 6 cards; rest hidden until "Ver mais")
```

### 5 Gradient families (lib/design-system/brand-gradients.ts)

```ts
sageHaze:  { card: 'linear-gradient(158deg, #D0D8CC 0%, #E4ECD8 50%, #ECF0DC 100%)', ink: '#3A4A3A' }
duskRose:  { card: 'linear-gradient(145deg, #E0D0E0 0%, #F4D0C4 50%, #E8D0D8 100%)', ink: '#5A3A4A' }
aurora:    { card: 'linear-gradient(150deg, #C8DCD8 0%, #E4D8E4 45%, #F0DDD0 100%)', ink: '#3A5A58' }
mist:      { card: 'linear-gradient(155deg, #DCE8EC 0%, #F2EDE8 50%, #D8E4EA 100%)', ink: '#3A4A50' }
blueDusk:  { card: 'linear-gradient(160deg, #D4E0EA 0%, #F0E4D8 50%, #D8E0EA 100%)', ink: '#3A4A5A' }

categoryGradient: {
  'Seasonal Calendar': 'sageHaze',
  'Copywriter': 'mist',
  'Image Generator': 'aurora',
  'Social Asset Creator': 'aurora',
  'Video Script Creator': 'duskRose',
  'Retention Engine': 'blueDusk',
  'Inventory Manager': 'sageHaze',
  'Post-Purchase': 'aurora',
  'Ops Pilot': 'mist',
  'Campaign': 'duskRose',
  'Analytics': 'blueDusk',
  'Ads': 'sageHaze',
  'WhatsApp': 'aurora',
  'Email / CRM': 'mist',
  'Brand DNA': 'blueDusk',
}

12 default capability cards (from snew-ai-core SnewStudioHomePage.tsx lines 258-271):
  c1  Seasonal Calendar     Dia das Mães em 18 dias. {store} ainda não publicou nada
  c2  Image Generator       Visual de {product} que para o scroll. Gerado em 30s
  c3  Copywriter            Copy de {kw1} e {kw2} para 6 canais
  c4  Seasonal Calendar     30 dias de conteúdo para {store}
  c5  Retention Engine      Seus clientes pararam de comprar
  c6  Ops Pilot             O que aconteceu na {store} esta semana
  c7  Video Script Creator  Script de Reels que converte
  c8  Seasonal Calendar     Dia dos Namorados. Campanha completa
  c9  Retention Engine      47 clientes em risco de churn
  c10 Brand DNA             Tom e identidade da {store}
  c11 Seasonal Calendar     Black Friday da {store}
  c12 Inventory Manager     Estoque crítico antes da próxima campanha
```

### Sidebar

```
outer wrapper (div):
  padding: 12px 0 12px 12px;
  boxSizing: border-box;
  flexShrink: 0;
  height: 100vh;
  class: transition-[width] duration-300 ease-in-out
  width: w-[68px] (collapsed) / w-[252px] (expanded)

inner aside (float panel):
  background: #FFFFFF;
  borderRadius: 8;
  boxShadow: 0 1px 3px rgba(0,0,0,0.06);
  width: 100%; height: 100%;
  display: flex; flexDirection: column;
  overflow: hidden;

logo row:
  h-[48px] flex items-center shrink-0 group cursor-pointer select-none
  collapsed: justify-center px-3
  expanded:  px-4
  collapsed inner: w-6 h-6 relative
    base: absolute inset-0 rounded-md bg-foreground flex items-center justify-center text-[11px] font-medium text-background
      content: "S"
      group-hover: opacity-0 (0.15s)
    hover: absolute inset-0 flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 (0.15s)
      content: <svg 16x16 rect 3,3 18x18 rx2 + path "M9 3v18"/> (collapse icon)
  expanded inner: flex items-center gap-2 flex-1 min-w-0
    span: text-sm font-medium text-foreground whitespace-nowrap flex-1 → "Snew"
    toggle icon: opacity-0 group-hover:opacity-100 transition-opacity duration-150
      same svg 16x16

nav wrapper:
  pt-3 pb-1 flex-1 transition-[padding] duration-300
  collapsed: px-1.5
  expanded:  px-2

nav items (5):
  { label: 'Home',     icon: Home,          path: '/' }
  { label: 'Board',    icon: LayoutGrid,    path: '/studio/create',  state: { openBoard: true } }
  { label: 'Skills',   icon: Cpu,           path: '/skills' }
  { label: 'Tarefas',  icon: ClipboardList, path: '/tarefas' }
  { label: 'Apps',     icon: AppWindow,     path: '/apps' }

nav button:
  relative w-full flex items-center rounded-md transition-colors mb-0.5
  collapsed: justify-center px-0 py-2.5
  expanded:  gap-2.5 px-3 py-2
  active:   bg-accent text-foreground font-medium
  inactive: text-muted-foreground hover:bg-accent hover:text-foreground

  active logic:
    Home: location.pathname === '/'
    Board: always false (never highlight — shares path with studio)
    Skills: location.pathname === '/skills'
    Tarefas: location.pathname === '/tarefas'
    Apps: location.pathname.startsWith('/apps')

  icon: w-4 h-4 shrink-0
  label wrapper:
    flex items-center flex-1 min-w-0 overflow-hidden
    transition-[opacity,max-width] duration-300 ease-in-out
    collapsed: max-w-0 opacity-0
    expanded:  max-w-full opacity-100
  label span: flex-1 text-left whitespace-nowrap; style fontSize 13 fontWeight 400

tooltip (Radix):
  only when collapsed
  side: right; sideOffset: 8
  classes: text-xs font-medium rounded-lg px-2.5 py-1.5
```

### Global CSS additions (app/globals.css)

```css
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes conic-spin {
  to {
    --conic-angle: 360deg;
  }
}

@property --conic-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@keyframes avatar-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
}

@keyframes snew-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.85);
  }
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  scrollbar-width: none;
}
```

### Fonts (next/font)

Add to `src/app/layout.tsx`:

```ts
import { Inter, DM_Serif_Display, IBM_Plex_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const dmSerif = DM_Serif_Display({ weight: '400', subsets: ['latin'], variable: '--font-dm-serif' })
const ibmMono = IBM_Plex_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-ibm-mono',
})
```

Apply `${inter.variable} ${dmSerif.variable} ${ibmMono.variable}` to `<body>`.

Tailwind v4 config in globals.css `@theme`:

```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-serif: 'DM Serif Display', Georgia, serif;
--font-mono: 'IBM Plex Mono', monospace;
```

## Data model (hardcoded for MVP)

### `lib/snew-home/default-styles.ts`

13 style templates:

```ts
[
  { id: 'ecommerce-photography',  name: 'E-commerce Photography', category: 'Produto isolado', description: 'Produto limpo, fundo neutro, luz uniforme', promptBase: '...' },
  { id: 'advertising-product',    name: 'Advertising Product',    category: 'Produto isolado', description: 'Props de ingredientes, fundo dominante, luz dramática e composição editorial', ... },
  { id: 'advertising-hold',       name: 'Advertising Hold',       category: 'Com pessoa', ... },
  { id: 'advertising-portrait',   name: 'Advertising Portrait',   category: 'Com pessoa', ... },
  { id: 'fashion-on-model',       name: 'Fashion On-Model',       category: 'Com pessoa', ... },
  { id: 'ghost-mannequin',        name: 'Ghost Mannequin',        category: 'Com pessoa', ... },
  { id: 'product-lifestyle',      name: 'Product Lifestyle',      category: 'Com pessoa', ... },
  { id: 'flat-lay-editorial',     name: 'Flat Lay Editorial',     category: 'Composição', ... },
  { id: 'unboxing',               name: 'Unboxing',               category: 'Composição', ... },
  { id: 'material-detail',        name: 'Material Detail',        category: 'Detalhe', ... },
  { id: 'product-attributes',     name: 'Product Attributes',     category: 'Detalhe', ... },
  { id: 'product-infographic',    name: 'Product Infographic',    category: 'Detalhe', ... },
  { id: 'pop-illustration',       name: 'Pop Illustration',       category: 'Campanha', ... },
]
```

Each entry has `thumbnailUrl` + `hoverImages[]` pointing to `https://apsfeutbqvgfgznmaesg.supabase.co/storage/v1/object/public/snew-assets/style-thumbs/{id}-{n}.jpg`.

### `lib/snew-home/default-capabilities.ts`

12 capability cards (see grid section above). `buildCapCards(storeCtx)` interpolates `{storeName}`, `{niche}`, `{tone}`, etc.

## Supabase Storage

**Bucket**: `snew-assets` (public, 10MB limit per file)

**Upload path**: `style-thumbs/{styleId}-{n}.{ext}` where n is 0 (thumb) or 1/2/3 (hover images).

Source: download from the existing snew-ai-core bucket (`plkhvlnqjihonpzeeybh.supabase.co/storage/v1/object/public/brand-references/style-thumbs/...`) and re-upload to Snew's bucket.

## Constraints

- All Home components are `'use client'` (state, hooks, localStorage, Framer Motion)
- `page.tsx` at `/` stays a Server Component that fetches brand DNA + store via Supabase and passes down
- All slideshow/thumbnail `<img>` → `next/image` with `fill sizes="216px"`
- No `<img>` anywhere in new Home
- Colors via CSS vars + literal hex (mixing OK — gradient families use literal hex for accuracy)
- No `style={{...}}` soup — use Tailwind where cheap, but inline styles preserved where 1:1 match beats semantic classes

## Success criteria

1. `localhost:3000/` pixel-match with `localhost:8080/` at 1440×900 viewport (side-by-side visual diff < 2% deviation)
2. All animations run: feature-card stagger, style-card slideshow, capability-card gradient, sidebar collapse, dot indicators
3. `next/image` used for all style thumbs (verified via DevTools Network tab: `/_next/image?url=...`)
4. Sidebar collapse persists across refreshes
5. Feature cards + capability cards navigate to correct routes with `autoPrompt`
6. Lighthouse perf ≥ 85 for `/`
7. Zero console errors or hydration warnings
8. Works in dark mode (Tailwind class `dark` — verify palette holds)

## Risks

- **Tailwind v4 migration of HSL vars**: snew-ai-core uses `hsl(var(--x))` — Snew v4 expects `oklch()`. Translate carefully.
- **Radix Tooltip in `'use client'`**: must be wrapped in Provider (already in `TooltipProvider` root layout)
- **next/image with Supabase Storage**: bucket must be public + remotePattern allow-list (already has `**.supabase.co`)
- **StorageQuotaExceeded**: 52 images × ~200KB avg = ~10MB, well within Supabase Free plan
- **localStorage SSR mismatch**: use `useEffect` to read + `suppressHydrationWarning` on the sidebar wrapper
