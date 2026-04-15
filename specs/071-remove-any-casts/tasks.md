---
description: 'Task list for 071-remove-any-casts'
---

# Tasks: Remove `any` Casts from Production Code

**Input**: Design documents from `/specs/071-remove-any-casts/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Compile-time fixtures only (see contracts/). No runtime test tasks — the refactor must not change behaviour, so the existing 513 Vitest suite is the regression guard.

**Organization**: Tasks are grouped by user story. Each story maps to one staged PR per plan.md §Project Structure.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no dependencies on incomplete tasks)
- **[Story]**: `[US1]` supabase-typed api layer, `[US2]` asset-studio types, `[US3]` ai/composio/hooks + ESLint flip
- All paths are absolute from repo root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: regenerate the `Database` type so every subsequent task can rely on it. This phase is single-threaded; T003 unblocks every other task.

- [ ] T001 Verify linked Supabase project is `apsfeutbqvgfgznmaesg` via `bunx supabase status`; if wrong, run `bunx supabase link --project-ref apsfeutbqvgfgznmaesg`
- [ ] T002 Confirm all 109 migrations in `supabase/migrations/` are applied in the linked project via `bunx supabase migration list --linked` — STOP and ask if any local migration is missing upstream
- [ ] T003 Regenerate DB types: `bunx supabase gen types typescript --linked > src/types/database.ts`
- [ ] T004 Remove stale generated file: `git rm src/lib/supabase/database.types.ts`
- [ ] T005 Update all imports of the old path via `rg -l "@/lib/supabase/database\.types" src | xargs sed -i 's|@/lib/supabase/database\.types|@/types/database|g'`
- [ ] T006 Verify baseline: `bunx tsc --noEmit 2>&1 | tee /tmp/tsc-before.txt` and record pre-existing test-file errors (must not get worse)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: expose typed client aliases and land the compile-time contract fixtures so every cast removed downstream is caught if it regresses.

**⚠️ CRITICAL**: No US1 task can begin until this phase completes.

- [ ] T007 Add typed aliases `TypedSupabaseClient` / `TypedServiceClient` in `src/lib/supabase/server.ts` (re-exporting `SupabaseClient<Database>` with documentation comments per data-model §T-2)
- [ ] T008 [P] Mirror the alias in the browser client at `src/lib/supabase/client.ts` so `"use client"` consumers get the typed form
- [ ] T009 [P] Add ESLint rule `@typescript-eslint/no-explicit-any` at severity `warn` (not `error` yet) in `eslint.config.mjs` with overrides for `**/__tests__/**` and `*.d.ts` — stays `warn` through P1/P2, flips to `error` in T068
- [ ] T010 Create regression fixture `src/lib/supabase/__tests__/types.contract.ts` per contracts/typed-supabase-client.md — verify it compiles after T003
- [ ] T011 Confirm `bunx tsc --noEmit` still matches the T006 baseline — fail the phase if new errors appeared outside `__tests__`

**Checkpoint**: Foundation ready — US1 can now proceed. US2 and US3 are blocked until US1's typed client work lands.

---

## Phase 3: User Story 1 — Typed Supabase Client Across the API Layer (Priority: P1) 🎯 MVP

**Goal**: every `src/app/api/**` handler and every `src/lib/**` Supabase callsite uses typed clients with no `any` cast. Reduces the project's `any` count from 349 → ~110.

**Independent Test**: rename a column in the `.select()` of any handler; `bunx tsc --noEmit` fails with a specific file:line error naming the column. See spec.md US1 acceptance scenario #1.

**PR scope**: `src/app/api/**`, `src/lib/queries/**`, `src/lib/chat/**` (Supabase callsites), `src/lib/billing/**`, `src/lib/tasks/**`, `src/lib/actions/**`, `src/lib/modules/**`, `src/lib/messaging/**`, `src/lib/onboarding/**`, RPC wrappers.

### US1-A: RPC wrappers (unblocks most downstream handlers)

- [ ] T012 [P] [US1] Create `src/lib/billing/rpc.ts` exporting `incrementAiCredits({ teamId, credits })` using `Database['public']['Functions']['increment_ai_credits']['Args']` — replace 4 callsites in `src/lib/chat/engine-messages.ts`, `src/lib/chat/engine-agents.ts` (×2), `src/lib/messaging/telegram-processor.ts`
- [ ] T013 [P] [US1] Create `src/lib/tasks/rpc.ts` exporting `createTaskWithConversation(payload)` using generated args — replace casts in `src/app/api/studio/tools/route.ts:872` and `src/app/api/tasks/route.ts:40`
- [ ] T014 [P] [US1] Type `activateSkill({ teamId, slug })` wrapper in `src/lib/actions/skills.ts` and update `src/app/api/onboarding/complete/route.ts:45` caller — remove the `as unknown as { rpc }` ladder
- [ ] T015 [P] [US1] Type `unscheduleCronJob(name)` in `src/lib/actions/workspace.ts:77` (remove current `as never`)
- [ ] T016 [P] [US1] Type `updateAgentConfig(params)` in `src/lib/actions/agents.ts:37` (remove `as never` casts on both args)
- [ ] T017 [P] [US1] Type the custom provision RPC in `src/lib/modules/provision.ts:64` using generated function type

### US1-B: API route cleanup (sweep by subtree)

- [ ] T018 [P] [US1] Remove all `as any` in `src/app/api/chat/route.ts` (3 occurrences) — verify `bunx tsc --noEmit src/app/api/chat/route.ts` passes
- [ ] T019 [P] [US1] Remove all `as any` in `src/app/api/studio/tools/route.ts` (6 occurrences, includes `synthesize` error path)
- [ ] T020 [P] [US1] Remove `as any` in `src/app/api/studio/turn/route.ts` and `src/app/api/studio/turn/activity/route.ts` (2 each) — keep user-scoped client from prior security fix
- [ ] T021 [P] [US1] Remove `as any` in `src/app/api/agents/update-prompt/route.ts` (3 occurrences, includes brand_dna query)
- [ ] T022 [P] [US1] Remove `as any` in `src/app/api/agents/cron/reports/route.ts` — now that `report_kind` is in types, drop the temporary cast block
- [ ] T023 [P] [US1] Remove `as any` in `src/app/api/studio/tools/instagram-list/route.ts` (2 occurrences)
- [ ] T024 [P] [US1] Remove `as any` in `src/app/api/tasks/route.ts` and `src/app/api/tasks/[id]/route.ts`
- [ ] T025 [P] [US1] Remove `as any` in `src/app/api/store/brand-dna/route.ts` and `src/app/api/store/settings/route.ts`
- [ ] T026 [P] [US1] Remove `as any` in `src/app/(dashboard)/studio/create/[id]/page.tsx:71` (`serviceClient as any`)
- [ ] T027 [P] [US1] Remove `as any` in `src/app/api/skills/seasonal-calendar/generate/route.ts` and `.../generate-deliverable/route.ts`

### US1-C: lib Supabase callsites

- [ ] T028 [P] [US1] Clean `: any` / `as any` in `src/lib/queries/members.ts` (5 + 2 occurrences) — row maps should use `Database['public']['Tables']['team_members']['Row']`
- [ ] T029 [P] [US1] Clean `: any` / `as any` in `src/lib/actions/skills.ts` (5 occurrences) — co-located with T014
- [ ] T030 [P] [US1] Clean `: any` in `src/lib/actions/seasonal-calendar.ts` (2 occurrences)
- [ ] T031 [P] [US1] Clean `: any` / `as any` in `src/lib/actions/members.ts` (9 occurrences)
- [ ] T032 [P] [US1] Clean `: any` in `src/lib/onboarding/analysis-pipeline.ts` (2 occurrences)
- [ ] T033 [P] [US1] Clean `: any` / `as any` in `src/lib/chat/engine-messages.ts` (1 each) — co-located with T012
- [ ] T034 [P] [US1] Clean `: any` / `as any` in `src/lib/chat/engine-agents.ts` (1 each) — co-located with T012
- [ ] T035 [P] [US1] Clean `: any` / `as any` in `src/lib/messaging/telegram-processor.ts` (4 + 4 occurrences)

### US1-D: verification and PR

- [ ] T036 [US1] Run `rg "as any|: any" src/app/api src/lib --glob '!**/__tests__/**' | wc -l` — expect <30 (down from ~180 in this subtree)
- [ ] T037 [US1] Run `bunx tsc --noEmit` — no new errors vs. T006 baseline
- [ ] T038 [US1] Run `bun test` — confirm 513 tests still pass
- [ ] T039 [US1] Open PR `fix/071-typed-supabase-client` — target `develop`, body references spec.md US1 acceptance scenarios

**Checkpoint**: US1 complete — typed Supabase flows through the whole server side. MVP demonstrable: regression fixture (T010) guards the contract; hand-rename a column in one handler and show the compile error.

---

## Phase 4: User Story 2 — Typed Asset-Studio Modal (Priority: P2)

**Goal**: `AssetCreatorModal` and its supporting asset-studio code carry hand-written types; discriminated-union actions make the reducer exhaustive. Reduces remaining `any` count from ~110 → ~25.

**Independent Test**: rename any required prop on `AssetCreatorModalProps`; every caller fails `tsc --noEmit`. Canvas reducer exhaustiveness check fires when a new action is added without a handler.

**PR scope**: `src/components/asset-studio/**`, one `zod` schema at the artifact-JSON boundary.

### US2-A: Type module and fixture

- [ ] T040 [P] [US2] Create `src/components/asset-studio/types.ts` with `ChannelAspectRatio`, `CanvasFont`, `CanvasStyle`, `CanvasWidget`, `CanvasProduct`, `CanvasState`, `CanvasAction`, `AssetCreatorModalProps` per data-model §T-4..T-7
- [ ] T041 [P] [US2] Create regression fixture `src/components/asset-studio/__tests__/types.contract.ts` per contracts/asset-studio-types.md
- [ ] T042 [P] [US2] Add `zod` schema for `CanvasState` at the JSON read site (`tasks.artifact_data.activeProduct`) in `src/lib/studio/artifact-bridge.ts` (or the exact file that deserialises the artifact — locate via grep on `artifact_data` reads in studio code)

### US2-B: Modal typing (single file, serialise sub-tasks by region)

- [ ] T043 [US2] Replace modal prop `any`s in `src/components/asset-studio/AssetCreatorModal.tsx` header/signature (~5 occurrences) with `AssetCreatorModalProps`
- [ ] T044 [US2] Replace canvas-state `any`s in reducer section of `src/components/asset-studio/AssetCreatorModal.tsx` (~40 occurrences) — reducer returns `CanvasState`, cases narrow via `action.type`
- [ ] T045 [US2] Replace `any`s in product-selector region of the same file (~30 occurrences) — rows typed as `CanvasProduct`
- [ ] T046 [US2] Replace remaining `any`s in helper functions of the modal (~35 occurrences) — e.g., `generateImage`, `applyStyle`, `applyChannel`
- [ ] T047 [US2] Exhaustiveness check: add a `default: const _exhaustive: never = action` branch to the reducer — confirm no regression

### US2-C: Supporting components

- [ ] T048 [P] [US2] Clean `: any` / `as any` in `src/components/asset-studio/StudioChatPanel.tsx` (11 + 4 occurrences) — chat messages typed via spec.md US2 acceptance #3
- [ ] T049 [P] [US2] Clean `: any` in `src/components/chat/orchestrator-chat-wrapper.tsx` (1 occurrence, related to asset handoff)

### US2-D: verification and PR

- [ ] T050 [US2] Run `rg "as any|: any" src/components/asset-studio --glob '!**/__tests__/**' | wc -l` — expect ≤5 (down from ~125 in subtree)
- [ ] T051 [US2] Run `bunx tsc --noEmit` — no new errors
- [ ] T052 [US2] Run `bun test` — confirm 513 tests still pass
- [ ] T053 [US2] Smoke test: open the studio create page locally, add a widget, change channel, change font, generate image. Verify no runtime regression.
- [ ] T054 [US2] Open PR `fix/071-asset-studio-types` — target `develop`, references US2 acceptance scenarios

**Checkpoint**: US2 complete — asset-studio modal is type-safe. Can be merged independently of US3.

---

## Phase 5: User Story 3 — AI/Composio/Hooks + ESLint Flip (Priority: P3)

**Goal**: close the long tail (AI wrappers, Composio connectors, `useProductCatalog` remnants) and flip ESLint to `error`. Reduces remaining `any` count from ~25 → <20. Every surviving cast carries a `// any:` comment.

**Independent Test**: add a new tool/skill name to the Anthropic wrapper; compiler auto-completes it. Adding an unsupported provider slug to Composio initiator fails typecheck.

**PR scope**: `src/lib/ai/**`, `src/lib/composio/**`, `src/hooks/**`, `studioSupabase`, `eslint.config.mjs`.

### US3-A: Studio legacy client typing

- [ ] T055 [P] [US3] Decide generation vs. hand-type for legacy studio project: inspect `studioSupabase` callsites (`src/hooks/useProductCatalog.ts`, `src/components/asset-studio/AssetCreatorModal.tsx`). If ≤5 tables used, hand-type `StudioDatabase` in `src/lib/supabase/studio-database.types.ts`; else run `bunx supabase gen types typescript --project-id <legacy-id>`
- [ ] T056 [US3] Update `src/lib/supabase/studio-client.ts` to export `createClient<StudioDatabase>` (or generated equivalent)
- [ ] T057 [US3] Remove 7 `: any` / `as any` in `src/hooks/useProductCatalog.ts` — now backed by `StudioDatabase`

### US3-B: AI wrappers

- [ ] T058 [P] [US3] Clean `: any` / `as any` in `src/lib/ai/agent-chat.ts` (3 + 1 occurrences) — type `sanitizeComposioResponse` input/output
- [ ] T059 [P] [US3] Clean `: any` / `as any` in `src/lib/ai/agent-client.ts` (3 + 1 occurrences) — type Anthropic tool-call wrapper
- [ ] T060 [P] [US3] Clean `: any` in `src/lib/ai/agent-provisioning.ts` (3 occurrences)
- [ ] T061 [P] [US3] Clean `: any` / `as any` in `src/lib/ai/platform-tools.ts` (2 + 1 occurrences)

### US3-C: Composio wrappers

- [ ] T062 [P] [US3] Clean `: any` / `as any` in `src/lib/composio/actions/initiate-connection.ts` (2 + 2 occurrences)
- [ ] T063 [P] [US3] Sweep `src/lib/composio/**` for any remaining `: any` via `rg "as any|: any" src/lib/composio` — clean or label with `// any: upstream-sdk` + inline reason

### US3-D: Hooks and chat wrappers

- [ ] T064 [P] [US3] Clean `: any` in `src/hooks/use-orchestrator-chat.ts` and `src/components/chat/orchestrator-chat-wrapper.tsx` remainders
- [ ] T065 [P] [US3] Any remaining `: any` under `src/components/asset-studio/AssetCreatorModal.tsx` (should be zero after US2; verify)

### US3-E: ESLint flip and final audit

- [ ] T066 [US3] Audit every surviving `any` in `src/` excluding `__tests__/` — add `// any: upstream-sdk` / `// any: generated-types-mismatch` per data-model §T-9 taxonomy. Create follow-up issue for each `generated-types-mismatch` entry
- [ ] T067 [US3] Confirm final count: `rg "as any|: any" src --glob '!**/__tests__/**' --glob '!**/*.d.ts' | wc -l` < 20 (SC-001)
- [ ] T068 [US3] Flip `@typescript-eslint/no-explicit-any` from `warn` → `error` in `eslint.config.mjs`, keeping the `__tests__` and `*.d.ts` overrides
- [ ] T069 [US3] `bun run lint` must pass with zero warnings — fix any stragglers or add scoped overrides
- [ ] T070 [US3] Run final `bunx tsc --noEmit` and `bun test` — baseline parity required (no new tsc errors outside `__tests__`, 513 tests pass)
- [ ] T071 [US3] Open PR `fix/071-ai-composio-eslint` — target `develop`, body includes the <20-budget proof and the labelled-exception list

**Checkpoint**: all three user stories complete. Constitution Principle IV fully enforceable from this point forward.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: documentation + rollout hygiene. No runtime changes.

- [ ] T072 [P] Update `CLAUDE.md` "Active Technologies" entry for 071 to note the finalised `Database` / `StudioDatabase` + ESLint stance
- [ ] T073 [P] Add a note to `docs/CODEBASE_MAP.md` (if exists) describing where generated DB types live and how they are refreshed
- [ ] T074 Commit a follow-up GitHub issue stub titled "Add CI gate: regenerate `src/types/database.ts` when `supabase/migrations/` changes" — out of scope for this feature but the obvious next step
- [ ] T075 Run `specs/071-remove-any-casts/quickstart.md` validation end-to-end on a fresh clone to confirm the playbook is accurate
- [ ] T076 Close `specs/071-remove-any-casts/checklists/requirements.md` — re-validate after merge

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: blocks everything. T003 (type regen) is the pivotal task.
- **Foundational (Phase 2)**: depends on Phase 1. T007–T011 can run mostly in parallel; T010 depends on T007.
- **US1 (Phase 3)**: depends on Foundational. All US1-A tasks are parallel; US1-B/C parallel per file. US1-D is serial.
- **US2 (Phase 4)**: depends on US1 PR landing (T039) because US2 code reads from the typed Supabase client.
- **US3 (Phase 5)**: depends on US2 PR landing (T054) mostly for clean merge base. US3-E (ESLint flip) is the last task of the feature.
- **Polish (Phase 6)**: depends on US3.

### User Story Dependencies

- **US1**: blocks US2 and US3 (they consume the typed `Database`).
- **US2**: blocks only Polish. US3 does not depend on US2 functionally but sequences after to keep PR sizes manageable.
- **US3**: blocks Polish.

### Within Each User Story

- **US1**: RPC wrappers (US1-A) first — unblock downstream handlers. Then US1-B + US1-C in parallel. Then US1-D.
- **US2**: Types module (T040) first — every other US2 task depends on it. T041 and T042 can run in parallel with T043+.
- **US3**: Studio DB typing (US3-A) and AI/Composio cleanup (US3-B/C/D) in parallel. ESLint flip (US3-E) is strictly last.

### Parallel Opportunities

- All Phase-1 tasks except T002→T003→T005 are sequential; T001 runs first.
- Phase 2: T008, T009 in parallel; T010 needs T007.
- US1-A: all six RPC wrapper tasks (T012–T017) can run in parallel.
- US1-B: all ten file sweeps (T018–T027) can run in parallel.
- US1-C: all eight file sweeps (T028–T035) can run in parallel.
- US2-A: all three setup tasks (T040–T042) in parallel.
- US2-B: serial (same file).
- US2-C: T048 and T049 in parallel.
- US3-B, C, D: all independent file cleanups — maximum parallelism.

---

## Parallel Example: User Story 1-B (API route sweep)

```bash
# Launch all route cleanups in parallel (different files, no cross-deps):
Task: "Remove all `as any` in src/app/api/chat/route.ts"
Task: "Remove all `as any` in src/app/api/studio/tools/route.ts"
Task: "Remove as any in src/app/api/studio/turn/route.ts and src/app/api/studio/turn/activity/route.ts"
Task: "Remove as any in src/app/api/agents/update-prompt/route.ts"
Task: "Remove as any in src/app/api/agents/cron/reports/route.ts"
Task: "Remove as any in src/app/api/studio/tools/instagram-list/route.ts"
Task: "Remove as any in src/app/api/tasks/route.ts and src/app/api/tasks/[id]/route.ts"
Task: "Remove as any in src/app/api/store/brand-dna/route.ts and src/app/api/store/settings/route.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup — **pivotal type regen**.
2. Complete Phase 2: Foundational — typed aliases + fixture.
3. Complete Phase 3: US1 — ~65% of the cast reduction.
4. **STOP and VALIDATE**: T036–T038 run cleanly. Open PR, let reviewers confirm the compile-time regression fixture catches a hand-written regression.
5. Merge US1 → measurable 349 → ~110 drop.

### Incremental Delivery

Three PRs, each independently mergeable:

1. **PR-1 (`fix/071-typed-supabase-client`)**: Phase 1 + 2 + US1 — ≤800 LOC.
2. **PR-2 (`fix/071-asset-studio-types`)**: US2 — ≤800 LOC, rebased on PR-1.
3. **PR-3 (`fix/071-ai-composio-eslint`)**: US3 + Polish + ESLint flip — ≤500 LOC, rebased on PR-2.

### Parallel Team Strategy

If two engineers are available after PR-1 merges:

- Engineer A: US2 (asset-studio modal).
- Engineer B: US3 studio-legacy client + AI/Composio cleanup.
- Merge US2 first (bigger reviewer surface), US3 rebased on it.

---

## Notes

- [P] tasks modify different files and have no incomplete dependencies — they may run in parallel by different contributors or concurrent agent sessions.
- The regression fixtures in `contracts/` (T010, T041) are compile-time only — no runtime test harness is added.
- The ESLint flip (T068) is the **only** task that can break unrelated files. It runs at the very end for a reason.
- The migration added in the previous security PR (`20260415000000_add_report_kind_to_agents.sql`) must be applied upstream before T003 runs, otherwise `report_kind` won't appear in the regenerated types and T022 will need a temporary cast.
- Every surviving `any` after T067 must carry one of the three documented comment markers (data-model §T-9). Nothing else is accepted.
- Commit after each logical task or pair of related tasks. Do not batch more than five tasks into a single commit — review quality drops sharply beyond that.
- If T003 regeneration fails or produces an empty file, stop and investigate — never hand-patch the types. Drift indicates a Supabase link / migration state problem that must be resolved upstream first.
