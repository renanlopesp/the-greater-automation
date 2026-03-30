# Tasks: Home Page Layout Redesign V2

**Branch**: `feat/layout-redesign-v2` | **Plan**: [plan.md](./plan.md)

## Phase 1: Design System & Foundation

### Task 1.1: Create design system config

- **File**: `src/config/design-system.ts`
- **Action**: Create new file
- **Details**:
  - Export `BRAND` object with base UI tokens (`white`, `surface`, `border`, `borderHov`, `ink`, `inkMuted`, `inkDim`)
  - Export 5 `GradientFamily` objects: `sageHaze`, `duskRose`, `aurora`, `mist`, `blueDusk` (each with `name`, `card`, `bubble`, `ink`, `seed`)
  - Export `categoryGradient` mapping (skill name → gradient family key)
  - Export `getGradient(skillName: string): GradientFamily` helper
  - Export `BubbleAvatar` React component (3-layer holographic sphere: organic texture, main gradient + specular highlight, iridescent border)
  - Export `SVGFilters` component (5 `feTurbulence` + `feDisplacementMap` filter pairs)
  - Export `FLOAT_DURATION` per family for float animation
  - Export types: `BrandGradientKey`, `GradientFamily`
- **Dependencies**: None
- **Acceptance**: `getGradient('Seasonal Calendar')` returns sageHaze family. `BubbleAvatar` renders a colored sphere. Types are strict.

### Task 1.2: Inject SVG filters in dashboard shell

- **File**: `src/components/dashboard-shell-new.tsx`
- **Action**: Modify
- **Details**:
  - Import `SVGFilters` from `@/config/design-system`
  - Add `<SVGFilters />` as the first child inside the outer container (renders once, absolute positioned, zero size)
- **Dependencies**: Task 1.1
- **Acceptance**: SVG filter elements (`#snew-f-sageHaze`, etc.) are present in the DOM when inspecting the dashboard.

### Task 1.3: Add snew-float keyframe animation

- **File**: `src/app/globals.css`
- **Action**: Modify
- **Details**:
  - Add `@keyframes snew-float` with a subtle vertical float effect (e.g., `translateY(-2px)` at 50%)
- **Dependencies**: None
- **Acceptance**: `.snew-float` or `animation: snew-float` works in browser.

---

## Phase 2: Home Page Core

### Task 2.1: Create HeroRotatingTitle component

- **File**: `src/components/home/hero-rotating-title.tsx`
- **Action**: Create new file
- **Details**:
  - `"use client"` directive
  - Hardcoded `HEADLINES` array (5 strings from spec)
  - `useState` for current index, `useEffect` with 5s `setInterval`
  - Start at random index: `Math.floor(Math.random() * HEADLINES.length)`
  - framer-motion `AnimatePresence mode="wait"` with `motion.p`
  - Animation: `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`, `exit={{ opacity: 0 }}`, `transition={{ duration: 0.2 }}`
  - Container: `flex flex-col items-center`, `minHeight: 30px`
  - Text: `fontSize: 20px`, `fontWeight: 500`, `color: #2C2A25`, `textAlign: center`
- **Dependencies**: None
- **Acceptance**: Title fades between messages every 5 seconds. No layout shift.

### Task 2.2: Update AskBarNew to match prototype

- **File**: `src/components/home/ask-bar-new.tsx`
- **Action**: Modify
- **Details**:
  - Outer wrapper: add `maxWidth: 680px`, `width: 100%`, center alignment
  - Input wrapper: `borderRadius: 16px` (keep rounded-2xl or set explicitly), `boxShadow: 0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)`, `bg-background` (not `bg-muted/50`)
  - Focus state: `borderColor: hsl(var(--foreground) / 0.15)`, stronger shadow `0 4px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)`
  - Remove `style={{ borderColor: 'transparent' }}` override
  - Update placeholder: `"Pergunte sobre campanhas, copies, assets, dados..."`
  - Textarea padding: `px-5 pt-4 pb-3` (keep current `px-5 pt-5 pb-3`, adjust to `pt-4`)
  - Send button: keep current (32px circle, ArrowUp icon, conditional colors)
- **Dependencies**: None
- **Acceptance**: Input matches prototype at 680px width with subtle shadow and focus ring.

### Task 2.3: Update QuickSuggestions to match prototype

- **File**: `src/components/home/quick-suggestions.tsx`
- **Action**: Modify
- **Details**:
  - Container: change `mt-4 flex flex-wrap items-center gap-2` to `flex flex-wrap justify-center gap-2` (remove mt-4, add justify-center)
  - Chips: `fontSize: 13px` (was 12), `padding: 6px 16px` (was px-3.5 py-1.5), `color: #6B6760`, `border: 1px solid #E5E3DC`, `borderRadius: 100px`
  - Hover: `color: #2C2A25`, `borderColor: #C2BFB5`
- **Dependencies**: None
- **Acceptance**: Chips are centered, 13px text, pill-shaped, with hover color change.

### Task 2.4: Update DashboardPage layout

- **File**: `src/app/(dashboard)/dashboard/page.tsx`
- **Action**: Modify
- **Details**:
  - Import new components: `HeroRotatingTitle`, `ActivityCards`, `SkillActionsGrid`
  - Change `max-w-[720px]` to `maxWidth: 880px`
  - Change padding: `px-6 py-12` to `padding: 64px 32px 48px`
  - Change gap: `gap-12` to `gap: 64px` (or `gap-16` = 64px)
  - Add `alignItems: center` to flex container
  - Wrap hero section: `HeroRotatingTitle` + `AskBarNew` + `QuickSuggestions` inside a `maxWidth: 680px` wrapper
  - Add dividers between sections: `<div style={{ width: '100%', height: 1, background: 'hsl(var(--border))' }} />`
  - Replace `ActivityFeed` with `ActivityCards`
  - Replace `ActiveSkillsRow` with `SkillActionsGrid`
- **Dependencies**: Tasks 2.1, 2.2, 2.3
- **Acceptance**: Page shows 3 sections separated by dividers, centered at 880px.

---

## Phase 3: Activity & Skills Sections

### Task 3.1: Create ActivityCards component

- **File**: `src/components/home/activity-cards.tsx`
- **Action**: Create new file
- **Details**:
  - Server Component (no `"use client"` needed — static mock data with Link for navigation)
  - Hardcoded `AUTONOMOUS_CARDS` array (3 items from spec)
  - Section title: "O que o Snew fez pela sua loja", `fontSize: 18px`, `fontWeight: 600`, `textAlign: center`, `marginBottom: 6px`
  - 3-column grid: `display: grid`, `gridTemplateColumns: repeat(3, 1fr)`, `gap: 12px`
  - Each card: `bg: var(--artifact-bg, #f7f6f3)`, `border: 1px solid hsl(var(--border))`, `borderRadius: 16px`, `padding: 20px`, `minHeight: 100px`, `cursor: pointer`
  - Card text: `fontSize: 14px`, `fontWeight: 500`, `color: hsl(var(--foreground))`
  - Use Next.js `Link` or `onClick` + `useRouter` for navigation
- **Dependencies**: None
- **Acceptance**: 3 cards render horizontally with correct bg, border-radius, and text.

### Task 3.2: Create SkillActionsGrid component

- **File**: `src/components/home/skill-actions-grid.tsx`
- **Action**: Create new file
- **Details**:
  - `"use client"` directive (needs useState for filter, framer-motion for animations)
  - Import `getGradient` from `@/config/design-system`
  - Hardcoded `CARDS` array (12 items from spec) and `FILTER_TABS` array
  - `useState<FilterTab>('all')` for active filter
  - Filter logic: `cards.filter(c => activeFilter === 'all' || c.category.includes(activeFilter))`
  - Section title: "What Snew can do for you", `fontSize: 16px`, `fontWeight: 500`, centered
  - Filter tabs: `flex`, `justifyContent: center`, `gap: 8px`, `marginBottom: 20px`
    - Active: `bg: hsl(var(--foreground))`, `color: hsl(var(--background))`, `border: 1px solid hsl(var(--foreground))`
    - Inactive: transparent bg, `color: hsl(var(--muted-foreground))`, `border: 1px solid hsl(var(--border))`
    - Both: `fontSize: 13px`, `borderRadius: 100px`, `padding: 6px 16px`
    - Hover (inactive): `borderColor: hsl(var(--foreground) / 0.3)`, `color: hsl(var(--foreground))`
  - Grid: `display: grid`, `gridTemplateColumns: repeat(3, 1fr)`, `gap: 16px`
  - Each card uses `motion.div` with:
    - `layout`, `initial={{ opacity: 0, scale: 0.97 }}`, `animate={{ opacity: 1, scale: 1 }}`, `exit={{ opacity: 0, scale: 0.97 }}`, `transition={{ duration: 0.18 }}`
    - `borderRadius: 20px`, `overflow: hidden`, `minHeight: 220px`
    - `background: grad.card`, `backgroundSize: 200% 200%`, `backgroundPosition: 0% 0%`
    - Hover: `backgroundPosition: 100% 100%`, `transition: background-position 0.9s ease`
  - Card content top area: `padding: 28px 28px 0`
    - Skill label: `fontSize: 10px`, `fontWeight: 600`, `letterSpacing: 0.04em`, `color: grad.ink`, `opacity: 0.5`, `marginBottom: 10px`
    - Title: `fontSize: 17px`, `fontWeight: 500`, `lineHeight: 1.25`, `letterSpacing: -0.01em`, `color: grad.ink`
  - Decorative glow area (bottom): `flex: 1`, `marginTop: 20px`, `position: relative`, `overflow: hidden`, `minHeight: 100px`
    - Glow 1: `position: absolute; bottom: -30%; left: 50%; transform: translateX(-50%); width: 80%; height: 120%; border-radius: 50%; background: radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, transparent 70%)`
    - Glow 2: `position: absolute; top: 10%; right: -10%; width: 60%; height: 60%; border-radius: 50%; background: radial-gradient(ellipse, rgba(255,255,255,0.25) 0%, transparent 65%)`
  - Footer: "Mostrando {filteredCards.length} ações disponíveis", `fontSize: 12px`, `color: hsl(var(--muted-foreground))`, `textAlign: center`, `marginTop: 24px`
  - Navigation on click: `useRouter().push(card.route)`
- **Dependencies**: Task 1.1 (design-system.ts)
- **Acceptance**: 12 cards render with correct gradients. Filtering works. Cards animate on filter change. Hover shifts gradient. Footer count updates.

---

## Phase 4: Sidebar & Header

### Task 4.1: Update sidebar nav items

- **File**: `src/components/layout/app-sidebar-new.tsx`
- **Action**: Modify
- **Details**:
  - Replace nav items array:
    - Keep: Home (`Home` icon), New Chat (`Plus` icon), Skills (`Cpu` icon)
    - Add: Tarefas (`ClipboardList` icon from lucide-react), position 4
    - Change: Apps (`AppWindow` icon from lucide-react), position 5
    - Remove: History (`Clock` icon)
  - Import `ClipboardList`, `AppWindow` from lucide-react
  - Update `isActive` function for `/tarefas` path
- **Dependencies**: None
- **Acceptance**: Sidebar shows 5 items: Home, New Chat, Skills, Tarefas, Apps.

### Task 4.2: Update sidebar skill pills with BubbleAvatar orbs

- **File**: `src/components/layout/sidebar-skill-pills.tsx`
- **Action**: Modify
- **Details**:
  - Import `BubbleAvatar` from `@/config/design-system`
  - Replace emoji text indicators with `<BubbleAvatar skillName={skill.name} size={20} animated={false} />`
  - Update skill list to: Seasonal Calendar, Copywriter, Image Generator, Social Asset Creator
  - Collapsed state: show only the 20px orbs
  - Expanded state: orb + skill name text
- **Dependencies**: Task 1.1 (design-system.ts), Task 1.2 (SVG filters injection)
- **Acceptance**: Sidebar shows 4 colored orb bubbles instead of emoji.

### Task 4.3: Add credits section to sidebar

- **File**: `src/components/layout/app-sidebar-new.tsx`
- **Action**: Modify
- **Details**:
  - Add bottom section (before settings) with:
    - `Zap` icon from lucide-react (or similar credit icon)
    - Text: "847 credits remaining" (mock)
    - "Upgrade" button: pill style, `border: 1px solid hsl(var(--border))`
  - Collapsed: show only Zap icon
  - Expanded: icon + text + upgrade button
- **Dependencies**: None
- **Acceptance**: Credits section visible at bottom of sidebar in both collapsed/expanded states.

### Task 4.4: Simplify TopBar

- **File**: `src/components/layout/top-bar.tsx`
- **Action**: Modify
- **Details**:
  - Remove: Feedback button, Support button, Folder icon button, theme toggle (keep in settings dialog)
  - Keep/update: Bell notification button with red dot (`6px`, `#e24b4a`, `1.5px` background border)
  - Keep/update: User avatar (`28px`, `border-radius: 50%`, `bg: hsl(217 70% 55%)`, white text initials, `fontSize: 11px`, `fontWeight: 600`)
  - Remove: `border-b` class from header (no bottom border)
- **Dependencies**: None
- **Acceptance**: Header shows only bell icon (with red dot) and user avatar. No bottom border.

---

## Phase 5: Visual QA

### Task 5.1: Screenshot comparison with prototype

- **Action**: Visual testing
- **Details**:
  - Open prototype (`localhost:8080`) and relay (`localhost:3000/dashboard`) side by side
  - Compare section by section using Playwright screenshots:
    1. Hero + chat input area
    2. Suggestion chips
    3. Activity cards
    4. Filter tabs
    5. Skill cards grid (scroll down)
    6. Sidebar (collapsed)
    7. Header
  - Document any discrepancies
- **Dependencies**: All previous tasks complete
- **Acceptance**: Visual match with prototype within 2px tolerance for spacing, exact color match for gradients and text.

### Task 5.2: Fix visual discrepancies

- **Action**: Bug fixes
- **Details**: Fix any spacing, color, typography, or layout issues found in Task 5.1
- **Dependencies**: Task 5.1
- **Acceptance**: All sections match prototype pixel-for-pixel.

### Task 5.3: Build verification

- **Action**: Run `bun run build` and `bun run lint`
- **Dependencies**: All code tasks complete
- **Acceptance**: Zero build errors, zero lint warnings.
