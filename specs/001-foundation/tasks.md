# Tasks: Foundation & Infrastructure

**Input**: Design documents from `/specs/001-foundation/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Unit tests via Vitest + Testing Library, e2e via Playwright. Tooling setup in Phase 6. Verification via `bun run build`, `bun run lint`, `bun run test`, `bun run test:e2e`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project root**: `relay/`
- **Source**: `src/` at repository root
- **Database**: `supabase/` at repository root
- Path alias: `@/` maps to `src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install all dependencies and configure environment variables. Must complete before any source files are created.

- [x] T001 [US1] Install runtime dependencies: `bun add @supabase/supabase-js @supabase/ssr @tanstack/react-query zustand react-hook-form zod @hookform/resolvers date-fns sonner recharts cmdk`
- [x] T002 [US1] Install shadcn/ui components: `bunx shadcn@latest add avatar badge separator tooltip dropdown-menu scroll-area dialog command popover tabs table select checkbox textarea sheet switch slider sidebar`
- [x] T003 [P] [US1] Create `.env.local` with placeholder Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY). Verify `.env.local` is in `.gitignore`.
- [x] T004 [P] [US1] Create `.env.example` with the same keys but empty values for documentation purposes.

**Checkpoint**: All dependencies installed, environment configured. Run `bun run build` to verify no dependency conflicts.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and Supabase clients. These files MUST be complete before middleware or providers can be built.

**CRITICAL**: No user story work (Phase 3-5) can begin until this phase is complete.

- [x] T005 [US1] Create `supabase/schema.sql` with complete database schema: 6 enum types, 12 tables, all column types/constraints/defaults, foreign keys with ON DELETE rules, UNIQUE constraints, CHECK constraints. Follow the exact schema from plan.md data-model section.
- [x] T006 [US1] Add RLS policies to `supabase/schema.sql` for all 12 tables. Each table must have ENABLE ROW LEVEL SECURITY plus SELECT/INSERT/UPDATE/DELETE policies per the RLS Policy Summary in plan.md.
- [x] T007 [US1] Add indexes to `supabase/schema.sql` per the Indexes Summary in plan.md (19 indexes total).
- [x] T008 [US1] Add trigger functions to `supabase/schema.sql`: (1) `handle_new_user()` trigger on auth.users for auto-creating profiles, (2) `update_updated_at()` trigger applied to all 10 mutable tables.

> Note: T005-T008 all modify the same file (`supabase/schema.sql`) and must be done sequentially or combined into a single task. They are split here for clarity of what the file must contain.

- [x] T009 [P] [US1] Create `src/lib/supabase/database.types.ts` with TypeScript type definitions for all 12 tables. Must export a `Database` type with `public.Tables` containing Row, Insert, and Update types for each table. Include enum union types matching the PostgreSQL enums. Include the `Json` type for JSONB columns.
- [x] T010 [P] [US1] Create `src/lib/supabase/client.ts` - Browser Supabase client. Must export a `createBrowserClient()` function that calls `createBrowserClient<Database>()` from `@supabase/ssr` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Must throw a descriptive error if env vars are missing.
- [x] T011 [P] [US1] Create `src/lib/supabase/server.ts` - Server Supabase client. Must export a `createServerClient()` async function that uses `@supabase/ssr` `createServerClient<Database>()` with `cookies()` from `next/headers` for cookie-based session management. Must handle cookie get/set/remove operations.

**Checkpoint**: Foundation ready. Run `bun run build` to verify all new files compile. Import `Database` type from `database.types.ts` to verify it resolves.

---

## Phase 3: User Story 1 - Supabase Setup, Database Schema & Types (Priority: P1)

**Goal**: Complete, deployable database schema with typed Supabase clients that can be used from any component.

**Independent Test**: Apply schema.sql to Supabase, instantiate browser and server clients, run a typed query against any table.

### Implementation for User Story 1

> All implementation tasks for US1 are covered in Phase 1 (Setup) and Phase 2 (Foundational) above. This phase exists as a verification checkpoint.

- [x] T012 [US1] Verification: Confirm `supabase/schema.sql` can be executed against a Supabase project without errors (copy-paste into SQL Editor or use `supabase db reset` if CLI is configured).
- [x] T013 [US1] Verification: Confirm `src/lib/supabase/client.ts` compiles and exports `createBrowserClient` with correct return type `SupabaseClient<Database>`.
- [x] T014 [US1] Verification: Confirm `src/lib/supabase/server.ts` compiles and exports `createServerClient` with correct return type.
- [x] T015 [US1] Verification: Confirm `src/lib/supabase/database.types.ts` exports `Database` type and all table types are accessible (e.g., `Database['public']['Tables']['workflows']['Row']` resolves to the correct shape).

**Checkpoint**: US1 complete. All database infrastructure is in place. `bun run build` passes.

---

## Phase 4: User Story 2 - Auth Middleware & Protected Routes (Priority: P2)

**Goal**: Authentication boundary that protects all dashboard routes and redirects unauthenticated users to login.

**Independent Test**: Start dev server, navigate to `/dashboard` without auth session -- verify redirect to `/login`. Navigate to `/` -- verify no redirect.

### Implementation for User Story 2

- [x] T016 [US2] Create `src/middleware.ts` with Next.js middleware that:
  1. Defines a `matcher` config excluding static assets (`/_next/static`, `/_next/image`, `/favicon.ico`) and public files
  2. Creates a Supabase server client using `@supabase/ssr` with request/response cookie handling
  3. Calls `supabase.auth.getUser()` to check authentication status (not `getSession()` which only checks JWT without server validation)
  4. Defines protected route prefixes: `/dashboard`, `/workspace`, `/runs`, `/agents`, `/workflows`
  5. If the user is not authenticated and the route is protected, redirects to `/login?redirectTo={originalUrl}`
  6. If the user is authenticated and on `/login` or `/signup`, redirects to `/dashboard`
  7. Passes the (potentially refreshed) response through for all other cases
- [x] T017 [US2] Verify middleware `config.matcher` correctly excludes: `/_next/static`, `/_next/image`, `/favicon.ico`, and any path with a file extension (e.g., `.png`, `.js`). Include the pattern `/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`.
- [x] T018 [US2] Verification: Run `bun run build` and confirm middleware compiles. Check that the middleware export is a named `middleware` function and `config` is exported.

**Checkpoint**: US2 complete. Auth boundary is in place. `bun run build` passes.

---

## Phase 5: User Story 3 - Root Layout with Providers (Priority: P3)

**Goal**: Root layout wraps the app with Inter font, TanStack Query provider, and sonner Toaster so all pages have consistent font, data fetching infrastructure, and toast notifications.

**Independent Test**: Start dev server, load any page, verify Inter font is applied, no "No QueryClient" errors appear in console, and `toast()` can be called from a client component.

### Implementation for User Story 3

- [x] T019 [P] [US3] Create `src/providers/query-provider.tsx` as a `"use client"` component that:
  1. Creates a `QueryClient` instance with `useState` (to avoid sharing state between requests in SSR)
  2. Sets default options: `staleTime: 60 * 1000` (1 minute), `refetchOnWindowFocus: false` (reasonable defaults, can be overridden per-query)
  3. Wraps children with `<QueryClientProvider client={queryClient}>`
  4. Exports `QueryProvider` as default
- [x] T020 [US3] Modify `src/app/layout.tsx` to:
  1. Replace Geist fonts with Inter from `next/font/google` (subsets: ['latin'], variable: '--font-inter')
  2. Update `<body>` className to use Inter variable and `antialiased`
  3. Wrap `{children}` with `<QueryProvider>`
  4. Add `<Toaster />` from `sonner` as a sibling to `{children}` (inside QueryProvider or at root level)
  5. Update metadata title to "Relay" and description to "Workflow automation platform"
- [x] T021 [US3] Verification: Run `bun run build` and confirm zero errors. Check for no hydration warnings by running `bun dev` and loading the page.

**Checkpoint**: US3 complete. All provider infrastructure is in place. `bun run build` passes with zero errors.

---

## Phase 6: Developer Tooling & Testing Infrastructure

**Purpose**: Set up Vitest, Playwright, Prettier, Husky + lint-staged so all subsequent features have testing and code quality tooling in place.

**CRITICAL**: This phase establishes tooling that all subsequent features depend on for their test tasks.

### Unit Testing (Vitest)

- [x] T022 Install Vitest and related dependencies: `bun add -d vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event happy-dom @vitest/coverage-v8`
- [x] T023 [P] Create `vitest.config.ts` at project root per plan.md Vitest Configuration section. Must include `@/` path alias, happy-dom environment, globals, setup file path, and coverage config excluding `src/components/ui/`.
- [x] T024 [P] Create `src/test/setup.ts` with `import '@testing-library/jest-dom/vitest'` for jest-dom matchers.
- [x] T025 Add test scripts to `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`.
- [x] T026 Verify Vitest setup: create a minimal smoke test at `src/lib/__tests__/utils.test.ts` that imports `cn()` from `@/lib/utils` and asserts `cn("foo", "bar")` returns `"foo bar"`. Run `bun run test` and confirm it passes.

### End-to-End Testing (Playwright)

- [x] T027 Install Playwright: `bun add -d @playwright/test`. Run `bunx playwright install chromium` to install browser binary.
- [x] T028 [P] Create `playwright.config.ts` at project root per plan.md Playwright Configuration section. Must include `e2e/` test dir, chromium project, webServer pointing to `bun run dev` on port 3000.
- [x] T029 [P] Create `e2e/` directory with a smoke test at `e2e/smoke.test.ts` that navigates to `/` and asserts the page loads (expect page title or redirect).
- [x] T030 Add e2e scripts to `package.json`: `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`.
- [x] T031 Verify Playwright setup: run `bun run test:e2e` and confirm the smoke test passes.

### Code Formatting (Prettier)

- [x] T032 Install Prettier: `bun add -d prettier prettier-plugin-tailwindcss`.
- [x] T033 [P] Create `.prettierrc` at project root per plan.md Prettier Configuration section.
- [x] T034 [P] Create `.prettierignore` with entries: `node_modules`, `.next`, `dist`, `coverage`, `src/components/ui/`, `bun.lockb`, `playwright-report`.
- [x] T035 Add format scripts to `package.json`: `"format": "prettier --write ."`, `"format:check": "prettier --check ."`.
- [x] T036 Run `bun run format` to format all existing files. Verify no files are broken by running `bun run build` after formatting.

### Git Hooks (Husky + lint-staged)

- [x] T037 Install Husky and lint-staged: `bun add -d husky lint-staged`. Run `bunx husky init` to create `.husky/` directory.
- [x] T038 [P] Add `lint-staged` config to `package.json`: `{ "*.{ts,tsx}": ["eslint --fix", "prettier --write"], "*.{json,md,css}": ["prettier --write"] }`.
- [x] T039 [P] Create `.husky/pre-commit` hook that runs `bunx lint-staged`.
- [x] T040 [P] Create `.husky/pre-push` hook that runs `bun run build && bun run test`.
- [x] T041 Add `"prepare": "husky"` script to `package.json` so hooks are installed on `bun install`.
- [x] T042 Verify hooks: stage a file with formatting issues, run `git commit` and confirm lint-staged auto-fixes.

**Checkpoint**: `bun run test` passes. `bun run test:e2e` passes. `bun run format:check` passes. Pre-commit hook runs lint-staged. Pre-push hook runs build + tests.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all user stories, lint cleanup, and documentation.

- [x] T043 Run `bun run lint` on all new and modified files. Fix any ESLint warnings or errors.
- [x] T044 Run `bun run format:check` on all files. Fix any formatting issues.
- [x] T045 Run `bun run build` as final verification. Must complete with zero errors.
- [x] T046 Run `bun run test` to confirm all unit tests pass.
- [x] T047 [P] Verify `.env.local` is in `.gitignore` and will not be committed.
- [x] T048 [P] Verify all imports use the `@/` path alias (not relative paths like `../../`).
- [x] T049 Verify no `any` types exist in any new file (TypeScript strict mode compliance).
- [x] T050 Review `supabase/schema.sql` one final time: confirm all 12 tables, all enums, all indexes, all RLS policies, all triggers are present and correct.

**Checkpoint**: Feature complete. All files compile, lint passes, tests pass, formatting is clean, and the foundation is ready for Phase 2 (Navigation & Layout).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion (dependencies must be installed first). BLOCKS all user stories.
- **US1 verification (Phase 3)**: Depends on Phase 2 completion
- **US2 (Phase 4)**: Depends on Phase 2 completion (needs Supabase server client and Database types). Can run in parallel with US3.
- **US3 (Phase 5)**: Depends on Phase 1 completion (needs @tanstack/react-query and sonner installed). Can run in parallel with US2.
- **Tooling (Phase 6)**: Depends on Phase 1 (needs package.json). Can run in parallel with Phases 3-5.
- **Polish (Phase 7)**: Depends on all previous phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Fully implemented in Phases 1-2. No dependencies on other stories.
- **User Story 2 (P2)**: Depends on US1 (needs `src/lib/supabase/server.ts` and `database.types.ts`). Independent of US3.
- **User Story 3 (P3)**: Depends only on npm packages from Phase 1. Independent of US2.

### Within Each Phase

- Tasks marked [P] within the same phase can run in parallel
- T005-T008 modify the same file and must be sequential (or done as one combined task)
- T009, T010, T011 are independent files and can be written in parallel
- T019 must complete before T020 (QueryProvider must exist before layout imports it)

### Parallel Opportunities

```
Phase 1: T001 → T002 (sequential, same package manager)
          T003 ─┬─ (parallel, different files)
          T004 ─┘

Phase 2: T005 → T006 → T007 → T008 (sequential, same file)
          T009 ─┬─ (parallel, independent files)
          T010 ─┤
          T011 ─┘

Phase 4 & 5 can run in parallel:
  Phase 4: T016 → T017 → T018
  Phase 5: T019 → T020 → T021

Phase 6 (Tooling) can run in parallel with Phases 3-5:
  Vitest:      T022 → T023 ─┬─ → T025 → T026
                       T024 ─┘
  Playwright:  T027 → T028 ─┬─ → T030 → T031
                       T029 ─┘
  Prettier:    T032 → T033 ─┬─ → T035 → T036
                       T034 ─┘
  Husky:       T037 → T038 ─┬─ → T041 → T042
                       T039 ─┤
                       T040 ─┘
```

---

## Implementation Strategy

### Recommended Execution (Solo Developer)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T011)
3. Complete Phase 3: US1 Verification (T012-T015)
4. Complete Phase 4: US2 Middleware (T016-T018)
5. Complete Phase 5: US3 Layout (T019-T021)
6. Complete Phase 6: Tooling (T022-T042)
7. Complete Phase 7: Polish (T043-T050)

### Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each phase completion
- Run `bun run build` at every checkpoint
- Run `bun run test` after Phase 6 and at every subsequent checkpoint
- The schema.sql file is the largest single deliverable; take care with enum names, foreign key references, and RLS policy sub-selects
- Phase 6 (Tooling) can be started as early as Phase 1 is done, in parallel with source code work
