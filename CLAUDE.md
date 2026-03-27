# Snew Automation

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
- Production project ID: `djohaxwfketlsjurwqne` — Test branch project ID: `ejqumzvclfkbbzzdvmmi`

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

## Agent Automation Rules

- **Every automation an agent creates MUST be a workflow.** When a user asks an agent to automate something (monitor prices, check stock daily, send reports, etc.), the agent MUST use `SNEW_CREATE_WORKFLOW` to create a visible, editable, testable workflow — NOT custom tools that write directly to the database.
- Workflows use the existing infrastructure: cron triggers, app steps (Composio), AI steps, utility steps (send_telegram). This makes automations visible in the workflow editor, editable by the user, and composable (e.g., detect price change → update own store price → notify on Telegram).
- **Never create one-off tools or database tables for automation logic.** If the workflow system lacks a capability, extend the workflow step types — don't bypass the system with custom code.
- Retail tools (`STORE_QUERY_STOCK`, `STORE_QUERY_SALES`, `STORE_LIST_ORDERS`) are READ-ONLY data access tools for answering questions in chat. They are NOT for creating automations.

## Git Workflow

- **Never push directly to `main`.** Always create a feature branch and open a PR.
- Use **one branch per session/task** (e.g., `fix/nuvemshop-variant-coercion`, `feat/price-monitor`). Group all related commits in the same branch — do NOT create a separate branch for each individual commit or sub-task.
- Branch naming: `fix/short-description`, `feat/short-description`, `refactor/short-description`.
- When work is done: push the branch, create a PR, and let the user merge.

## Scripts

- `bun dev` - Start dev server
- `bun run build` - Production build
- `bun run start` - Start production server
- `bun run lint` - Run ESLint

## Active Technologies

- TypeScript 5 (strict mode) + Next.js 16.1.6, React 19, shadcn/ui (new-york), Tailwind CSS v4, TanStack React Query, Zustand (for artifact navigation state) (043-seasonal-calendar-skill)
- Supabase PostgreSQL (`skills` table exists, campaign data stored as static TypeScript files) (043-seasonal-calendar-skill)

- TypeScript 5 (strict mode) + Next.js 16.1.6, React 19, shadcn/ui (Sheet), Tailwind CSS v4, TanStack React Query, Vercel AI SDK (generateObject), Firecrawl JS SDK, Zod (041-assets-drawer-redesign)
- Supabase PostgreSQL (brand_dna table — new jsonb columns for fonts + texts; store_products for image URLs) (041-assets-drawer-redesign)

- TypeScript 5 (strict mode) + Next.js 16.1.6, React 19, Vercel AI SDK (generateObject, streamText), Zod, TanStack React Query, Composio SDK (040-real-onboarding-brand-dna)
- Supabase PostgreSQL (stores, store_products, brand_dna, skills tables — all exist) (040-real-onboarding-brand-dna)

- TypeScript 5 (strict mode) + Next.js 16.1.6, React 19, shadcn/ui (new-york), Tailwind CSS v4, TanStack React Query, Zustand, lucide-react (039-new-layout-onboarding)
- Supabase PostgreSQL (existing skills + skill_executions tables from 038) (039-new-layout-onboarding)

- TypeScript 5 (strict mode) + Next.js 16.1.6, React 19, Vercel AI SDK (useChat, streamText), TanStack React Query, Zustand, shadcn/ui (new-york), Tailwind CSS v4 (037-orchestrator-system)
- Supabase PostgreSQL (agents, agent_conversations, agent_messages tables) (037-orchestrator-system)
- TypeScript 5 (strict mode) + Next.js 16.1.6, React 19, Vercel AI SDK, TanStack React Query, Zustand, shadcn/ui (new-york), Tailwind CSS v4 (038-single-agent-skills)
- Supabase PostgreSQL (skills, skill_executions tables — single-agent architecture, agents table deprecated to 1 row) (038-single-agent-skills)

- TypeScript 5 (strict mode) + Next.js 16.1.6, React 19, Supabase (@supabase/ssr), Vercel AI SDK, TanStack React Query, Zustand, shadcn/ui (new-york), Tailwind CSS v4 (036-agent-modules-system)

- TypeScript 5 (strict mode) + Next.js 16.1.6, React 19.2.3, shadcn/ui (new-york), Tailwind CSS v4, TanStack React Query, Zustand, lucide-react, next-themes (031-layout-redesign)
- Supabase PostgreSQL (existing — unchanged), localStorage (sidebar state, language preference) (031-layout-redesign)
- TypeScript 5 (strict mode) + Next.js 16.1.6, React 19, @supabase/ssr, Composio SDK (032-restore-data-integration)

- TypeScript 5 (strict mode) + Next.js 16.1.6, React 19, shadcn/ui (new-york), Tailwind CSS v4, Vercel AI SDK (jsonSchema), TanStack React Query, Zod (029-supplier-management)
- Supabase PostgreSQL (production: `djohaxwfketlsjurwqne`) (029-supplier-management)

- TypeScript 5 (strict mode) + Vercel AI SDK (`jsonSchema`), `@/lib/nuvemshop/client` (NuvemshopClient), `@/lib/supabase/server` (createServiceRoleClient) (028-retail-intelligence)
- Nuvemshop API (orders, customers) + Supabase store_products (cost_price only) (028-retail-intelligence)

- TypeScript 5 (strict mode) + Next.js 16.1.6, React 19, @supabase/ssr, Vercel AI SDK, TanStack React Query, Zod (027-retail-pivot)

- TypeScript 5 (strict mode) + Next.js 16.1.6, React 19, shadcn/ui, @supabase/ssr, TanStack React Query, Zod (024-team-members)
- Supabase PostgreSQL (production: `djohaxwfketlsjurwqne`, test: `ejqumzvclfkbbzzdvmmi`) (024-team-members)

- TypeScript 5 (strict mode) + Next.js 16.1.6 (App Router), React 19 + `composio-core` ^0.6.3 (triggers API), `@ai-sdk/openai` (Claude agent steps), `@supabase/ssr` + `@supabase/supabase-js` (Realtime for progress), TanStack React Query (021-app-event-triggers)
- Supabase PostgreSQL — new `trigger_subscriptions` table, extended `agent_workflows` and `agent_workflow_runs` (021-app-event-triggers)

- TypeScript 5 (strict mode) + Next.js 16.1.6, React 19, Supabase, Vercel AI SDK, Composio SDK (020-structured-skills)
- PostgreSQL via Supabase (production: `djohaxwfketlsjurwqne`, branch: `ejqumzvclfkbbzzdvmmi`) (020-structured-skills)

- TypeScript 5 (strict mode) + Next.js 16.1.6 (App Router), React 19, Composio SDK (`composio-core`), Kiro Chat API (OpenAI-compatible, streaming + function calling), TanStack React Query, Zustand (018-autonomous-agent-skills)
- Supabase (PostgreSQL) — existing tables: `agents`, `agent_conversations`, `agent_messages`, `agent_skills`, `app_connections` (018-autonomous-agent-skills)

- TypeScript 5 (strict mode) + Next.js 16.1.6 (App Router), React 19, Supabase (@supabase/ssr, @supabase/supabase-js) (014-webhook-runner)
- Supabase (PostgreSQL) — workflow_triggers, workflow_runs, workflow_run_steps tables (014-webhook-runner)

## Recent Changes

- 014-webhook-runner: Added TypeScript 5 (strict mode) + Next.js 16.1.6 (App Router), React 19, Supabase (@supabase/ssr, @supabase/supabase-js)
