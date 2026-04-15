# Feature Specification: Remove `any` Casts from Production Code

**Feature Branch**: `071-remove-any-casts`
**Created**: 2026-04-15
**Status**: Draft
**Input**: User description: "Eliminate `any` casts from the production codebase (349 occurrences: 237 `: any` + 112 `as any` across 60+ files under `src/`). Goal: restore TypeScript's strict-mode guarantees so refactors and future reviews can trust the types."

## User Scenarios & Testing _(mandatory)_

The "users" of this work are the engineers (and AI agents) who read, review, and change code in this repository. Each story is a slice of type-safety that delivers standalone value.

### User Story 1 - Typed Supabase client across the API layer (Priority: P1)

Engineers writing a new `/api/*` route expect the Supabase client to tell them, at compile time, when they misspell a column, reference a dropped table, or read a column that doesn't exist yet. Today ~40% of API routes cast the client through `as any`, so typos ship to production and only surface as runtime errors.

**Why this priority**: this is the single biggest source of the `any` count (≥60% of occurrences) and touches every future DB-backed change. Fixing it unlocks downstream cleanup in one pass.

**Independent Test**: pick three representative routes (`/api/chat`, `/api/studio/tools`, `/api/agents/cron/reports`), rename a column in the query to something that doesn't exist, run typecheck, and confirm the error is surfaced by the compiler with the correct column/table name in the message.

**Acceptance Scenarios**:

1. **Given** a handler that selects `team_members.team_id`, **When** an engineer renames the select to a non-existent column, **Then** `bunx tsc --noEmit` fails with a specific error pointing at the handler file and column name (not a generic `any` error from `supabase-js`).
2. **Given** the service-role client facade, **When** code inserts a row missing a non-nullable column, **Then** the compiler rejects the call before runtime.
3. **Given** an agent row fetched from the DB, **When** code accesses `agent.report_kind`, **Then** the type narrows to the enum `'stock' | 'price' | 'sales' | null` (after regenerating DB types), not `any`.

---

### User Story 2 - Typed asset-studio modal props and canvas state (Priority: P2)

The asset-studio work is concentrated in `AssetCreatorModal.tsx` (≈110 `any` occurrences, ~30% of the total). Product iterations on the modal constantly re-break canvas state because `any` hides which fields a helper expects. Engineers avoid reviewing the diff because the types are unenforceable.

**Why this priority**: it's the largest single-file hotspot and the hot area of current product iteration. Typing it pays back every future PR that touches the modal.

**Independent Test**: rename any required prop in `AssetCreatorModalProps` and verify `bunx tsc --noEmit` fails at every call site (not silently passes). Canvas state reducers should reject action objects with wrong shapes.

**Acceptance Scenarios**:

1. **Given** the modal is invoked from its caller, **When** a required prop is omitted, **Then** the compiler flags the caller, not the modal body.
2. **Given** the canvas state reducer, **When** an action of an unknown `type` is dispatched, **Then** TypeScript treats it as a discriminated-union exhaustive-check failure.
3. **Given** a helper that reads a product from canvas state, **When** the helper is called with raw `JSON.parse` output, **Then** a schema validation step narrows it to the canonical `CanvasProduct` type.

---

### User Story 3 - Typed AI, Composio, and remaining hook wrappers (Priority: P3)

Smaller clusters: `src/lib/ai/*` (Anthropic SDK wrappers), `src/lib/composio/*` (OAuth connectors), `src/hooks/useProductCatalog.ts`. These are lower volume but block writing new skills confidently — each new skill must re-guess the shape of a tool call.

**Why this priority**: lower volume than P1/P2 but still a correctness risk for new skill authors. Ship after the big clusters so the type helpers from P1 are already in place.

**Independent Test**: add a new tool/skill using the typed Anthropic wrapper; confirm the compiler auto-suggests tool names and infers tool-use input/output payload types.

**Acceptance Scenarios**:

1. **Given** a call to the Anthropic wrapper, **When** an engineer mistypes a tool name, **Then** the compiler flags it with a suggestion from the known tool list.
2. **Given** the Composio OAuth initiation helper, **When** an unsupported provider slug is passed, **Then** the compiler rejects it at the call site.
3. **Given** `useProductCatalog`, **When** a consumer reads a catalog row, **Then** the returned object is typed as `CatalogProduct` end-to-end with no `as any` casts inside the hook.

---

### Edge Cases

- A few third-party SDK types are genuinely wrong (known issues in `composio-core`, older `@supabase/ssr` cookie types). These must not block the PR; document each remaining cast with a one-line comment (what's wrong, when to remove) instead of deleting it.
- Tests under `src/**/__tests__/*` are **out of scope**. They often cast to `any` to construct fixtures deliberately. Leave them; revisit in a separate pass.
- If regenerating `src/types/database.ts` reveals that the DB schema in this repo is out of sync with production (missing columns from applied migrations, etc.), stop and resolve the drift before continuing — don't hand-patch the types.
- ESLint enablement must exclude tests and type declaration files; otherwise 200+ test files would fail the lint gate at once.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The codebase MUST produce fewer than 20 `: any` or `as any` occurrences under `src/` (excluding `**/__tests__/**` and `**/*.d.ts`) when measured with the success-criteria grep command, and every remaining occurrence MUST carry an inline comment stating the upstream cause.
- **FR-002**: The Supabase generated types in `src/types/database.ts` MUST match the live schema (last-applied migration) at the time of merge, regenerated via the Supabase type-generation command against the linked project.
- **FR-003**: Server-side Supabase client factories (`createServerClient`, `createServiceRoleClient`) MUST return a fully-typed client so `.from('table').select('col')` is checked at compile time.
- **FR-004**: `AssetCreatorModal` and its supporting components under `src/components/asset-studio/**` MUST expose hand-written prop types; callers passing wrong shapes MUST fail typecheck.
- **FR-005**: The project ESLint config MUST enable `@typescript-eslint/no-explicit-any` at severity `error` for production code, with explicit overrides that allow `any` in test files and generated `.d.ts` files only.
- **FR-006**: `bunx tsc --noEmit` MUST exit with status 0 on the merged branch. Pre-existing errors in test files that were failing before this work MAY remain, but MUST NOT get worse.
- **FR-007**: The existing Vitest suite MUST continue to pass at the same count as before the refactor started (baseline: 513 tests).
- **FR-008**: The refactor MUST NOT change runtime behaviour. No `.select` / `.insert` column lists change, no HTTP contracts change. If a type-correct call path forces a minor data reshape, the shaped output MUST equal the pre-refactor output byte-for-byte for the same inputs.
- **FR-009**: Remaining legitimate `any` usages MUST be labelled with one of three comment markers so future audits can triage them: `// any: upstream-sdk` (third-party gap), `// any: generated-types-mismatch` (tracked drift with a follow-up issue), or `// any: test-fixture` (applies only under `__tests__`, not counted in scope).
- **FR-010**: The work MUST land in staged pull requests ordered by hotspot, not a single mega-PR. Each PR MUST be independently mergeable and independently revertable. At minimum: one PR per user story above (3 PRs total).

### Key Entities

No new runtime data entities. Type-level entities introduced by this work:

- **`Database`** (from `src/types/database.ts`): the regenerated Supabase schema type — every table/column/enum drawn from the current DB.
- **`CanvasProduct`, `CanvasAsset`, `AssetCreatorModalProps`** (in `src/components/asset-studio`): hand-written shapes that replace the untyped "props bag" pattern in the modal.
- **Typed service-client facade** (`createServiceRoleClient`, `createServerClient`): wraps the raw Supabase client with the generated `Database` type.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At merge time, a repo-wide search for `as any|: any` under `src/` (excluding `__tests__/**` and `*.d.ts`) returns fewer than 20 results (baseline: 349), and each remaining result has a comment starting with `// any:`.
- **SC-002**: `bunx tsc --noEmit` exits with status 0 on a clean checkout of the merged branch.
- **SC-003**: The full test suite passes with the same number of passing tests as the pre-refactor baseline (513 as of branch cut).
- **SC-004**: In a random sample of 10 post-merge code reviews, reviewers find at least one typo/ambiguity that the compiler catches and that `any` would previously have hidden (measured informally over the first two weeks after merge — target: ≥5 out of 10 reviews).
- **SC-005**: Time to add a new `/api/*` route (measured from empty file to working handler) drops by at least 20% relative to the pre-refactor baseline, driven mostly by column/table autocomplete instead of manual schema lookup. Baseline: measure two sample routes before the refactor starts.
- **SC-006**: The refactor lands in ≥3 separate PRs, each ≤800 LOC diff, each reviewable in under 30 minutes.
- **SC-007**: Zero runtime regressions reported in the first week after merge that correlate to the refactor (i.e., no PRs need to be reverted). A correlated regression is one whose fix touches a file changed in this refactor.

## Assumptions

- The Supabase schema in the production project `apsfeutbqvgfgznmaesg` is the source of truth; local migration files are in sync with it at the moment the refactor starts. If not, the drift must be resolved first (out of scope, handled in a separate ticket).
- All migrations applied during the refactor (including the just-added `report_kind` column) have been applied in production before the type-generation command runs, otherwise the regenerated types will miss them.
- The team agrees `any` in test fixtures is acceptable — test-side type tightening is a separate future initiative.
- ESLint enforcement will be enabled in **CI only** for the first week after merge, then promoted to a blocking pre-commit check once the team has cleared any stragglers that escaped the PR sweep.
- No new Supabase client library version is introduced as part of this work. If an upgrade is needed to get cleaner types, it goes through its own evaluation per the dependency-expert process.
