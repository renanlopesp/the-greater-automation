# Ralph Loop: 013 Workflow Integration (Vercel Workflow)

**Spec**: `specs/013-workflow-integration/spec.md`
**Created**: 2026-02-10
**Estimated Phases**: 10
**Estimated Tasks**: ~68

---

## Execution Rules

- Follow phases IN ORDER -- each phase has blocking prerequisites
- Within each phase, tasks marked `[P]` can run in parallel
- Verify each phase checkpoint before advancing
- Use `bun` as package manager (not npm/yarn)
- All new components use `"use client"` only when needed
- Use `cn()` from `@/lib/utils` for dynamic className
- All colors via CSS variables (OKLCH) -- no hex/rgb in new code
- Follow existing patterns in `src/components/workflow-editor/`
- Delegate implementation to executor agents, verification to verifier agents

---

## Phase 1: Vercel Workflow Library Setup

**Purpose**: Install the `workflow` npm package and configure Next.js integration.
**Blocking**: ALL subsequent phases depend on this.

- [ ] T001 Install the Vercel Workflow package: `bun add workflow`. Verify it appears in `package.json` dependencies. **IMPORTANT**: The package is currently in beta (~4.x-beta). Pin the exact installed version in `package.json` to avoid breaking changes.

- [ ] T002 Modify `next.config.ts` to wrap the existing config with `withWorkflow()`:

  ```typescript
  import { withWorkflow } from 'workflow/next'
  import type { NextConfig } from 'next'
  const nextConfig: NextConfig = {
    experimental: {
      optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', '@radix-ui/react-icons'],
    },
  }
  export default withWorkflow(nextConfig)
  ```

- [ ] T003 [P] Add TypeScript plugin to `tsconfig.json` under `compilerOptions.plugins`:

  ```json
  { "name": "workflow" }
  ```

- [ ] T004 [P] If `src/middleware.ts` exists, update the matcher to exclude `.well-known/workflow/*` paths. If no middleware exists, note this as N/A.

- [ ] T005 Verify setup: run `bun run build`. Confirm no errors related to the workflow package. Start dev server and confirm it boots without issues.

**Checkpoint**: `bun run build` succeeds. Dev server starts. `withWorkflow()` is active.

---

## Phase 2: Database Schema for Runs

**Purpose**: Create Supabase migration for workflow run tracking tables.
**Blocking**: Phases 6, 7 (Runs tab, execution engine need these tables).

- [ ] T006 Create Supabase migration to ALTER the EXISTING `workflow_runs` table (DO NOT drop/recreate -- it is used by dashboard, runs page, workspace, agent detail):

  ```sql
  -- Add missing columns to existing workflow_runs table
  ALTER TABLE workflow_runs
    ADD COLUMN IF NOT EXISTS trigger_type trigger_type,
    ADD COLUMN IF NOT EXISTS trigger_data JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS error TEXT;
  ```

- [ ] T007 [P] Create Supabase migration to add `workflow_run_steps` table:

  ```sql
  CREATE TABLE workflow_run_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES workflow_runs(id) ON DELETE CASCADE,
    step_id UUID,
    step_position INTEGER NOT NULL,
    step_type step_type NOT NULL,
    status run_status NOT NULL DEFAULT 'pending',  -- uses existing run_status enum
    input JSONB DEFAULT '{}',
    output JSONB DEFAULT '{}',
    error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER
  );
  CREATE INDEX idx_run_steps_run_id ON workflow_run_steps(run_id);
  ALTER TABLE workflow_run_steps ENABLE ROW LEVEL SECURITY;
  ```

- [ ] T008 [P] Regenerate TypeScript types: `bunx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts` (or manually add the new types to the existing file).

- [ ] T009 Add RLS policies for both tables: authenticated users can read/write runs for workflows they own. Match existing RLS patterns.

**Checkpoint**: Migration applied. Types regenerated. RLS policies active.

---

## Phase 3: Workflow Save & Publish API

**Purpose**: Backend APIs for persisting workflow config and managing publish status.
**Blocking**: Phase 5 (header actions need save), Phase 7 (execution needs saved config).

- [ ] T010 Create `src/app/api/workflows/[id]/save/route.ts` -- POST endpoint that:
  - Accepts `{ name, emoji, isStarred, trigger, steps }` in the body
  - Upserts workflow metadata to `workflows` table
  - Upserts trigger to `workflow_triggers` table
  - Deletes existing steps, then inserts new steps to `workflow_steps` table (atomic via transaction)
  - Returns `{ success: true, savedAt: timestamp }`
  - Validates auth via Supabase session

- [ ] T011 [P] Create `src/app/api/workflows/[id]/publish/route.ts` -- POST endpoint that:
  - Accepts `{ status: 'published' | 'draft' }` in the body
  - Validates workflow has a trigger and at least one step before publishing
  - Updates `workflows.status` column
  - Returns `{ success: true, status }`

- [ ] T012 [P] Create `src/app/api/workflows/[id]/duplicate/route.ts` -- POST endpoint that:
  - Reads the full workflow (metadata + trigger + steps)
  - Creates a new workflow with `name + " (copy)"`, same trigger and steps
  - Returns `{ success: true, newWorkflowId }`

- [ ] T013 Update `src/lib/queries/workflow-editor.ts` -- add functions:
  - `saveWorkflowConfig(supabase, workflowId, data)` -- used by save API
  - `duplicateWorkflow(supabase, workflowId)` -- used by duplicate API
  - `updateWorkflowStatus(supabase, workflowId, status)` -- used by publish API

- [ ] T014 Update `src/hooks/use-workflow-data.ts` -- add mutations:
  - `useSaveWorkflow()` -- calls save API, invalidates query cache
  - `usePublishWorkflow()` -- calls publish API
  - `useDuplicateWorkflow()` -- calls duplicate API, navigates to new editor

**Checkpoint**: Save API works (test with curl). Publish toggles status. Duplicate creates a copy.

---

## Phase 4: Trigger Configuration Forms (All 9 Types)

**Purpose**: Complete config panels for all 9 trigger types.
**Blocking**: None (can run in parallel with Phase 5-6).

- [ ] T015 Create `src/components/workflow-editor/trigger-config/manual-trigger-config.tsx`:
  - "Run inputs" section with Add/Remove/Reorder capability
  - Each input: Name, Type (select), Required (checkbox), Default value, Description
  - Uses trigger config interface `ManualTriggerConfig`

- [ ] T016 [P] Create `src/components/workflow-editor/trigger-config/scheduled-trigger-config.tsx`:
  - Schedule type toggle: Interval vs Cron
  - Interval mode: Value (number) + Unit (select: minutes/hours/days/weeks)
  - Cron mode: Expression input with human-readable preview
  - Timezone select (defaulting to user's timezone)
  - Optional: Start date, End date (date pickers)

- [ ] T017 [P] Create `src/components/workflow-editor/trigger-config/webhook-trigger-config.tsx`:
  - Auto-generated webhook URL (read-only with copy button)
  - Method select (GET/POST/PUT/PATCH)
  - Secret key input (optional)
  - Response status code input

- [ ] T018 [P] Create `src/components/workflow-editor/trigger-config/form-trigger-config.tsx`:
  - Fields list with Add/Remove/Reorder
  - Each field: Label, Type (select from 8 types), Required, Placeholder
  - Submit button text input
  - Success message input

- [ ] T019 [P] Create `src/components/workflow-editor/trigger-config/rss-trigger-config.tsx`:
  - Feed URL input with validation
  - Check interval (number + unit)
  - Max items per check

- [ ] T020 [P] Create `src/components/workflow-editor/trigger-config/mailhook-trigger-config.tsx`:
  - Auto-generated email address (read-only with copy)
  - Allowed senders (tag input)
  - Subject filter
  - Save attachments toggle

- [ ] T021 [P] Create `src/components/workflow-editor/trigger-config/table-trigger-config.tsx`:
  - Table selector dropdown
  - Event type select (row_created, row_updated, row_deleted, field_changed)

- [ ] T022 [P] Create `src/components/workflow-editor/trigger-config/mcp-trigger-config.tsx`:
  - Server name input
  - Description textarea
  - Tools list with Add/Remove
  - Each tool: Name, Description, Input schema (JSON textarea)

- [ ] T023 [P] Create `src/components/workflow-editor/trigger-config/app-trigger-config.tsx`:
  - App selector grid
  - Event selector (dynamic based on app)
  - Filters section (key-value pairs)

- [ ] T024 Create `src/components/workflow-editor/trigger-config/index.tsx` -- barrel export + `TriggerConfigRouter` component that renders the correct config form based on trigger type. Integrate into the existing trigger panel/config panel.

- [ ] T025 Update `src/components/editor/trigger-panel.tsx` and relevant components to show the trigger config form when a trigger is selected (either inline or in the config panel).

**Checkpoint**: Select each trigger type, config form renders with all fields. Fill in required fields, completion indicator updates.

---

## Phase 5: Step Configuration Forms (Complete All 8)

**Purpose**: Complete config panels for all 8 step types (enhance AI/HTTP, build 6 new ones).
**Blocking**: None (can run in parallel with Phase 4, 6).

- [ ] T025B **[BLOCKING]** Update TypeScript interfaces in `src/lib/workflow-editor/step-defaults.ts` BEFORE building any config forms:
  - `FlowControlStepConfig`: Change `control_type` to `'path' | 'loop' | 'wait'`, add `conditions`, `loop_config`, `duration` fields
  - `UtilityStepConfig`: Change `utility_type` to `'format' | 'parse_json' | 'parse_csv' | 'merge' | 'filter' | 'map' | 'math'`, add dynamic config fields
  - `SequenceStepConfig`: Type `inline_steps` as `Array<{ type: StepType; name: string; config: StepConfig }>`
  - `WebScrapingStepConfig`: Add `selector: string`, `wait_for_selector: boolean` fields
  - `HumanInLoopStepConfig`: Add `assignee: string`, `timeout_minutes: number` fields
  - `HTTPStepConfig`: Add `headers: Record<string, string>`, `body: string`, `auth: { type: 'none' | 'bearer' | 'basic' | 'api_key'; value: string }` fields
  - Update `getStepDefaultConfig()` with defaults for all new fields
  - Update `isStepConfigComplete()` to validate new fields

- [ ] T026 Enhance `AIStepConfigForm` in `step-config-panel.tsx` (or extract to `src/components/workflow-editor/step-config/ai-step-config.tsx`):
  - Add AI action select (summarize/classify/extract/generate/transform)
  - Add temperature slider (0-1)
  - Add max tokens input
  - Add variable insertion button in prompt textarea

- [ ] T027 [P] Enhance `HTTPStepConfigForm` (or extract to `step-config/http-step-config.tsx`):
  - Add headers section (key-value pairs with Add/Remove)
  - Add body editor (JSON textarea, shown for POST/PUT/PATCH)
  - Add auth section (None/Bearer/Basic/API Key)
  - Add timeout and retry inputs

- [ ] T028 [P] Create `src/components/workflow-editor/step-config/app-step-config.tsx`:
  - App selector grid (Email, LinkedIn, X, YouTube + Browse all)
  - Action selector (dynamic based on app)
  - Dynamic input fields based on action
  - Variable reference support in inputs

- [ ] T029 [P] Create `src/components/workflow-editor/step-config/flow-control-step-config.tsx`:
  - Control type selector: Path, Loop, Wait
  - Path: Condition builder (field, operator, value) with add/remove conditions
  - Loop: Loop count or "for each" with array reference
  - Wait: Duration input (maps to Vercel Workflow `sleep()`)

- [ ] T030 [P] Create `src/components/workflow-editor/step-config/web-scraping-step-config.tsx`:
  - URL input with variable support
  - Scrape type: Full page / CSS selector / XPath
  - Selector input (conditional)
  - Output format select

- [ ] T031 [P] Create `src/components/workflow-editor/step-config/human-in-loop-step-config.tsx`:
  - Action type select (Approval/Input/Review)
  - Assignee type (Anyone/Specific)
  - Prompt textarea
  - Include context toggle
  - Timeout input

- [ ] T032 [P] Create `src/components/workflow-editor/step-config/utility-step-config.tsx`:
  - Utility type selector (Format/Parse JSON/Parse CSV/Merge/Filter/Map/Math)
  - Dynamic config based on utility type
  - Input reference field
  - Output preview section

- [ ] T033 [P] Create `src/components/workflow-editor/step-config/sequence-step-config.tsx`:
  - Description text
  - "Add inline step" button (opens step selector)
  - Nested step list
  - Collapse/expand

- [ ] T034 Update `src/components/workflow-editor/step-config-panel.tsx` to route ALL 8 step types to their config forms. Remove the "coming soon" fallback message. Import all config components.

**Checkpoint**: Add each step type, select it, config form renders with all fields. No "coming soon" messages remain.

---

## Phase 6: Variable Picker & Data Mapping

**Purpose**: Enable steps to reference outputs from previous steps.
**Blocking**: Phase 7 (execution needs variable resolution).

- [ ] T035 Create `src/components/workflow-editor/variable-picker.tsx`:
  - Popover triggered by `{ }` button
  - Lists available variables: `{{trigger.output}}`, `{{step_1.output}}`, etc.
  - Each variable shows step name and type icon
  - Click to insert variable as highlighted chip
  - Support dot-notation drilling: `{{step_1.output.data.field}}`

- [ ] T036 [P] Create `src/lib/workflow-editor/variable-resolver.ts`:
  - `resolveVariables(template: string, context: Record<string, unknown>): string`
  - Parses `{{step_N.output}}` and `{{trigger.output}}` patterns
  - Supports dot-notation: `{{step_1.output.data.email}}`
  - Returns resolved string with actual values substituted
  - Throws descriptive error if referenced step/field doesn't exist

- [ ] T037 [P] Create `src/components/workflow-editor/variable-chip.tsx`:
  - Renders inline chip/badge for variable references in text inputs
  - Shows step name + icon
  - Red warning state if referenced step is deleted
  - Tooltip showing full variable path

- [ ] T038 Integrate variable picker into all text/textarea inputs in step config forms (T026-T033). Add the `{ }` button next to each relevant input field.

**Checkpoint**: Add HTTP step + AI step. In AI prompt, click variable picker, insert `{{step_1.output}}`. Variable chip renders correctly.

---

## Phase 7: Workflow Execution Engine (Vercel Workflow)

**Purpose**: Define the actual Vercel Workflow functions that execute workflows.
**Blocking**: Phase 8 (runs tab needs execution data).

- [ ] T039 Create `src/workflows/utils/variable-resolver.ts` (server-side version):
  - Same logic as client-side resolver but for server execution context
  - Resolves variables from accumulated step outputs during run

- [ ] T040 [P] Create `src/workflows/utils/step-output-store.ts`:
  - In-memory store for tracking step outputs during a single run
  - `setOutput(stepPosition: number, output: unknown): void`
  - `getOutput(stepPosition: number): unknown`
  - `getContext(): Record<string, unknown>` -- returns all outputs for variable resolution

- [ ] T041 Create `src/workflows/steps/http-step.ts`:
  - Function with `"use step"` directive
  - Accepts `{ method, url, headers, body, auth, timeout }` config
  - Executes HTTP request using `fetch()`
  - Returns `{ status, headers, body }` as output
  - Throws `FatalError` for 4xx client errors, retries on 5xx

- [ ] T042 [P] Create `src/workflows/steps/ai-step.ts`:
  - Function with `"use step"` directive
  - Accepts `{ action, prompt, outputFormat, temperature, maxTokens }` config
  - Calls AI provider API (OpenAI/Anthropic via environment config)
  - Returns AI response as output
  - Throws `FatalError` for invalid prompts

- [ ] T043 [P] Create `src/workflows/steps/web-scraping-step.ts`:
  - Function with `"use step"` directive
  - Fetches URL, extracts content based on scrape type
  - Returns extracted content in specified format

- [ ] T044 [P] Create `src/workflows/steps/app-step.ts`:
  - Function with `"use step"` directive
  - Routes to appropriate app integration (Email, LinkedIn, etc.)
  - Executes app action with provided inputs
  - Returns action result as output

- [ ] T045 [P] Create `src/workflows/steps/human-in-loop-step.ts`:
  - Function with `"use step"` directive
  - Creates a pending approval/input record in Supabase
  - Uses `sleep()` to suspend workflow until human responds
  - Returns human's response as output

- [ ] T046 [P] Create `src/workflows/steps/utility-step.ts`:
  - Function with `"use step"` directive
  - Performs data transformation based on utility type
  - Returns transformed data as output

- [ ] T047 [P] Create `src/workflows/steps/flow-control-step.ts`:
  - Handles Path (conditional), Loop, Wait logic
  - Wait uses `sleep()` from Vercel Workflow
  - Path evaluates conditions and returns branch indicator
  - Loop iterates over array or count

- [ ] T048 [P] Create `src/workflows/steps/sequence-step.ts`:
  - Function with `"use step"` directive
  - Executes inline steps sequentially
  - Aggregates outputs from all inline steps

- [ ] T049 Create `src/workflows/executor.ts` -- main workflow orchestrator:
  - Function with `"use workflow"` directive
  - Accepts workflow config (trigger, steps[], variable mappings)
  - Iterates through steps in order
  - Before each step: resolves variables from accumulated outputs
  - After each step: stores output, updates run_steps in Supabase
  - Handles flow control branching
  - Returns final accumulated outputs

- [ ] T050 Create `src/app/api/workflows/[id]/run/route.ts` -- POST endpoint:
  - Validates auth
  - Loads workflow config from Supabase
  - Creates a `workflow_runs` record
  - Creates `workflow_run_steps` records for each step (status: pending)
  - Calls `start(executor, [workflowConfig])` from `workflow/api`
  - Returns `{ runId, status: 'started' }`

- [ ] T051 [P] Create `src/app/api/workflows/[id]/runs/route.ts` -- GET endpoint:
  - Returns list of runs for the workflow
  - Includes status, timestamps, step progress count
  - Supports pagination (`?limit=20&offset=0`)

- [ ] T052 [P] Create `src/app/api/workflows/[id]/runs/[runId]/route.ts` -- GET endpoint:
  - Returns full run detail with all step statuses, inputs, outputs
  - Includes error messages for failed steps

**Checkpoint**: Create a workflow with Manual trigger + HTTP step. POST to run API. Verify run record created, step executes, outputs stored.

---

## Phase 8: Runs Tab UI

**Purpose**: Display workflow run history and live progress in the editor's Runs tab.
**Blocking**: None (can start after Phase 7 checkpoint).

- [ ] T053 Create `src/components/workflow-editor/runs-tab.tsx`:
  - Fetches runs via `GET /api/workflows/[id]/runs`
  - Displays run list sorted by most recent
  - Each row: Run ID (short), Status badge (color-coded), Started at, Duration, Trigger icon, Step progress (e.g., "3/5")
  - Empty state: illustration + "No runs yet" + "Run now" button
  - Polling for live updates (every 3s when a run is in progress)

- [ ] T054 [P] Create `src/components/workflow-editor/run-detail.tsx`:
  - Shown when a run is clicked in the list
  - Full run metadata section
  - Step timeline: vertical list of steps with status icons, duration, expandable I/O
  - Each step expandable to show input/output JSON (formatted)
  - Failed step highlighted in red with error message
  - "Retry from failed step" button for failed runs

- [ ] T055 [P] Create `src/hooks/use-workflow-runs.ts`:
  - `useWorkflowRuns(workflowId)` -- React Query hook for run list
  - `useWorkflowRunDetail(runId)` -- React Query hook for single run detail
  - `useStartWorkflowRun(workflowId)` -- mutation to start a run
  - Polling configured for active runs

- [ ] T056 Update `src/components/editor/editor-shell.tsx`:
  - Replace "Runs tab coming soon" with actual `<RunsTab />` component
  - Pass workflow ID as prop

- [ ] T057 Add "Run" / "Test Run" button to the editor header:
  - Play icon button in the header area
  - Clicking starts a run and switches to the Runs tab
  - Shows loading state while run starts

**Checkpoint**: Run a workflow, switch to Runs tab. Verify run appears with correct status. Click run to see step detail. Live progress updates for in-progress runs.

---

## Phase 9: Header Actions & Store Enhancements

**Purpose**: Wire all remaining header buttons and add save/undo/redo to the store.
**Blocking**: None (can run in parallel with Phase 8).

- [ ] T058 Update `src/stores/workflow-editor-store.ts`:
  - Add `undoStack: WorkflowEditorState[]` and `redoStack: WorkflowEditorState[]`
  - Add `undo()` and `redo()` actions with stack management
  - Add `workflowStatus: 'draft' | 'published'` to state
  - Wrap state-changing actions to push to undo stack before applying
  - Add `saveWorkflow()` action that calls save API
  - Add `publishWorkflow()` / `unpublishWorkflow()` actions

- [ ] T059 [P] Update `src/components/editor/editor-header.tsx`:
  - Add Save button (visible when `isDirty`), wired to `saveWorkflow()`
  - Add Publish/Unpublish toggle button with status indicator
  - Wire Rename dropdown item to focus the name input
  - Wire Duplicate dropdown item to `duplicateWorkflow()` then navigate
  - Add Play/Run button to start a test run
  - Wire More (...) menu with: Export JSON, Delete workflow (with confirm dialog)

- [ ] T060 [P] Create `src/components/workflow-editor/sharing-dialog.tsx`:
  - Dialog with access level selector (Private/Team/Public)
  - Share link with copy button
  - Team member list (if applicable)
  - Wire to Sharing button in header

- [ ] T061 [P] Add keyboard shortcuts to `src/app/(editor)/workflows/[id]/edit/page.tsx`:
  - `Ctrl+Z` / `Cmd+Z` -- undo
  - `Ctrl+Shift+Z` / `Cmd+Shift+Z` -- redo
  - `Ctrl+S` / `Cmd+S` -- save (prevent default browser save)
  - `Delete` / `Backspace` -- delete selected step
  - `?` -- open shortcuts help dialog

- [ ] T061B [P] Create `src/components/workflow-editor/notifications-popover.tsx`:
  - Popover triggered by Bell icon in header
  - Lists recent workflow notifications: run completed/failed alerts, collaboration mentions
  - "Mark all as read" button
  - Empty state: "No notifications"
  - Wire to Bell button in editor-header.tsx

- [ ] T062 [P] Add auto-save debounce logic:
  - After any store change, debounce 3 seconds then auto-save
  - Show subtle "Saving..." / "Saved" indicator in header
  - Skip auto-save if workflow is new (never been saved manually)

**Checkpoint**: Save button appears when dirty, saves successfully. Undo/Redo works. Ctrl+S saves. Duplicate creates a copy. Publish toggles status.

---

## Phase 10: AI Assistant Backend & Polish

**Purpose**: Connect the AI assistant to a backend, final polish, and comprehensive testing.
**Blocking**: None (final phase).

- [ ] T063 Create `src/app/api/workflows/[id]/assistant/route.ts` -- POST endpoint:
  - Accepts `{ prompt, currentWorkflow }` (current workflow state for context)
  - Calls AI provider to generate workflow suggestions
  - Returns `{ message, suggestedWorkflow? }` (optional workflow config)

- [ ] T064 Update `src/components/workflow-editor/ai-assistant-panel.tsx`:
  - Wire Send button to call assistant API
  - Display AI responses in a chat-like interface
  - When AI returns a `suggestedWorkflow`, show "Apply to editor" button
  - Wire use-case cards to populate prompt and auto-submit
  - Add loading state while AI processes

- [ ] T065 Final polish and testing pass:
  - Verify all 9 trigger config forms save and restore correctly
  - Verify all 8 step config forms save and restore correctly
  - Verify workflow execution end-to-end for each step type
  - Verify runs tab displays correctly for all run states
  - Verify undo/redo across all operations
  - Verify mobile responsiveness for all new components
  - Verify no TypeScript errors: `bun run build`
  - Verify no ESLint errors: `bun run lint`

**Checkpoint**: ALL features working end-to-end. Zero build errors. Zero lint errors. Every button functional.

---

## Summary

| Phase     | Tasks              | Parallel | Description                                            |
| --------- | ------------------ | -------- | ------------------------------------------------------ |
| 1         | T001-T005          | 2        | Vercel Workflow library setup                          |
| 2         | T006-T009          | 2        | Database schema for runs (ALTER existing table)        |
| 3         | T010-T014          | 3        | Save/Publish/Duplicate APIs                            |
| 4         | T015-T025          | 9        | All 9 trigger config forms                             |
| 5         | T025B-T034         | 7        | TypeScript interface updates + all 8 step config forms |
| 6         | T035-T038          | 2        | Variable picker & data mapping                         |
| 7         | T039-T052          | 10       | Execution engine (Vercel Workflow)                     |
| 8         | T053-T057          | 2        | Runs tab UI                                            |
| 9         | T058-T062 (+T061B) | 5        | Header actions, notifications, store enhancements      |
| 10        | T063-T065          | 1        | AI assistant & polish                                  |
| **Total** | **~68**            |          |                                                        |

## Phase Dependencies

```
Phase 1 (Setup) ──┬── Phase 2 (DB Schema) ──── Phase 7 (Execution) ── Phase 8 (Runs Tab) ──┐
                   │                                                                         │
                   ├── Phase 3 (Save API) ──── Phase 9 (Header Actions) ────────────────────┤
                   │                                                                         │
                   ├── Phase 4 (Trigger Config) ────────────────────────────────────────────── Phase 10 (Polish)
                   │                                                                         │
                   ├── Phase 5 (Step Config) ───────────────────────────────────────────────┤
                   │                                                                         │
                   └── Phase 6 (Variables) ──── Phase 7 (Execution) ────────────────────────┘
```

NOTE: Phase 4 and 5 (config forms) do NOT depend on Phase 3 (save API). They are pure UI
components that update the Zustand store. They CAN run in parallel with Phase 3.

**Critical path**: Phase 1 -> Phase 2 -> Phase 7 -> Phase 8 -> Phase 10
**Parallel tracks**:

- Track A: Phase 4 (triggers) + Phase 5 (steps) -- can start after Phase 1
- Track B: Phase 3 (save API) -- can start after Phase 1
- Track C: Phase 6 (variables) -- can start after Phase 1, needed before Phase 7

## Ralph Loop Execution Notes

1. **Start with Phase 1** -- nothing works without the Workflow library
2. **Phases 2, 3, 4, 5, 6 can overlap** -- maximize parallelism
3. **Phase 7 is the largest phase** (14 tasks) -- use background agents aggressively
4. **Phase 8 and 9 can run in parallel** after Phase 7
5. **Phase 10 is the final gate** -- comprehensive verification before completion
6. **Architect verification required** before claiming complete
