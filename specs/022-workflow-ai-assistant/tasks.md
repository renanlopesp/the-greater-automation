# Tasks: Workflow AI Assistant

**Input**: Design documents from `specs/022-workflow-ai-assistant/`
**Prerequisites**: plan.md (required), spec.md (required)

## Phase 1: Setup

- [x] T001 [P] Create `src/lib/ai/workflow-assistant.ts` with type definitions for WorkflowAssistantContext, SuggestedWorkflow, and the SUGGEST_WORKFLOW tool schema
- [x] T002 [P] Create `src/hooks/use-workflow-assistant.ts` skeleton with useChat integration

---

## Phase 2: Core AI Backend (US1 - Streaming Chat)

**Goal**: Replace hardcoded pattern-matching with real AI streaming via Vercel AI SDK

**Independent Test**: Send a message via API and receive a streaming AI response with workflow domain knowledge

- [x] T003 [US1] Build `buildWorkflowAssistantPrompt()` in `src/lib/ai/workflow-assistant.ts` — embeds all 9 trigger types with config schemas, all 8 step types with config schemas, variable interpolation syntax, and current workflow state
- [x] T004 [US1] Define SUGGEST_WORKFLOW tool using jsonSchema() — trigger: { type, config }, steps: Array<{ type, name, config }>
- [x] T005 [US1] Rewrite `src/app/api/workflows/[id]/assistant/route.ts` — replace pattern-matching with `streamText()` using OpenAI provider, `buildWorkflowAssistantPrompt()`, SUGGEST_WORKFLOW tool, `result.toTextStreamResponse()`

**Checkpoint**: API accepts messages and returns streaming AI responses with workflow context

---

## Phase 3: Client Hook & UI (US1 + US2 - Streaming UI + Apply)

**Goal**: Wire streaming responses to the UI and enable applying suggestions to editor

- [x] T006 [US1] Implement `useWorkflowAssistant(workflowId)` hook — uses `useChat()` with `DefaultChatTransport`, passes workflow context from Zustand store, exposes messages, isLoading, isStreaming, sendMessage, stop
- [x] T007 [US1+US2] Rewrite `ai-assistant-panel.tsx` — uses `useWorkflowAssistant()` hook, renders streaming messages with `message.parts`, shows "Apply to editor" button for SUGGEST_WORKFLOW results, use-case cards for empty state
- [x] T008 [US2] Implement `handleApplySuggestion()` — validates trigger/step types, calls `setTrigger()` and `addStep()` on Zustand store

**Checkpoint**: User can chat with AI assistant, see streaming responses, and apply workflow suggestions to editor

---

## Phase 4: Use Case Cards (US4)

**Goal**: Quick-start cards send real prompts to the AI

- [x] T009 [US4] Use-case card click handler calls `sendMessage()` from the hook — cards: "Meeting briefings", "Competitor analysis", "Email assistant", "YouTube summarizer"

**Checkpoint**: Clicking use-case cards triggers real AI responses

---

## Phase 5: Unit Tests

**Goal**: Comprehensive unit test coverage for hook, prompt builder, and API route

- [x] T010 [P] [US1] Unit tests for `buildWorkflowAssistantPrompt()` — 16 tests covering all 9 triggers, 8 steps, context embedding, variable syntax
- [x] T011 [P] [US1] Unit tests for `extractSuggestion()` — 11 tests covering dynamic-tool parsing, edge cases
- [x] T012 [P] [US2] Unit tests for apply-suggestion logic — type validation covered in extractSuggestion + handleApplySuggestion inline validation

**Checkpoint**: All unit tests pass with >80% coverage on new files

---

## Phase 6: E2E Playwright Tests

**Goal**: End-to-end verification of the full workflow assistant flow

- [x] T013 [US1] E2E tests in `e2e/workflow-assistant.spec.ts` — 5 tests: use-case cards, typing, card click, panel close, floating button
- [ ] T014 [US2] E2E test for apply suggestion flow — deferred (requires real AI response with tool call)
- [x] T015 [US4] E2E test for use-case cards — click card, verify message sent (skips without API key)

**Checkpoint**: All E2E tests pass in Playwright chromium

---

## Phase 7: Polish

- [x] T016 Error handling — API errors return 400/500, error banner in panel, empty message prevention, loading state during streaming
- [ ] T017 Mobile responsiveness — verify Sheet/drawer behavior on mobile breakpoints

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Backend)**: Depends on Phase 1 types
- **Phase 3 (Client)**: Depends on Phase 2 API being ready
- **Phase 4 (Cards)**: Depends on Phase 3 hook being ready
- **Phase 5 (Unit Tests)**: Can run in parallel with Phase 4, depends on Phase 3
- **Phase 6 (E2E)**: Depends on Phases 3+4 being complete (needs working UI)
- **Phase 7 (Polish)**: Depends on all above

### Parallel Opportunities

- T001 and T002 (Phase 1) can run in parallel
- T010, T011, T012 (Phase 5) can all run in parallel
- T013, T014, T015 (Phase 6) can run sequentially (share browser state)
- Phase 5 and Phase 4 can run in parallel
