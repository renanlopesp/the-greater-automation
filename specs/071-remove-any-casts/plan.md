# Implementation Plan: Remove `any` Casts from Production Code

**Branch**: `071-remove-any-casts` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/071-remove-any-casts/spec.md`

## Summary

Restore TypeScript's strict-mode guarantees across `src/` by eliminating the 349 `any` casts (237 `: any` + 112 `as any`) that bypass the compiler today. Attack by hotspot in three stages: (P1) regenerate Supabase `Database` types + rewrite client factories to return `SupabaseClient<Database>`, fixing ~60% of the count; (P2) hand-write prop and state types for `AssetCreatorModal` + supporting asset-studio code (~30%); (P3) type the Anthropic/Composio/hook wrappers and the small remainders. Lock in the result with `@typescript-eslint/no-explicit-any` as `error` in ESLint for non-test files. Each stage ships as its own PR so a rollback is surgical.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: `@supabase/supabase-js`, `@supabase/ssr`, `@anthropic-ai/sdk`, `composio-core`, `@tanstack/react-query`, `zod`
**Storage**: Supabase PostgreSQL (production project `apsfeutbqvgfgznmaesg`). No schema changes in this feature.
**Testing**: Vitest (`src/**/__tests__/*`, 513 passing at branch cut), Playwright (if relevant flows touched). Baseline `bunx tsc --noEmit` has pre-existing test-file errors that MUST NOT get worse.
**Target Platform**: Next.js 16 App Router (Node runtime on Vercel; some routes on Edge runtime — untyped client already works on both, so no runtime change is expected).
**Project Type**: single (web app — all under `src/`)
**Performance Goals**: No runtime perf target. Build-time: `bunx tsc --noEmit` wall clock MUST NOT regress by more than 10% after the refactor (regenerated `Database` type can be large; measure before/after).
**Constraints**: No behaviour change. No `.select`/`.insert` column lists change. No HTTP contract change. Each PR ≤800 LOC of net diff, ≥3 PRs total.
**Scale/Scope**: 349 occurrences across ~60 files in `src/`; target final count <20 documented exceptions. Zero new runtime code paths.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status        | Notes                                                                                                                                                                                   |
| ------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Next.js App Router First    | ✅ Pass       | No routing change.                                                                                                                                                                      |
| II. shadcn/ui Component System | ✅ Pass       | No new components; only prop types on existing ones.                                                                                                                                    |
| III. Tailwind CSS v4 + OKLCH   | ✅ Pass       | No styling change.                                                                                                                                                                      |
| IV. TypeScript Strict Mode     | ✅ **Aligns** | This feature directly enforces Principle IV by removing forbidden `any` usage. Remaining cases carry the `// any:` marker documenting the "genuine type boundary" the principle allows. |
| V. Simplicity and YAGNI        | ✅ Pass       | Only the type surface that the 349 occurrences force us to touch. No speculative type helpers.                                                                                          |
| VI. Supabase as Backend        | ✅ Pass       | No new backend code; strengthens typing on the existing Supabase client factories.                                                                                                      |

**Quality gates**: `bun run build` must pass at the end of each PR (constitution requires zero errors). `bun run lint` must pass — this feature adds the `no-explicit-any` rule, so the final PR of the sequence is the one that flips it to `error`; earlier PRs keep it `warn` to avoid a tripwire mid-refactor.

No constitution violations. Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/071-remove-any-casts/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (type-model, not data-model)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (type-contract fixtures)
│   └── typed-supabase-client.md
├── checklists/
│   └── requirements.md  # Created by /speckit.specify
└── tasks.md             # /speckit.tasks output
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/                         # ~40% of any casts live here (supabase query casts)
├── components/
│   └── asset-studio/
│       ├── AssetCreatorModal.tsx    # Largest single hotspot (~110 occurrences)
│       └── StudioChatPanel.tsx      # Secondary hotspot
├── hooks/
│   └── useProductCatalog.ts         # Already partially migrated; finishes here
├── lib/
│   ├── ai/                          # Anthropic wrappers (agent-chat, agent-client, platform-tools)
│   ├── composio/                    # OAuth connectors
│   ├── supabase/
│   │   ├── server.ts                # createServerClient / createServiceRoleClient factories (rewritten)
│   │   └── studio-client.ts         # studioSupabase (rewritten)
│   └── queries/                     # typed query helpers (members.ts etc.)
└── types/
    └── database.ts                  # Regenerated Supabase types (source of truth)
```

**Structure Decision**: Single-project layout, no new directories. All work is in-place. The `src/types/database.ts` file is the only "new" artefact (it exists today but may be stale / partial — regenerating it is the pivotal first step of P1).

## Complexity Tracking

_Not applicable — zero Constitution violations._

---

## Phase 0 — Research

_Prerequisites identified while writing Technical Context._

Open questions that need resolution before Phase 1 can commit to a design:

### R-1: Is `src/types/database.ts` currently in sync with production schema?

**Decision needed**: check whether the file exists, when it was last regenerated, and whether recent migrations (incl. `20260415000000_add_report_kind_to_agents.sql` from the preceding PR) have been applied to production.

**How to resolve**: `stat src/types/database.ts`; diff generated types against a fresh `supabase gen types typescript --linked`; inspect `supabase/migrations/` vs. `supabase migration list --linked`.

**Exit criterion**: either the file is already in sync (proceed), or a regeneration task is added as the first task in P1 (blocker).

### R-2: Which client factory variants exist and where are they called from?

**Decision needed**: enumerate all callers of `createServerClient()`, `createServiceRoleClient()`, `createBrowserClient()`, and `studioSupabase`. Some may legitimately need the untyped client (e.g., RPC calls to tables not in the generated type). We need a full list before we change the return type.

**How to resolve**: `Grep` for each factory name; tag every callsite. For any that calls `.rpc()` with a name not in the `Database['public']['Functions']` map, plan a `@ts-expect-error // any: rpc-not-in-types` comment strategy.

**Exit criterion**: a callsite inventory goes into `research.md` with a row per callsite and its category (clean cast, RPC, custom table).

### R-3: Canvas state shape in `AssetCreatorModal`

**Decision needed**: the modal has ~110 `any` occurrences, most of them props and state-reducer actions. We need to decide whether to hand-write the types or extract a schema via `zod` (used elsewhere in the project) and derive types from it.

**How to resolve**: read `AssetCreatorModal.tsx` plus its callers; list all state-action shapes; decide per cluster.

**Exit criterion**: `research.md` contains a decision with rationale. Default recommendation: hand-write TypeScript interfaces for props + a `zod` schema for any state reconstructed from `JSON.parse` or from Supabase JSON columns (since those are the genuine trust boundaries per Principle IV).

### R-4: ESLint enforcement rollout

**Decision needed**: should `@typescript-eslint/no-explicit-any` flip from `warn` → `error` in a separate final commit of the final PR, or be part of each stage PR (scoped per-directory)?

**How to resolve**: check whether the current ESLint config supports per-directory overrides; review whether staged enablement can hide regressions in the interim.

**Exit criterion**: `research.md` picks one rollout strategy. Default recommendation: enable as `error` globally only in the final PR (P3), with test files excluded via an `overrides` block. Earlier PRs rely on the reviewer + `tsc --noEmit` to enforce.

### R-5: How much of the backlog is "RPC-shaped" and can't be fully typed

**Decision needed**: `rpc('activate_skill', …)` and friends have string names and loosely-typed args today. The generated `Database['public']['Functions']` map should cover them, but only if the RPC definitions live in migrations (not applied ad-hoc). Inventory which RPCs are in migrations vs. which were created directly.

**How to resolve**: `Grep` for `\.rpc\(` calls, cross-reference each name against `supabase/migrations/` (`CREATE OR REPLACE FUNCTION`).

**Exit criterion**: list of untyped RPCs in `research.md` with a remediation plan: add the function to a migration, or wrap it in a hand-typed helper.

**Output**: `research.md` with all five items resolved. All `NEEDS CLARIFICATION` flags cleared before Phase 1.

## Phase 1 — Design

_Prerequisites: `research.md` complete._

### 1a. Type model (`data-model.md`)

This is a type-only feature, so the "data model" is a type model. Document:

- `Database` (regenerated): tables, views, enums, functions — source of truth.
- `TypedSupabaseClient`: alias for `SupabaseClient<Database>`.
- `CanvasProduct`, `CanvasAsset`, `CanvasActionMap` (asset-studio): hand-written shapes.
- `AssetCreatorModalProps`: full prop interface.
- Supporting helper types: `SafeInsert<Table>`, `SafeUpdate<Table>`, `Json`, `Enums<Name>` (mostly re-exports from `database.ts`).

Validation rules: each type either lives in a generated file (machine truth) or carries a `zod` schema at the trust boundary — API route body, `JSON.parse`, Supabase JSON columns decoded client-side.

### 1b. Contracts (`contracts/`)

This feature has no HTTP contracts. Instead we ship **type contracts** — small `.ts` fixtures in `contracts/` that pin the shape of the public types. The CI typechecks these fixtures; if the types regress (e.g., a field becomes `any` again), the fixture breaks.

- `contracts/typed-supabase-client.md`: documents the factory-return contract and a tiny `.ts` snippet used as a regression fixture.
- `contracts/asset-studio-types.md`: documents the modal prop contract.

### 1c. Quickstart (`quickstart.md`)

A one-page checklist for an engineer picking up a later task: "here's how to regenerate types, here's the comment taxonomy for remaining `any`s, here's how to run the grep that validates success."

### 1d. Agent context update

Run `.specify/scripts/bash/update-agent-context.sh claude` so `CLAUDE.md` knows about the `Database` / `TypedSupabaseClient` additions to Active Technologies.

**Output**: `data-model.md`, `contracts/*.md`, `quickstart.md`, updated `CLAUDE.md` stub.

## Re-Evaluation — Constitution Check (post-design)

To be completed after Phase 1 artefacts are generated. Expected result: all six principles still pass. Any new type helpers introduced in Phase 1 must not break Principle V (Simplicity) — if the design adds >3 helper types that aren't used by at least two callers each, revisit before committing.
