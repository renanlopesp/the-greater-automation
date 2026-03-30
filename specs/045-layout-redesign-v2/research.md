# Research: Home Page Layout Redesign V2

## R1: Gradient CSS in Tailwind v4

**Decision**: Use inline `style={{}}` for gradient backgrounds, define hex values in `src/config/design-system.ts`.

**Rationale**: Tailwind v4 CSS-first config doesn't support arbitrary multi-stop linear gradients with specific hex colors as utility classes. The 5 gradient families have 3+ color stops each with specific angles (145deg-160deg). Defining these as inline styles in a centralized config file keeps them maintainable without bloating the CSS.

**Alternatives considered**:

- CSS custom properties for each gradient stop → too many variables (5 families × 3 stops × 2 types = 30+ variables)
- Tailwind plugin → over-engineering for 5 static gradients
- `@apply` in globals.css → breaks the "config as code" pattern

## R2: framer-motion AnimatePresence for text rotation

**Decision**: Use `framer-motion` `AnimatePresence` with `mode="wait"` for hero title cycling.

**Rationale**: Already installed (v12.33+). Prototype uses exact same pattern. Cross-fade is smooth (opacity 0→1, duration 0.2s). Alternative CSS-only approach would require keyframe complexity for 5 rotating texts.

**Alternatives considered**:

- CSS `@keyframes` with opacity cycling → complex timing for N texts, no dynamic count
- `react-transition-group` → extra dependency, less ergonomic

## R3: SVG feTurbulence filters for BubbleAvatar

**Decision**: Inject SVG filter definitions once in the dashboard shell, reference via `url(#snew-f-{family})`.

**Rationale**: SVG filters create the organic/holographic texture effect on bubble avatars. They must be in the DOM to be referenced by CSS. Injecting once at the shell level avoids duplication.

**Alternatives considered**:

- CSS `filter` with backdrop-filter → can't replicate feTurbulence displacement
- Canvas-based rendering → over-engineering for 20px decorative orbs
- Skip organic texture, use plain gradients → loses visual fidelity with prototype

## R4: Server Components vs Client Components

**Decision**: Split the Home page into Server and Client components:

- **Server**: `DashboardPage` (layout wrapper), `ActivityCards` (static mock data)
- **Client**: `HeroRotatingTitle` (useEffect interval), `AskBarNew` (useState for input), `SkillActionsGrid` (useState for filter), `QuickSuggestions` (useRouter for navigation)

**Rationale**: Minimize client-side JavaScript. Static mock sections don't need hydration. Only interactive sections need `"use client"`.

**Alternatives considered**:

- Entire page as client component → unnecessary JS bundle for static sections
- RSC with client islands → current approach already does this naturally

## R5: Activity cards gap discrepancy

**Decision**: Use `gap: 12px` for activity cards (not 16px).

**Rationale**: Prototype source code (`AutonomousSection`) uses `gap: 12` in the 3-column grid. Computed styles from Playwright confirmed this. The skill cards grid uses `gap: 16px` — these are intentionally different.
