# Phase 0 Research — Remove `any` Casts

**Branch**: `071-remove-any-casts`
**Date**: 2026-04-15

## Inventory

Measured on `develop` at branch cut:

| Metric                                                      | Value                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| Total `: any` or `as any` under `src/`                      | **349**                                                    |
| `: any` (type annotations)                                  | 237                                                        |
| `as any` (type assertions)                                  | 112                                                        |
| Files with ≥1 occurrence                                    | ~60                                                        |
| Largest single file (`AssetCreatorModal.tsx`)               | ~110                                                       |
| `.rpc(` call sites                                          | 10 (across 8 files)                                        |
| Client factory call sites                                   | 25 across 10 files                                         |
| Migrations applied in repo                                  | 109 (last: `20260415000000_add_report_kind_to_agents.sql`) |
| Generated types file (`src/lib/supabase/database.types.ts`) | 2,443 lines, **dated 2026-03-02**                          |

## R-1: Is `database.types.ts` in sync with production schema?

**Decision**: **NO — it is ~6 weeks stale.** Regenerating it is task #1 of P1 and blocks everything else in P1.

**Evidence**:

- The generated file is dated 2026-03-02. Since then ~20 migrations have been applied (every file in `supabase/migrations/` dated 2026-03-10 or later).
- `grep -c "report_kind|anthropic_agent_id|product_catalog|conversation_messages"` returns **0** in the current file, but all four columns/tables exist in applied migrations.
- This stale state is **the single root cause of the 349 `any` casts** in API routes — engineers hit compile errors and cast around them.

**Plan**:

1. Regenerate via `bunx supabase gen types typescript --linked > src/lib/supabase/database.types.ts`.
2. Commit as first task of P1 PR.
3. Add CI check (follow-up) that fails when `database.types.ts` was not regenerated in the same commit as any file under `supabase/migrations/`.

**Alternatives considered**:

- Hand-patching the missing tables: rejected — drift accumulates again within weeks.
- Moving to generated file at `src/types/database.ts` (consistent with CLAUDE.md conventions entry "Database types MUST be generated from Supabase schema"): **accepted** — same regen command, output redirected to the new path, and `server.ts` / `service.ts` / `studio-client.ts` imports updated. The old `src/lib/supabase/database.types.ts` gets removed.

## R-2: Client factory callsite inventory

**Decision**: all server/service factories already return typed clients (`createSupabaseServerClient<Database>`, `createClient<Database>`). The problem is **not** the factory types — it's that callers cast to `any` to work around the stale `Database` definition and to bypass branded-never types caused by `.from('<table_not_in_types>')`.

**Callsite counts** (from `rg -c "createServerClient|createServiceRoleClient|createBrowserClient|studioSupabase"` sampled top 10 files):

| File                                     | Count  | Category                                                              |
| ---------------------------------------- | ------ | --------------------------------------------------------------------- |
| `src/hooks/useProductCatalog.ts`         | 7      | `studioSupabase` — different (legacy) project, not in main `Database` |
| `src/hooks/use-trigger-subscriptions.ts` | 3      | server client                                                         |
| `src/hooks/use-*` (x7)                   | 2 each | server client                                                         |
| `src/proxy.ts`                           | 2      | server client                                                         |

Plus ~60 callsites inside `src/app/api/**` handlers (measured separately via grep of `createServerClient(` / `createServiceRoleClient(`).

**Plan**:

- Phase P1 fixes the main-project clients: once types are regenerated, remove every `(supabase as any).from(...)` / `(serviceClient as any).from(...)` in `src/app/api/**` and `src/lib/queries/*`.
- `studioSupabase` (legacy prototype project) gets its own minimal typed wrapper in P3. Generate types for **that** project too: `bunx supabase gen types typescript --project-id <legacy-id> > src/lib/supabase/studio-database.types.ts`, or — if the legacy schema is too churny — hand-type only the 3 tables we actually touch (`product_catalog`, + 2 more used by edge functions). Decision will be made at the start of P3 based on the table count; if >5 tables, generate; else hand-type.

## R-3: Canvas state shape in `AssetCreatorModal`

**Decision**: **hand-write TypeScript interfaces** for props + canvas state. Add `zod` schemas **only** at the trust boundaries where the state is serialised (Supabase JSON column reads, `localStorage` hydration, `JSON.parse`).

**Evidence**:

- The modal state lives in-memory throughout most of its lifecycle — plain TypeScript interfaces are enough.
- The project already uses `zod` at API-route boundaries (e.g., `OnboardingCompleteSchema`), so adding `zod` at state-hydration boundaries is idiomatic.
- Deriving types from `zod` schemas for internal state would add runtime parse overhead (every reducer call) with no correctness upside, violating Principle V (Simplicity).

**Plan for P2**:

1. Inventory every prop the modal accepts (grep the component signature, list all destructured fields).
2. Inventory every reducer action type (`dispatch({ type: '...' ...})`).
3. Define a discriminated-union `CanvasAction` and a `CanvasState` interface in a new `src/components/asset-studio/types.ts`.
4. Replace `any`s component-by-component; compile gate catches anything missed.
5. Add one `zod` schema at the JSON-column read site (`tasks.artifact_data → CanvasState`).

## R-4: ESLint enforcement rollout

**Decision**: **enable `@typescript-eslint/no-explicit-any` as `error` in the final PR of the sequence (P3)**. Earlier PRs keep it as `warn`.

**Evidence**:

- Flipping to `error` before P1's DB-type regen lands would fail lint on files not yet touched by the cleanup, making PRs un-mergeable in sequence.
- Scoping the rule per-directory is brittle and doesn't capture imports crossing boundaries.
- A single cutover at the end is explicit and reviewable.

**Plan**:

- P1 PR: no ESLint change. Rely on `tsc --noEmit` + reviewer.
- P2 PR: no ESLint change. Same as above.
- P3 PR: final commit of the PR flips `@typescript-eslint/no-explicit-any` to `error`, with an `overrides` block allowing it in `**/__tests__/**` and `*.d.ts`.

## R-5: Untyped RPC surface

**Decision**: **hand-typed wrappers for the 6 RPCs we call**. Regenerated `Database['public']['Functions']` will cover them if the functions were defined in migrations, but we need hand-typed wrappers anyway to avoid `as any` at every call site.

**RPC inventory**:

| RPC                             | Caller(s)                                                                 | In migrations?                      | Action                                        |
| ------------------------------- | ------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------- |
| `increment_ai_credits`          | 4 call sites (`engine-messages`, `engine-agents`×2, `telegram-processor`) | Yes                                 | Typed wrapper in `src/lib/billing/rpc.ts`.    |
| `create_task_with_conversation` | `/api/studio/tools`, `/api/tasks`                                         | Yes (`20260401010000`)              | Typed wrapper in `src/lib/tasks/rpc.ts`.      |
| `activate_skill`                | `/api/onboarding/complete`                                                | Yes                                 | Typed wrapper in `src/lib/actions/skills.ts`. |
| `unschedule_cron_job`           | `src/lib/actions/workspace.ts`                                            | Yes                                 | Typed wrapper co-located.                     |
| `update_agent_config`           | `src/lib/actions/agents.ts`                                               | Yes (but currently cast `as never`) | Typed wrapper co-located; remove `as never`.  |
| (provision.ts custom)           | `src/lib/modules/provision.ts`                                            | Yes                                 | Typed wrapper co-located.                     |

After regen, each RPC's input and return type will be importable from `Database['public']['Functions'][<name>]['Args' | 'Returns']`. Wrappers are thin adapters with explicit param names.

## Summary — resolved clarifications

All five research items resolved. No `NEEDS CLARIFICATION` flags remain.

Phase 1 can now commit to:

- **Typed schema file**: `src/types/database.ts` (regenerated via `supabase gen types typescript --linked`).
- **Factory rewrites**: `src/lib/supabase/server.ts` keeps its current `createSupabaseServerClient<Database>` pattern but imports from the new path; `studio-client.ts` gets either generated or hand-typed `Database` narrowly.
- **Canvas types**: `src/components/asset-studio/types.ts` (hand-written, `zod` only at JSON boundaries).
- **RPC wrappers**: 6 wrappers, co-located with their callers.
- **ESLint flip**: single commit at the end of P3.
