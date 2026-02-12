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

## Spec-Driven Development (MANDATORY)

**Every implementation task MUST follow the speckit workflow.** This project uses the `.specify/` framework for spec-driven development. No feature, enhancement, or significant change should be implemented without first creating the proper specification artifacts.

### Required Workflow

Before writing any implementation code, follow this pipeline:

1. **`/speckit.specify`** — Create the feature spec (`specs/XXX-feature-name/spec.md`) with user stories, requirements, and success criteria
2. **`/speckit.plan`** — Generate the technical plan (`plan.md`) with architecture, data model, and contracts
3. **`/speckit.tasks`** — Break the plan into ordered, dependency-aware tasks (`tasks.md`)
4. **`/speckit.implement`** — Execute tasks following the plan

### When This Applies

- New features or pages
- Significant UI changes (new components, layout restructuring)
- New API routes or database schema changes
- Refactors that touch 3+ files
- Any work that would take more than ~30 minutes

### When This Does NOT Apply

- Single-line bug fixes or typo corrections
- Direct user requests for quick isolated changes (e.g., "change this color", "rename this variable")
- Configuration changes (env vars, dependencies)
- Migration-only changes (covered by Database Rules)
- Emergency hotfixes explicitly requested by the user

### Enforcement

If you are about to start implementing a feature without a spec, **STOP** and ask the user:

> "This looks like a feature that should go through the speckit workflow. Should I run `/speckit.specify` first?"

Existing specs are in `specs/` — always check if a spec already exists before creating a new one.

## Scripts

- `bun dev` - Start dev server
- `bun run build` - Production build
- `bun run start` - Start production server
- `bun run lint` - Run ESLint

## Active Technologies

- TypeScript 5 (strict mode) + Next.js 16.1.6 (App Router), React 19, Supabase (@supabase/ssr, @supabase/supabase-js) (014-webhook-runner)
- Supabase (PostgreSQL) — workflow_triggers, workflow_runs, workflow_run_steps tables (014-webhook-runner)

## Recent Changes

- 014-webhook-runner: Added TypeScript 5 (strict mode) + Next.js 16.1.6 (App Router), React 19, Supabase (@supabase/ssr, @supabase/supabase-js)
