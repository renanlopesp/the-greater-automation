# Feature Specification: Workflow Integration (Vercel Workflow)

**Feature Branch**: `013-workflow-integration`
**Created**: 2026-02-10
**Status**: Draft
**Dependencies**: 001-foundation (DB schema, Supabase clients), 004-workflow-editor (existing UI shell)

---

## Overview

Make the entire `/workflows/:id/edit` page fully functional end-to-end. Every button, every step type config form, every trigger config form, the Runs tab, workflow save/publish, and workflow execution -- all powered by the **Vercel Workflow** library (`workflow` npm package from useworkflow.dev) as the backend execution engine.

**IMPORTANT DISTINCTION**:

- **`/workflows/:id/edit`** = The project's workflow editor page (Next.js route) -- the UI we are completing
- **Vercel Workflow** = The `workflow` npm package (`bun add workflow`) that provides async, resumable, durable workflow execution with `"use workflow"` and `"use step"` directives

---

## Current State (Gap Analysis)

### Fully Functional

- Zustand store (all actions working)
- Trigger/Step selection dialogs (9 triggers, 8 steps)
- Trigger block display with completion warnings
- Step cards with move up/down reorder
- Step selection (visual highlight)
- Step deletion
- Workflow name editing + star toggle
- AI assistant panel toggle/collapse
- AI step config form (prompt + output format)
- HTTP step config form (method + URL)
- Keyboard shortcut (Esc to deselect)
- Unsaved changes warning (beforeunload)
- Mobile responsive (sheet panel on mobile)
- ResizablePanel (desktop config panel)
- Workflow data loading via React Query + Supabase

### Stub / Not Functional

- Dropdown menus: Rename, Duplicate -- open but no handlers
- Sharing button -- no functionality
- Bell / Notifications -- no functionality
- UserPlus / Add collaborator -- no functionality
- More (...) button -- no functionality
- AI Assistant: UI only, no AI backend, send button does nothing, use-case cards do nothing
- Runs tab: shows "Runs tab coming soon"

### Not Yet Implemented

- **6 of 8 step config forms**: app, flow_control, web_scraping, human_in_loop, utility, sequence
- **9 trigger config forms**: ALL triggers lack config panels (selecting a trigger sets defaults but no config UI)
- **Workflow Save**: no save/persist to Supabase
- **Workflow Publish/Unpublish**: no status toggle
- **Workflow Execution**: no backend execution engine
- **Run History**: no runs display
- **Run Detail**: no step-by-step execution view
- **Step Data Mapping**: no variable/output passing between steps
- **Undo/Redo**: no history management
- **Keyboard Shortcuts**: only Esc implemented
- **Test Run**: no way to test a workflow before publishing
- **Observability**: no execution progress tracking

---

## User Scenarios & Testing

### User Story 1 - Vercel Workflow Library Setup & Backend Infrastructure (Priority: P0)

The Vercel Workflow library (`workflow` npm package) is installed and configured. `next.config.ts` is wrapped with `withWorkflow()`. TypeScript plugin is added. API routes are created for starting workflow runs and checking run status. The `.well-known/workflow/*` paths are excluded from middleware. The foundational backend plumbing exists so that workflows can be defined, started, and observed.

**Why this priority**: Without the Vercel Workflow backend, nothing can execute. This is the foundational infrastructure that everything else depends on.

**Independent Test**: Run `bun run build` and verify no errors. Start dev server, verify `/.well-known/workflow/` endpoint responds. Create a trivial test workflow with `"use workflow"` directive and verify it can be started via API route.

**Acceptance Scenarios**:

1. **Given** the project has `workflow` installed, **When** the dev server starts, **Then** the Vercel Workflow runtime is active and `/.well-known/workflow/` routes are available.

2. **Given** `next.config.ts` wraps with `withWorkflow()`, **When** the build runs, **Then** `"use workflow"` and `"use step"` directives are recognized by the compiler.

3. **Given** `tsconfig.json` includes the workflow plugin, **When** editing workflow files in IDE, **Then** IntelliSense provides proper type hints for workflow/step directives.

4. **Given** middleware exists, **When** a request hits `/.well-known/workflow/*`, **Then** it is NOT intercepted by middleware (excluded via matcher).

5. **Given** an API route at `app/api/workflows/[id]/run/route.ts`, **When** a POST request is sent with workflow ID, **Then** the workflow is started asynchronously via the `start()` function from `workflow/api` and a run ID is returned.

6. **Given** an API route at `app/api/workflows/[id]/runs/route.ts`, **When** a GET request is sent, **Then** it returns a list of runs for that workflow with status, timestamps, and step progress.

7. **Given** a run is in progress, **When** the run status API is called, **Then** it returns current step, overall status (pending/running/completed/failed), and per-step status.

---

### User Story 2 - Workflow Save, Publish, and Lifecycle Management (Priority: P1)

A user edits a workflow in the editor and clicks Save. The workflow config (trigger, steps, metadata) persists to Supabase. The user can Publish (make active) or Unpublish (deactivate) the workflow. The header dropdown actions (Rename, Duplicate) work. The Save button shows dirty state. Auto-save is supported with debounce.

**Why this priority**: Without save/publish, no workflow configuration is persistent. Users can't build and return to workflows later.

**Independent Test**: Edit a workflow name, add a trigger, add 2 steps, click Save. Refresh the page and verify all data is restored. Toggle publish status and verify it persists.

**Acceptance Scenarios**:

1. **Given** the editor has unsaved changes (`isDirty: true`), **When** the user views the header, **Then** a Save button appears (or existing button shows active state) indicating unsaved changes.

2. **Given** the user clicks Save, **When** the save operation runs, **Then**:
   - Workflow metadata (name, emoji, isStarred) is upserted to `workflows` table
   - Trigger config is upserted to `workflow_triggers` table
   - Steps are upserted to `workflow_steps` table (with position, type, name, config)
   - `isDirty` resets to `false`
   - A success toast appears

3. **Given** a workflow is in `draft` status, **When** the user clicks a Publish button, **Then** the workflow status changes to `published` in the database and the UI updates to show published state.

4. **Given** a workflow is `published`, **When** the user clicks Unpublish, **Then** the status reverts to `draft` and any active scheduled triggers are paused.

5. **Given** the user opens the header dropdown and clicks Rename, **When** the rename action fires, **Then** the workflow name input gains focus for inline editing.

6. **Given** the user clicks Duplicate in the dropdown, **When** the duplication runs, **Then** a new workflow is created with the same trigger, steps, and config, named "[Original Name] (copy)", and the user is navigated to the new workflow's editor.

7. **Given** the user has been editing for 5+ seconds without saving, **When** auto-save triggers (debounced 3s after last change), **Then** the workflow is saved automatically and a subtle "Saved" indicator appears.

8. **Given** the user clicks the More (...) button, **When** the menu opens, **Then** options include: Export as JSON, Import from JSON, Delete workflow, View workflow history.

---

### User Story 3 - Complete Trigger Configuration Forms (Priority: P1)

All 9 trigger types have fully functional configuration panels. When a user selects a trigger type, a config form appears in the right panel (or inline) allowing them to configure all parameters for that trigger type. Each form validates required fields and shows completion warnings.

**Why this priority**: Triggers are the entry point of every workflow. Without config forms, users can't configure HOW their workflow starts.

**Independent Test**: Select each of the 9 trigger types, verify a config form renders with all fields from the trigger config interfaces. Fill in required fields, verify completion indicator changes from warning to complete.

**Acceptance Scenarios**:

1. **Manual Trigger Config**:
   - **Given** the user selects Manual trigger, **When** the config panel opens, **Then** it shows a "Run inputs" section with an "Add input" button.
   - **When** the user adds an input, **Then** a form row appears with: Name (text), Type (select: text/number/boolean/select/date), Required (checkbox), Default value (text), Description (text).
   - **When** the user adds multiple inputs, **Then** they can reorder via drag-and-drop and delete individual inputs.

2. **Scheduled Trigger Config**:
   - **Given** the user selects Scheduled trigger, **When** the config panel opens, **Then** it shows:
     - Schedule type toggle: Interval vs Cron
     - **Interval mode**: Value (number input) + Unit (select: minutes/hours/days/weeks)
     - **Cron mode**: Cron expression input with preview of next 3 run times
     - Timezone select (defaults to user's timezone)
     - Optional: Start date, End date

3. **Webhook Trigger Config**:
   - **Given** the user selects Webhook trigger, **When** the config panel opens, **Then** it shows:
     - Auto-generated webhook URL (read-only, with copy button)
     - Method select (GET/POST/PUT/PATCH)
     - Optional: Secret key input (for HMAC verification)
     - Response status code (number, default 200)
   - **When** the URL is copied, **Then** a toast confirms "Webhook URL copied".

4. **Form Trigger Config**:
   - **Given** the user selects Form trigger, **When** the config panel opens, **Then** it shows:
     - "Fields" section with "Add field" button
     - Each field row: Label, Type (select: text/textarea/number/email/select/checkbox/date/file), Required checkbox, Placeholder text
     - Submit button text input (default "Submit")
     - Success message input (default "Form submitted successfully")
   - Fields support reorder via drag-and-drop.

5. **RSS Trigger Config**:
   - **Given** the user selects RSS trigger, **When** the config panel opens, **Then** it shows:
     - Feed URL input (required, with URL validation)
     - Check interval (number + unit, default 15 minutes)
     - Max items per check (number, default 10)

6. **Mailhook Trigger Config**:
   - **Given** the user selects Mailhook trigger, **When** the config panel opens, **Then** it shows:
     - Auto-generated email address (read-only, with copy button)
     - Allowed senders (tag input, optional)
     - Subject filter (text, optional)
     - Save attachments toggle (default on)

7. **Table Trigger Config**:
   - **Given** the user selects Table trigger, **When** the config panel opens, **Then** it shows:
     - Table selector (dropdown of available Supabase tables)
     - Event type select: Row created, Row updated, Row deleted, Field changed
   - **When** the user selects a table, **Then** `table_id` is set and completion indicator turns green.

8. **MCP Server Trigger Config**:
   - **Given** the user selects MCP trigger, **When** the config panel opens, **Then** it shows:
     - Server name input (required)
     - Description textarea
     - "Tools" section with "Add tool" button
     - Each tool: Name, Description, Input schema (JSON editor)

9. **App Trigger Config**:
   - **Given** the user selects App trigger, **When** the config panel opens, **Then** it shows:
     - App selector (grid of connected apps with icons)
     - Event selector (depends on selected app)
     - Filters section (key-value pairs)
   - **When** an app is selected, **Then** available events load dynamically.

---

### User Story 4 - Complete Step Configuration Forms (Priority: P1)

All 8 step types have fully functional configuration panels. The existing AI and HTTP forms are enhanced. The remaining 6 step types get complete config forms. Each form validates required fields and reflects changes in the store immediately.

**Why this priority**: Steps are the core building blocks. Without config forms for all types, users can only use AI and HTTP steps.

**Independent Test**: Add each of the 8 step types to a workflow, select each one, verify a complete config form renders in the right panel with all fields from the step config interfaces. Fill in required fields, verify completion status updates.

**Acceptance Scenarios**:

1. **AI Step Config (Enhanced)**:
   - Existing form PLUS:
     - AI action select: Summarize, Classify, Extract, Generate, Transform
     - Temperature slider (0-1, default 0.7)
     - Max tokens input (number, default 1000)
     - Variable insertion: Click to insert `{{step_N.output}}` references in prompt template
   - **When** the prompt template uses `{{step_1.output}}`, **Then** it shows as a highlighted chip/tag in the textarea.

2. **HTTP Step Config (Enhanced)**:
   - Existing form PLUS:
     - Headers section: Key-value pairs with Add/Remove
     - Body editor: Raw JSON textarea (for POST/PUT/PATCH)
     - Auth section: None / Bearer Token / Basic Auth / API Key
     - Timeout input (seconds, default 30)
     - Retry count input (number, default 0)
     - Response handling: Select which part of response to use (body/headers/status)

3. **App Step Config**:
   - **Given** the user selects an App step, **When** the config panel opens, **Then** it shows:
     - App selector (grid with connected app icons: Email, LinkedIn, X/Twitter, YouTube, plus "Browse all")
     - **When** an app is selected, **Then** available actions load (e.g., Email: Send, LinkedIn: Post, etc.)
     - Action selector dropdown
     - Dynamic input fields based on selected action
     - Input mapping: fields can reference previous step outputs via `{{step_N.output}}`

4. **Flow Control Step Config**:
   - **Given** the user selects a Flow Control step, **When** the config panel opens, **Then** it shows:
     - Control type selector: Path (conditional), Loop, Wait
     - **Path mode**:
       - Condition builder: Field (from previous steps), Operator (equals/contains/gt/lt/exists), Value
       - "Add condition" for multiple branches
       - Default/else path
     - **Loop mode**: Loop count or "for each item in {{step_N.output}}"
     - **Wait mode**: Duration input (seconds/minutes/hours) -- maps to Vercel Workflow `sleep()` function

5. **Web Scraping Step Config**:
   - **Given** the user selects a Web Scraping step, **When** the config panel opens, **Then** it shows:
     - URL input (required, with variable support)
     - Scrape type: Full page, CSS selector, XPath
     - Selector input (if CSS/XPath selected)
     - Output format select: Text, HTML, JSON
     - Wait for selector option (for dynamic pages)

6. **Human in the Loop Step Config**:
   - **Given** the user selects a Human in Loop step, **When** the config panel opens, **Then** it shows:
     - Action type select: Approval, Input, Review
     - Assignee type: Anyone, Specific user
     - Assignee selector (if specific, shows team members)
     - Prompt textarea (what the human sees)
     - Include context toggle (attach previous step outputs)
     - Timeout input (how long to wait before auto-action)
   - This step uses Vercel Workflow's `sleep()` to suspend execution until human responds.

7. **Utility Step Config**:
   - **Given** the user selects a Utility step, **When** the config panel opens, **Then** it shows:
     - Utility type selector: Format data, Parse JSON, Parse CSV, Merge data, Filter array, Map array, Math operation
     - Dynamic config based on selected utility type
     - Input field referencing previous step outputs
     - Output preview (shows expected output format)

8. **Sequence Step Config**:
   - **Given** the user selects a Sequence step, **When** the config panel opens, **Then** it shows:
     - Description: "A reusable group of steps that execute together"
     - "Add inline step" button (opens step selector within the sequence)
     - Nested step list with same step cards as main canvas
     - Collapse/expand toggle for the sequence

---

### User Story 5 - Workflow Execution Engine with Vercel Workflow (Priority: P1)

The Vercel Workflow library powers actual workflow execution. Each step type maps to a `"use step"` function. The workflow orchestrator uses `"use workflow"` to coordinate steps sequentially (or conditionally for flow control). Runs are tracked, steps report progress, and errors are handled with retries.

**Why this priority**: This is the core value proposition -- workflows that actually execute. Without this, the editor is just a visual builder with no backend.

**Independent Test**: Create a workflow with Manual trigger + HTTP step (GET httpbin.org/get) + AI step. Click "Run" in the editor. Verify the workflow executes: HTTP step fetches data, AI step processes it, run completes with output visible in the Runs tab.

**Acceptance Scenarios**:

1. **Given** a workflow definition with trigger + steps, **When** the execution engine processes it, **Then** a Vercel Workflow function is generated/dispatched with:
   - `"use workflow"` directive at the top
   - Sequential step invocations, each with `"use step"` directive
   - Step outputs passed to next step's input
   - Error handling with automatic retry (Vercel Workflow default behavior)
   - `FatalError` thrown for validation failures (non-retryable)

2. **Given** an HTTP step with method=GET and url=`https://api.example.com/data`, **When** the step executes, **Then** it makes the HTTP request, captures the response (status, headers, body), and returns it as `step_N.output`.

3. **Given** an AI step with a prompt template containing `{{step_1.output}}`, **When** the step executes, **Then** the template is interpolated with the previous step's output, sent to an AI provider, and the AI response becomes `step_N.output`.

4. **Given** a Flow Control step in "Wait" mode with duration "5s", **When** the step executes, **Then** Vercel Workflow's `sleep("5s")` is called, suspending execution without consuming resources for 5 seconds.

5. **Given** a step throws an unhandled error, **When** the workflow engine processes it, **Then** the step is automatically retried (Vercel Workflow default). If it throws `FatalError`, it is NOT retried and the run fails.

6. **Given** a workflow with 5 steps, **When** execution progresses, **Then** each step's status updates in real-time: pending -> running -> completed/failed. The overall run status reflects aggregate progress.

7. **Given** the user clicks "Test Run" in the editor, **When** the test run starts, **Then** the workflow executes in test mode (no side effects for external steps), and results appear inline in the editor with step-by-step output.

---

### User Story 6 - Runs Tab with Execution History and Live Progress (Priority: P2)

The Runs tab in the editor displays a complete history of workflow runs. Each run shows status, start time, duration, trigger info, and step-by-step execution details. Live runs show real-time progress. Users can inspect individual run details, view step outputs, and retry failed runs.

**Why this priority**: Visibility into execution is critical for debugging and trust. Users need to see what their workflows are doing.

**Independent Test**: Run a workflow 3 times (1 success, 1 in-progress, 1 failed). Switch to Runs tab. Verify all 3 runs appear with correct status badges. Click on the completed run, verify step-by-step output is visible. Verify the in-progress run shows live step progress.

**Acceptance Scenarios**:

1. **Given** the user switches to the Runs tab, **When** runs exist for this workflow, **Then** a list of runs appears sorted by most recent, each showing:
   - Run ID (short hash)
   - Status badge: Queued (gray), Running (blue pulse), Completed (green), Failed (red)
   - Started at timestamp (relative, e.g., "2 min ago")
   - Duration (e.g., "3.2s")
   - Trigger type icon and label
   - Step progress indicator (e.g., "3/5 steps completed")

2. **Given** a run is in progress, **When** the user views the Runs tab, **Then** the running run shows:
   - Animated pulse on the status badge
   - Current step highlighted
   - Live elapsed time counter
   - Step-by-step progress updates (polling or SSE)

3. **Given** the user clicks on a completed run, **When** the run detail panel opens, **Then** it shows:
   - Full run metadata (ID, status, timestamps, duration)
   - Step timeline: each step with name, type icon, status, duration, and expandable output
   - **When** a step is expanded, **Then** its input and output data are shown in formatted JSON

4. **Given** a run has failed, **When** the user views the run detail, **Then** the failed step is highlighted in red with the error message. A "Retry from failed step" button is available.

5. **Given** the user clicks "Retry from failed step", **When** the retry starts, **Then** a new run is created that skips completed steps and resumes from the failed step (using Vercel Workflow's resumability).

6. **Given** no runs exist, **When** the user views the Runs tab, **Then** an empty state is shown: illustration, "No runs yet", "Run this workflow to see execution history", and a "Run now" button.

---

### User Story 7 - Step Data Mapping and Variable System (Priority: P2)

Steps can reference outputs from previous steps using a variable syntax `{{step_N.output}}` or `{{trigger.output}}`. The editor provides a visual variable picker that shows available variables from upstream steps. Variables are validated (can't reference non-existent steps).

**Why this priority**: Data flow between steps is what makes workflows useful. Without variable mapping, each step is isolated.

**Independent Test**: Create a workflow with HTTP step + AI step. In the AI step's prompt template, click the variable picker. Verify `{{step_1.output}}` is available. Insert it. Save and run the workflow. Verify the AI step receives the HTTP step's output.

**Acceptance Scenarios**:

1. **Given** a step config form has a text/textarea input, **When** the user sees the input, **Then** a small `{ }` button appears next to the input to open the variable picker.

2. **Given** the variable picker opens, **When** the user views available variables, **Then** it lists:
   - `{{trigger.output}}` -- the trigger's output data
   - `{{step_1.output}}` through `{{step_N.output}}` for all preceding steps
   - Each variable shows the step name and type icon for identification

3. **Given** the user clicks a variable, **When** it's inserted, **Then** it appears as a highlighted chip/tag in the input field (not raw text). The chip shows the step name.

4. **Given** a step references `{{step_3.output}}` but step 3 is deleted, **When** the editor re-renders, **Then** the variable chip shows a red warning state and a tooltip "Referenced step no longer exists".

5. **Given** step outputs have structured data (JSON), **When** the variable picker shows, **Then** the user can drill into the output schema: `{{step_1.output.data.email}}` with dot-notation navigation.

---

### User Story 8 - Header Actions: Sharing, Notifications, Collaborators (Priority: P3)

All header buttons are functional. Sharing opens a dialog to manage workflow access. Notifications shows workflow-related alerts. The UserPlus button opens a collaborator invite dialog. The More button provides additional workflow management options.

**Why this priority**: These are collaboration features that enhance the multi-user experience but aren't required for single-user workflow building.

**Independent Test**: Click each header button, verify the corresponding dialog/popover opens with functional content.

**Acceptance Scenarios**:

1. **Given** the user clicks the Sharing button, **When** the sharing dialog opens, **Then** it shows:
   - Current access level: Private / Team / Public
   - Share link with copy button
   - Team member list with role (Editor/Viewer)
   - "Add people" input

2. **Given** the user clicks the Bell (notifications) button, **When** the popover opens, **Then** it shows recent workflow notifications:
   - Run completed/failed alerts
   - Collaboration mentions
   - "Mark all as read" button

3. **Given** the user clicks UserPlus, **When** the invite dialog opens, **Then** it shows:
   - Email input for inviting collaborators
   - Role selector (Editor/Viewer)
   - "Send invite" button

4. **Given** the user clicks More (...), **When** the menu opens, **Then** it includes:
   - Export as JSON
   - Import from JSON
   - Duplicate workflow
   - View version history
   - Delete workflow (with confirmation dialog)

---

### User Story 9 - Undo/Redo and Keyboard Shortcuts (Priority: P3)

The editor supports full undo/redo for all store actions. Keyboard shortcuts accelerate common operations. A keyboard shortcuts help dialog is available.

**Why this priority**: Power-user features that improve editing speed but aren't blockers for core functionality.

**Independent Test**: Add a step, press Ctrl+Z, verify step is removed. Press Ctrl+Shift+Z, verify step is restored. Press Delete with a step selected, verify step is deleted.

**Acceptance Scenarios**:

1. **Given** the user makes a change (add step, edit name, change trigger), **When** the change is applied, **Then** the previous state is pushed to an undo stack.

2. **Given** changes exist in the undo stack, **When** the user presses `Ctrl+Z` (or `Cmd+Z` on Mac), **Then** the last change is reverted and pushed to the redo stack.

3. **Given** changes exist in the redo stack, **When** the user presses `Ctrl+Shift+Z`, **Then** the last undone change is re-applied.

4. **Given** a step is selected, **When** the user presses `Delete` or `Backspace`, **Then** the selected step is deleted (with undo support).

5. **Given** the editor is active, **When** the user presses `Ctrl+S`, **Then** the workflow is saved (debounced).

6. **Given** the editor is active, **When** the user presses `Ctrl+Shift+P`, **Then** a command palette opens (similar to VS Code) for quick actions.

7. **Given** the user presses `?` (with no input focused), **When** the shortcut help opens, **Then** it lists all available keyboard shortcuts.

---

### User Story 10 - AI Assistant Backend Integration (Priority: P3)

The AI assistant panel connects to an AI provider. Users can describe a workflow in natural language and the assistant generates the workflow configuration. Use-case cards populate the prompt. The assistant can also explain existing steps and suggest improvements.

**Why this priority**: AI assistance is a differentiator but not required for manual workflow building.

**Independent Test**: Open the assistant, type "Create a workflow that fetches RSS news and sends a summary email daily". Verify the assistant generates a workflow with RSS trigger + AI step + Email step. Click "Apply" to populate the editor.

**Acceptance Scenarios**:

1. **Given** the assistant panel is open, **When** the user types a workflow description and clicks Send, **Then** the AI processes the request and returns a suggested workflow configuration.

2. **Given** the AI returns a workflow suggestion, **When** the response renders, **Then** it shows:
   - Natural language explanation of the workflow
   - Visual preview of proposed trigger + steps
   - "Apply to editor" button that populates the store with the suggested configuration

3. **Given** the user clicks a use-case card (e.g., "Meeting briefings"), **When** the card is clicked, **Then** the prompt textarea is populated with the use-case description and auto-submitted.

4. **Given** a workflow is already configured, **When** the user asks "explain this workflow", **Then** the assistant reads the current store state and provides a natural language explanation of what each step does.

---

## Technical Architecture

### Vercel Workflow Integration

```
next.config.ts
├── withWorkflow(nextConfig) wrapper
└── Enables "use workflow" and "use step" directives

tsconfig.json
└── compilerOptions.plugins: [{ name: "workflow" }]

src/workflows/                         # NEW directory for workflow definitions
├── executor.ts                        # Main workflow orchestrator ("use workflow")
├── steps/
│   ├── http-step.ts                   # HTTP request execution ("use step")
│   ├── ai-step.ts                     # AI processing ("use step")
│   ├── app-step.ts                    # Connected app actions ("use step")
│   ├── web-scraping-step.ts           # Web scraping ("use step")
│   ├── human-in-loop-step.ts          # Human approval with sleep() ("use step")
│   ├── utility-step.ts               # Data transformation ("use step")
│   ├── flow-control-step.ts           # Conditional/loop logic
│   └── sequence-step.ts              # Grouped step execution ("use step")
└── utils/
    ├── variable-resolver.ts           # Resolve {{step_N.output}} references
    └── step-output-store.ts           # Track outputs per run

src/app/api/workflows/[id]/
├── run/route.ts                       # POST: Start a workflow run
├── runs/route.ts                      # GET: List runs for workflow
├── runs/[runId]/route.ts              # GET: Get run detail with step status
└── save/route.ts                      # POST: Save workflow config to Supabase
```

### Database Changes

**IMPORTANT**: The `workflow_runs` table ALREADY EXISTS with columns: `id, workflow_id, agent_id, status (run_status enum), steps_used, ai_credits_used, started_at, completed_at, created_at`. It is actively queried by dashboard, runs page, workspace, and agent detail views. DO NOT drop/recreate it.

Alter existing table: `workflow_runs` (add missing columns)

```sql
ALTER TABLE workflow_runs
  ADD COLUMN IF NOT EXISTS trigger_type trigger_type,
  ADD COLUMN IF NOT EXISTS trigger_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS error TEXT;
```

New table: `workflow_run_steps`

```sql
CREATE TABLE workflow_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_id UUID,                           -- NO FK constraint (steps get deleted/re-inserted on save)
  step_position INTEGER NOT NULL,
  step_type step_type NOT NULL,
  status run_status NOT NULL DEFAULT 'pending', -- uses existing run_status enum
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);
```

**Note on `step_id`**: No foreign key to `workflow_steps` because the save API deletes and re-inserts steps (T010). A FK would cascade-delete historical run step data. The `step_id` is informational only for correlating with current step definitions.

### Store Enhancements

```typescript
// Additional state for undo/redo
undoStack: WorkflowEditorState[]
redoStack: WorkflowEditorState[]

// Additional actions
saveWorkflow: () => Promise<void>        // Persist to Supabase
publishWorkflow: () => Promise<void>     // Set status to published
unpublishWorkflow: () => Promise<void>   // Set status to draft
duplicateWorkflow: () => Promise<string> // Clone and return new ID
undo: () => void                         // Pop undo stack
redo: () => void                         // Pop redo stack
startRun: () => Promise<string>          // Trigger execution, return run ID
```

### Key Integration Points

1. **Workflow Definition Generation**: When a workflow is "run", the system generates a Vercel Workflow function from the stored config (trigger + steps + variable mappings)
2. **Step Execution**: Each step type maps to a `"use step"` function that performs the actual work
3. **Variable Resolution**: Before each step runs, `{{step_N.output}}` references are resolved from the accumulated outputs
4. **Sleep/Wait**: Flow control "wait" and "human in loop" steps use Vercel Workflow's `sleep()` for resource-free suspension
5. **Error Handling**: Steps throw `FatalError` for validation failures; other errors trigger automatic retry

---

## File Impact Summary

### New Files

- `src/workflows/executor.ts` - Main workflow orchestrator
- `src/workflows/steps/*.ts` - Step execution functions (8 files)
- `src/workflows/utils/*.ts` - Variable resolver, output store
- `src/app/api/workflows/[id]/run/route.ts` - Run API
- `src/app/api/workflows/[id]/runs/route.ts` - Runs list API
- `src/app/api/workflows/[id]/runs/[runId]/route.ts` - Run detail API
- `src/app/api/workflows/[id]/save/route.ts` - Save API
- `src/components/workflow-editor/trigger-config/*.tsx` - 9 trigger config forms
- `src/components/workflow-editor/step-config/*.tsx` - 6 new step config forms
- `src/components/workflow-editor/runs-tab.tsx` - Runs tab component
- `src/components/workflow-editor/run-detail.tsx` - Run detail panel
- `src/components/workflow-editor/variable-picker.tsx` - Variable picker
- `src/components/workflow-editor/sharing-dialog.tsx` - Sharing dialog
- Supabase migration for `workflow_runs` and `workflow_run_steps` tables

### Modified Files

- `next.config.ts` - Add `withWorkflow()` wrapper
- `tsconfig.json` - Add workflow TypeScript plugin
- `src/middleware.ts` - Exclude `.well-known/workflow/*`
- `src/stores/workflow-editor-store.ts` - Add save/publish/undo/redo actions
- `src/components/workflow-editor/step-config-panel.tsx` - Route to all config forms
- `src/components/editor/editor-shell.tsx` - Connect Runs tab
- `src/components/editor/editor-header.tsx` - Wire all header buttons
- `src/components/workflow-editor/ai-assistant-panel.tsx` - Connect AI backend
- `src/hooks/use-workflow-data.ts` - Add save/publish mutations
- `src/lib/queries/workflow-editor.ts` - Add save/runs queries

---

### TypeScript Interface Updates Required

Before building config forms, the following interfaces in `src/lib/workflow-editor/step-defaults.ts` MUST be updated:

- **`FlowControlStepConfig`**: Add `control_type: 'path' | 'loop' | 'wait'`, condition builder fields, loop config, duration
- **`UtilityStepConfig`**: Add `utility_type: 'format' | 'parse_json' | 'parse_csv' | 'merge' | 'filter' | 'map' | 'math'` plus dynamic config fields
- **`SequenceStepConfig`**: Type `inline_steps` properly instead of `unknown[]`
- **`WebScrapingStepConfig`**: Add `selector`, `wait_for_selector` fields
- **`HumanInLoopStepConfig`**: Add `assignee`, `timeout` fields
- **`HTTPStepConfig`**: Add `headers`, `body`, `auth` fields

### Environment Variables Required

```env
# AI Provider (for AI step execution and AI assistant)
AI_PROVIDER_API_KEY=        # OpenAI or Anthropic API key
AI_PROVIDER_URL=            # API endpoint URL

# Webhook Trigger
WEBHOOK_BASE_URL=           # Base URL for generating webhook URLs (e.g., https://relay.app)

# Vercel Workflow (automatic in Vercel deployment, manual in dev)
# No additional env vars needed -- workflow uses Next.js runtime
```

### Risk: Workflow Package Beta Status

The `workflow` npm package is currently at `4.x-beta`. Pin the exact version in `package.json` to avoid breaking changes during development. Monitor the changelog at useworkflow.dev for stable release.

---

## Non-Functional Requirements

- **Performance**: Workflow save < 500ms. Run list load < 1s. Step execution timeout configurable per step.
- **Reliability**: Vercel Workflow handles retry and resumability. Failed steps show clear error messages.
- **Security**: API routes validate auth. Workflow execution runs server-side only. Sensitive configs (API keys, secrets) are encrypted at rest.
- **Accessibility**: All config forms have proper labels, keyboard navigation, and ARIA attributes.
- **Mobile**: Config forms render properly in sheet panels on mobile. Runs tab is scrollable and touch-friendly.
