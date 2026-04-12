# Tasks: Hybrid Chat Architecture

**Input**: Design documents from `/specs/063-hybrid-chat-api/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/chat-api.md ✅, quickstart.md ✅

**Tests**: Unit tests included for router + skill detection + tools client (critical logic). No new integration test suite added; Playwright smoke lives in `quickstart.md`.

**Organization**: Tasks are grouped by user story so each user story can ship as an independent increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 / US4 — derived from spec.md Goals

## Path Conventions

Single Next.js web app; all source under `src/`. New chat-engine code lives in `src/lib/chat/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffolding and env wiring.

- [x] T001 [P] Add `FEATURE_HYBRID_CHAT` entry to `.env.example` with comment: `# 'true' to route conversational chat through the Messages API engine (spec 063)`
- [x] T002 Create directory `src/lib/chat/` with placeholder `README.md` describing the two engines and the router; link to `specs/063-hybrid-chat-api/spec.md`
- [x] T003 Create directory `src/lib/chat/__tests__/` (vitest conventions already configured in repo)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared modules that both engines and the router depend on.

**⚠️ CRITICAL**: No user-story phase can begin until T004-T009 are complete.

- [x] T004 [P] Create `src/lib/chat/types.ts` exporting `HybridChatRequest`, `ChatRouterDecision`, `ToolInvocation`, `ToolResult` (shapes in data-model.md)
- [x] T005 [P] Create `src/lib/chat/skill-detector.ts` exporting `detectMode(body: HybridChatRequest, teamSkills: Skill[]): ChatRouterDecision` — checks `skill_slug` against active skills, falls back to keyword regex for "calendário|seasonal|campanha sazonal"
- [x] T006 [P] Add unit tests `src/lib/chat/__tests__/skill-detector.test.ts` covering: explicit slug present + active, explicit slug unknown (returns chat), keyword fallback hit, no skill match (chat), taskId-only request
- [x] T007 Create `src/lib/chat/tools-client.ts` exporting `invokeTool({ name, input, context }): Promise<ToolResult>` — POSTs to the `mcp-tools` Edge Function URL, returns the first text block parsed as JSON with optional `artifact` field
- [x] T008 [P] Add unit tests `src/lib/chat/__tests__/tools-client.test.ts` covering: success path, 401 (missing secret), 5xx → throws, response missing text block → throws, `__artifact` field extracted, no `__artifact` field → `artifact === undefined`
- [x] T009 [P] Create `src/lib/ai/prompt-cache.ts` exporting `buildCachedSystemBlock(text: string)` and `buildCachedToolsBlock(tools: AnthropicTool[])` — both apply `cache_control: { type: 'ephemeral' }`; add a short unit test `src/lib/ai/__tests__/prompt-cache.test.ts`

**Checkpoint**: `bun run test src/lib/chat src/lib/ai/prompt-cache` passes. Nothing user-facing wired up yet.

---

## Phase 3: User Story US1 — Fast conversational chat (P1)

**Goal**: Tool-free messages ("Olá", "como você funciona?") reply in ≤ 2s P50.

**Independent test criteria**:

- Send "Olá" via `/api/chat` with `FEATURE_HYBRID_CHAT=true`, no `skill_slug`, no `taskId`.
- Response header `X-Chat-Engine: messages-api`.
- First text delta arrives ≤ 2.5s (local dev) / ≤ 2s (Vercel).
- Assistant message persisted to `conversation_messages` with `metadata.engine = 'messages-api'`.

- [x] T010 [US1] Extract the current Managed Agents proxy flow from `src/app/api/chat/route.ts` into `src/lib/chat/engine-agents.ts` (export `runAgentsEngine(ctx): Promise<Response>`). The route handler becomes the router and delegates.
- [x] T011 [US1] Create `src/lib/chat/engine-messages.ts` exporting `runMessagesEngine(ctx): Promise<Response>`. Implement:
  - Load last 20 messages from `conversation_messages` into `messages: [...]`
  - Build Anthropic request using `buildCachedSystemBlock(buildOrchestratorSystemPrompt(...))`
  - Call `anthropic.messages.stream({ model, system, messages, ...})` (no tools yet — US2 adds them)
  - Translate stream to UIMessageChunk via `createUIMessageStream` (adapter)
  - On stream close: `INSERT conversation_messages {role:'assistant', content:fullText, metadata:{engine:'messages-api'}}` + `increment_ai_credits`
- [x] T012 [US1] Update `src/app/api/chat/route.ts` to:
  - Read `FEATURE_HYBRID_CHAT` env var
  - Call `detectMode(body, teamSkills)` to decide the path
  - If chat-path and flag on → `runMessagesEngine(ctx)`
  - Else → `runAgentsEngine(ctx)` (legacy)
  - Set `X-Chat-Engine` response header accordingly
- [x] T013 [P] [US1] Add a `model` field (default `claude-sonnet-4-6`) to the engine-messages context; honor `body.model` if it matches the whitelist `['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5']`
- [x] T014 [US1] Manual verification per `quickstart.md` "Hybrid path — conversational" section; record P50 over 10 requests in PR description

**Checkpoint**: MVP — Messages API engine serves tool-free chat behind the flag.

---

## Phase 4: User Story US2 — Fast retail tool queries with artifacts (P1)

**Goal**: Single-tool queries ("Quanto vendi hoje?", "Como está meu estoque?") complete in ≤ 5s P50 and populate the artifact panel.

**Independent test criteria**:

- Send "Quanto vendi hoje?" via `/api/chat` (flag on) with a `taskId`.
- Right-panel artifact renders "Resumo de vendas — Hoje" inside ~3s.
- Assistant text finishes ≤ 5s.
- Exactly one POST to `/functions/v1/mcp-tools` per tool the model called (no `SNEW_MODIFY_ARTIFACT` duplicate).
- `tasks.artifact_data.html` matches shape written by `saveArtifact` (Spec 058-E).

- [x] T015 [US2] In `engine-messages.ts`, define the tool list: import the MCP tool names/schemas from a new `src/lib/chat/tool-definitions.ts` that mirrors the Edge Function's `registerTool` calls (inputSchema → Anthropic `input_schema`)
- [x] T016 [P] [US2] Create `src/lib/chat/tool-definitions.ts` with the 5 retail/platform tools used by chat: `STORE_QUERY_SALES`, `STORE_QUERY_STOCK`, `STORE_LIST_ORDERS`, `STORE_GET_STORE_INFO`, `SNEW_CHECK_CONNECTIONS`. Exclude skill-invocation tools (`SNEW_RUN_SKILL`) and `SNEW_MODIFY_ARTIFACT` (deprecated)
- [x] T017 [US2] In `engine-messages.ts`, wire the tool-use loop:
  - Emit `tool-input-start/delta/end` to UI stream
  - Call `invokeTool({name, input, context})` from `tools-client.ts`
  - On `ToolResult.artifact` present + `taskId` present → `void saveArtifact(serviceClient, taskId, artifact)` (fire-and-forget — reuse the helper already in `src/app/api/chat/route.ts`; move it to `src/lib/chat/save-artifact.ts` as a shared module)
  - Feed `tool_result` back into `messages.stream` as a follow-up call
  - Emit `tool-output-available` event so the UI shows the tool output
- [x] T018 [P] [US2] Move `saveArtifact` helper from `src/app/api/chat/route.ts` to `src/lib/chat/save-artifact.ts`; update the existing (legacy) call site to import from the new module. No behaviour change
- [x] T019 [US2] Update `runMessagesEngine` to apply `buildCachedToolsBlock(tools)` so the tools schema is cached
- [x] T020 [US2] Manual verification per `quickstart.md` "Hybrid path — single-tool query" and "multi-turn cache hit" sections

**Checkpoint**: Chat lane fully functional. Skills still route to the legacy path (addressed in US3).

---

## Phase 5: User Story US3 — Seamless skill routing (P2)

**Goal**: A skill request (via `skill_slug` or keyword) dispatches the Managed Agent in the background and returns a taskId immediately.

**Independent test criteria**:

- Click "Seasonal Calendar" pill, submit "Gera o calendário de 2026".
- Response is a JSON 200 with `{ ok: true, taskId, skill: 'seasonal-calendar' }` within ~500ms.
- Frontend navigates to `/chat/task/<taskId>`.
- Background `askAgent` call runs the skill; artifact appears within 30-60s.
- Header `X-Chat-Engine: managed-agents`.

- [x] T021 [US3] In the router, when `detectMode` returns `mode === 'skill'`:
  - Create the `conversations` + `tasks` row if needed (mirror current behaviour)
  - Respond immediately: `NextResponse.json({ ok: true, taskId, skill: slug, message: 'Gerando...' })`
  - Fire-and-forget: `void runAgentsEngineBackground(ctx, slug)` (new export in `engine-agents.ts`)
- [x] T022 [US3] Add `runAgentsEngineBackground(ctx, slug)` in `src/lib/chat/engine-agents.ts`. It wraps the existing `askAgent` flow + artifact save. Ensure it uses a fresh Supabase service role client (no request cookies) since it runs after the HTTP response has been sent
- [x] T023 [P] [US3] Update `src/hooks/use-orchestrator-chat.ts` to:
  - Include `skill_slug` in the request body when the hero skill pill is non-default
  - Detect JSON (skill-path) response shape vs SSE (chat-path) and navigate to `/chat/task/<taskId>` when JSON arrives
- [x] T024 [US3] Manual verification per `quickstart.md` "Skill path" section

**Checkpoint**: Both lanes fully wired. Feature flag still gating the whole thing.

---

## Phase 6: User Story US4 — Observability and rollout safety (P3)

**Goal**: The team can ship this to production with confidence and roll back instantly if anything breaks.

**Independent test criteria**:

- `X-Chat-Engine` header present on every `/api/chat` response.
- Setting `FEATURE_HYBRID_CHAT=false` in Vercel env reverts new requests to the legacy path within 1 request (no deploy).
- Structured `[chat]` log line on every request with engine, skill, taskId, duration_ms.

- [x] T025 [US4] Add structured logging in the router: `console.log('[chat]', { engine, skill, taskId, conversationId, userId, tokens, duration_ms })` on response finalization
- [x] T026 [P] [US4] Document the flag in `docs/FEATURE_FLAGS.md` (create if missing) with default value, current rollout target, owner
- [x] T027 [US4] Canary rollout checklist: enable `FEATURE_HYBRID_CHAT=true` for your own team only (via a second env `FEATURE_HYBRID_CHAT_TEAM_IDS=<uuid>`) — router reads this list and falls back to legacy for teams outside it

---

## Phase 7: Polish & Cross-Cutting

- [x] T028 [P] Add benchmark script `scripts/bench-chat.ts` that hits `/api/chat` 10× for each of "Olá" and "Quanto vendi hoje?" and prints P50/P95 TTFT and total duration, segmented by engine (reads `X-Chat-Engine`)
- [x] T029 [P] Update memory note: add the hybrid chat architecture to `~/.claude/projects/-home-renanl-Projects-relay/memory/` project notes
- [x] T030 Update `CLAUDE.md` "Active Technologies" — already updated by `/speckit.plan`; verify no duplicate block
- [x] T031 Delete dead code: after 1 week of successful hybrid rollout, remove the legacy Managed Agents proxy fallback from the router and the `FEATURE_HYBRID_CHAT` flag (one-line flag check)

---

## Dependencies

- T001-T003 (Setup) → no blockers
- T004-T009 (Foundational) → depend on Setup; block every US phase
- T010-T014 (US1) → depend on Foundational
- T015-T020 (US2) → depend on US1 complete
- T021-T024 (US3) → depend on US1 complete (can run parallel to US2)
- T025-T027 (US4) → depend on US1 complete
- T028-T031 (Polish) → final

## Parallel Execution Examples

**Foundational phase (after Setup):**

```
In parallel: T004, T005, T009 (independent files)
After T005 lands: T006 [P] (tests) can run in parallel with T007
After T007 lands: T008 [P]
```

**US1 phase:**

```
T010 (extract engine) must come first (file move).
Then T011 (new engine) and T013 [P] (model whitelist) in parallel.
T012 after both complete (router wires them).
T014 after all code lands.
```

**US2 + US3 parallel:**

```
Once US1 checkpoint passes, two developers can own US2 (tools) and US3 (skill routing) in parallel — they touch different modules (engine-messages vs engine-agents + router).
```

## Implementation Strategy

- **MVP = US1 only**. Shipping US1 alone already cuts "Olá" from 6s to 2s and has zero risk (legacy path is the fallback).
- Ship US1 behind the flag, verify with `scripts/bench-chat.ts`, then ship US2 which unlocks the real win ("quanto vendi hoje?" 14s → 5s).
- US3 and US4 can follow without urgency; skills already work on the legacy path.
- **Rollback**: flip `FEATURE_HYBRID_CHAT=false` in Vercel — single env var change, no redeploy.

---

## Summary

| Phase                  | Tasks     | Story    | Can parallelize?                                |
| ---------------------- | --------- | -------- | ----------------------------------------------- |
| Phase 1 (Setup)        | T001-T003 | —        | T001 // T002 // T003                            |
| Phase 2 (Foundational) | T004-T009 | —        | T004 // T005 // T009; then T006 // T007 // T008 |
| Phase 3 (US1 — MVP)    | T010-T014 | US1 (P1) | T011 // T013                                    |
| Phase 4 (US2)          | T015-T020 | US2 (P1) | T016 // T018 // T019                            |
| Phase 5 (US3)          | T021-T024 | US3 (P2) | T023 runs with others                           |
| Phase 6 (US4)          | T025-T027 | US4 (P3) | T026                                            |
| Phase 7 (Polish)       | T028-T031 | —        | T028 // T029                                    |

**Total: 31 tasks**
**MVP (US1): 5 tasks (T010-T014)**
**First valuable ship (US1+US2): 11 tasks**

Every task has a file path, a story label (or none for setup/foundational/polish), and is unambiguous — ready for execution.
