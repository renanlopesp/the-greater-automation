# Tasks: Webhook Runner

**Input**: Design documents from `/specs/014-webhook-runner/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Unit tests (Vitest) and E2E tests (Playwright) are requested by the user.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Shared infrastructure and foundational helpers needed by all user stories

- [ ] T001 Add `webhook_token` field to WebhookTriggerConfig interface in `src/lib/workflow-editor/trigger-defaults.ts`
- [ ] T002 Create webhook helper module with `generateWebhookToken()` and `buildWebhookUrl()` functions in `src/lib/workflow-editor/webhook-executor.ts`
- [ ] T003 Extract shared `executeWorkflowSteps()` function from `src/app/api/workflows/[id]/execute-scheduled/route.ts` into `src/lib/workflow-editor/webhook-executor.ts` to reuse step execution logic across webhook and scheduled runners

**Checkpoint**: Foundation ready — shared helpers available for all user stories

---

## Phase 2: User Story 1 — Receive Webhook and Execute Workflow (Priority: P1) MVP

**Goal**: External services can POST/GET to a webhook URL and trigger workflow execution end-to-end

**Independent Test**: Send an HTTP request to a webhook URL → verify a workflow run is created and all steps execute to completion

### Tests for User Story 1

- [ ] T004 [P] [US1] Write unit tests for `generateWebhookToken()`, `buildWebhookUrl()`, and `validateWebhookRequest()` in `src/lib/workflow-editor/__tests__/webhook-executor.test.ts`
- [ ] T005 [P] [US1] Write unit tests for the webhook route handler (token lookup, run creation, method/secret validation, error responses) in `src/lib/workflow-editor/__tests__/webhook-route.test.ts`

### Implementation for User Story 1

- [ ] T006 [US1] Replace `src/app/.well-known/workflow/v1/webhook/[token]/route.js` with TypeScript `route.ts` implementing the full webhook handler: extract token from URL, look up `workflow_triggers` by `config->>'webhook_token'`, verify workflow is published, validate HTTP method, validate secret, capture request payload (body, headers, query params) as trigger_data, create `workflow_run` with trigger_type='webhook', create `workflow_run_steps`, execute steps using shared `executeWorkflowSteps()`, return configured `response_status` code
- [ ] T007 [US1] Refactor `src/app/api/workflows/[id]/execute-scheduled/route.ts` to use the shared `executeWorkflowSteps()` function from T003 (dedup execution logic)

**Checkpoint**: Webhook endpoint receives requests and executes workflows. Can be tested via curl/Postman.

---

## Phase 3: User Story 2 — Webhook URL Generation and Display (Priority: P2)

**Goal**: Users see a real, copyable webhook URL in the trigger configuration UI after saving the workflow

**Independent Test**: Create a workflow with a webhook trigger, save it, verify the UI shows a real URL pointing to the correct endpoint

### Tests for User Story 2

- [ ] T008 [P] [US2] Write unit tests for the webhook trigger config component (displays real URL when token exists, shows placeholder when no token, copy button works) in `src/components/workflow-editor/trigger-config/__tests__/webhook-trigger-config.test.tsx`

### Implementation for User Story 2

- [ ] T009 [US2] Update `src/components/workflow-editor/trigger-config/webhook-trigger-config.tsx` to display the real webhook URL (`buildWebhookUrl(config.webhook_token)`) when `webhook_token` exists in config, and show a "Save workflow to generate URL" message when no token exists yet
- [ ] T010 [US2] Add token generation logic: when saving a workflow with a webhook trigger that has no `webhook_token`, generate one via `generateWebhookToken()` and include it in the trigger config before persisting. Find where trigger config is saved (likely in the workflow editor store or the save API) and add the token generation there

**Checkpoint**: Users can see and copy real webhook URLs. Full loop: create workflow → save → copy URL → send request → run executes.

---

## Phase 4: User Story 3 — Secret Key Validation (Priority: P3)

**Goal**: Webhook requests with incorrect or missing secrets are rejected when a secret is configured

**Independent Test**: Configure a secret, send requests with correct/incorrect/missing secret header, verify acceptance/rejection

### Implementation for User Story 3

- [ ] T011 [US3] Ensure the webhook route handler (T006) validates `x-webhook-secret` header against `config.secret` — return 401 if secret is configured but header is missing/incorrect. (This is likely already handled in T006, verify and add test coverage)

**Checkpoint**: Secret validation works. Requests without correct secret are rejected with 401.

---

## Phase 5: User Story 4 — HTTP Method Validation (Priority: P4)

**Goal**: Webhook requests with mismatched HTTP methods are rejected with 405

### Implementation for User Story 4

- [ ] T012 [US4] Ensure the webhook route handler (T006) validates the request method against `config.method` — return 405 Method Not Allowed if the incoming method doesn't match. (This is likely already handled in T006, verify and add test coverage)

**Checkpoint**: Method validation works. Wrong HTTP methods are rejected with 405.

---

## Phase 6: E2E Testing & Polish

**Purpose**: End-to-end Playwright tests and cross-cutting concerns

- [ ] T013 Write Playwright E2E test in `e2e/webhook-runner.spec.ts` that: (1) logs in, (2) creates a new workflow, (3) adds a Webhook trigger, (4) adds multiple steps (e.g. AI + HTTP + utility), (5) saves the workflow, (6) verifies the webhook URL appears in the UI, (7) copies the URL, (8) publishes the workflow, (9) sends an HTTP request to the webhook URL via Playwright's request API, (10) navigates to the Runs tab and verifies a new run appeared with status completed, (11) clicks into the run and verifies step-by-step execution details
- [ ] T014 Test edge cases in E2E: (1) send request to invalid token → 404, (2) send request with wrong method → 405, (3) send request with wrong secret → 401, (4) send request to unpublished workflow → 404
- [ ] T015 Run `bun run build` and `bun run lint` to verify no build errors or lint warnings
- [ ] T016 Verify all existing tests still pass with `bun run test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (US1)**: Depends on Phase 1 — core webhook handler
- **Phase 3 (US2)**: Depends on Phase 1 — UI can be done in parallel with US1
- **Phase 4 (US3)**: Depends on Phase 2 — validation is part of the route handler
- **Phase 5 (US4)**: Depends on Phase 2 — validation is part of the route handler
- **Phase 6 (E2E)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 1 only. Core functionality.
- **US2 (P2)**: Depends on Phase 1 only. Can run in parallel with US1.
- **US3 (P3)**: Part of the webhook route handler (US1). Verify coverage after US1.
- **US4 (P4)**: Part of the webhook route handler (US1). Verify coverage after US1.

### Parallel Opportunities

- T004 and T005 can run in parallel (different test files)
- T008 can run in parallel with US1 implementation (different file)
- US2 (T009, T010) can run in parallel with US1 (T006, T007) — different files
- T011 and T012 are verification tasks that can run after T006

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: US1 (T004-T007)
3. **STOP and VALIDATE**: Test via curl — send POST to webhook URL, verify run is created
4. This alone provides full webhook-to-execution functionality

### Incremental Delivery

1. Setup → Foundation ready
2. Add US1 → Webhook endpoint works → Test via curl (MVP!)
3. Add US2 → Users see real URLs in UI → Copy URL → Send webhook
4. Add US3 + US4 → Security and method validation → Full feature
5. E2E tests → Comprehensive coverage → Ready for merge

---

## Notes

- US3 and US4 validation logic is implemented as part of the webhook route handler in T006. Phases 4 and 5 are primarily verification and test-coverage tasks.
- The shared `executeWorkflowSteps()` extraction (T003/T007) reduces ~200 lines of duplicated code between webhook and scheduled runners.
- Human-in-loop steps are skipped in webhook-triggered runs (same behavior as scheduled runs).
- No database migration needed — `webhook_token` is stored in existing JSONB `config` column.
