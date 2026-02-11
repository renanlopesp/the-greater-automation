# Relay

## Codebase Overview

Next.js 16 application with shadcn/ui components, React 19, Tailwind CSS v4, and TypeScript in strict mode. Uses the App Router with Server Components by default.

**Stack**: Next.js 16.1.6, React 19.2.3, Tailwind CSS v4, shadcn/ui (new-york style), Radix UI, TypeScript 5
**Structure**: `src/app/` (pages & layouts), `src/components/ui/` (shadcn components), `src/lib/` (utilities)

For detailed architecture, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

## Key Conventions

- Path alias `@/` maps to `src/`
- Use `cn()` from `@/lib/utils` for all dynamic className composition
- Server Components by default; only add `"use client"` when necessary
- Theme configured via CSS variables in `src/app/globals.css` (OKLCH color space)
- Add shadcn components via `npx shadcn@latest add <component>`
- Tailwind v4 CSS-first config (no `tailwind.config.js`)

## React 19 Rules

- **Never use `useEffect` to sync fetched data into external stores** (Zustand, Redux, etc.). This causes re-initialization loops when queries refetch. The store should own the state or the component should read from the query directly — not both via useEffect.
- **Never invalidate a query whose data feeds a `useEffect` that resets UI state.** If a mutation (like save) invalidates a query, and that query's `data` is in a `useEffect` dependency array that calls `initializeWorkflow()` or similar, the UI state (selected items, active tabs, open panels) will be wiped.
- Prefer Server Components for data fetching. Only use client-side queries (React Query) when real-time updates or mutations are needed.
- Avoid `useEffect` for derived state — compute it during render or use `useMemo`.

## Scripts

- `bun dev` - Start dev server
- `bun run build` - Production build
- `bun run start` - Start production server
- `bun run lint` - Run ESLint
