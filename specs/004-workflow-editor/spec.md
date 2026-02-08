# Feature Specification: Workflow Editor

**Feature Branch**: `004-workflow-editor`
**Created**: 2026-02-07
**Status**: Draft
**Input**: Phase 4 from DEVELOPMENT_SPEC.md (sections 4.1 through 4.7)

---

## User Scenarios & Testing

### User Story 1 - Editor Page with 3-Panel Layout, Top Bar, Store, and Step Canvas (Priority: P1)

A user navigates to `/workflows/:id/edit` and sees the full workflow editor. The page consists of a top bar (emoji, editable name, star toggle, actions), an Editor/Runs tab bar, and a 3-panel layout. The center panel is the step canvas: a vertical list starting with a trigger block at the top, numbered steps below connected by vertical lines, and an "Add step" button at the bottom. The Zustand store manages all editor state (workflow metadata, trigger, steps, selection, assistant visibility). This is the MVP -- the editor shell with the canvas rendering and store wiring.

**Why this priority**: Without the editor page, store, and canvas, nothing else in this feature can function. The 3-panel layout is the structural foundation for all sub-features. The step canvas is the core interaction surface.

**Independent Test**: Navigate to `/workflows/test-id/edit`, verify the top bar renders with editable name and star toggle, verify Editor tab is selected by default, verify step canvas shows empty trigger block with "Add trigger" button, verify "Add step" button renders at bottom of canvas. Verify Zustand store initializes with default state and actions dispatch correctly.

**Acceptance Scenarios**:

1. **Given** a user navigates to `/workflows/:id/edit`, **When** the page loads, **Then** the top bar displays: workflow emoji (default to a generic icon), an editable text input for the workflow name (defaulting to "Untitled workflow"), a star toggle button (unfilled by default), a dropdown menu (rename, change emoji, duplicate), a notifications bell icon, an "add person" icon, a "Sharing" button, and a more (...) button.

2. **Given** the editor page is loaded, **When** the user views the tab bar below the top bar, **Then** two tabs are visible: "Editor" (active/selected by default) and "Runs" (inactive).

3. **Given** the Editor tab is active, **When** the user views the center panel, **Then** a step canvas renders with:
   - A trigger block card at the top showing a "Trigger" header and an "Add trigger" button (when no trigger is set)
   - An "Add step" button at the very bottom
   - No numbered steps (empty workflow)

4. **Given** the Zustand store is initialized, **When** the editor page mounts, **Then** the store state is:

   ```
   workflowId: string (from URL param)
   workflowName: "Untitled workflow"
   workflowEmoji: "" (empty / default)
   isStarred: false
   trigger: null
   steps: []
   selectedStepId: null
   isAssistantOpen: true
   ```

5. **Given** the user clicks the star toggle, **When** the toggle is clicked, **Then** `isStarred` flips in the store and the star icon changes from outline to filled (or vice versa).

6. **Given** the user edits the workflow name input, **When** the user types a new name, **Then** `workflowName` updates in the store.

7. **Given** a trigger has been set (via store `setTrigger`), **When** the canvas re-renders, **Then** the trigger block shows the trigger type icon, the trigger type name, and a brief config summary instead of "Add trigger".

8. **Given** steps exist in the store (e.g., 3 steps), **When** the canvas renders, **Then**:
   - Each step is displayed as a numbered card (1, 2, 3)
   - A thin vertical connector line connects each step to the next
   - The trigger block connects to step 1 via a connector line
   - Step 3 connects to the "Add step" button via a connector line

9. **Given** the user clicks on a step card in the canvas, **When** the click event fires, **Then** `selectedStepId` updates in the store, and the step card shows a selected visual state (e.g., blue border or highlight).

10. **Given** the 3-panel layout renders, **When** the editor loads with `isAssistantOpen: true`, **Then** the left panel (AI Assistant) is visible at 320px width, the center panel (step canvas) fills remaining space, and the right panel (step config) is hidden (no step selected).

11. **Given** a step is selected (`selectedStepId` is not null), **When** the right panel should appear, **Then** a step config panel slides in on the right side of the editor.

---

### User Story 2 - Trigger Selector and Step Selector with Search (Priority: P2)

A user clicks "Add trigger" on the trigger block or "Add step" at the bottom of the canvas. A dialog/popover opens with a search input and a list of available types. The trigger selector lists 9 trigger types; the step selector lists 8 categories plus connected apps. Each type has an icon, name, and description. The search input filters the list. Selecting a type sets the trigger or adds a step to the store.

**Why this priority**: After the editor shell (US1), the user needs to populate their workflow. The selectors are the primary way to add triggers and steps. Without them, the editor is an empty shell.

**Independent Test**: With US1 complete, click "Add trigger", verify 9 trigger types appear in a dialog with a search input. Search for "manual", verify only "Manual" trigger type is visible. Click "Manual", verify trigger is set in the store and the trigger block updates. Click "Add step", verify 8 categories appear. Click "AI", verify a step is added to the store and canvas.

**Acceptance Scenarios**:

1. **Given** no trigger is set, **When** the user clicks "Add trigger" on the trigger block, **Then** a dialog/popover opens with:
   - A search input at the top (placeholder: "Search triggers...")
   - A list of 9 trigger types, each with an icon, name, and description:
     1. Apps -- "Start runs based on actions in other apps" (has a chevron/arrow indicating sub-menu)
     2. Manual -- "Start runs by clicking a button"
     3. Scheduled -- "Start runs on a recurring schedule"
     4. Form -- "Start runs by submitting a form"
     5. RSS -- "Start runs for new RSS items"
     6. Mailhook -- "Start runs by sending emails to unique address"
     7. Webhook -- "Start runs with custom HTTP requests"
     8. Table -- "Start runs when Table is updated" (has a chevron/arrow indicating sub-menu)
     9. MCP Server -- "Create MCP server for Cursor/Claude"

2. **Given** the trigger selector is open, **When** the user types "sched" in the search input, **Then** only "Scheduled" trigger type is visible in the list (others filtered out).

3. **Given** the trigger selector is open, **When** the user clicks "Manual", **Then**:
   - The dialog closes
   - The store's `trigger` is set to `{ type: "manual", config: { run_inputs: [] } }`
   - The trigger block in the canvas updates to show the Manual trigger icon and "Manual" label

4. **Given** a trigger is already set, **When** the user clicks the trigger block, **Then** the trigger config panel or selector opens allowing the user to change or configure the trigger.

5. **Given** the editor has a trigger set, **When** the user clicks "Add step" at the bottom of the canvas, **Then** a dialog/popover opens with:
   - A search input at the top (placeholder: "Search steps...")
   - 8 step categories, each with an icon, name, and description:
     1. Apps -- "Automate actions in Gmail, Notion, HubSpot etc."
     2. Flow control -- "Paths, waiting, looping"
     3. AI -- "Summarizing, extracting"
     4. Web scraping -- "Get text/profile data from websites"
     5. Human in the loop -- "Wait for person action"
     6. Utilities -- "Format, convert data/files"
     7. HTTP requests -- "Custom requests, webhook wait"
     8. Sequences -- "Reusable step groups"
   - A "CONNECTED APPS" section below with: Email, LinkedIn, X (Twitter), YouTube

6. **Given** the step selector is open, **When** the user types "AI" in the search, **Then** only the "AI" category is visible.

7. **Given** the step selector is open, **When** the user clicks "AI", **Then**:
   - The dialog closes
   - A new step is appended to the store's `steps[]` array with `{ id: <uuid>, type: "ai", name: "AI", position: <next>, config: {} }`
   - The canvas re-renders with the new numbered step card

8. **Given** the trigger selector shows "Apps" with a sub-menu indicator, **When** the user clicks "Apps", **Then** a secondary panel/list shows available app triggers (e.g., Gmail, Slack, Notion) that can be selected.

9. **Given** trigger type configs, **When** a trigger type is selected, **Then** the trigger config is initialized with the correct default shape for that type (see Trigger Config Shapes below).

---

### User Story 3 - AI Assistant Panel and Step Config Panel (Priority: P3)

The AI Assistant panel on the left side is collapsible and shows a welcome state with use case cards. The step config panel on the right side appears when a step is selected and shows editable configuration for that step.

**Why this priority**: These are enhancement panels that improve the user experience but are not required for the core editor to function. The AI Assistant is purely UI at this stage (no backend). The step config panel provides detailed editing but the step canvas already shows steps from US1/US2.

**Independent Test**: With US1+US2 complete, verify the AI Assistant panel renders on the left at 320px with the welcome message, 4 use case cards, and an input textarea. Click the collapse button, verify it collapses and shows an "Open Assistant" button. Click a step in the canvas, verify the step config panel opens on the right with the step name, description, config form fields, and a "Done" button.

**Acceptance Scenarios**:

1. **Given** the editor loads with `isAssistantOpen: true`, **When** the left panel renders, **Then** the AI Assistant panel shows:
   - Header: A logo icon + "Relay.app Assistant" text + a dock/collapse button (icon to collapse)
   - Welcome section: A diamond icon with the text "What can I help you build?"
   - Input area: A textarea with placeholder "Describe a workflow or ask a question" and a send button
   - Popular use cases: 4 cards, each with emoji + title + description:
     1. Meeting briefings
     2. Competitor analysis
     3. Email assistant
     4. YouTube summarizer

2. **Given** the AI Assistant is open, **When** the user clicks the collapse/dock button, **Then**:
   - `isAssistantOpen` in the store is set to `false`
   - The left panel collapses (width goes to 0 or a minimal collapsed state)
   - An "Open Assistant" button appears (e.g., in the canvas area or as a floating button)

3. **Given** the AI Assistant is collapsed, **When** the user clicks "Open Assistant", **Then**:
   - `isAssistantOpen` is set to `true`
   - The left panel re-expands to 320px

4. **Given** a step is selected (e.g., an AI step), **When** the step config panel opens on the right, **Then** it shows:
   - Header: step type icon + editable step name input + "Run as" avatar + delete button (trash icon) + settings button (gear icon)
   - Description: text describing what this step type does
   - Config form: form fields specific to the step type (varies by type, see Step Config Shapes below)
   - Footer: "Output:" reference badge + "Done" button

5. **Given** the step config panel is open, **When** the user edits the step name, **Then** `updateStep` is called in the store and the step name updates in both the config panel header and the canvas step card.

6. **Given** the step config panel is open, **When** the user clicks "Done", **Then** `selectedStepId` is set to `null` and the right panel closes.

7. **Given** the step config panel is open, **When** the user clicks the delete button, **Then** `deleteStep` is called in the store, the step is removed from `steps[]`, the panel closes, and the canvas re-renders without the deleted step (remaining steps renumber).

8. **Given** a Manual trigger is set, **When** the trigger config panel is viewed, **Then** an "Add run inputs" section is visible, allowing the user to define input fields for the manual run form.

---

### Edge Cases

- **Empty workflow**: When `trigger` is `null` and `steps` is `[]`, the canvas shows only the trigger block with "Add trigger" and the "Add step" button. No connector lines are shown between trigger block and "Add step" when there are no steps.
- **Maximum steps**: The canvas must handle workflows with 50+ steps without performance degradation. The vertical list must be scrollable.
- **Step reorder (drag)**: Steps can be reordered via `reorderSteps(fromIndex, toIndex)`. The canvas re-renders with new positions and renumbered step labels. Connector lines update accordingly.
- **Unsaved changes**: When the user navigates away from the editor with unsaved changes, a browser `beforeunload` confirmation should appear. The store tracks a `isDirty` flag (derived from whether any action has been dispatched since last save/load).
- **Invalid trigger config**: If a trigger config is incomplete (e.g., Scheduled with no cron expression), the trigger block should show a warning indicator (e.g., yellow warning icon). Steps with incomplete config should also show warnings.
- **Duplicate step names**: Multiple steps can have the same name. Each step has a unique `id` (UUID).
- **Rapid clicking**: Debounce "Add step" clicks to prevent duplicate steps from being added.
- **Panel overlap on small screens**: At viewport widths below 1024px, the AI Assistant should auto-collapse, and the step config panel should overlay the canvas rather than push it.
- **Trigger replacement**: If the user already has a trigger set and opens the trigger selector again, selecting a new trigger type replaces the existing trigger. The user should see a confirmation if the existing trigger has non-default config.
- **Step selection while config panel is open**: If the user clicks a different step while the config panel is open for another step, the panel should switch to the newly selected step without closing and reopening.

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a Zustand store (`workflow-editor-store.ts`) that holds all editor state: `workflowId`, `workflowName`, `workflowEmoji`, `isStarred`, `trigger`, `steps[]`, `selectedStepId`, `isAssistantOpen`.
- **FR-002**: Store MUST expose actions: `setTrigger(trigger)`, `addStep(step)`, `updateStep(id, partial)`, `deleteStep(id)`, `reorderSteps(fromIndex, toIndex)`, `selectStep(id | null)`, `toggleAssistant()`, `setWorkflowName(name)`, `setWorkflowEmoji(emoji)`, `toggleStar()`.
- **FR-003**: Editor page MUST be at route `/workflows/[id]/edit` within the `(dashboard)` layout group.
- **FR-004**: Editor page MUST render a top bar with: workflow emoji, editable name input, star toggle, dropdown menu (rename, change emoji, duplicate), notifications bell, add person icon, "Sharing" button, more (...) button.
- **FR-005**: Editor page MUST render two tabs: "Editor" (default active) and "Runs".
- **FR-006**: Editor tab MUST render a 3-panel layout: left (AI Assistant, 320px, collapsible), center (step canvas, flex-1), right (step config, conditional on selection).
- **FR-007**: Step canvas MUST render a vertical sequential list: trigger block at top, numbered step cards, vertical connector lines between all adjacent elements, "Add step" button at bottom.
- **FR-008**: Trigger block MUST show "Add trigger" button when `trigger` is `null`, or the trigger type icon + name + config summary when a trigger is set.
- **FR-009**: Step cards MUST display: step number, step type icon, step name. Clicking a step MUST set `selectedStepId` in the store.
- **FR-010**: Vertical connector lines MUST be thin (1-2px) border lines connecting each element to the next in the vertical flow.
- **FR-011**: Trigger selector MUST present 9 trigger types in a searchable dialog/popover: Apps, Manual, Scheduled, Form, RSS, Mailhook, Webhook, Table, MCP Server.
- **FR-012**: Step selector MUST present 8 step categories in a searchable dialog/popover: Apps, Flow control, AI, Web scraping, Human in the loop, Utilities, HTTP requests, Sequences. Plus a "CONNECTED APPS" section.
- **FR-013**: Search inputs in both selectors MUST filter the list in real-time by matching against type/category name and description.
- **FR-014**: AI Assistant panel MUST show a welcome state with diamond icon, "What can I help you build?" heading, a textarea input, and 4 popular use case cards.
- **FR-015**: AI Assistant panel MUST be collapsible via the store's `isAssistantOpen` state. When collapsed, an "Open Assistant" button MUST be visible.
- **FR-016**: Step config panel MUST open on the right when a step is selected, showing: step icon + editable name, "Run as" avatar, delete button, settings button, description, config form, output reference badge, and "Done" button.
- **FR-017**: Clicking "Done" in the step config panel MUST deselect the step (`selectedStepId = null`) and close the panel.
- **FR-018**: Clicking delete in the step config panel MUST remove the step from `steps[]`, close the panel, and renumber remaining steps.
- **FR-019**: Step reorder MUST be supported via the `reorderSteps` action, updating positions and re-rendering the canvas.
- **FR-020**: "Apps" and "Table" trigger types MUST show a sub-menu indicator (chevron) and open a secondary selection panel when clicked.
- **FR-021**: Each trigger type MUST initialize with its correct default config shape (see Trigger Config Shapes).
- **FR-022**: Each step type MUST initialize with its correct default config shape (see Step Config Shapes).
- **FR-023**: The editor page MUST be a client component (`"use client"`) since it depends on Zustand store, event handlers, and interactive UI.
- **FR-024**: All selectors MUST use the shadcn `command` component (cmdk) for the searchable list pattern.

### Key Entities

- **Workflow**: The parent entity. Has id, name, emoji, starred status. Stored in `workflows` table.
- **WorkflowTrigger**: The event that starts a workflow run. One per workflow. Has type (one of 9 types) and config (JSONB, shape varies by type). Stored in `workflow_triggers` table.
- **WorkflowStep**: An action within a workflow. Ordered by position. Has type (one of 8 categories), name, config (JSONB, shape varies by type). Stored in `workflow_steps` table.

### Trigger Config Shapes (JSONB)

Each trigger type has a distinct config shape stored as JSONB:

```typescript
// 1. Apps trigger
type AppsTriggerConfig = {
  app_id: string // Selected app (e.g., "gmail", "slack")
  event: string // App-specific event (e.g., "new_email", "new_message")
  filters: Record<string, string> // Optional filters (e.g., { label: "important" })
}

// 2. Manual trigger
type ManualTriggerConfig = {
  run_inputs: Array<{
    id: string
    name: string
    type: 'text' | 'number' | 'boolean' | 'select' | 'date'
    required: boolean
    default_value?: string
    options?: string[] // For "select" type
    description?: string
  }>
}

// 3. Scheduled trigger
type ScheduledTriggerConfig = {
  schedule_type: 'cron' | 'interval'
  cron_expression?: string // e.g., "0 9 * * 1-5" (weekdays at 9am)
  interval_value?: number // e.g., 30
  interval_unit?: 'minutes' | 'hours' | 'days' | 'weeks'
  timezone: string // e.g., "America/New_York"
  starts_at?: string // ISO 8601 datetime
  ends_at?: string // ISO 8601 datetime
}

// 4. Form trigger
type FormTriggerConfig = {
  fields: Array<{
    id: string
    label: string
    type: 'text' | 'textarea' | 'number' | 'email' | 'select' | 'checkbox' | 'date' | 'file'
    required: boolean
    placeholder?: string
    options?: string[] // For "select" type
    validation?: {
      min_length?: number
      max_length?: number
      pattern?: string
    }
  }>
  submit_button_text: string // Default: "Submit"
  success_message: string // Default: "Form submitted successfully"
}

// 5. RSS trigger
type RSSTriggerConfig = {
  feed_url: string // RSS/Atom feed URL
  check_interval_minutes: number // Default: 15
  max_items_per_check: number // Default: 10
  filters?: {
    title_contains?: string
    title_not_contains?: string
    category?: string
  }
}

// 6. Mailhook trigger
type MailhookTriggerConfig = {
  address: string // Auto-generated unique email address
  allowed_senders?: string[] // Whitelist of sender emails
  subject_filter?: string // Filter by subject line
  save_attachments: boolean // Default: true
}

// 7. Webhook trigger
type WebhookTriggerConfig = {
  url: string // Auto-generated webhook URL
  method: 'GET' | 'POST' | 'PUT' | 'PATCH'
  secret?: string // For HMAC signature verification
  headers_required?: Record<string, string>
  response_status: number // Default: 200
  response_body?: string // Optional response body template
}

// 8. Table trigger
type TableTriggerConfig = {
  table_id: string // Reference to a Relay Table
  event: 'row_created' | 'row_updated' | 'row_deleted' | 'field_changed'
  watched_fields?: string[] // For "field_changed" event
  filters?: Record<string, unknown>
}

// 9. MCP Server trigger
type MCPServerTriggerConfig = {
  server_name: string // Display name for the MCP server
  description: string // What this server does
  tools: Array<{
    name: string
    description: string
    input_schema: Record<string, unknown> // JSON Schema
  }>
}

// Union type
type TriggerConfig =
  | { type: 'app'; config: AppsTriggerConfig }
  | { type: 'manual'; config: ManualTriggerConfig }
  | { type: 'scheduled'; config: ScheduledTriggerConfig }
  | { type: 'form'; config: FormTriggerConfig }
  | { type: 'rss'; config: RSSTriggerConfig }
  | { type: 'mailhook'; config: MailhookTriggerConfig }
  | { type: 'webhook'; config: WebhookTriggerConfig }
  | { type: 'table'; config: TableTriggerConfig }
  | { type: 'mcp'; config: MCPServerTriggerConfig }
```

### Step Config Shapes (JSONB)

Each step category has a distinct config shape:

```typescript
// 1. Apps step
type AppsStepConfig = {
  app_id: string // Selected app (e.g., "gmail", "notion")
  action: string // App-specific action (e.g., "send_email", "create_page")
  inputs: Record<string, unknown> // Action-specific input mapping
  connection_id?: string // Reference to app_connections
}

// 2. Flow control step
type FlowControlStepConfig = {
  control_type: 'path' | 'wait' | 'loop' | 'filter' | 'delay'
  // Path: conditional branching
  paths?: Array<{
    id: string
    name: string
    condition: {
      field: string
      operator:
        | 'equals'
        | 'not_equals'
        | 'contains'
        | 'greater_than'
        | 'less_than'
        | 'is_empty'
        | 'is_not_empty'
      value: unknown
    }
    steps: string[] // Step IDs in this path
  }>
  // Wait: pause until condition
  wait_condition?: {
    type: 'duration' | 'condition' | 'webhook'
    duration_seconds?: number
    condition_expression?: string
  }
  // Loop: iterate over array
  loop_source?: string // Reference to array output from previous step
  loop_variable_name?: string
  max_iterations?: number // Default: 100
  // Delay
  delay_seconds?: number
}

// 3. AI step
type AIStepConfig = {
  ai_action: 'summarize' | 'extract' | 'generate' | 'classify' | 'translate' | 'custom'
  model?: string // e.g., "gpt-4o", "claude-3.5-sonnet"
  prompt_template: string // Template with {{variable}} references
  input_data?: string // Reference to previous step output
  output_format?: 'text' | 'json' | 'markdown' | 'table'
  temperature?: number // 0-2, default 0.7
  max_tokens?: number // Default: 1000
  system_prompt?: string
}

// 4. Web scraping step
type WebScrapingStepConfig = {
  scrape_type: 'url' | 'search' | 'profile'
  url?: string // For "url" type
  search_query?: string // For "search" type
  profile_url?: string // For "profile" type (LinkedIn, etc.)
  selectors?: {
    title?: string // CSS selector
    content?: string
    links?: string
    images?: string
    custom?: Record<string, string>
  }
  output_format: 'text' | 'html' | 'markdown' | 'json'
  wait_for_selector?: string // Wait for element before scraping
  take_screenshot?: boolean
}

// 5. Human in the loop step
type HumanInTheLoopStepConfig = {
  action_type: 'approval' | 'input' | 'review' | 'decision'
  assignee_type: 'specific_user' | 'team_role' | 'anyone'
  assignee_id?: string // User ID or role name
  prompt: string // What to show the human
  options?: Array<{
    label: string
    value: string
    color?: string // Button color
  }>
  timeout_hours?: number // Auto-escalate after timeout
  escalation_user_id?: string
  include_context: boolean // Show previous step outputs
}

// 6. Utilities step
type UtilitiesStepConfig = {
  utility_type: 'format' | 'convert' | 'transform' | 'merge' | 'split' | 'math' | 'date'
  // Format
  format_template?: string // Template string with {{var}} references
  // Convert
  convert_from?: 'json' | 'csv' | 'xml' | 'yaml' | 'markdown' | 'html'
  convert_to?: 'json' | 'csv' | 'xml' | 'yaml' | 'markdown' | 'html'
  // Transform
  transform_expression?: string // JSONPath or expression
  // Merge
  merge_sources?: string[] // References to multiple outputs
  // Math
  math_expression?: string
  // Date
  date_operation?: 'format' | 'add' | 'subtract' | 'diff' | 'now'
  date_format?: string
  date_value?: string
  input_data?: string // Reference to previous step output
}

// 7. HTTP requests step
type HTTPRequestStepConfig = {
  request_type: 'custom' | 'webhook_wait'
  // Custom request
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'
  url?: string
  headers?: Record<string, string>
  body?: string // Template with {{var}} references
  body_type?: 'json' | 'form' | 'raw' | 'xml'
  auth_type?: 'none' | 'bearer' | 'basic' | 'api_key'
  auth_value?: string
  timeout_seconds?: number // Default: 30
  retry_count?: number // Default: 0
  // Webhook wait
  webhook_url?: string // Auto-generated
  webhook_timeout_hours?: number
  expected_schema?: Record<string, unknown> // JSON Schema for validation
}

// 8. Sequences step
type SequencesStepConfig = {
  sequence_id?: string // Reference to a saved sequence
  sequence_name?: string
  inputs?: Record<string, string> // Mapping of sequence inputs to current context
  inline_steps?: Array<{
    type: string
    name: string
    config: Record<string, unknown>
  }>
}

// Union type
type StepConfig =
  | { type: 'app'; config: AppsStepConfig }
  | { type: 'flow_control'; config: FlowControlStepConfig }
  | { type: 'ai'; config: AIStepConfig }
  | { type: 'web_scraping'; config: WebScrapingStepConfig }
  | { type: 'human_in_loop'; config: HumanInTheLoopStepConfig }
  | { type: 'utility'; config: UtilitiesStepConfig }
  | { type: 'http'; config: HTTPRequestStepConfig }
  | { type: 'sequence'; config: SequencesStepConfig }
```

### Canvas Rendering Rules

1. The canvas is a vertically scrollable container centered in the editor.
2. The trigger block is always the first element.
3. Steps are ordered by their `position` field (0-indexed).
4. Connector lines are vertical, centered horizontally between elements.
5. Each connector line has a fixed height (e.g., 32px) and a width of 2px.
6. The connector line color follows `border-muted` or a subtle gray.
7. Step cards have a fixed width (e.g., 400px max) and are centered in the canvas.
8. Step numbering starts at 1 and increments sequentially (not based on position value).
9. The "Add step" button is always the last element, below all steps and connectors.
10. When the canvas overflows vertically, it scrolls independently of the top bar and tab bar.

### Panel Behavior

1. **AI Assistant (left)**: 320px fixed width when open. 0px when collapsed. Transition animated (200-300ms ease).
2. **Step canvas (center)**: `flex-1`, fills all remaining horizontal space. Always visible.
3. **Step config (right)**: 400px fixed width when a step is selected. 0px when no step is selected. Transition animated.
4. **Responsive**: Below 1024px viewport, AI Assistant auto-collapses. Step config overlays as a sheet/drawer.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: User can open the workflow editor page and see the 3-panel layout, top bar, and step canvas within 1 second of navigation.
- **SC-002**: User can add a trigger and 5 steps to a workflow within 60 seconds using the selectors.
- **SC-003**: All 9 trigger types are selectable and initialize with correct default configs.
- **SC-004**: All 8 step categories are selectable and initialize with correct default configs.
- **SC-005**: The AI Assistant panel collapses and expands without layout shifts or visual glitches.
- **SC-006**: Step selection and config panel opening/closing is instantaneous (under 100ms perceived latency).
- **SC-007**: The editor handles 50+ steps without scroll performance degradation.
- **SC-008**: `bun run build` passes with zero errors after all tasks are complete.
- **SC-009**: `bun run lint` passes with zero warnings after all tasks are complete.
