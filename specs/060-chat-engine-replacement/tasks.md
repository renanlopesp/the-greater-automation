# Tasks: Chat Engine Replacement

**Input**: Design documents from `/specs/060-chat-engine-replacement/`
**Prerequisites**: plan.md, spec.md, research.md

**Tests**: Not explicitly requested — manual integration testing.

**Organization**: Tasks grouped by user story.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

**Purpose**: Verify existing route works and database schema is ready

- [x] T001 Verify `conversations` table has `anthropic_session_id` column — check via Supabase MCP, add migration if missing
- [x] T002 Verify existing chat route compiles and build passes — `bun run build`

---

## Phase 2: Foundational — Credit Check + Provisioning Cleanup (Blocking)

**Purpose**: Add pre-chat credit checking and clean up the inline provisioning helper

- [x] T003 Add pre-chat credit check to `src/app/api/chat/route.ts` — before any AI processing, check team's credit balance. If credits <= 0, return error response with message about insufficient credits and link to billing page.
- [x] T004 Remove the inline `provisionAgent()` helper function from `src/app/api/chat/route.ts` (~80 lines). Replace with an import of the provisioning logic from a shared module, or make an internal fetch to `/api/agents/provision`. The auto-provisioning behavior must remain (if team has no agent, provision before first message).
- [x] T005 Verify build passes after credit check + provisioning cleanup

**Checkpoint**: Chat route checks credits and uses shared provisioning logic. Build passes.

---

## Phase 3: User Story 1 — Customer Chats with Their Agent (Priority: P1) MVP

**Goal**: Verify the existing streaming chat works end-to-end with the hardened route.

- [ ] T006 [US1] Manual test: open chat, send "Olá, quem é você?" — verify streaming response appears word-by-word
- [ ] T007 [US1] Manual test: send a follow-up message in the same conversation — verify session is resumed (agent has context from previous message)
- [ ] T008 [US1] Manual test: start a new conversation — verify new session is created

**Checkpoint**: Basic chat streaming works end-to-end.

---

## Phase 4: User Story 2 — Agent Uses Business Tools (Priority: P1)

**Goal**: Verify MCP tools work through the Sessions API.

- [ ] T009 [US2] Manual test: ask "quanto vendi hoje?" — verify agent calls STORE_QUERY_SALES via MCP and returns real data
- [ ] T010 [US2] Manual test: ask "como tá meu estoque?" — verify agent calls STORE_QUERY_STOCK via MCP
- [ ] T011 [US2] Verify artifact panel updates after sales query — SNEW_MODIFY_ARTIFACT should write HTML to task

**Checkpoint**: Business tools work through the Managed Agent.

---

## Phase 5: User Story 3 — Thinking Indicators (Priority: P2)

**Goal**: Verify thinking events are translated to UI indicators.

- [ ] T012 [US3] Verify `agent.thinking` events are translated to `reasoning-start/delta/end` UIMessage chunks in `src/app/api/chat/route.ts` — already implemented, just verify it works visually
- [ ] T013 [US3] Manual test: ask a complex question — verify thinking indicator appears in the UI

**Checkpoint**: Thinking indicators work.

---

## Phase 6: User Story 4 — Conversation Persistence (Priority: P1)

**Goal**: Verify messages are persisted and credits are deducted.

- [ ] T014 [US4] Manual test: send a message, refresh the page — verify conversation history is visible
- [ ] T015 [US4] Verify credit deduction — check team's credit balance before and after a conversation turn, confirm tokens were deducted
- [ ] T016 [US4] Manual test: set team credits to 0, try to send message — verify "insufficient credits" error appears

**Checkpoint**: Persistence and billing work correctly.

---

## Phase 7: User Story 5 — Legacy Code Removal (Priority: P2)

**Goal**: Delete old chat engine files and verify no broken imports.

- [x] T017 DEFERRED to 058-F — 16 files still import agent-chat.ts. Delete [US5] Delete `src/lib/ai/agent-chat.ts` (874 lines of old chat engine)
- [x] T018 DEFERRED to 058-F — 4 files still import chat.ts. Delete [P] [US5] Delete `src/lib/ai/chat.ts` (Kiro legacy)
- [x] T019 DEFERRED [US5] Fix any broken imports — search codebase for references to deleted files and update/remove them
- [x] T020 [US5] Run `bun run build` — verify zero compilation errors
- [x] T021 [US5] Run `bunx vitest run` — verify all tests pass (update/remove tests that reference deleted modules)

**Checkpoint**: Codebase clean, build passes, tests pass.

---

## Phase 8: Polish

- [x] T022 Add session error recovery to `src/app/api/chat/route.ts` — if `sessions.events.send()` or `sessions.events.stream()` fails with a session error, create a new session and retry once
- [ ] T023 Ensure file attachments work — verify that file upload URLs from the frontend are passed to the agent in the message content
- [x] T024 Run `bun run lint` — fix any lint warnings in modified files
- [ ] T025 Final manual test: complete chat flow (message → tool call → artifact → follow-up)

---

## Dependencies & Execution Order

- **Phase 1** (Setup): No dependencies
- **Phase 2** (Foundational): Depends on Phase 1 — BLOCKS all user stories
- **Phases 3-6** (User Stories): All depend on Phase 2, can be validated in parallel
- **Phase 7** (Legacy Removal): Independent, can run any time after Phase 3 validates chat works
- **Phase 8** (Polish): After all phases

### Parallel Opportunities

- T017, T018 (file deletions) can run in parallel
- US3 and US4 validation can run in parallel with US1/US2

---

## Implementation Strategy

### MVP First

1. Phase 1-2: Setup + credit check (T001-T005)
2. Phase 3: Verify chat works (T006-T008)
3. **STOP**: Chat engine validated end-to-end

### Full Delivery

4. Phase 4-6: Tool calls, thinking, persistence (T009-T016)
5. Phase 7: Delete legacy code (T017-T021)
6. Phase 8: Polish (T022-T025)
