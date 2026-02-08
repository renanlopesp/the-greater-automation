# Feature Specification: Foundation & Infrastructure

**Feature Branch**: `001-foundation`
**Created**: 2026-02-07
**Status**: Draft
**Input**: Phase 1 of DEVELOPMENT_SPEC.md - Supabase backend, auth middleware, database schema, providers, root layout

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Supabase Setup, Database Schema & Types (Priority: P1)

As a developer, I need the Supabase backend fully configured with a complete database schema and generated TypeScript types so that all subsequent features have a reliable, type-safe data layer to build upon.

**Why this priority**: This is the absolute foundation. Every other feature in Relay depends on the database schema existing and the Supabase clients being available. Without this, no data can be stored, queried, or displayed. The entire application is blocked until this is in place.

**Independent Test**: Can be fully tested by running `supabase db reset` to apply schema.sql, verifying all 12 tables are created with correct columns, constraints, indexes, and RLS policies. The TypeScript types file can be validated by importing it and confirming it compiles without errors. The browser and server Supabase clients can be tested by instantiating them and making a simple query (e.g., `supabase.from('teams').select('id').limit(1)`).

**Acceptance Scenarios**:

1. **Given** a fresh Supabase project with URL and anon key in `.env.local`, **When** the schema.sql file is applied via Supabase dashboard or CLI, **Then** all 12 tables (profiles, teams, team_members, agents, folders, workflows, workflow_triggers, workflow_steps, agent_skills, workflow_runs, app_connections, usage) are created with correct columns, types, constraints, foreign keys, and indexes.
2. **Given** the schema is applied, **When** RLS is checked on each table, **Then** all tables have RLS enabled and appropriate policies for authenticated users to read/write only their team's data.
3. **Given** the database.types.ts file exists, **When** it is imported in a TypeScript file, **Then** it compiles without errors and provides full type safety for all table operations (select, insert, update, delete).
4. **Given** the browser Supabase client (client.ts), **When** `createBrowserClient()` is called in a client component, **Then** it returns a typed Supabase client using NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from environment variables.
5. **Given** the server Supabase client (server.ts), **When** `createServerClient()` is called in a Server Component or Route Handler, **Then** it returns a typed Supabase client with cookie-based session management via `@supabase/ssr`.
6. **Given** `.env.local` is missing NEXT_PUBLIC_SUPABASE_URL, **When** the Supabase client is instantiated, **Then** it throws a clear error message indicating the missing environment variable.

---

### User Story 2 - Auth Middleware & Protected Routes (Priority: P2)

As a user attempting to access the Relay dashboard, I need authentication enforced at the middleware level so that unauthenticated users are redirected to login and authenticated users can seamlessly access protected routes.

**Why this priority**: Without auth middleware, the application has no security boundary. Users could access dashboard, workspace, runs, agents, and workflow pages without being logged in, which would result in empty pages and broken Supabase queries. This must be in place before any protected page is built.

**Independent Test**: Can be fully tested by starting the dev server, attempting to navigate to `/dashboard` without being logged in, and verifying the redirect to `/login`. Then logging in via Supabase auth and verifying access is granted. Public routes (`/`, `/login`, `/signup`) should remain accessible without auth.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they navigate to `/dashboard`, **Then** they are redirected to `/login` with the original URL preserved as a `redirectTo` query parameter.
2. **Given** an unauthenticated user, **When** they navigate to `/workspace`, `/runs`, `/agents/123`, or `/workflows/456`, **Then** they are redirected to `/login`.
3. **Given** an authenticated user with a valid session cookie, **When** they navigate to `/dashboard`, **Then** they are allowed through to the page without redirect.
4. **Given** an authenticated user, **When** they navigate to `/login`, **Then** they are redirected to `/dashboard` (already logged in).
5. **Given** a user with an expired session token, **When** they navigate to a protected route, **Then** the middleware attempts to refresh the session. If refresh succeeds, access is granted. If refresh fails, they are redirected to `/login`.
6. **Given** any user, **When** they navigate to `/`, `/login`, or `/signup`, **Then** the middleware allows the request through without authentication checks.
7. **Given** a request to a static asset (`/_next/`, `/favicon.ico`), **When** the middleware runs, **Then** it skips authentication checks entirely via the matcher config.

---

### User Story 3 - Root Layout with Providers (Priority: P3)

As a user loading any page in Relay, I need the root layout to provide the Inter font, TanStack Query for data fetching, and toast notifications (sonner) so that the application has a consistent visual baseline and shared infrastructure for all pages.

**Why this priority**: While the layout is needed for the app to look correct and function properly, it is a thin wrapper that can be added after the data layer and auth are in place. It does not block schema work or middleware work. It is the final piece that ties the infrastructure together before UI features begin.

**Independent Test**: Can be fully tested by starting the dev server, loading any page, and verifying: (1) the Inter font is applied to the body, (2) React Query DevTools appear in development mode, (3) a toast notification can be triggered programmatically via `toast.success('test')` from any client component, and (4) no hydration errors occur.

**Acceptance Scenarios**:

1. **Given** the root layout is updated, **When** any page loads, **Then** the Inter font is applied to the `<body>` element via `next/font/google` with the `antialiased` class.
2. **Given** a client component wrapped by QueryProvider, **When** it calls `useQuery()`, **Then** the query executes successfully without a "No QueryClient set" error.
3. **Given** the Toaster component is rendered in the layout, **When** `toast.success('Action completed')` is called from any client component, **Then** a toast notification appears on screen.
4. **Given** the layout in production mode, **When** the page loads, **Then** no React hydration mismatch errors occur in the console.
5. **Given** a page that triggers a server-side error, **When** the error boundary catches it, **Then** the QueryProvider and Toaster remain functional (they don't crash the entire app).

---

### Edge Cases

- **Missing environment variables**: If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set, the Supabase client creation must throw a descriptive error at build/start time rather than silently failing with cryptic runtime errors.
- **Invalid Supabase credentials**: If the anon key is malformed or the URL points to a non-existent project, Supabase client calls should fail gracefully and the middleware should redirect to login rather than crashing.
- **Expired sessions**: When a session token expires mid-use, the server client must attempt a silent refresh via `@supabase/ssr` cookie handling. If refresh fails, the user must be redirected to login without data loss (no partial renders).
- **RLS violations**: If a user somehow crafts a query that bypasses the client and hits the database directly (e.g., trying to access another team's data), RLS policies must deny the request and return an empty result set (not a server error).
- **Concurrent access to same team**: Multiple team members accessing the same team's data simultaneously must not cause race conditions. The schema must use proper constraints (UNIQUE, CHECK) to prevent data corruption.
- **Self-referential folders**: The `folders` table allows `parent_id` to reference another folder. If a circular reference is created (folder A -> folder B -> folder A), queries must not infinitely recurse. The schema should allow NULL parent_id for root folders.
- **JSONB config fields**: The `config` columns on `workflow_triggers` and `workflow_steps` use JSONB. If malformed JSON is inserted, PostgreSQL will reject it. The TypeScript types must type these as `Json` (Supabase's JSON type) to allow flexible but type-aware access.
- **Cascade deletions**: Deleting a team must cascade to team_members, agents, folders, workflows, and usage. Deleting a workflow must cascade to workflow_triggers, workflow_steps, and workflow_runs. These cascades must be tested to ensure no orphaned records remain.
- **Middleware on API routes**: The middleware must not interfere with Supabase auth callback routes (`/auth/callback`) or Next.js internal routes (`/_next/`).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a browser-side Supabase client (`createBrowserClient()`) that reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from environment variables and returns a fully typed client instance.
- **FR-002**: System MUST provide a server-side Supabase client (`createServerClient()`) that uses `@supabase/ssr` with cookie-based session management for use in Server Components, Route Handlers, and Server Actions.
- **FR-003**: System MUST include a complete SQL schema (`supabase/schema.sql`) defining all 12 tables with proper column types, NOT NULL constraints, DEFAULT values, CHECK constraints, foreign keys with ON DELETE CASCADE rules, indexes, and RLS policies.
- **FR-004**: System MUST include a TypeScript types file (`database.types.ts`) that provides full type definitions for all tables, including Row, Insert, and Update types for each table.
- **FR-005**: System MUST include middleware (`src/middleware.ts`) that intercepts requests to protected routes (`/dashboard/*`, `/workspace/*`, `/runs/*`, `/agents/*`, `/workflows/*`) and redirects unauthenticated users to `/login`.
- **FR-006**: Middleware MUST refresh expired sessions silently using `@supabase/ssr` before deciding to redirect.
- **FR-007**: Middleware MUST skip authentication checks for public routes (`/`, `/login`, `/signup`), auth callback routes (`/auth/callback`), and static assets.
- **FR-008**: System MUST include a TanStack Query provider (`QueryProvider`) as a client component that wraps the application and provides a `QueryClient` instance.
- **FR-009**: Root layout (`src/app/layout.tsx`) MUST use the Inter font from `next/font/google`, wrap children with `QueryProvider`, and render the sonner `Toaster` component.
- **FR-010**: All database tables MUST have Row Level Security (RLS) enabled with policies that restrict data access to authenticated users who are members of the relevant team.
- **FR-011**: The `profiles` table MUST be automatically populated when a new user signs up via a database trigger on `auth.users`.
- **FR-012**: All tables with mutable data MUST have `updated_at` columns that are automatically set via database triggers.
- **FR-013**: System MUST include a `.env.local` template with placeholder values for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **FR-014**: The `workflow_triggers.type` column MUST be constrained to the enum values: manual, scheduled, webhook, form, rss, mailhook, table, mcp, app.
- **FR-015**: The `workflow_steps.type` column MUST be constrained to the enum values: app, ai, flow_control, web_scraping, human_in_loop, utility, http, sequence.
- **FR-016**: The `workflow_runs.status` column MUST be constrained to the enum values: pending, running, completed, failed, cancelled.
- **FR-017**: The `workflows.status` column MUST be constrained to the enum values: draft, published.
- **FR-018**: The `team_members.role` column MUST be constrained to the enum values: owner, admin, member.
- **FR-019**: The `app_connections.status` column MUST be constrained to the enum values: connected, disconnected, error.

### Key Entities

- **Profile**: Extends Supabase `auth.users`. Fields: `id` (uuid, PK, references auth.users), `email` (text, NOT NULL), `full_name` (text), `avatar_url` (text), `created_at` (timestamptz, NOT NULL, DEFAULT now()), `updated_at` (timestamptz, NOT NULL, DEFAULT now()). One-to-many with team_members.
- **Team**: Organizational unit. Fields: `id` (uuid, PK, DEFAULT gen_random_uuid()), `name` (text, NOT NULL), `slug` (text, NOT NULL, UNIQUE), `avatar_url` (text), `created_at` (timestamptz, NOT NULL, DEFAULT now()), `updated_at` (timestamptz, NOT NULL, DEFAULT now()). One-to-many with team_members, agents, folders, workflows, app_connections, usage.
- **TeamMember**: Join table linking users to teams with roles. Fields: `team_id` (uuid, NOT NULL, FK to teams ON DELETE CASCADE), `user_id` (uuid, NOT NULL, FK to profiles ON DELETE CASCADE), `role` (text, NOT NULL, CHECK in owner/admin/member), `created_at` (timestamptz, NOT NULL, DEFAULT now()). PK is (team_id, user_id).
- **Agent**: AI agent belonging to a team. Fields: `id` (uuid, PK, DEFAULT gen_random_uuid()), `team_id` (uuid, NOT NULL, FK to teams ON DELETE CASCADE), `name` (text, NOT NULL), `description` (text), `avatar_url` (text), `avatar_type` (text, DEFAULT 'dots'), `created_by` (uuid, NOT NULL, FK to profiles), `created_at` (timestamptz), `updated_at` (timestamptz).
- **Folder**: Hierarchical organization for workflows. Fields: `id` (uuid, PK), `team_id` (uuid, NOT NULL, FK to teams ON DELETE CASCADE), `name` (text, NOT NULL), `parent_id` (uuid, FK to folders ON DELETE CASCADE, nullable for root folders), `created_at`, `updated_at`.
- **Workflow**: Automation definition. Fields: `id` (uuid, PK), `team_id` (uuid, NOT NULL, FK to teams ON DELETE CASCADE), `folder_id` (uuid, FK to folders ON DELETE SET NULL, nullable), `name` (text, NOT NULL), `emoji` (text, DEFAULT 'zap'), `description` (text), `status` (text, NOT NULL, DEFAULT 'draft', CHECK in draft/published), `is_starred` (boolean, NOT NULL, DEFAULT false), `created_by` (uuid, NOT NULL, FK to profiles), `published_at` (timestamptz), `created_at`, `updated_at`.
- **WorkflowTrigger**: Defines how a workflow starts. Fields: `id` (uuid, PK), `workflow_id` (uuid, NOT NULL, FK to workflows ON DELETE CASCADE, UNIQUE), `type` (text, NOT NULL, CHECK in manual/scheduled/webhook/form/rss/mailhook/table/mcp/app), `config` (jsonb, NOT NULL, DEFAULT '{}'), `created_at`, `updated_at`.
- **WorkflowStep**: Individual step in a workflow. Fields: `id` (uuid, PK), `workflow_id` (uuid, NOT NULL, FK to workflows ON DELETE CASCADE), `position` (integer, NOT NULL), `type` (text, NOT NULL, CHECK in app/ai/flow_control/web_scraping/human_in_loop/utility/http/sequence), `name` (text, NOT NULL), `config` (jsonb, NOT NULL, DEFAULT '{}'), `created_at`, `updated_at`. UNIQUE constraint on (workflow_id, position).
- **AgentSkill**: Links agents to workflows as skills. Fields: `id` (uuid, PK), `agent_id` (uuid, NOT NULL, FK to agents ON DELETE CASCADE), `workflow_id` (uuid, NOT NULL, FK to workflows ON DELETE CASCADE), `name` (text, NOT NULL), `last_run_at` (timestamptz), `run_count` (integer, NOT NULL, DEFAULT 0), `created_at`, `updated_at`. UNIQUE constraint on (agent_id, workflow_id).
- **WorkflowRun**: Execution record. Fields: `id` (uuid, PK), `workflow_id` (uuid, NOT NULL, FK to workflows ON DELETE CASCADE), `agent_id` (uuid, FK to agents ON DELETE SET NULL, nullable), `status` (text, NOT NULL, DEFAULT 'pending', CHECK in pending/running/completed/failed/cancelled), `steps_used` (integer, NOT NULL, DEFAULT 0), `ai_credits_used` (numeric(10,2), NOT NULL, DEFAULT 0), `started_at` (timestamptz), `completed_at` (timestamptz), `created_at`.
- **AppConnection**: Third-party app integration credentials. Fields: `id` (uuid, PK), `user_id` (uuid, NOT NULL, FK to profiles ON DELETE CASCADE), `team_id` (uuid, NOT NULL, FK to teams ON DELETE CASCADE), `app_name` (text, NOT NULL), `app_logo_url` (text), `status` (text, NOT NULL, DEFAULT 'disconnected', CHECK in connected/disconnected/error), `credentials` (jsonb, NOT NULL, DEFAULT '{}'), `created_at`, `updated_at`. UNIQUE constraint on (user_id, team_id, app_name).
- **Usage**: Team usage tracking per billing period. Fields: `id` (uuid, PK), `team_id` (uuid, NOT NULL, FK to teams ON DELETE CASCADE), `period_start` (timestamptz, NOT NULL), `period_end` (timestamptz, NOT NULL), `steps_used` (integer, NOT NULL, DEFAULT 0), `steps_limit` (integer, NOT NULL, DEFAULT 1000), `ai_credits_used` (numeric(10,2), NOT NULL, DEFAULT 0), `ai_credits_limit` (numeric(10,2), NOT NULL, DEFAULT 100), `created_at`, `updated_at`. UNIQUE constraint on (team_id, period_start).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `bun run build` completes with zero errors after all foundation files are created.
- **SC-002**: `bun run lint` passes with zero warnings on all new files.
- **SC-003**: All 12 database tables are created successfully when schema.sql is applied to a fresh Supabase project, with zero errors.
- **SC-004**: The TypeScript types file compiles without errors and provides autocomplete for all table names and column names in the IDE.
- **SC-005**: Unauthenticated requests to any protected route (`/dashboard`, `/workspace`, `/runs`, `/agents/*`, `/workflows/*`) are redirected to `/login` within 100ms.
- **SC-006**: Authenticated requests to protected routes pass through middleware without redirect within 50ms.
- **SC-007**: The root layout renders with Inter font, functional QueryProvider, and functional Toaster with zero hydration errors.
- **SC-008**: All RLS policies correctly prevent cross-team data access (verified by attempting to query another team's data with a valid but unauthorized session).
