# Spec 066 — Studio as the New Chat (1:1 port from snew-ai-core)

**Feature Branch**: `066-studio-chat-replacement`
**Created**: 2026-04-14
**Status**: Draft
**Input**: User description: "/studio irá substituir toda a estrutura de chat que temos hoje no chat/task para esse formato novo dele. Primeiro fazer o update do studio, assim como está em http://localhost:8080/studio/create do projeto snew-ai-core — literalmente copiar os arquivos. Verificar banco e edge functions que precisam ser atualizadas."

---

## Context

The prototype at `/home/renanl/Projects/snew-ai-core` (Vite + React 18 + React Router, served at `http://localhost:8080`) contains the **new studio experience** that will replace the legacy chat/task UI in relay. The relay currently has a partial, out-of-date port of this studio at `src/components/asset-studio/` that drifted significantly from the prototype and is operationally broken.

### Current relay state (verified)

| Concern              | State                                                                                                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Studio entry route   | `src/app/(dashboard)/studio/page.tsx` — wraps `AssetCreatorModal` directly. No `/studio/create` route, no landing home page.                                                                                                                                                                            |
| Component drift      | `AssetCreatorModal.tsx` is **10,744 lines vs 12,846 lines** in prototype (−2,102). `StudioChatPanel.tsx` is **633 lines vs 1,632** (−999). All 12 shared files differ.                                                                                                                                  |
| Missing components   | `FloatWindowHeader.tsx`, `ImageUploadPanel.tsx` (exist only in prototype).                                                                                                                                                                                                                              |
| Supabase client      | `studioSupabase` (`src/lib/supabase/studio-client.ts`) points to the **prototype's** Supabase project (`plkhvlnqjihonpzeeybh`) via `NEXT_PUBLIC_STUDIO_SUPABASE_*` envs — NOT relay's production project (`apsfeutbqvgfgznmaesg`).                                                                      |
| Edge function calls  | Relay's `AssetCreatorModal` invokes `generate-copy`, `gemini-generate`, `generate-legenda`, `generate-video`, `check-video-status`, `conversion-scanner`, `generate-carousel` — NONE of which are deployed in relay's Supabase. They resolve because `studioSupabase` calls the prototype's deployment. |
| DB tables referenced | `product_catalog` (via `useProductCatalog.ts`), `image_styles` (referenced by imports), `coworker_avatars`, storage buckets `brand-references`, `temp-videos`, `product-images`, `coworker-avatars`. None exist in relay's migrations.                                                                  |
| Legacy chat route    | `src/app/(dashboard)/chat/page.tsx` redirects to `/dashboard`. `/chat/task/[id]` and `/chat/[id]` exist with working task chat UI. `/tasks/page.tsx` + `task-list.tsx` drive task management.                                                                                                           |

---

## Frontend Delta — Detailed UI/UX Inventory (READ THIS FIRST)

This is the primary gap: the prototype's studio is a visibly richer UI, not just a larger file. The sections below capture everything a user would SEE differently on a side-by-side at `/studio/create` and `/studio`.

### A. Modal chrome & layout (AssetCreatorModal)

- **Floating draggable windows**: Prototype imports `useFloatWindow` hook and the new `FloatWindowHeader` (42 lines) to render draggable panels. Relay has no floating window support. Prototype's modal renders floats at specific slots (product picker, text generator, image position) at `top:24, left:24, zIndex:50`, repositionable by the user.
- **Left sidebar (Visual DNA & references)**: Prototype renders `ImageUploadPanel` (388 lines) as a left rail inside the modal — product image upload zone (drag-drop, thumbnail preview, "Trocar imagem"/X buttons), product catalog grid (4 store products, 36×36 thumbnails, click to select), and reference images slot grid ("Referências visuais (n/5)", max 5, with "Limpar tudo" control). Dark-themed: white text on translucent dark background. Relay has **none** of this.
- **Canvas preview** (both): uses `CanvasPreview.tsx` with `SelectableText` (Figma-style single-click select + double-click edit); prototype's version adds bindings for reference images and visual DNA context.
- **Icon imports (lucide-react)**: Prototype's AssetCreatorModal adds `Play`, `Video`, `ChevronsLeft` beyond relay's set — powering video playback affordances and a collapse control the current relay lacks.
- **Font selector portal**: Prototype has a fixed-position dropdown opened below the font button, with collapsible categories (sans/serif/display/script/handwritten) and each font name rendered in its own family. Relay's font UI is a simpler inline selector.
- **Tone dropdown (text generator)**: Prototype renders a 2-column grid with 10 tone options (direto→, emocional♡, urgência⚡, etc.) with lucide icon + label, selectable to drive "Gerar versões" that pops an inline panel of 4 AI-generated variants with per-item "Usar" buttons on hover.
- **Overlay & creative presets**: Prototype exposes `OVERLAY_PRESETS` (5 entries: none, subtle, medium, strong, warm — each with type solid/gradient, color, opacity, position, preview) and `CREATIVE_PRESETS` (6 font/color presets keyed by keywords like "warm", "baby", "luxury" to auto-pick font family/color/size/shadow). Both feed style selection UI the relay version lacks.
- **Style modal**: Prototype has a large overlay picker (≤680px width, 80vh max height) with 140px min-width cards. Each card shows a gradient preview + "Aa" rendered in the selected font, with colored border for Brand DNA or active selection. Relay's style UI is linear/list-based.

### B. Chat panel (StudioChatPanel) — biggest delta: 1,632 vs 633 lines

- **Qualification flow (NEW in prototype)**: On first user message the chat enters a step machine (`inlineFlow: "pick-product" | "pick-style"`). `ProductPicker` renders a 3-column thumbnail grid (6 products initially with a "load more" button), plus a search box, a free-text fallback ("Ou digite o nome..."), and a skip button per step. After product is picked, `StylePickerMessage` renders a grid of style cards (color swatch + name + hover animations). None of this exists in relay.
- **Inline activity messages**: Prototype activity messages render a 40×40 thumbnail (borderRadius 8, objectFit cover) to the left of title/description/suggestions — clickable for preview — and animate in with a `fadeInUp 0.2s ease`. Relay activity messages are text-only.
- **Welcome suggestions with stagger**: Prototype shows 4 emoji-prefixed action chips ("✦ Gerar imagem que para o scroll", "♡ Lifestyle que gera desejo", etc.) staggered with `animationDelay: ${i * 60}ms` and `chipFadeIn 0.25s ease forwards`. Prototype's welcome is conditional on `!creativeState.hasImage`. Relay has static chips with no animation and no conditional logic.
- **Drag-drop reference image onto chat**: Prototype shows a white drop overlay with centered ImageIcon, main text ("Solte para usar como referência") + subtext, and `-4px` outline-dashed inset. Attached images are tracked as `{dataUrl, base64, mimeType}[]` and previewed inline. Relay has a simpler overlay with no subtext.
- **Expanded `StudioChatPanelRef`**: Prototype exposes `pushQualificationMessage(...)`, `pushAssistantMessage(...)`, `pushStylePickerMessage(...)`, `setMessages(...)` (plus 3 more). Relay only has 3 methods. The modal's parent cannot steer the chat without these.
- **Expanded `CreativeState`**: Prototype adds `visualConcept`, `modelGender`, `modelAge`, `modelPose`, `shootingStyle`, `lightingMood`, `colorMood` to inform AI prompts. Relay does not capture any of these.
- **Dual backend in chat**: Prototype calls both `studio-chat` (studio mode) AND `gemini-generate` (agent/doc mode), switching by a flag. Relay only calls `studio-chat`.

### C. ImageUploadPanel (NEW, 388 lines)

- Two stacked sections: "Foto do produto" on top, "Referências visuais (n/5)" below.
- Product section: dashed-border drop zone with Upload icon; on load → 48×48 thumb + "Imagem carregada" label + link-styled "Trocar imagem" + X delete (red tint #EF4444 on hover); below that, a 4-tile product catalog grid (36×36 each) from `store` with checkmark/active-state styling.
- References section: header + conditional "Limpar tudo" button; upload zone matching the product style; 5-slot thumbnail grid, click to preview/delete.
- Drag/drop handlers change border to `rgba(255,255,255,0.4)` and background to `rgba(255,255,255,0.06)`. Disabled state: opacity 0.4, cursor not-allowed.
- `readFilesAsBase64()` utility resolves `ReferenceImage[]` with `{id, dataUrl, base64, mimeType}`.

### D. FloatWindowHeader (NEW, 41 lines)

- Reusable chrome for all floating panels: drag handle on the left (cursor: move), title, X close button on the right. Dark theme styling. Used across 3+ floating contexts in the prototype modal.

### E. SnewStudioHomePage (NEW, 1,043 lines) — the `/studio` landing

- **Outer layout**: `flex; 100vw × 100vh`. Main container: `maxWidth 1100px`, `margin 0 auto`, `padding 52px 40px 80px`, background `hsl(40, 7%, 96%)` (warm beige #F5F2ED). Sections stacked: Header → Hero (chatbox + feature cards) → Templates → Capabilities → History.
- **Hero H1**: "O que criar para {storeName} hoje?" (dynamic from `loadStoreContext()`), fallback "O que você quer criar hoje?". Style: `26px / 500 / #1A1A1A / letterSpacing -0.02em / margin 0 0 24px`.
- **Chatbox**: `maxWidth 580px`, white, `borderRadius 14`, padding `14px 18px`, `minHeight 80`, `box-shadow 0 2px 12px rgba(0,0,0,0.07)`, border `1px solid #E8E8E4`. Textarea: rows 2, placeholder `"Descreva o criativo para {storeName}..."`. Circular submit button 32px, absolute bottom-right, bg `#E0E0DC` (empty) / `#1A1A1A` (filled), `<ArrowUp size={14} />`. Enter (no Shift) fires `goCreate(chatInput.trim())`.
- **6 feature cards row** (Image / Video / Carousel / Copy / Campaign / Report): flex `gap:12`; each card: `flex:1; padding 10px 12px; borderRadius 12; background #FFFFFF; border none`; icon 36×36 inline SVG + label (`12 / 500 / #1A1A1A`); hover bg `#F0F0EE`; animation `fadeSlideUp 0.3s ease both` with `animationDelay: ${i*40}ms` (stagger).
- **Style gallery**: horizontal scroll with chevron arrows (scroll step 696px). `StyleCard` is 216×384, `borderRadius 14`, bg `#E8E6E2`. Dual-layer crossfade slideshow on hover: two absolute `<img>` layers with `opacity 0.25s ease`, interval 650ms, 30ms layer swap. Hover shows dot indicators at `bottom:10` (active dot `14×5`, inactive `5×5`, bg `rgba(255,255,255,0.9)`, radius 99). Gradient fades left/right (60px). Data: `loadImageStyles()` + Supabase `image_styles` table merged with localStorage `STYLES_STORAGE_KEY = "app:styles"`. Staggered card entry `fadeSlideUp 0.35s ease both; animationDelay ${idx*40}ms`. PT category grouping: "Produto isolado / Com pessoa / Detalhe / Campanha / Composição". Click → `/studio/create` with `{autoPrompt, styleId, styleName, styleDesc}`.
- **Capabilities grid**: `repeat(3, 1fr) gap:16`. Cards 220px min-height, `borderRadius 20`. Background uses `getGradient(skill)` from `config/designSystem.tsx` (5 gradient families: Sage Haze / Dusk Rose / Aurora / Mist / Blue Dusk — each with `card`, `bubble`, `ink` tokens). Framer motion: `initial {opacity:0, scale:.97}`, `animate {opacity:1, scale:1}`, `exit {opacity:0, scale:.97}`, `transition {duration:.18}`, `whileHover {backgroundPosition:"100% 100%"}` (gradient shift .9s). Filter tabs: All / Campaigns / Content / Analytics / Retention (active `bg #1A1A1A / text #FFFFFF`, inactive `border 1px #E0E0DC / color #888`). 12 capabilities, show 6 initially + "Ver mais". Each card carries `autoPrompt` dynamic with store context. Uses `<AnimatePresence mode="popLayout">` for smooth filter reflow.
- **History grid**: `repeat(4, 1fr) gap:12`, `slice(0,3)` on home (full view on `/studio/create?openBoard=true`). Card `aspectRatio 3/4`, white bg, `borderRadius 16`; image overlay at `opacity 0.18 objectFit cover`; `<video muted playsInline />` supported. Metadata bottom: type label (11px uppercase #888), title (15 / 600 / #1A1A1A), timeAgo (11 / #BBB). Hover `translateY(-3px) boxShadow 0 8px 24px rgba(0,0,0,0.10)`. Empty state: centered Clock icon (32px, opacity .5) + "Seus criativos aparecerão aqui depois de gerados". Data: localStorage `snew_asset_history_{storeSlug}` (cap 50, from `getHistoryKey()`); `migrateLegacyHistory()` runs on mount. Click `openItem()` → `/studio/create` with `location.state.restoreItem`.
- **Cross-tab sync**: `window.addEventListener("storage", ...)` keeps history + styles in sync across tabs (no polling).

### F. Animations & transitions — unique to prototype

- Slideshow crossfade (650ms interval, 0.25s opacity)
- Chip stagger (60ms delay per chip, `chipFadeIn` 0.25s)
- Activity fade-in (`fadeInUp` 0.2s)
- Font-portal drop-in (`dropIn` 0.15s)
- Loading bar (`loadingBar 8s ease-out forwards`, `loadingShimmer 2s linear infinite`)
- Framer motion on capability cards (gradient shift on hover, AnimatePresence popLayout on filter)
- Feature cards / style cards: `fadeSlideUp` with staggered `animationDelay`

### G. Top-10 concrete UX differences a user will notice

1. **Floating product selector** appears as a draggable window on "Selecionar produto" — not a modal.
2. **Visual DNA left rail** with product upload + 5 reference image slots.
3. **Chat qualification**: first prompt opens an inline 3-column product picker with search + load-more + skip.
4. **Inline style picker cards** in chat (swatch + name) instead of text suggestions.
5. **Home gallery hover slideshow** with dual-layer crossfade + dot indicators.
6. **Chat welcome chips** animate in with staggered fade; conditional on canvas being empty.
7. **Drag image onto chat** shows a polished white overlay with 2 lines of copy.
8. **Font selector** opens a portal dropdown with collapsible category sections, each font rendered in its own family.
9. **Text tone dropdown** is a 2-column grid of icon+label; "Gerar versões" spawns a panel of 4 AI drafts with per-row "Usar".
10. **Style modal** is a premium grid overlay (preview gradient + "Aa" in selected font) rather than a list.
11. **Activity cards in chat** include a 40×40 thumbnail that opens a preview.
12. **`/studio` home** exists — 1,043 lines of hero + gallery + capabilities + history (today relay has a 40-line wrapper that goes straight into the modal).

### Prototype state (source of truth)

| Route               | Component                              | Purpose                                                                                                                                                          |
| ------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/studio` (and `/`) | `SnewStudioHomePage.tsx` (1,043 lines) | Landing: hero chatbox + feature cards + 20+ style gallery with hover-slideshow + creation history grid + capability suggestion cards.                            |
| `/studio/create`    | `SnewStudioPage.tsx` (50 lines)        | Wraps `AssetCreatorModal` in embedded mode with AppSidebar, receives `location.state` (autoPrompt, openBoard, restoreItem, styleId/Name/Desc, \_ts remount key). |
| `/studio/calendar`  | `PostCalendarPage.tsx`                 | Scheduled posts calendar (secondary).                                                                                                                            |

Edge functions deployed in prototype's Supabase (11 total):

- `studio-chat` (311 lines — creative director persona, aggressive action execution, product anchoring, brand adaptation)
- `gemini-generate` (image generation + multimodal analysis)
- `generate-copy` (headline/description/CTA text)
- `generate-carousel` (multi-slide carousel generation)
- `generate-video` (submit video generation job)
- `check-video-status` (poll video job)
- `generate-legenda` (Portuguese social captions)
- `freepik-generate`, `freepik-icon` (stock integrations)
- `convert-video` (format conversion)
- `conversion-scanner` (conversion analysis)

Relay edge functions today: `studio-chat` (245 lines, older prompt — NOT used at runtime since studioSupabase routes to prototype), `mcp-tools`, `generate-seasonal-*`, `_shared`.

### DB schema dependencies (from prototype migrations)

| Object                                                                                                                                                                        | Kind    | Status in relay                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `image_styles` table (id, name, category, prompt_base, negative_prompt, thumbnail_url, icon, color, build_prompt_template, is_active, sort_order, hover_images[], timestamps) | Table   | Missing                                                                                    |
| `product_catalog` table (id, product_id, name, sku, image_url, timestamps)                                                                                                    | Table   | Missing (but referenced in `useProductCatalog.ts`)                                         |
| `coworker_avatars` table (coworker_id, avatar_url, timestamps)                                                                                                                | Table   | Missing (may not be required by studio)                                                    |
| `brand-references` bucket                                                                                                                                                     | Storage | Missing (spec 065 notes says uploaded to `snew-assets`; prototype uses `brand-references`) |
| `temp-videos` bucket                                                                                                                                                          | Storage | Missing                                                                                    |
| `product-images` bucket                                                                                                                                                       | Storage | Missing (relay has `chat-uploads`)                                                         |
| `coworker-avatars` bucket                                                                                                                                                     | Storage | Missing                                                                                    |

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Pixel-identical `/studio/create` experience (Priority: P1)

**As a Snew user**, when I open `/studio/create` (from home, a style card, or a restored history item), I get the exact same creator workspace that exists in the prototype at `http://localhost:8080/studio/create`: the full `AssetCreatorModal` with side chat panel, progressive canvas, style/product/overlay controls, visual DNA, reference image uploader, and floating windows.

**Why this priority**: This is the core deliverable. Every other story depends on the modal being operational at parity. Without it, the studio cannot replace chat/task.

**Independent Test**: Navigate side-by-side (`localhost:3000/studio/create` vs `localhost:8080/studio/create`) with an identical seed prompt. The DOM, controls, and outputs must match. Every "action" the chat fires (generate_image, set_style, set_channel, set_heading, etc.) must render identically.

**Acceptance Scenarios**:

1. **Given** I land on `/studio/create?autoPrompt=criar+post+dia+dos+pais`, **When** the modal mounts, **Then** the chat panel auto-sends the prompt and the canvas populates exactly as in the prototype.
2. **Given** I upload a reference image via the Image Upload Panel, **When** I generate a new image, **Then** the prompt includes the reference and the result mirrors the prototype.
3. **Given** I select a brand-DNA style, **When** the chat pushes a style-picker message, **Then** the picker renders inline (prototype parity) and applying it updates the creative state.

---

### User Story 2 — Studio landing at `/studio` (Priority: P1)

**As a Snew user**, when I open `/studio`, I see the `SnewStudioHomePage` equivalent: hero chatbox with store-personalized H1, horizontal scrollable gallery of 20+ image styles (with hover slideshow), creation history grid (search + type filter), and capability suggestion cards. Clicking anything routes to `/studio/create` with the correct state.

**Why this priority**: Users arriving to `/studio` from the sidebar need a launcher, not a blank modal. Without the home page, the prototype's discovery/history flow is lost.

**Independent Test**: Visit `/studio`, verify hero, gallery, history, and cards render. Click a style → lands on `/studio/create` with `styleId/styleName/styleDesc` threaded through. Click a history item → restores its state (product, chat messages, generated images).

**Acceptance Scenarios**:

1. **Given** I have `brand_dna.store_name="Milkes"`, **When** I open `/studio`, **Then** the H1 reads "O que criar para Milkes hoje?" (prototype parity).
2. **Given** I hover a style card, **When** more than one image exists for that style, **Then** the dual-layer crossfade slideshow cycles at 650ms intervals (as in prototype).
3. **Given** I have 10 items in localStorage history, **When** I open `/studio`, **Then** all 10 render in a grid, are filterable by type (Todos/Imagens/Vídeos/Carrosséis), and clicking one navigates to `/studio/create` with `restoreItem` state.

---

### User Story 3 — Studio becomes the replacement for chat/task (Priority: P1)

**As a Snew user**, the legacy `/chat` and `/chat/task/[id]` flow is superseded by studio. New conversations start at `/studio` (or `/studio/create`). Existing task/chat entry points redirect to the studio equivalent. The sidebar "Chat" / "Tarefas" items route to `/studio`.

**Why this priority**: This is the stated goal — "o studio irá substituir toda a estrutura de chat que temos hoje". Without the redirect/replacement, users continue on the old flow.

**Independent Test**: The sidebar's primary creation/chat affordance points at `/studio`. Visiting `/chat` or `/chat/task/[id]` redirects to the studio equivalent (restoring task context when possible). No feature regression in task persistence, conversation history, or artifact retrieval.

**Acceptance Scenarios**:

1. **Given** the sidebar, **When** I click the "nova criação" / chat entry, **Then** I land at `/studio` (not `/chat` or `/dashboard`).
2. **Given** an existing task URL `/chat/task/<id>`, **When** I open it, **Then** I see the studio modal at `/studio/create` with the task's conversation + artifact state restored (or a graceful fallback that explains the migration).
3. **Given** conversation persistence today relies on `conversations` + `conversation_messages`, **When** studio-based sessions persist, **Then** they write to the same (or clearly migrated) tables so no history is lost.

---

### User Story 4 — Studio backend runs on relay's Supabase (Priority: P2)

**As a team**, studio should read/write to relay's production Supabase (`apsfeutbqvgfgznmaesg`) — not the prototype's. Both the edge functions and the DB tables it depends on (`image_styles`, `product_catalog`, storage buckets) must live in relay's project with proper migrations and RLS.

**Why this priority**: Running studio against the prototype DB is a hidden coupling: the prototype can be wiped, envs can rotate, and multi-tenant isolation is impossible. This must be fixed before wider rollout, but P1 stories can ship against the prototype DB for continuity.

**Independent Test**: Flip `studioSupabase` to use relay's credentials. All chat, image, video, and carousel flows still work. Migrations exist in `supabase/migrations/` for every table and bucket. Edge functions are deployed in relay.

**Acceptance Scenarios**:

1. **Given** the env `NEXT_PUBLIC_STUDIO_SUPABASE_URL` is removed, **When** studio loads, **Then** it uses the main `createClient()` against `apsfeutbqvgfgznmaesg` and all flows work.
2. **Given** relay's Supabase, **When** I run `list_migrations`, **Then** I see migrations for `image_styles`, `product_catalog`, `brand-references`, `temp-videos`, `product-images`, `coworker-avatars`.
3. **Given** relay's Supabase, **When** I run `list_edge_functions`, **Then** `studio-chat` (updated), `gemini-generate`, `generate-copy`, `generate-carousel`, `generate-video`, `check-video-status`, `generate-legenda`, `conversion-scanner`, `freepik-generate`, `freepik-icon`, `convert-video` are all deployed.

---

### User Story 5 — History, DNA, and KB integration (Priority: P2)

**As a user**, my creation history, visual DNA references, and store knowledge base (`KnowledgeBasePage`'s `loadStoreContext`, `loadBrandReferencesBase64`) are available inside studio — not just the modal, but also for AI prompts (product anchoring, brand-context injection).

**Why this priority**: The prototype's AI quality depends on these context builders. Without them, the relay studio chat gives generic output.

**Independent Test**: With a Brand DNA configured (`brand_dna.store_name`, `store_niche`, `store_tone`), generate any image. The request body must include `storeName`, `storeNiche`, `storeTone`, `storeKeywords`, `storeProducts`, `storeColors` — matching the prototype's `studio-chat` contract.

**Acceptance Scenarios**:

1. **Given** I configured Brand DNA, **When** the chat calls `studio-chat`, **Then** `creativeState` includes the brand fields and the LLM response anchors the prompt to the brand product.
2. **Given** I have visual DNA references uploaded, **When** I generate an image, **Then** up to 4 reference images (by priority weight) are attached to the `gemini-generate` request.
3. **Given** I create an image/video/carousel, **When** it finishes, **Then** it is saved to localStorage under `getHistoryKey()` with a 50-item cap (prototype parity).

---

### User Story 6 — Calendar & scheduled posts (Priority: P3)

**As a user**, I can access `/studio/calendar` to see scheduled posts across channels. Studio's `Schedule` action writes to the same store as the calendar reads from.

**Why this priority**: Post-MVP; nice-to-have once core studio is live.

**Independent Test**: From studio, schedule a post. Navigate to `/studio/calendar` and see the scheduled item on the correct date.

**Acceptance Scenarios**:

1. **Given** I clicked "Schedule" in studio, **When** I pick a date and save, **Then** `/studio/calendar` shows the item on that date.

---

### Edge Cases

- **Missing Brand DNA**: Home H1 falls back to "O que você quer criar hoje?"; studio-chat omits the brand section of the system prompt.
- **`studioSupabase` env missing**: Must fail loudly with a clear message directing the dev to set `NEXT_PUBLIC_STUDIO_SUPABASE_URL` and `NEXT_PUBLIC_STUDIO_SUPABASE_ANON_KEY` (or follow the P2 migration to relay's main Supabase).
- **Deep-link to `/studio/create` without state**: Renders an empty studio modal; chat accepts the first user message as the seed.
- **Reference image > 10 MB**: `ImageUploadPanel` validates and rejects (prototype parity).
- **Legacy task URL**: `/chat/task/[id]` must redirect gracefully — either opens studio with the legacy task context loaded, or shows a banner explaining the migration.
- **Video polling stalls**: `check-video-status` returns an error after N attempts → surface a toast with a retry.

## Requirements _(mandatory)_

### Functional Requirements

**Routes and Pages**

- **FR-001**: Relay MUST expose `/studio/create` as a dedicated route rendering an `AssetCreatorModal`-based page equivalent to prototype `SnewStudioPage`. Next.js translation: `src/app/(dashboard)/studio/create/page.tsx`.
- **FR-002**: Relay MUST expose `/studio` as the studio landing page, equivalent to prototype `SnewStudioHomePage`. Replaces current direct modal wrapper at `src/app/(dashboard)/studio/page.tsx`.
- **FR-003**: Relay MUST support `/studio/calendar` (P3) as equivalent to prototype `PostCalendarPage`.
- **FR-004**: All `location.state` patterns from the prototype (autoPrompt, openBoard, restoreItem, styleId, styleName, styleDesc, \_ts) MUST be supported in Next.js via `searchParams` + `sessionStorage` bridge (URL for simple keys, storage for complex payloads like `restoreItem`).

**Component Parity**

- **FR-005**: Copy `AssetCreatorModal.tsx` (12,846 lines) from prototype to `src/components/asset-studio/AssetCreatorModal.tsx` with Next.js adjustments only: `'use client'` directive; swap `react-router-dom` navigation → `next/navigation`; swap `@/integrations/supabase/client` → the chosen supabase client (studioSupabase for P1, main client for P2).
- **FR-006**: Copy `StudioChatPanel.tsx` (1,632 lines) with the same adjustments. MUST expose the full `StudioChatPanelRef` interface (pushAssistantMessage, pushQualificationMessage, pushStylePickerMessage, setMessages, plus any additional methods present in the prototype).
- **FR-007**: Copy the 10 remaining `asset-studio/` files (CanvasPreview, FontCategorySelector, Step1Campaign, Step2Products, Step3Studio, Step4Export, StudioProgressBar, StudioSidebar, StudioTopBar) so they match the prototype byte-for-byte (minus necessary Next.js adjustments).
- **FR-008**: Add the two missing components — `FloatWindowHeader.tsx` (41 lines) and `ImageUploadPanel.tsx` (388 lines) — with the same adjustments.

**Supporting Config & Data**

- **FR-009**: Port `src/config/imageStyles.ts` (loadImageStyles, ImageStyleOption, STYLES_STORAGE_KEY, seeds) from prototype.
- **FR-010**: Port `src/config/storeContext.ts` (buildKBInline, buildBrandContextBody) and `loadStoreContext` / `loadBrandReferencesBase64` from `src/pages/KnowledgeBasePage.tsx`. Relay may either replicate the KnowledgeBasePage module or lift the helpers into `src/lib/studio/` — contents must match.
- **FR-011**: Port any `useFloatWindow` hook, `getGradient` from `config/designSystem`, `historyKey` / `migrateLegacyHistory` helpers used by the landing page.
- **FR-012**: All `/data/*.ts` files referenced (`assetStudioData`, `seasonalCalendar`, `seasonalL3Content`) MUST exist at parity with prototype.

**Supabase Client & Envs**

- **FR-013** (P1): Continue using `studioSupabase` with the prototype's Supabase project for initial rollout. Envs `NEXT_PUBLIC_STUDIO_SUPABASE_URL` and `NEXT_PUBLIC_STUDIO_SUPABASE_ANON_KEY` MUST be documented in `.env.example`.
- **FR-014** (P2): Migrate studio to use relay's main Supabase (`apsfeutbqvgfgznmaesg`). After migration, `studio-client.ts` is removed and all imports use the main `createClient()` helper.

**Database (P2)**

- **FR-015**: Create migration `supabase/migrations/YYYYMMDDHHMMSS_create_image_styles_table.sql` mirroring the prototype schema (see DB table above) including `hover_images text[]` and `updated_at` trigger. Seed with the 20+ styles used by `SnewStudioHomePage` gallery.
- **FR-016**: Create migration for `product_catalog` table (if relay is to own products) OR formally adopt `store_products` as the canonical source and rewire `useProductCatalog.ts` + `ImageUploadPanel` to it. Decision required in /speckit.clarify.
- **FR-017**: Create migrations to provision storage buckets: `brand-references` (public), `temp-videos` (public), `product-images` (public), `coworker-avatars` (public). Each with insert/select/update/delete policies matching the prototype.
- **FR-018**: Decide whether `coworker_avatars` table is required by studio (prototype had it for a legacy coworker UI — likely NOT required for studio-only scope). Mark [NEEDS CLARIFICATION] if unsure.

**Edge Functions (P2)**

- **FR-019**: Deploy to relay's Supabase — and keep at parity with prototype versions of — these 11 edge functions: `studio-chat`, `gemini-generate`, `generate-copy`, `generate-carousel`, `generate-video`, `check-video-status`, `generate-legenda`, `conversion-scanner`, `freepik-generate`, `freepik-icon`, `convert-video`.
- **FR-020**: Update the existing relay `studio-chat/index.ts` (245 lines → 311 lines) to match the prototype's creative-director prompt, product anchoring rule, people/models rules, and style-adaptation logic.
- **FR-021**: Any secrets the functions need (`LOVABLE_API_KEY`, `GEMINI_API_KEY`, `FREEPIK_API_KEY`, etc.) MUST be set in relay's Supabase project secrets and documented in the spec's plan.md.

**Chat/Task Replacement**

- **FR-022**: The sidebar entry labelled "Chat" (or equivalent) MUST point to `/studio`.
- **FR-023**: `src/app/(dashboard)/chat/page.tsx` MUST redirect to `/studio` (replacing the current `/dashboard` redirect).
- **FR-024**: `src/app/(dashboard)/chat/task/[id]/page.tsx` and `src/app/(dashboard)/chat/[id]/page.tsx` MUST either (a) keep working for task-chat flows that are not yet migrated, OR (b) redirect to `/studio/create?restoreTask=<id>` with the necessary state bridge.
- **FR-025**: Conversation persistence: studio's chat messages MUST write to the existing `conversations` + `conversation_messages` tables (per spec 063 hybrid chat API), so no user history is lost. [NEEDS CLARIFICATION if studio keeps a separate store or merges with these.]

**Observability**

- **FR-026**: Studio MUST emit structured telemetry events (chat send, image generate, video generate, style apply, schedule) so the replacement of chat/task can be measured.

### Key Entities

- **StudioSession**: A user's in-progress creation. Holds `CreativeState` (product, style, channel, headings, colors, font, overlay, reference images, visual DNA weights, last prompt). Persisted in localStorage during the session and in `conversation_messages` on send.
- **ImageStyle**: Gallery item (id, name, category, prompt_base, negative_prompt, thumbnail_url, hover_images[], icon, color, build_prompt_template, is_active, sort_order). Defines the style picker and home gallery.
- **CreationHistoryItem**: localStorage record per user with `{id, sessionTitle, type: image|video|document|carousel, imageUrl, chatMessages, createdAt}`. 50-item cap.
- **VisualDNARef**: Base64-encoded brand reference image (id, category, imageUrl, imageBase64, label, isActive, weight 1-3). Used to steer AI generation.
- **ProductCatalogItem**: Product the user selects inside studio (id, product_id, name, sku, image_url). Open question: keep a dedicated `product_catalog` table or consolidate with existing `store_products`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `/studio/create` passes a pixel-diff test against `http://localhost:8080/studio/create` with < 2% delta on main viewports (1440×900, 1280×800, 1024×768) for each of 5 canned scenarios (empty, with product, with style, with carousel, with video).
- **SC-002**: Every `supabase.functions.invoke` call in `src/components/asset-studio/**` (33 sites across AssetCreatorModal + StudioChatPanel) returns a 200 response in end-to-end runs against whichever Supabase project is configured (prototype's for P1, relay's for P2).
- **SC-003**: `/studio` landing page renders under 2s time-to-interactive with 20+ style cards and up to 50 history items (prototype parity baseline measured locally).
- **SC-004**: After P2 migration, zero references to `NEXT_PUBLIC_STUDIO_SUPABASE_*` remain; relay's `list_edge_functions` shows 11 studio-related functions deployed.
- **SC-005**: Legacy entry points (`/chat`, `/chat/task/[id]`) redirect to the studio equivalent with no dead-end (verified by clicking every sidebar item and every chat-linked URL in the last 30 days of telemetry).
- **SC-006**: 100% of the prototype's `StudioChatPanelRef` public methods are implemented; no `TODO` stubs remain in the ported files.

## Open Questions / Clarifications

1. **[NEEDS CLARIFICATION]**: Should studio keep using the prototype's Supabase (P1 fast ship) or migrate to relay's immediately? The trade-off is speed of rollout vs. avoiding the hidden coupling risk.
2. **[NEEDS CLARIFICATION]**: `product_catalog` vs. `store_products` — which is canonical? The prototype's `useProductCatalog.ts` reads `product_catalog`; the relay's current codebase talks about `store_products`. Pick one and consolidate.
3. **[NEEDS CLARIFICATION]**: Chat/conversation persistence in studio: should studio sessions write to `conversations` + `conversation_messages` (spec 063 hybrid chat API), or keep a separate lightweight history in localStorage only?
4. **[NEEDS CLARIFICATION]**: Do we need `coworker_avatars` for studio, or is it pure prototype-era baggage?
5. **[NEEDS CLARIFICATION]**: Existing task chat (`/chat/task/[id]`) has live users — is data migration required, or a hard redirect acceptable?
6. **[NEEDS CLARIFICATION]**: For FR-015, do we seed `image_styles` with the 20+ styles via SQL seed file, or do we upload thumbnails to storage and seed dynamically? Spec 065 uploaded hover images; reuse the bucket or create new.

## Out of Scope

- Rewrites of the ported files beyond Next.js compatibility (App Router, `'use client'`, `next/navigation`). The prototype is the source of truth.
- Redesign of any screen. This is a port, not a redesign.
- Replacement of the existing sidebar or onboarding flows (covered by specs 031, 039, 065).
- Admin CRUD for `image_styles` (out of scope; seed-only for MVP).
- Full migration of historical task-chat conversations (see FR-024, FR-025).

## Dependencies

- Spec 065 (Snew Home Layout) — provides `next/font`, design tokens, and `snew-assets` bucket.
- Spec 063 (Hybrid Chat API) — provides `conversations` + `conversation_messages` tables studio may reuse.
- Spec 064 (Edge Function First Skills) — helpful context for edge function deployment patterns.

## Risk Register

| Risk                                                                                                         | Severity          | Mitigation                                                                                                 |
| ------------------------------------------------------------------------------------------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| AssetCreatorModal is 12k+ lines — harder to refactor during port.                                            | High              | Port file byte-for-byte; use Next.js shims (`'use client'`, router adapter) rather than refactoring.       |
| Hidden runtime dependency on prototype Supabase project.                                                     | High (P2 blocker) | Gate the migration behind a feature-flagged env; validate all 11 edge functions in relay before switching. |
| Drift between existing `chat/task` users and new studio flow.                                                | Medium            | Implement a read-only bridge (FR-024) before cutover; monitor redirect telemetry (SC-005).                 |
| Large prompt payloads from Visual DNA (up to 4 base64 images) may hit edge function timeouts.                | Medium            | Keep `DNA_SYSTEM_INSTRUCTION` + reference images in prompt; monitor function latency.                      |
| `html2canvas` + MP4-muxer differences between prototype (uses `mp4-muxer`) and relay (uses `MediaRecorder`). | Low               | Decide early: either install `mp4-muxer` or accept WebM in relay.                                          |

## Implementation Phases (preview — to be detailed in plan.md)

1. **Phase 0 — Prep**: Inventory diffs; create spec branch (this document); install missing npm deps.
2. **Phase 1 — Port components (P1)**: Copy the 12 `asset-studio/` files and 2 new ones; port `/studio/create` route; port supporting config (`imageStyles`, `storeContext`, helpers, data); verify vs prototype DOM.
3. **Phase 2 — Port home (P1)**: Copy `SnewStudioHomePage` into `src/app/(dashboard)/studio/page.tsx`; verify gallery + history + cards.
4. **Phase 3 — Chat/task replacement (P1)**: Wire sidebar to `/studio`; redirect `/chat` → `/studio`; decide on task-chat bridge (FR-024).
5. **Phase 4 — Backend migration (P2)**: Create DB migrations; deploy 11 edge functions to relay; flip `studioSupabase` to main client; decommission prototype-only envs.
6. **Phase 5 — Calendar & cleanup (P3)**: Port `/studio/calendar`; delete dead code from old chat/task flow after 1 release of monitoring.
