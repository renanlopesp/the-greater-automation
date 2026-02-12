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

## Database Rules

- **Every schema change MUST have a migration file.** When creating, altering, or dropping tables, columns, indexes, enums, functions, triggers, or RLS policies, always create a corresponding migration file in `supabase/migrations/` using the Supabase MCP `apply_migration` tool (or `supabase migration new` locally). Never apply DDL changes directly via `execute_sql` without a migration.
- Migration names should be descriptive and snake_case (e.g., `add_status_column_to_workflows`, `create_agent_skills_table`).
- Production project ID: `djohaxwfketlsjurwqne` — Test branch project ID: `fqvqxydiaunlntzjtobr`

## Scripts

- `bun dev` - Start dev server
- `bun run build` - Production build
- `bun run start` - Start production server
- `bun run lint` - Run ESLint
