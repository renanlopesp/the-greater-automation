# Tasks: App Event Triggers (Event-Driven Workflow Execution)

**Input**: Design documents from `/specs/021-app-event-triggers/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested — test tasks omitted. Tests can be added later via `/speckit.checklist`.

**Organization**: Tasks grouped by user story. 5 user stories from spec.md (2x P1, 2x P2, 1x P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema, type definitions, and SDK wrapper needed by all user stories

- [ ] T001 Create database migration for `trigger_subscriptions` table with RLS policies and indexes, plus add `event_log_id`, `pipeline_steps`, `current_step_index` columns to `agent_workflow_runs`, in `supabase/migrations/YYYYMMDD_create_trigger_subscriptions.sql` — apply via Supabase MCP `apply_migration`
- [ ] T002 Add `AppEventTriggerConfig` interface to `WorkflowTriggerConfig` union and add `ClaudeAgentActionConfig` to `WorkflowActionConfig` union, plus `PipelineStepRecord` interface, in `src/lib/workflows/types.ts`
- [ ] T003 [P] Create Composio triggers SDK wrapper with `listTriggers()`, `createTrigger()`, `enableTrigger()`, `disableTrigger()`, `deleteTrigger()`, and `getTriggerType()` functions in `src/lib/composio/triggers.ts`
- [ ] T004 [P] Create Zod validation schema for Composio webhook payloads (type, data, timestamp, log_id, metadata) in `src/lib/composio/webhook-schema.ts`
- [ ] T005 Regenerate Supabase TypeScript types after migration in `src/lib/supabase/database.types.ts` — use Supabase MCP `generate_typescript_types`

**Checkpoint**: Schema deployed, types defined, Composio SDK wrapper ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core execution infrastructure that MUST be complete before user story implementation

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create pipeline executor function `executePipeline()` in `src/lib/workflows/pipeline-executor.ts` — creates run record, initializes `pipeline_steps` array, executes actions sequentially with per-step status tracking (pending → running → completed/failed/skipped), updates run record after each step via Supabase
- [ ] T007 Extend `executeActions()` in `src/lib/workflows/action-executor.ts` to accept and return `PipelineStepRecord[]` — each action execution updates its corresponding step record with status, output, error, timing
- [ ] T008 [P] Add `app_event` to `WorkflowTriggerType` union and update `SNEW_CREATE_WORKFLOW` tool parameter schema to accept `app_event` trigger type with `trigger_slug`, `app_id`, and `trigger_config` fields in `src/lib/ai/skill-builder-tools.ts`

**Checkpoint**: Foundation ready — pipeline execution works, tools accept app_event triggers

---

## Phase 3: User Story 1 — Subscribe to App Events (Priority: P1)

**Goal**: Users can select app events as workflow triggers, Composio creates the subscription, and incoming events trigger workflow runs.

**Independent Test**: Connect GitHub, create a workflow with "PR Opened" trigger via chat, open a PR on a test repo, verify workflow run appears in run history with the correct event payload.

### Implementation for User Story 1

- [ ] T009 [US1] Implement `SNEW_CREATE_WORKFLOW` extension: when trigger type is `app_event`, call `composio.triggers.create()` to create subscription, insert row into `trigger_subscriptions` table, and set `trigger_config` with `AppEventTriggerConfig` data — in `src/lib/ai/skill-builder-tools.ts` (extend the existing create workflow tool handler, ~line 210-464)
- [ ] T010 [US1] Create server actions `createTriggerSubscription()`, `getTriggerSubscriptions()`, `toggleTriggerSubscription()`, `deleteTriggerSubscription()`, and `listAvailableTriggers()` in `src/lib/actions/trigger-subscriptions.ts` — per contracts/trigger-subscriptions.md
- [ ] T011 [US1] Create Composio webhook endpoint `POST /api/composio/webhook` in `src/app/api/composio/webhook/route.ts` — validate payload with Zod schema, look up `trigger_subscriptions` by trigger metadata, check idempotency via `event_log_id`, check `is_enabled`, call `executePipeline()` from pipeline-executor, update subscription `last_event_at` and `event_count`
- [ ] T012 [P] [US1] Update agent system prompt in `buildAgentSystemPrompt()` in `src/lib/ai/agent-chat.ts` — add guidance about app event triggers: mention `SNEW_LIST_APP_CAPABILITIES` returns triggers, instruct agent to use `app_event` trigger type in `SNEW_CREATE_WORKFLOW`, add example for "when a PR is opened" type requests
- [ ] T013 [P] [US1] Extend `SNEW_LIST_APP_CAPABILITIES` tool to highlight trigger types more prominently — add a `_trigger_hint` field per trigger showing example usage (e.g., "Use trigger_slug 'GITHUB_PULL_REQUEST_OPENED' with app_event trigger type") in `src/lib/ai/skill-builder-tools.ts` (~line 133-207)
- [ ] T014 [US1] Show trigger subscription status on workflows in sidebar — add a small badge/indicator (e.g., "Listening" with a dot) on workflows that have an active `trigger_subscriptions` row, in `src/components/agent-detail/workflows-list.tsx`
- [ ] T015 [US1] Fetch trigger subscriptions in the agent detail page and pass to sidebar — query `trigger_subscriptions` for the agent alongside existing data fetches in `src/app/(dashboard)/agents/[id]/page.tsx`, pass as prop to `AgentSidebar`
- [ ] T016 [US1] Update `AgentSidebar` props to accept `triggerSubscriptions` array and pass through to `WorkflowsList` in `src/components/agent-detail/agent-sidebar.tsx`

**Checkpoint**: US1 complete — app event triggers can be created via chat, Composio events fire and create workflow runs, sidebar shows trigger status

---

## Phase 4: User Story 2 — Multi-Step Pipeline Execution (Priority: P1)

**Goal**: Workflows execute as multi-step pipelines with sequential data flow between steps, per-step status tracking, and graceful failure handling.

**Independent Test**: Create a workflow with 3+ steps (fetch data, AI analysis, post comment), trigger it via test event, verify each step executes in order with data flowing between them and individual step statuses visible.

### Implementation for User Story 2

- [ ] T017 [US2] Extend `executePipeline()` in `src/lib/workflows/pipeline-executor.ts` to write `pipeline_steps` JSONB to `agent_workflow_runs` after each step completes — enable real-time step visibility by updating the DB row incrementally (not just at the end)
- [ ] T018 [US2] Add `claude_agent` case to `executeActions()` in `src/lib/workflows/action-executor.ts` — call new `executeClaudeAgentStep()` function (placeholder, full implementation in US3), return structured output keyed by `config.output_key`
- [ ] T019 [P] [US2] Extend run history component to show pipeline step details — when a run has `pipeline_steps`, show expandable step list with status icons (pending/running/completed/failed), duration, and output preview in `src/components/agent-detail/run-history.tsx`
- [ ] T020 [P] [US2] Create React Query hook `useTriggerSubscriptions(agentId)` for fetching trigger subscriptions and `usePipelineRunSteps(runId)` for subscribing to Supabase Realtime changes on a specific run's `pipeline_steps` in `src/hooks/use-trigger-subscriptions.ts`
- [ ] T021 [US2] Add Supabase Realtime subscription for `agent_workflow_runs` updates — subscribe to changes on the specific run row to get live `pipeline_steps` updates, integrate into run history detail view in `src/components/agent-detail/run-history.tsx`

**Checkpoint**: US2 complete — multi-step pipelines execute with per-step tracking, UI shows real-time step progress

---

## Phase 5: User Story 3 — Claude Agent as Workflow Step (Priority: P2)

**Goal**: A `claude_agent` action type that performs AI analysis with configurable prompts, tool access, and structured output within a pipeline step.

**Independent Test**: Create a workflow with a Claude agent step (e.g., code review prompt), provide sample input data, trigger the workflow, verify the agent produces structured JSON output that subsequent steps can consume.

### Implementation for User Story 3

- [ ] T022 [US3] Implement `executeClaudeAgentStep()` function in `src/lib/workflows/action-executor.ts` — resolve prompt template with trigger data and previous outputs, build Composio tool list from `config.tools`, call AI SDK with system prompt and tools, parse response into structured JSON (if `output_format: 'json'`), enforce `timeout_ms` (default 300000), return output keyed by `config.output_key`
- [ ] T023 [US3] Update `SNEW_CREATE_WORKFLOW` action schema to support `claude_agent` action type — add `claude_agent` to the action type enum, include `prompt`, `output_key`, `tools`, `model`, `timeout_ms`, `output_format` parameters in `src/lib/ai/skill-builder-tools.ts` (the actionJsonSchema definition ~line 47)
- [ ] T024 [P] [US3] Update agent system prompt to guide creation of Claude agent workflow steps — add examples like "Create a workflow with a Claude agent step for code review" showing the `claude_agent` action type config, in `src/lib/ai/agent-chat.ts`

**Checkpoint**: US3 complete — Claude agent steps execute within pipelines, produce structured output, support tool usage

---

## Phase 6: User Story 4 — Event Payload Mapping and Filtering (Priority: P2)

**Goal**: Users can configure filters on trigger subscriptions to control which events trigger runs, and set up field mappings to map event data to clean workflow variables.

**Independent Test**: Configure a trigger with filter "label = needs-review", send events with and without the label, verify only matching events create runs. Configure field mappings, verify mapped fields are available under configured variable names.

### Implementation for User Story 4

- [ ] T025 [US4] Implement event filter evaluation in the Composio webhook handler — before calling `executePipeline()`, load `trigger_subscriptions.filters` (array of `WorkflowCondition`), evaluate each condition against the event `data` payload using the existing `evaluateConditions()` from `src/lib/workflows/condition-engine.ts`, skip run creation if filters don't match, in `src/app/api/composio/webhook/route.ts`
- [ ] T026 [US4] Implement field mapping resolution — after filters pass, apply `trigger_subscriptions.field_mappings` to transform the raw event payload into mapped workflow variables before passing to `executePipeline()` as `triggerData`, in `src/app/api/composio/webhook/route.ts`
- [ ] T027 [P] [US4] Add sample payload preview to `SNEW_LIST_APP_CAPABILITIES` — when listing triggers, call `composio.triggers.getType(slug)` to get the payload schema and include a `sample_payload` field showing what data the event provides, in `src/lib/ai/skill-builder-tools.ts` (~line 133-207)
- [ ] T028 [US4] Extend `SNEW_CREATE_WORKFLOW` to accept `filters` and `field_mappings` parameters for `app_event` triggers — store in `trigger_subscriptions` row when creating the subscription, in `src/lib/ai/skill-builder-tools.ts`

**Checkpoint**: US4 complete — event filtering prevents unwanted runs, field mappings provide clean variable names to workflow steps

---

## Phase 7: User Story 5 — Execution Monitoring Dashboard (Priority: P3)

**Goal**: Users can monitor all event-triggered workflow runs in one place, filter by event type or workflow, drill into step-by-step details, and retry failed runs.

**Independent Test**: Trigger several workflows, open the monitoring view, verify all runs appear with correct statuses, drill down into a run to see step details, retry a failed run.

### Implementation for User Story 5

- [ ] T029 [US5] Create retry server action `retryWorkflowRun(runId)` in `src/lib/actions/trigger-subscriptions.ts` — load original run's `trigger_data`, create a new `agent_workflow_runs` record, call `executePipeline()` with the same event payload
- [ ] T030 [US5] Add retry button to failed runs in run history — show a "Retry" button on runs with `status === 'failed'` that calls the retry server action, in `src/components/agent-detail/run-history.tsx`
- [ ] T031 [P] [US5] Add event source indicator to run history items — show the app icon/name and trigger type (e.g., "GitHub: PR Opened") for event-triggered runs using `trigger_data` metadata, in `src/components/agent-detail/run-history.tsx`
- [ ] T032 [US5] Add filtering controls to run history — allow filtering by status (all/completed/failed/running) and by trigger type (manual/webhook/app_event), in `src/components/agent-detail/run-history.tsx`

**Checkpoint**: US5 complete — monitoring view shows all runs with filtering, drill-down, and retry

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validation, error handling, and final integration checks

- [ ] T033 Add subscription limit enforcement — check count of active `trigger_subscriptions` per workspace (via `agent_id` → `agents.team_id`) before creating new ones, return error if limit (50) is reached, in `src/lib/actions/trigger-subscriptions.ts` and `src/lib/ai/skill-builder-tools.ts`
- [ ] T034 [P] Add error handling for expired OAuth tokens in webhook handler — when a trigger fires but the user's app connection token is expired, mark the run as failed with "authentication expired" error and include reconnection guidance, in `src/app/api/composio/webhook/route.ts`
- [ ] T035 [P] Handle disabled workflow case in webhook handler — when an event fires for a workflow with `is_enabled = false`, acknowledge the event but don't create a run, log for debugging, in `src/app/api/composio/webhook/route.ts`
- [ ] T036 Run `bun run build` to verify zero TypeScript errors across all new and modified files
- [ ] T037 Run quickstart.md validation — manually test scenarios from `specs/021-app-event-triggers/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001, T002 must complete) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion
- **US2 (Phase 4)**: Depends on Phase 2 completion, benefits from US1 (webhook endpoint) but can be tested with manual trigger data
- **US3 (Phase 5)**: Depends on Phase 2 (action executor infrastructure)
- **US4 (Phase 6)**: Depends on US1 (webhook handler must exist to add filtering)
- **US5 (Phase 7)**: Depends on US1 + US2 (runs and step tracking must exist)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — foundational event subscription capability
- **US2 (P1)**: Can start after Phase 2 — can develop pipeline execution independently of US1
- **US3 (P2)**: Can start after Phase 2 — Claude agent step is an independent action type
- **US4 (P2)**: Depends on US1 — extends the webhook handler with filters/mappings
- **US5 (P3)**: Depends on US1 + US2 — extends the UI with monitoring and retry

### Within Each User Story

- Types and schemas before implementation
- Server-side logic before UI components
- Core functionality before enhancements

### Parallel Opportunities

- **Phase 1**: T003 and T004 can run in parallel (different files)
- **Phase 2**: T008 can run in parallel with T006/T007 (different files)
- **Phase 3**: T012 and T013 can run in parallel with each other and with T014-T016
- **Phase 4**: T019 and T020 can run in parallel (different files)
- **Phase 5**: T024 can run in parallel with T022/T023
- **Phase 6**: T027 can run in parallel with T025/T026
- **Phase 7**: T031 can run in parallel with T029/T030
- **Phase 8**: T034 and T035 can run in parallel

---

## Parallel Example: Phase 1 Setup

```bash
# These can run simultaneously (different files):
Task: "T003 Create Composio triggers SDK wrapper in src/lib/composio/triggers.ts"
Task: "T004 Create Zod webhook schema in src/lib/composio/webhook-schema.ts"
```

## Parallel Example: User Story 1

```bash
# After T009/T010/T011 complete, these can run simultaneously:
Task: "T012 Update agent system prompt in src/lib/ai/agent-chat.ts"
Task: "T013 Extend SNEW_LIST_APP_CAPABILITIES in src/lib/ai/skill-builder-tools.ts"
Task: "T014 Show trigger status in src/components/agent-detail/workflows-list.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (schema + types + SDK wrapper)
2. Complete Phase 2: Foundational (pipeline executor + tool schema)
3. Complete Phase 3: US1 — app event subscriptions work end-to-end
4. Complete Phase 4: US2 — multi-step pipelines with step tracking
5. **STOP and VALIDATE**: Test US1 + US2 together: create a multi-step workflow with an app event trigger, fire the event, verify pipeline executes with step tracking
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US1 → Event subscriptions work → Deploy (basic trigger capability)
3. Add US2 → Pipeline execution with step tracking → Deploy (full pipeline)
4. Add US3 → Claude agent steps → Deploy (AI-powered pipelines)
5. Add US4 → Filtering and mapping → Deploy (noise reduction)
6. Add US5 → Monitoring dashboard → Deploy (production-ready)

### Parallel Team Strategy

With multiple agents:

1. Complete Setup + Foundational together
2. Once Foundational is done:
   - Agent A: US1 (event subscriptions) + US4 (filtering, depends on US1)
   - Agent B: US2 (pipeline execution) + US5 (monitoring, depends on US2)
   - Agent C: US3 (Claude agent step, independent)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Composio webhook URL must be configured in Composio dashboard settings before testing
- Production project ID: `djohaxwfketlsjurwqne` — use for migrations
- All Supabase queries use RLS — new table needs policies
- Existing `evaluateConditions()` in condition-engine.ts is reused for event filtering
