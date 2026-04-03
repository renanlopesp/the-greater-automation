# Tasks: Chat-Driven Artifact Modification

**Input**: Design documents from `/specs/049-chat-artifact-modification/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested — omitted.

**Organization**: Tasks grouped by user story. Each story is independently implementable on `feat/task-based-architecture`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US6)

---

## Phase 1: Setup

**Purpose**: Clean up existing hacky implementation and establish solid foundation

- [ ] T001 Remove current SNEW_MODIFY_ARTIFACT tool code from `src/lib/ai/platform-tools.ts` (lines 955–1155) — will be rewritten in Phase 2
- [ ] T002 Remove current artifact context injection from `src/app/api/chat/route.ts` (lines 288–347) — will be rewritten in Phase 2
- [ ] T003 Remove current keyword detection modification-skip logic from `src/app/api/chat/route.ts` (lines 207–215) — will be rewritten in Phase 2

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core tool infrastructure that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement `loadArtifact()` helper in `src/lib/ai/platform-tools.ts` — loads `artifact_data` from task via `serviceClient`, returns typed artifact or error
- [ ] T005 Implement `validateDateIds()` helper in `src/lib/ai/platform-tools.ts` — validates date IDs exist in artifact, returns error with valid IDs list on failure
- [ ] T006 Register `SNEW_MODIFY_ARTIFACT` tool skeleton in `src/lib/ai/platform-tools.ts` — tool definition with operation enum (`generate_campaign`, `filter_dates`, `remove_dates`, `clear_campaigns`), input schema, empty execute handler that dispatches to operation handlers
- [ ] T007 Implement artifact context injection in `src/app/api/chat/route.ts` — when task has `artifact_data`, inject date IDs + names + campaign status + available operations into system prompt. Include explicit instruction to never confirm without calling tool.
- [ ] T008 Fix keyword detection in `src/app/api/chat/route.ts` — when message contains modification-intent words (`remov`, `limp`, `delet`, `filtr`, `alter`, `modif`, `gere campanha`, `gera campanha`), skip programmatic calendar dispatch even if calendar keywords present
- [ ] T009 Pass `serviceClient` to `buildPlatformTools()` in `src/app/api/chat/route.ts` (3rd parameter) instead of `undefined`

**Checkpoint**: Tool skeleton registered, context injected, keyword detection fixed. Ready for operation implementation.

---

## Phase 3: User Story 1 — Generate Campaign for Date (Priority: P1) MVP

**Goal**: User says "gere a campanha de Black Friday" → AI calls tool → campaign generated → panel shows "Gerada"

**Independent Test**: Send "gere a campanha de Black Friday" in task with calendar. Verify Black Friday changes from "Pendente" to "Gerada" in panel with drill-down content.

- [ ] T010 [US1] Implement `generate_campaign` operation handler in `src/lib/ai/platform-tools.ts` — validate single date_id, load brand_dna + products, call `generateCampaign()`, save campaign to `artifact_data.campaigns[dateId]`, return success with date name
- [ ] T011 [US1] Test via Playwright: send API call with `generate_campaign` operation, verify DB updated with campaign data for the specified date
- [ ] T012 [US1] Test via Playwright: send chat message "gere a campanha de Black Friday", verify AI calls tool and panel updates

**Checkpoint**: Campaign generation via chat works end-to-end

---

## Phase 4: User Story 2 — Real-Time Panel Updates (Priority: P1)

**Goal**: Panel updates within 1 second of AI finishing response

**Independent Test**: Time delay between AI stream completion and panel re-render. Must be < 1 second.

- [ ] T013 [US2] Implement query invalidation in `src/components/chat/orchestrator-chat-wrapper.tsx` — watch `status` transition from `streaming` → `ready`, call `queryClient.invalidateQueries(['task', taskId])`
- [ ] T014 [US2] Configure `useTask` polling in `src/hooks/use-task.ts` — poll at 2s only when `skill_status` is `running`/`idle`, otherwise rely on invalidation from chat wrapper
- [ ] T015 [US2] Test via Playwright: send modification message, measure time between stream end and panel update

**Checkpoint**: Panel updates reactively on chat completion

---

## Phase 5: User Story 3 — AI Behavioral Guardrails (Priority: P1)

**Goal**: AI only modifies data when explicitly asked. Never hallucinates confirmations.

**Independent Test**: Ask "quais datas têm campanha?" — verify zero tool calls made.

- [ ] T016 [US3] Refine system prompt context in `src/app/api/chat/route.ts` — separate "available operations" from "behavioral rules". Add: "Para perguntas sobre o calendário, responda com base no contexto sem chamar tools. Só chame SNEW_MODIFY_ARTIFACT quando o usuário EXPLICITAMENTE pedir para modificar, gerar, remover ou limpar."
- [ ] T017 [US3] Test via Playwright: send "quais datas têm campanha gerada?" via API, verify stream has zero `tool-input` events
- [ ] T018 [US3] Test via Playwright: send "quero focar na Black Friday" via API, verify zero `tool-input` events (conversational, not a command)

**Checkpoint**: AI answers questions without modifying data

---

## Phase 6: User Story 4 — Remove/Filter Dates (Priority: P2)

**Goal**: User says "remova Carnaval" → date disappears from panel

**Independent Test**: Send "remova Carnaval do calendário", verify Carnaval removed from panel.

- [ ] T019 [P] [US4] Implement `remove_dates` operation handler in `src/lib/ai/platform-tools.ts` — validate IDs, filter dates array, clean campaigns for removed dates, save
- [ ] T020 [P] [US4] Implement `filter_dates` operation handler in `src/lib/ai/platform-tools.ts` — validate IDs, keep only listed dates + their campaigns, save
- [ ] T021 [US4] Test via Playwright: send "remova Carnaval e Dia do Estudante", verify 2 dates removed from DB + panel
- [ ] T022 [US4] Test via Playwright: send "mantenha só Dia das Mães e Black Friday", verify only 2 dates remain

**Checkpoint**: Date removal and filtering work via chat

---

## Phase 7: User Story 5 — Clear Campaign Content (Priority: P2)

**Goal**: User says "limpe campanhas exceto Dia das Mães" → dates stay, campaigns cleared

**Independent Test**: Send "limpe todas as campanhas menos Dia das Mães", verify all dates show "Pendente" except Dia das Mães.

- [ ] T023 [US5] Implement `clear_campaigns` operation handler in `src/lib/ai/platform-tools.ts` — validate IDs, support `except` flag, remove campaign entries from `campaigns` object, save
- [ ] T024 [US5] Test via Playwright: send "limpe a campanha de Natal", verify only Natal's campaign cleared
- [ ] T025 [US5] Test via Playwright: send "limpe todas as campanhas menos Dia das Mães" (except=true), verify only Dia das Mães keeps campaign

**Checkpoint**: Campaign clearing works with both direct and inverted selection

---

## Phase 8: User Story 6 — Generation vs Modification Detection (Priority: P2)

**Goal**: "mostra o calendário" generates calendar. "remova Natal do calendário" modifies.

**Independent Test**: Send "remova Natal do calendário" (contains "calendário"), verify NO full calendar regeneration.

- [ ] T026 [US6] Refine keyword detection logic in `src/app/api/chat/route.ts` — comprehensive list of modification-intent words, tested against common user phrases
- [ ] T027 [US6] Test via Playwright: send "remova Natal do calendário" on task WITH existing calendar, verify `artifact_data.dates` count decreased (not regenerated)
- [ ] T028 [US6] Test via Playwright: send "mostra o calendário sazonal" on task WITHOUT calendar, verify programmatic dispatch generates new calendar

**Checkpoint**: Calendar generation only triggers on genuine generation requests

---

## Phase 9: Polish & Error Handling

**Purpose**: Edge cases and cross-cutting improvements

- [ ] T029 [P] Handle missing Brand DNA in `generate_campaign` — return clear error "Brand DNA não configurado"
- [ ] T030 [P] Handle empty artifact (no calendar yet) — context injection returns helpful message instead of empty context
- [ ] T031 [P] Handle invalid date names (user says "Dia dos Avós" which doesn't exist) — tool returns error with valid dates, AI relays to user
- [ ] T032 Remove `_CalendarRowOld` dead code from `src/components/chat/artifacts/seasonal-calendar-artifact.tsx` if still present
- [ ] T033 Update `specs/048-calendar-drilldown/remaining-work.md` with current status

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No deps — clean up existing code
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phases 3–8 (User Stories)**: All depend on Phase 2 completion
  - US1 (generate campaign) → US2 (reactivity) → US3 (guardrails) — sequential, each builds on previous
  - US4 (remove/filter) and US5 (clear campaigns) — can run parallel after US3
  - US6 (detection) — independent, can run anytime after Phase 2
- **Phase 9 (Polish)**: After all user stories

### Parallel Opportunities

- T019 + T020 (remove_dates + filter_dates) — different operations, same file but isolated functions
- T029 + T030 + T031 — independent error handling tasks
- US4 + US5 — independent stories, can run in parallel
- US6 — fully independent of US4/US5

---

## Implementation Strategy

### MVP (Phases 1–4)

1. Clean up existing code (Phase 1)
2. Build foundation: tool skeleton + context + detection fix (Phase 2)
3. Implement campaign generation (Phase 3 / US1)
4. Add reactivity (Phase 4 / US2)
5. **STOP and VALIDATE**: Test "gere campanha de X" → panel updates

### Full Feature (Phases 5–9)

6. Add guardrails (Phase 5 / US3)
7. Add remove/filter (Phase 6 / US4) + clear campaigns (Phase 7 / US5) — parallel
8. Fix detection (Phase 8 / US6)
9. Polish and error handling (Phase 9)

---

## Notes

- All implementation happens on `feat/task-based-architecture` branch (existing code already there)
- Phase 1 removes the hacky code from the current session; Phase 2+ rebuilds it properly
- Playwright tests validate the AI actually calls tools (check stream for `tool-input` events)
- Each checkpoint should be committed separately
- Total: 33 tasks across 9 phases
