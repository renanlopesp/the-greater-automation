# Quickstart: Home Page Layout Redesign V2

## Prerequisites

- Node.js 22+ / Bun
- Relay project cloned and dependencies installed (`bun install`)
- Dev server running (`bun dev`) at `localhost:3000`
- Prototype running (`cd ~/Projects/snew-ai-core && npm run dev`) at `localhost:8080` for visual comparison

## Development Flow

### 1. Start the dev server

```bash
cd ~/Projects/relay
bun dev
```

### 2. Open both apps side by side

- **Prototype** (reference): `http://localhost:8080/`
- **Relay** (implementation): `http://localhost:3000/dashboard`

### 3. Implementation order

Follow the phases in `plan.md`:

1. **Design system** → `src/config/design-system.ts` + SVG filters injection
2. **Home page core** → Hero title, ask bar updates, suggestion chips, page layout
3. **Activity & Skills** → Activity cards, skill actions grid with filter tabs
4. **Sidebar & Header** → Nav items, orb icons, credits, simplified header
5. **Visual QA** → Compare screenshots pixel-by-pixel

### 4. Key files to reference

| Prototype file                                          | Purpose                               |
| ------------------------------------------------------- | ------------------------------------- |
| `~/Projects/snew-ai-core/src/config/designSystem.tsx`   | BRAND tokens, gradients, BubbleAvatar |
| `~/Projects/snew-ai-core/src/pages/Home.tsx`            | Full page with inline styles          |
| `~/Projects/snew-ai-core/src/components/AppSidebar.tsx` | Sidebar structure                     |
| `~/Projects/snew-ai-core/src/components/TopBar.tsx`     | Header structure                      |
| `~/Projects/snew-ai-core/src/index.css`                 | CSS variables, animations             |

### 5. Visual QA checklist

- [ ] Hero title rotates every 5 seconds with cross-fade
- [ ] Chat input has 680px max-width, 16px border-radius, subtle shadow
- [ ] 3 suggestion chips with correct pill styling
- [ ] Activity section has 3 horizontal cards with bg `#f7f6f3`
- [ ] Skill grid shows 12 cards in 3 columns with correct gradients
- [ ] Filter tabs work (All/Campaigns/Content/Analytics/Retention)
- [ ] Card hover effect shifts gradient smoothly (0.9s)
- [ ] Sidebar shows Tarefas nav item with ClipboardList icon
- [ ] Sidebar skill shortcuts use BubbleAvatar orbs (not emoji)
- [ ] Header shows only bell (with red dot) + avatar (blue circle)
- [ ] Main content centered at 880px max-width with 64px section gap
- [ ] Dividers between sections are 1px height, border color

## Useful commands

```bash
bun dev          # Start dev server
bun run build    # Verify production build
bun run lint     # Check for lint errors
```
