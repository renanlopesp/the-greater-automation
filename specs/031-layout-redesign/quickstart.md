# Quickstart: Layout Redesign & Full Page Conversion

**Branch**: `031-layout-redesign`

## Prerequisites

- Node.js 22+ and bun installed
- Relay project cloned at `/home/renanl/Projects/relay/`
- Vite prototype available at `/home/renanl/Projects/snew-agent-mind/` (reference only)
- Screenshots captured at `screenshots/` (10 PNG files)

## Setup

```bash
# Switch to feature branch
git checkout 031-layout-redesign

# Install dependencies (if new packages needed)
bun install

# Start dev server
bun dev
```

## Reference Materials

| Resource              | Location                                                               |
| --------------------- | ---------------------------------------------------------------------- |
| Feature spec          | `specs/031-layout-redesign/spec.md`                                    |
| Implementation plan   | `specs/031-layout-redesign/plan.md`                                    |
| Research decisions    | `specs/031-layout-redesign/research.md`                                |
| Data model            | `specs/031-layout-redesign/data-model.md`                              |
| Component contracts   | `specs/031-layout-redesign/contracts/`                                 |
| Prototype screenshots | `screenshots/01-home.png` through `screenshots/10-installed-agent.png` |
| Vite prototype source | `/home/renanl/Projects/snew-agent-mind/src/`                           |
| Relay constitution    | `.specify/memory/constitution.md`                                      |

## Implementation Order

1. **Shell first**: Build sidebar + top bar + shell wrapper before any page.
2. **Home + Discover**: Core pages that validate the shell works.
3. **Chat pages**: New Chat, Chat History, Individual Chat view.
4. **Management pages**: Apps, History, Notifications, Agent Workspace.
5. **Specialized pages**: Customer Service dashboard, Installed Agent, 404.
6. **Polish**: Visual comparison, build verification, cleanup.

## Key Files to Modify

| File                                         | Action | Purpose                              |
| -------------------------------------------- | ------ | ------------------------------------ |
| `src/app/globals.css`                        | Modify | Add OKLCH variables, conic animation |
| `src/app/(dashboard)/layout.tsx`             | Modify | Use new DashboardShellNew            |
| `src/app/(dashboard)/dashboard/page.tsx`     | Modify | New home dashboard                   |
| `src/app/(dashboard)/agents/page.tsx`        | Modify | New co-workers discovery             |
| `src/app/(dashboard)/agents/[id]/page.tsx`   | Modify | New agent workspace                  |
| `src/app/(dashboard)/chat/page.tsx`          | Modify | New chat page                        |
| `src/app/(dashboard)/apps/page.tsx`          | Modify | New apps page                        |
| `src/app/(dashboard)/history/page.tsx`       | Modify | New history page                     |
| `src/app/(dashboard)/notifications/page.tsx` | Modify | New notifications page               |

## Key Files to Create

| File                                                 | Purpose                     |
| ---------------------------------------------------- | --------------------------- |
| `src/components/app-sidebar-new.tsx`                 | New simplified sidebar      |
| `src/components/top-bar.tsx`                         | New top bar                 |
| `src/components/dashboard-shell-new.tsx`             | New layout shell            |
| `src/contexts/language-context.tsx`                  | i18n provider               |
| `src/data/agents.ts`                                 | 27 agent definitions        |
| `src/data/coworkers.ts`                              | Chat coworker data          |
| `src/data/apps.ts`                                   | 12 app integrations         |
| `src/data/notifications.ts`                          | Mock notifications          |
| `src/app/(dashboard)/customer-service/page.tsx`      | CS dashboard (new route)    |
| `src/app/(dashboard)/chat/[id]/page.tsx`             | Individual chat (new route) |
| `src/app/(dashboard)/agents/[id]/installed/page.tsx` | Installed agent (new route) |

## Verification

```bash
# Build check
bun run build

# Lint check
bun run lint

# Visual comparison
# Open http://localhost:3000 and compare against screenshots/
```

## Conversion Guidelines

When porting from Vite prototype to Next.js:

1. **React Router → App Router**: Replace `useNavigate()` with `useRouter().push()`, `<Link to>` with `<Link href>`.
2. **Client components**: Add `"use client"` only when component uses hooks, event handlers, or browser APIs.
3. **HSL → OKLCH**: Convert color variables in globals.css.
4. **Static data**: Port `src/data/` files with strict TypeScript types.
5. **Icons**: Both projects use lucide-react — icons port directly.
6. **shadcn/ui**: Both projects use new-york style — components port directly.
7. **Tailwind**: Relay uses v4 (CSS-first config), prototype uses v3 (JS config). Class names are mostly compatible but verify custom theme extensions.
