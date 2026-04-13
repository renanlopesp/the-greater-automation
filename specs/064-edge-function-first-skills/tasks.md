# Tasks: Edge-Function-First Skills

**Input**: Design documents from `/specs/064-edge-function-first-skills/`
**Prerequisites**: spec.md ✅, contracts/generate-seasonal-calendar.md ✅, quickstart.md ✅
**Depends on**: Spec 063 (Hybrid Chat API) — merged

**Tests**: Unit tests for shared Deno modules (anthropic wrapper, brand-dna loader, error helper). No new integration test suite — manual Playwright via `quickstart.md`.

**Organization**: Tasks are grouped by user story so each user story can ship as an independent increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 / US4 — derived from spec.md Migration plan

## Path Conventions

New Deno code lives in `supabase/functions/`. Shared helpers live in `supabase/functions/_shared/`. Next.js deletions target `src/lib/ai/` and `src/app/api/skills/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold Edge Function directories and shared `_shared/` module; document env surface.

- [x] T001 [P] Create directory `supabase/functions/generate-seasonal-calendar/` with an empty `index.ts` scaffold and a per-function `README.md` linking to `specs/064-edge-function-first-skills/contracts/generate-seasonal-calendar.md`
- [x] T002 [P] Create `supabase/functions/_shared/` with a `README.md` explaining: "shared Deno modules imported by skill Edge Functions; do NOT import from Next.js src/"; add `.gitkeep` equivalent if needed
- [x] T003 [P] Add `.env.example.edge-functions` at repo root listing the Supabase secrets each new function needs: `MCP_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NUVEMSHOP_USER_AGENT`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared Deno modules every skill Edge Function will import.

**⚠️ CRITICAL**: No user-story phase can begin until T004-T008 are complete.

- [x] T004 [P] Create `supabase/functions/_shared/supabase.ts` exporting `createServiceClient()` — wraps `createClient` with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `auth: { persistSession: false }`
- [x] T005 [P] Create `supabase/functions/_shared/anthropic.ts` exporting `callMessages({ model, system, messages, tools? })` — thin fetch wrapper over `https://api.anthropic.com/v1/messages` with `anthropic-version: 2023-06-01`; also exports `generateObject({ schema, prompt, system })` helper used by calendar generator
- [x] T006 [P] Create `supabase/functions/_shared/nuvemshop.ts` exporting `fetchProducts(storeId, token, { limit })` and `fetchStore(storeId, token)` — ported from `src/lib/nuvemshop/client.ts`, Deno-compatible fetch only
- [x] T007 [P] Create `supabase/functions/_shared/brand-dna.ts` exporting `loadBrandDna(supabase, teamId)` and `loadStoreForTeam(supabase, teamId)`; handles null/missing gracefully
- [x] T008 [P] Create `supabase/functions/_shared/errors.ts` exporting `failTask(supabase, taskId, stage, message)` and `log(tag, fields)` — centralizes the `tasks.skill_status='failed'` + `metadata.error` write pattern

**Checkpoint**: `_shared/` compiles via `supabase functions serve _shared` (no-op check) — nothing user-facing yet.

---

## Phase 3: User Story US1 — Pilot: seasonal-calendar Edge Function (P1)

**Goal**: The seasonal-calendar skill runs entirely inside a Supabase Edge Function. Next.js dispatches via the MCP tool and reads the artifact via Realtime.

**Independent test criteria** (see `quickstart.md` §2):

- Submit "Gera o calendário de 2026" via chat.
- `/api/chat` returns 200 JSON `{ ok: true, taskId }` in ≤ 500ms.
- `generate-seasonal-calendar` Edge Function logs show `start` and `completed` lines.
- `tasks.artifact_type='seasonal-calendar'` + `skill_status='completed'` within 60s.
- Artifact panel renders 16+ dates.

- [x] T009 [US1] Port the calendar prompt + JSON schema from `src/lib/ai/seasonal-campaign-generator.ts` into `supabase/functions/generate-seasonal-calendar/prompt.ts` (prompt template + Zod schema for the 16-date calendar output)
- [x] T010 [US1] Port the product-analyzer scoring logic (sales + margin + co-occurrence summary) from `src/lib/ai/product-analyzer.ts` into `supabase/functions/generate-seasonal-calendar/product-analyzer.ts` — Deno-compatible; no Node-only imports
- [x] T011 [US1] Implement `supabase/functions/generate-seasonal-calendar/index.ts`: `Deno.serve` handler, CORS, Zod request validation, `MCP_AUTH_TOKEN` check, immediate 202 response, `EdgeRuntime.waitUntil(runBackground(...))` call
- [x] T012 [US1] Implement `runBackground()` in `generate-seasonal-calendar/index.ts`: marks task running → loads brand_dna + store + products → calls `anthropic.generateObject(...)` → writes `artifact_data` + `skill_status='completed'`; on any throw calls `failTask(...)`
- [x] T013 [US1] Dispatch path for `seasonal-calendar` is wired in TWO places: (1) `supabase/functions/mcp-tools/index.ts` `SNEW_RUN_SKILL` handler fires the Edge Function when called via MCP; (2) `src/lib/chat/engine-agents.ts` `runAgentsEngineBackground` fires the Edge Function directly via `EDGE_FUNCTION_SKILLS` map when the skill slug matches — this is the primary Next.js dispatch path and does NOT rely on the agent calling `SNEW_RUN_SKILL`. In both cases, the Edge Function owns the `skill_status` transition (running → completed/failed); the Next.js background only writes the assistant chat reply.
- [x] T014 [P] [US1] Add unit test `supabase/functions/_shared/__tests__/errors.test.ts` (Deno test) covering `failTask` writes the expected row shape
- [x] T015 [US1] Deploy both functions: `supabase functions deploy generate-seasonal-calendar --no-verify-jwt` and `supabase functions deploy mcp-tools --no-verify-jwt`; run quickstart §2 end-to-end; record P50/P95 timings in PR description

**Checkpoint**: MVP — seasonal-calendar runs entirely in Edge Function. Next.js still contains the old generator code (deleted in US2).

---

## Phase 4: User Story US2 — Remove Next.js-side calendar code (P1)

**Goal**: `src/lib/ai/seasonal-campaign-generator.ts` and related helpers are deleted. `runAgentsEngineBackground` reverts to pure `askAgent`.

**Independent test criteria**:

- `src/lib/ai/seasonal-campaign-generator.ts` does not exist.
- `src/lib/ai/product-analyzer.ts` does not exist.
- `generateCalendarInBackground` does not exist in `src/lib/chat/engine-agents.ts`.
- `grep -r "generateCalendarInBackground" src/` returns zero hits.
- `bun run build` passes; `bun run test` passes.
- Quickstart §2 still produces a calendar via the new dispatch path.

- [x] T016 [US2] Delete `src/lib/ai/seasonal-campaign-generator.ts` and `src/lib/ai/product-analyzer.ts`
- [x] T017 [US2] Remove `generateCalendarInBackground` function from `src/lib/chat/engine-agents.ts` and remove its export
- [x] T018 [US2] Remove the skill-slug dispatch switch inside `runAgentsEngineBackground` (introduced in Spec 063 T022); body reverts to calling `askAgent(...)` and saving the final artifact via the existing `saveArtifact` helper
- [x] T019 [US2] Delete `src/app/api/skills/seasonal-calendar/` directory (all route files under it)
- [x] T020 [US2] Re-run quickstart §2; verify the calendar still generates end-to-end with only the Edge Function path

---

## Phase 5: User Story US3 — Port remaining skills (P2)

**Goal**: copywriter, deliverable, and image-artifact skills also move to Edge Functions; their Next.js counterparts are deleted.

**Independent test criteria**: for each skill:

- `supabase/functions/generate-<skill>/index.ts` exists and responds 202.
- Next.js side of that skill is deleted.
- Quickstart §5 passes for that skill.

- [ ] T021 [P] [US3] Create `supabase/functions/generate-copywriter/` — mirror T009-T012 pattern; port prompts from `src/lib/ai/campaign-copywriter.ts` (or equivalent); wire `SNEW_RUN_SKILL` dispatch branch
- [ ] T022 [P] [US3] Delete Next.js-side copywriter generator modules and `src/app/api/skills/copywriter/` (or equivalent paths — grep before deleting)
- [ ] T023 [P] [US3] Create `supabase/functions/generate-deliverable/` — port `src/lib/ai/email-template-generator.ts` logic (HTML email templates + concept generation) into Deno; wire dispatch branch
- [ ] T024 [P] [US3] Delete `src/lib/ai/email-template-generator.ts` and `src/app/api/skills/*/generate-deliverable/route.ts` references
- [ ] T025 [P] [US3] Create `supabase/functions/generate-image-artifact/` — port `src/lib/ai/asset-generator.ts` logic (HTML/CSS asset template generator); wire dispatch branch
- [ ] T026 [P] [US3] Delete `src/lib/ai/asset-generator.ts` and any `src/app/api/skills/*/asset*` routes

---

## Phase 6: User Story US4 — Observability and rollout safety (P3)

**Goal**: The team can ship this to production with confidence and automatically recovers from stuck tasks.

**Independent test criteria** (see `quickstart.md` §4, §6):

- A task stuck in `running` for >10min is auto-flipped to `failed` by cron.
- `FEATURE_EDGE_GENERATORS=false` reverts to legacy path (during migration window only).
- `docs/FEATURE_FLAGS.md` documents the flag.

- [ ] T027 [US4] Add dead-man's switch: Supabase cron (`pg_cron`) running every 5min that runs `UPDATE tasks SET skill_status='failed', metadata = jsonb_set(coalesce(metadata,'{}'), '{error}', '"stale_timeout"') WHERE skill_status='running' AND updated_at < now() - interval '10 minutes'`; create via Supabase migration
- [ ] T028 [P] [US4] Add `FEATURE_EDGE_GENERATORS` env to `.env.example` and to `src/lib/chat/engine-agents.ts` — when `false`, re-enables the legacy in-Next.js path (only during migration; removed in T031)
- [ ] T029 [P] [US4] Update `docs/FEATURE_FLAGS.md` with `FEATURE_EDGE_GENERATORS` entry (default value, rollout target, owner, sunset date)

---

## Phase 7: Polish & Cross-Cutting

- [ ] T030 [P] Delete remaining unused files under `src/app/api/skills/` after T016-T026 settle; verify `ls src/app/api/skills/` is empty or the directory itself is removed
- [ ] T031 After one week of green production telemetry, remove the `FEATURE_EDGE_GENERATORS` flag + the legacy fallback branch from `runAgentsEngineBackground`; delete the flag from `.env.example` and `docs/FEATURE_FLAGS.md`
- [ ] T032 [P] Run `bun run build`; confirm `.next/server/app/api/chat/route.js` shrinks ≥ 2000 LOC vs pre-064 baseline; attach before/after sizes to the PR
- [ ] T033 [P] Update project memory in `~/.claude/projects/-home-renanl-Projects-relay/memory/` — add a note summarizing the edge-function-first architecture and the four migrated skills
- [ ] T034 Run `bun run lint && bun run test && bun run build`; all three must be green before merge

---

## Dependencies

- T001-T003 (Setup) → no blockers
- T004-T008 (Foundational) → depend on Setup; block every US phase
- T009-T015 (US1) → depend on Foundational
- T016-T020 (US2) → depend on US1 complete (can't delete code until Edge Function path is proven live)
- T021-T026 (US3) → depend on US1 complete (reuses dispatch pattern); each sub-pair (T021+T022, T023+T024, T025+T026) is independent
- T027-T029 (US4) → depend on US1 complete
- T030-T034 (Polish) → final; T031 gated on production soak time

## Parallel Execution Examples

**Foundational phase (after Setup):**

```
In parallel: T004, T005, T006, T007, T008 (all different files in _shared/)
```

**US1 phase:**

```
T009 and T010 [P] (independent port files) in parallel.
Then T011, T012 (same file, sequential).
T013 (mcp-tools update) in parallel with T014 [P] (shared tests).
T015 after all above.
```

**US3 phase (three skills in parallel tracks):**

```
Track A: T021 → T022 (copywriter)
Track B: T023 → T024 (deliverable)
Track C: T025 → T026 (image-artifact)
All three tracks run simultaneously; no shared files.
```

## Implementation Strategy

- **MVP = US1 only**. Ships the seasonal-calendar pilot to Edge Function and proves the architecture. Legacy paths for other skills still work.
- **First valuable ship = US1 + US2**. Validates the deletion step and frees bundle size immediately.
- **US3 and US4 follow in parallel**. Each skill migration is an independent PR.
- **Rollback during migration window**: `FEATURE_EDGE_GENERATORS=false`. After T031, rollback is git-revert only.

---

## Summary

| Phase                  | Tasks     | Story    | MVP? | Can parallelize?                     |
| ---------------------- | --------- | -------- | ---- | ------------------------------------ |
| Phase 1 (Setup)        | T001-T003 | —        | —    | T001 // T002 // T003                 |
| Phase 2 (Foundational) | T004-T008 | —        | —    | T004 // T005 // T006 // T007 // T008 |
| Phase 3 (US1 — MVP)    | T009-T015 | US1 (P1) | ✅   | T009 // T010; T013 // T014           |
| Phase 4 (US2)          | T016-T020 | US2 (P1) | —    | T016 // T017 // T019 independent     |
| Phase 5 (US3)          | T021-T026 | US3 (P2) | —    | Three skill tracks fully parallel    |
| Phase 6 (US4)          | T027-T029 | US4 (P3) | —    | T028 // T029                         |
| Phase 7 (Polish)       | T030-T034 | —        | —    | T032 // T033                         |

**Total: 34 tasks**
**MVP (US1): 7 tasks (T009-T015)**
**First valuable ship (US1+US2): 12 tasks**

Every task has a file path, a story label (or none for setup/foundational/polish), and is unambiguous — ready for execution.
