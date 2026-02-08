# Tasks: Workflow Editor

**Input**: Design documents from `specs/004-workflow-editor/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)
**Dependencies**: 001-foundation (database schema, Supabase clients, types), 002-navigation-layout (dashboard layout, sidebar)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install missing dependencies and ensure prerequisite shadcn components are available.

- [ ] T001 Verify Zustand is installed (`bun add zustand` if not already in package.json from 001-foundation). Verify cmdk is available via shadcn command component. Verify shadcn components are installed: dialog, command, tabs, input, textarea, button, dropdown-menu, scroll-area, separator, tooltip, sheet, popover. Run `bunx shadcn@latest add <component>` for any missing.

- [ ] T002 [P] Create directory structure for workflow editor components: `src/components/workflow-editor/`, `src/stores/`, `src/lib/workflow-editor/`.

**Checkpoint**: All dependencies installed, directory structure created.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Zustand store and metadata/defaults that ALL user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Create trigger metadata file at `src/lib/workflow-editor/trigger-metadata.ts`. Export a `TRIGGER_TYPES` array of objects, each with: `type` (TriggerType), `name` (display name), `description` (one-line), `icon` (Lucide icon name), `hasSubMenu` (boolean, true for "app" and "table"). All 9 trigger types: app, manual, scheduled, form, rss, mailhook, webhook, table, mcp.

- [ ] T004 [P] Create step metadata file at `src/lib/workflow-editor/step-metadata.ts`. Export a `STEP_TYPES` array of objects, each with: `type` (StepType), `name` (display name), `description` (one-line), `icon` (Lucide icon name). All 8 step types: app, flow_control, ai, web_scraping, human_in_loop, utility, http, sequence. Also export a `CONNECTED_APPS` array with: `id`, `name`, `icon` for Email, LinkedIn, X (Twitter), YouTube.

- [ ] T005 [P] Create trigger defaults file at `src/lib/workflow-editor/trigger-defaults.ts`. Export a `getTriggerDefaultConfig(type: TriggerType)` function that returns the correct default config object for each of the 9 trigger types (see plan.md "Trigger Config Default Values" table). Also export TypeScript interfaces for all 9 trigger config shapes.

- [ ] T006 [P] Create step defaults file at `src/lib/workflow-editor/step-defaults.ts`. Export a `getStepDefaultConfig(type: StepType)` function that returns the correct default config object for each of the 8 step types (see plan.md "Step Config Default Values" table). Also export TypeScript interfaces for all 8 step config shapes.

- [ ] T007 Create Zustand store at `src/stores/workflow-editor-store.ts`. Implement the full `WorkflowEditorStore` interface from plan.md:
  - **State**: `workflowId`, `workflowName` (default "Untitled workflow"), `workflowEmoji` (default ""), `isStarred` (default false), `trigger` (default null), `steps` (default []), `selectedStepId` (default null), `isAssistantOpen` (default true).
  - **Actions**:
    - `setWorkflowName(name)`: updates workflowName
    - `setWorkflowEmoji(emoji)`: updates workflowEmoji
    - `toggleStar()`: flips isStarred
    - `setTrigger(trigger | null)`: sets or clears trigger
    - `addStep(step)`: appends step to steps[] with position = steps.length
    - `updateStep(id, updates)`: merges partial updates into matching step
    - `deleteStep(id)`: removes step, recomputes positions for remaining steps
    - `reorderSteps(fromIndex, toIndex)`: moves step, recomputes all positions
    - `selectStep(id | null)`: sets selectedStepId
    - `toggleAssistant()`: flips isAssistantOpen
    - `initializeWorkflow(data)`: bulk-sets state from loaded workflow data
    - `resetStore()`: resets all state to defaults
  - Import types from trigger-defaults.ts and step-defaults.ts.
  - Use `create` from zustand. Store must be typed with `WorkflowEditorState & WorkflowEditorActions`.

**Checkpoint**: Store, metadata, and defaults are ready. All user story implementation can begin.

---

## Phase 3: User Story 1 - Editor Core (Priority: P1)

**Goal**: Full editor page shell with top bar, tabs, 3-panel layout, and step canvas with trigger block, step cards, connector lines.

**Independent Test**: Navigate to `/workflows/test-id/edit`, see top bar with editable name and star, Editor/Runs tabs, empty canvas with trigger block and "Add step" button. Programmatically add steps via store and verify canvas renders them with numbers and connector lines.

### Implementation for User Story 1

- [ ] T008 Create the connector line component at `src/components/workflow-editor/connector-line.tsx`. A simple presentational component: renders a centered vertical line (2px wide, 32px tall, `bg-border` color). No props needed (purely visual). No `"use client"` needed if purely CSS -- but if using cn() only, still server-compatible. Keep it simple.

- [ ] T009 [P] Create the trigger block component at `src/components/workflow-editor/trigger-block.tsx`. `"use client"` component. Props: `trigger: WorkflowTrigger | null`, `onAddTrigger: () => void`, `onClickTrigger: () => void`. Renders a card (shadcn Card) with:
  - Header: "Trigger" label
  - Body (when trigger is null): "Add trigger" button (dashed border style, centered)
  - Body (when trigger is set): trigger type icon (from trigger-metadata) + trigger type name + brief config summary text
  - Clicking the card when trigger is set calls `onClickTrigger`
  - Clicking "Add trigger" calls `onAddTrigger`
  - Card width: max-w-[400px], centered in parent via mx-auto

- [ ] T010 [P] Create the step card component at `src/components/workflow-editor/step-card.tsx`. `"use client"` component. Props: `step: WorkflowStep`, `stepNumber: number`, `isSelected: boolean`, `onClick: () => void`. Renders a card with:
  - Left: step number badge (circular, numbered)
  - Center: step type icon (from step-metadata) + step name text
  - Card has hover state and selected state (ring/border highlight when isSelected)
  - Clicking calls onClick
  - Card width: max-w-[400px], centered in parent via mx-auto

- [ ] T011 [P] Create the "Add step" button component at `src/components/workflow-editor/add-step-button.tsx`. `"use client"` component. Props: `onClick: () => void`. Renders a button with a "+" icon and "Add step" text, styled with dashed border, centered (max-w-[400px], mx-auto). Clicking calls onClick.

- [ ] T012 Create the step canvas component at `src/components/workflow-editor/step-canvas.tsx`. `"use client"` component. Reads from Zustand store: `trigger`, `steps`, `selectedStepId`. Renders vertically in a ScrollArea:
  1. TriggerBlock (passes trigger, onAddTrigger opens trigger selector, onClickTrigger opens trigger config)
  2. If trigger is set OR steps exist: ConnectorLine
  3. For each step in steps (sorted by position):
     a. StepCard (passes step, stepNumber = index + 1, isSelected, onClick calls selectStep)
     b. ConnectorLine (after each step)
  4. AddStepButton (onClick opens step selector)
  - The canvas is vertically scrollable (overflow-y-auto) and takes full height of its container.
  - Items are centered horizontally (flex flex-col items-center).
  - Manage state for triggerSelectorOpen and stepSelectorOpen (local useState).

- [ ] T013 Create the top bar component at `src/components/workflow-editor/top-bar.tsx`. `"use client"` component. Reads/writes from Zustand store: workflowName, workflowEmoji, isStarred. Renders a horizontal bar (flex, items-center, gap, px-4, h-14, border-b):
  - Left group: Emoji button (shows workflowEmoji or a default icon) + editable Input (value = workflowName, onChange calls setWorkflowName) + Star toggle Button (icon: Star filled/outline based on isStarred, onClick calls toggleStar) + DropdownMenu (trigger: ChevronDown icon, items: "Rename", "Change emoji", "Duplicate")
  - Right group: Bell icon Button + UserPlus icon Button + "Sharing" Button (variant outline) + MoreHorizontal icon Button
  - The dropdown menu items are non-functional stubs at this stage (just labels, no handlers).

- [ ] T014 Create the editor layout component at `src/components/workflow-editor/editor-layout.tsx`. `"use client"` component. Reads from Zustand store: `isAssistantOpen`, `selectedStepId`. Renders a flex row container (flex-1, overflow-hidden):
  - Left: AI Assistant slot -- renders `children[0]` or an "Open Assistant" button if `isAssistantOpen` is false. Width: 320px when open, transitions via CSS (transition-all duration-300). When collapsed, width = 0, overflow hidden.
  - Center: Step canvas slot -- renders `children[1]`. flex-1.
  - Right: Step config slot -- renders `children[2]` only when `selectedStepId` is not null. Width: 400px. Transitions via CSS.
  - Props: `assistantPanel: ReactNode`, `canvas: ReactNode`, `configPanel: ReactNode`.
  - Alternatively, instead of children slots, use named props for each panel.

- [ ] T015 Create the editor page at `src/app/(dashboard)/workflows/[id]/edit/page.tsx`. `"use client"` component.
  - Read `id` from route params (via `useParams` or page props).
  - On mount, call `initializeWorkflow({ workflowId: id })` to set the workflow ID in the store.
  - Render:
    1. TopBar
    2. Tabs (shadcn Tabs, defaultValue="editor")
       - TabsList: TabsTrigger "Editor", TabsTrigger "Runs"
       - TabsContent "editor": EditorLayout with:
         - assistantPanel: placeholder `<div>Assistant placeholder</div>` (replaced in US3)
         - canvas: StepCanvas
         - configPanel: placeholder `<div>Config placeholder</div>` (replaced in US3)
       - TabsContent "runs": placeholder `<div className="p-8 text-muted-foreground">Runs tab coming soon</div>`
  - The page fills available height (flex flex-col, h-full or min-h-0 flex-1).
  - Import and use the workflow editor store.

- [ ] T016 Verify US1 integration: Run `bun dev`, navigate to `/workflows/test-id/edit`. Confirm:
  - Top bar renders with "Untitled workflow" name, unfilled star, dropdown menu
  - Editor tab is selected by default, Runs tab is clickable
  - Step canvas shows trigger block with "Add trigger" button
  - "Add step" button is at the bottom
  - AI Assistant placeholder is on the left
  - Config placeholder is hidden (no step selected)
  - Editing the name updates the store (check via React DevTools or console)
  - Toggling star changes the icon
  - Run `bun run build` and `bun run lint` -- fix any errors

**Checkpoint**: Editor page shell is fully functional. Canvas renders trigger block, steps, and connectors. Store drives all state.

---

## Phase 4: User Story 2 - Selectors (Priority: P2)

**Goal**: Trigger selector dialog (9 types, searchable) and step selector dialog (8 categories + connected apps, searchable). Selecting a type adds it to the store and updates the canvas.

**Independent Test**: Click "Add trigger", see dialog with search and 9 types. Search filters correctly. Select "Manual", trigger block updates. Click "Add step", see dialog with 8 categories and connected apps. Select "AI", new step appears in canvas.

### Implementation for User Story 2

- [ ] T017 Create the trigger selector component at `src/components/workflow-editor/trigger-selector.tsx`. `"use client"` component. Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `onSelect: (type: TriggerType) => void`. Renders a shadcn Dialog containing a Command (cmdk) component:
  - CommandInput: placeholder "Search triggers..."
  - CommandList > CommandEmpty: "No triggers found."
  - CommandGroup: map over TRIGGER_TYPES from trigger-metadata.ts. Each CommandItem renders:
    - Icon (from metadata, use Lucide component)
    - Name (bold)
    - Description (text-muted-foreground, text-sm)
    - ChevronRight icon if `hasSubMenu` is true
  - On CommandItem select: call `onSelect(type)`, close dialog
  - For "app" and "table" types with sub-menus: at this stage, just select the type directly (sub-menu navigation is a stretch goal). The chevron is visual only.

- [ ] T018 [P] Create the step selector component at `src/components/workflow-editor/step-selector.tsx`. `"use client"` component. Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `onSelect: (type: StepType) => void`. Renders a shadcn Dialog containing a Command (cmdk) component:
  - CommandInput: placeholder "Search steps..."
  - CommandList > CommandEmpty: "No steps found."
  - CommandGroup label="Steps": map over STEP_TYPES from step-metadata.ts. Each CommandItem renders:
    - Icon (from metadata)
    - Name (bold)
    - Description (text-muted-foreground, text-sm)
  - CommandSeparator
  - CommandGroup label="CONNECTED APPS": map over CONNECTED_APPS from step-metadata.ts. Each CommandItem renders:
    - Icon
    - Name
  - On CommandItem select: call `onSelect(type)`, close dialog. For connected apps, treat them as "app" type steps with the app pre-selected in config.

- [ ] T019 Wire trigger selector into step canvas. Update `src/components/workflow-editor/step-canvas.tsx`:
  - Add local state: `triggerSelectorOpen` (boolean, default false)
  - TriggerBlock's `onAddTrigger` sets `triggerSelectorOpen = true`
  - Render TriggerSelector dialog with `open={triggerSelectorOpen}`, `onOpenChange={setTriggerSelectorOpen}`
  - TriggerSelector's `onSelect` handler:
    1. Import `getTriggerDefaultConfig` from trigger-defaults.ts
    2. Call store's `setTrigger({ type, config: getTriggerDefaultConfig(type) })`
    3. Close dialog
  - TriggerBlock's `onClickTrigger` also opens the trigger selector (to allow changing trigger type)

- [ ] T020 Wire step selector into step canvas. Update `src/components/workflow-editor/step-canvas.tsx`:
  - Add local state: `stepSelectorOpen` (boolean, default false)
  - AddStepButton's `onClick` sets `stepSelectorOpen = true`
  - Render StepSelector dialog with `open={stepSelectorOpen}`, `onOpenChange={setStepSelectorOpen}`
  - StepSelector's `onSelect` handler:
    1. Import `getStepDefaultConfig` from step-defaults.ts
    2. Import step metadata to get the display name for the type
    3. Generate a UUID for the step ID (use `crypto.randomUUID()`)
    4. Call store's `addStep({ id, type, name: stepMetadata.name, config: getStepDefaultConfig(type) })`
    5. Close dialog

- [ ] T021 Update trigger block to show config summary. Update `src/components/workflow-editor/trigger-block.tsx`:
  - When trigger is set, show a brief config summary below the trigger name. The summary varies by type:
    - manual: "Click to run" (or "N run inputs" if inputs defined)
    - scheduled: show interval or cron description (e.g., "Every 1 hour")
    - webhook: "POST" + truncated URL
    - form: "N fields"
    - rss: truncated feed URL
    - mailhook: truncated address
    - table: event type (e.g., "Row created")
    - mcp: server name
    - app: app name + event
  - Create a helper function `getTriggerSummary(trigger: WorkflowTrigger): string` in trigger-block.tsx or in `src/lib/workflow-editor/trigger-defaults.ts`.

- [ ] T022 Verify US2 integration: Run `bun dev`. Confirm:
  - Click "Add trigger" opens dialog with 9 trigger types
  - Search input filters trigger list correctly
  - Selecting "Manual" sets trigger, canvas updates to show "Manual" with icon
  - Selecting "Scheduled" shows "Every 1 hour" summary
  - Click trigger block re-opens selector to change type
  - Click "Add step" opens dialog with 8 categories + 4 connected apps
  - Search filters step list correctly
  - Selecting "AI" adds numbered step to canvas with connector line
  - Adding multiple steps shows correct numbering (1, 2, 3...) with connector lines between each
  - Run `bun run build` and `bun run lint` -- fix any errors

**Checkpoint**: Users can add triggers and steps to workflows via searchable selectors. Canvas fully renders the workflow.

---

## Phase 5: User Story 3 - Panels (Priority: P3)

**Goal**: AI Assistant panel (left, collapsible, welcome state, use case cards, input) and step config panel (right, editable step config, done/delete actions).

**Independent Test**: AI Assistant renders on left with welcome message and 4 cards. Collapse button hides it, "Open Assistant" restores it. Click a step in canvas, config panel opens on right with step name, description, delete, done. Edit step name, verify canvas updates. Click done, panel closes. Delete step, verify it is removed from canvas.

### Implementation for User Story 3

- [ ] T023 Create the use case card component at `src/components/workflow-editor/use-case-card.tsx`. `"use client"` component (or server-compatible if no interactivity). Props: `emoji: string`, `title: string`, `description: string`, `onClick?: () => void`. Renders a card (border, rounded-lg, p-4, hover:bg-muted/50, cursor-pointer) with:
  - Emoji (text-2xl)
  - Title (font-medium, text-sm)
  - Description (text-xs, text-muted-foreground)

- [ ] T024 Create the AI Assistant panel at `src/components/workflow-editor/ai-assistant-panel.tsx`. `"use client"` component. Reads from store: `isAssistantOpen`. Calls store: `toggleAssistant`. Renders:
  - Header (flex, items-center, h-14, px-4, border-b):
    - Logo icon (a small diamond or relay-like icon using Lucide, e.g., Diamond or Sparkles)
    - "Relay.app Assistant" text (font-medium)
    - Collapse button (PanelLeftClose icon, onClick calls toggleAssistant)
  - Scrollable content area (flex-1, overflow-y-auto, p-4):
    - Welcome section: Diamond icon (large, centered), "What can I help you build?" heading (text-lg, font-semibold, text-center)
    - Use case cards grid (grid grid-cols-2 gap-3, mt-6):
      1. UseCaseCard: emoji "📋", title "Meeting briefings", description "Prepare for meetings with AI-generated context and summaries"
      2. UseCaseCard: emoji "🔍", title "Competitor analysis", description "Track competitor activity and get AI-powered insights"
      3. UseCaseCard: emoji "📧", title "Email assistant", description "Automatically draft, summarize, and categorize emails"
      4. UseCaseCard: emoji "🎥", title "YouTube summarizer", description "Get AI summaries of YouTube videos and channels"
  - Input area (border-t, p-4):
    - Textarea (placeholder "Describe a workflow or ask a question", rows=3)
    - Send button (icon: SendHorizontal, positioned at bottom-right of textarea area)
  - The input/send are non-functional stubs (no AI backend in this phase).

- [ ] T025 [P] Create the step config panel at `src/components/workflow-editor/step-config-panel.tsx`. `"use client"` component. Reads from store: `steps`, `selectedStepId`. Calls store: `updateStep`, `deleteStep`, `selectStep`. Derives `selectedStep` from `steps.find(s => s.id === selectedStepId)`. If `selectedStep` is null/undefined, render nothing. Otherwise renders (w-[400px], border-l, flex flex-col, h-full):
  - Header (flex, items-center, gap-2, h-14, px-4, border-b):
    - Step type icon (from step-metadata, based on selectedStep.type)
    - Editable Input (value = selectedStep.name, onChange calls updateStep(id, { name }))
    - Spacer (flex-1)
    - "Run as" avatar placeholder (small circular Avatar)
    - Delete button (Trash2 icon, variant ghost, size icon-sm, onClick calls deleteStep(id) then selectStep(null))
    - Settings button (Settings icon, variant ghost, size icon-sm, non-functional stub)
  - Scrollable content (flex-1, overflow-y-auto, p-4):
    - Description: a text paragraph describing what this step type does (use step-metadata description)
    - Separator
    - Config form section: At this stage, render a placeholder message per step type:
      - For "ai": show fields for prompt_template (Textarea), output_format (Select), temperature (Slider placeholder)
      - For "http": show fields for method (Select), url (Input), headers (placeholder)
      - For all other types: show "Configuration for [step type] coming soon" placeholder text
    - For manual trigger config (when the trigger is manual), show "Add run inputs" section (button to add input fields)
  - Footer (border-t, px-4, py-3, flex, items-center, justify-between):
    - "Output:" badge (a small Badge component showing the step name as a reference, e.g., "step_1.output")
    - "Done" button (variant default, onClick calls selectStep(null))

- [ ] T026 Wire AI Assistant panel into editor layout. Update `src/app/(dashboard)/workflows/[id]/edit/page.tsx`:
  - Replace the assistant placeholder with `<AIAssistantPanel />`
  - The EditorLayout component already handles show/hide based on `isAssistantOpen`
  - When `isAssistantOpen` is false, render a small "Open Assistant" button in the canvas area or at the left edge. This can be a fixed-position button or integrated into EditorLayout.

- [ ] T027 Wire step config panel into editor layout. Update `src/app/(dashboard)/workflows/[id]/edit/page.tsx`:
  - Replace the config placeholder with `<StepConfigPanel />`
  - The EditorLayout component already handles show/hide based on `selectedStepId`

- [ ] T028 Add "Open Assistant" collapsed state to editor layout. Update `src/components/workflow-editor/editor-layout.tsx`:
  - When `isAssistantOpen` is false, instead of the full assistant panel, render a small vertical strip or floating button on the left edge:
    - A button with Sparkles icon and tooltip "Open Assistant"
    - onClick calls `toggleAssistant()` from the store
  - This button should not take up significant horizontal space (e.g., w-10, centered vertically)

- [ ] T029 Add responsive behavior to editor layout. Update `src/components/workflow-editor/editor-layout.tsx`:
  - Use a `useEffect` + `window.matchMedia` or Tailwind responsive classes to auto-collapse the AI Assistant when viewport width is below 1024px.
  - When below 1024px and a step is selected, render the StepConfigPanel as a Sheet (shadcn Sheet) overlay instead of a side panel.
  - This ensures the editor is usable on smaller screens without horizontal overflow.

- [ ] T030 Verify US3 integration: Run `bun dev`. Confirm:
  - AI Assistant panel renders on left with welcome message, 4 use case cards, and textarea
  - Clicking collapse button hides assistant, "Open Assistant" button appears
  - Clicking "Open Assistant" restores the assistant panel
  - Adding a step (via US2 selector) then clicking the step card in canvas opens the config panel on the right
  - Config panel shows step icon, editable name, delete, settings, description, placeholder config, output badge, and Done button
  - Editing step name in config panel updates the step card name in the canvas
  - Clicking "Done" closes the config panel
  - Clicking delete removes the step, closes the panel, remaining steps renumber
  - Run `bun run build` and `bun run lint` -- fix any errors

**Checkpoint**: All three panels are functional. The editor is feature-complete for client-side interactions.

---

## Phase 6: Polish and Cross-Cutting Concerns

**Purpose**: Visual polish, edge case handling, and build verification.

- [ ] T031 Add animations and transitions to panels. Update `src/components/workflow-editor/editor-layout.tsx`:
  - AI Assistant panel: `transition-[width] duration-300 ease-in-out`
  - Step config panel: `transition-[width] duration-200 ease-in-out`
  - Ensure no layout shift during transitions (use `overflow-hidden` on transitioning panels)

- [ ] T032 [P] Add hover and interaction states to all interactive elements:
  - TriggerBlock: hover:shadow-md transition
  - StepCard: hover:shadow-sm, selected:ring-2 ring-primary
  - AddStepButton: hover:border-primary hover:text-primary transition
  - UseCaseCard: hover:bg-muted/50 transition
  - ConnectorLine: subtle pulse animation on hover (optional, skip if YAGNI)

- [ ] T033 [P] Handle empty state edge case. In `src/components/workflow-editor/step-canvas.tsx`:
  - When trigger is null AND steps is empty: show only TriggerBlock (with "Add trigger") and AddStepButton, with NO connector line between them
  - When trigger is set but steps is empty: show TriggerBlock + ConnectorLine + AddStepButton
  - When trigger is null but steps exist: show TriggerBlock (with "Add trigger") + ConnectorLine + steps + AddStepButton

- [ ] T034 [P] Handle step reorder. Add drag-to-reorder support for step cards in `src/components/workflow-editor/step-canvas.tsx`:
  - Use HTML5 drag-and-drop or a simple up/down button approach (YAGNI -- prefer simple buttons over full drag library)
  - Option A (simple): Add up/down arrow buttons on each step card (visible on hover). Up button calls `reorderSteps(index, index - 1)`, down button calls `reorderSteps(index, index + 1)`. Hide up on first step, hide down on last step.
  - Option B (drag): If drag is needed, use native HTML drag events with `draggable` attribute on step cards. On drop, call `reorderSteps(fromIndex, toIndex)`.
  - Choose Option A for YAGNI compliance.

- [ ] T035 [P] Add beforeunload warning for unsaved changes. In `src/app/(dashboard)/workflows/[id]/edit/page.tsx`:
  - Track an `isDirty` flag in the store (set to true when any action is dispatched after initialization, reset on save/load).
  - Alternatively, derive `isDirty` from a simple counter or by comparing current state to initial state.
  - Add a `useEffect` that registers a `beforeunload` event listener when `isDirty` is true.
  - Clean up the listener on unmount or when `isDirty` becomes false.

- [ ] T036 [P] Add keyboard shortcuts to the editor:
  - `Escape`: deselect current step (selectStep(null)), close config panel
  - `Backspace`/`Delete` when a step is selected (and not focused on an input): delete selected step
  - These should only fire when no input/textarea is focused (use `document.activeElement` check)

- [ ] T037 Add trigger replacement confirmation. Update `src/components/workflow-editor/step-canvas.tsx` or trigger-selector:
  - When the user clicks the trigger block and a trigger is already set, opening the trigger selector and selecting a new type should show a confirmation if the existing trigger has non-default config values.
  - Use a simple `window.confirm()` or a shadcn AlertDialog: "Changing the trigger type will reset the trigger configuration. Continue?"
  - If confirmed, replace the trigger. If cancelled, keep the existing trigger.

- [ ] T038 [P] Add validation warnings to trigger block and step cards:
  - TriggerBlock: if trigger is set but config is incomplete (e.g., scheduled with no cron/interval, webhook with empty URL), show a small warning icon (AlertTriangle, text-yellow-500) next to the trigger name.
  - StepCard: if step config is incomplete (e.g., AI with empty prompt, HTTP with empty URL), show a warning icon.
  - Create a helper function `isTriggerConfigComplete(trigger: WorkflowTrigger): boolean` in trigger-defaults.ts.
  - Create a helper function `isStepConfigComplete(step: WorkflowStep): boolean` in step-defaults.ts.

- [ ] T039 Final build and lint verification:
  - Run `bun run build` -- must pass with zero errors
  - Run `bun run lint` -- must pass with zero warnings
  - Fix any TypeScript, ESLint, or build errors
  - Verify all imports use `@/` path alias
  - Verify all components use `cn()` for dynamic classNames
  - Verify no raw hex/rgb colors (all via CSS variable tokens)
  - Verify `"use client"` is only on components that need it

---

## Phase 7: Testing

**Purpose**: Unit tests for Zustand store, metadata/defaults, and components. E2e tests for editor flows.

**Prerequisites**: 001-foundation Phase 6 (Vitest, Playwright, Prettier, Husky) must be complete.

### Unit Tests (Vitest + Testing Library)

- [ ] T040 [P] Write unit tests for Zustand store at `src/stores/__tests__/workflow-editor-store.test.ts`:
  - Test `setWorkflowName` updates name
  - Test `toggleStar` flips isStarred
  - Test `setTrigger` sets/clears trigger
  - Test `addStep` appends with correct position
  - Test `deleteStep` removes step and recomputes positions
  - Test `reorderSteps` moves step and recomputes positions
  - Test `selectStep` sets selectedStepId
  - Test `resetStore` returns to defaults
  - Test `initializeWorkflow` bulk-sets state

- [ ] T041 [P] Write unit tests for trigger defaults at `src/lib/workflow-editor/__tests__/trigger-defaults.test.ts`:
  - Test `getTriggerDefaultConfig` returns correct defaults for all 9 trigger types
  - Test each config has expected shape/keys

- [ ] T042 [P] Write unit tests for step defaults at `src/lib/workflow-editor/__tests__/step-defaults.test.ts`:
  - Test `getStepDefaultConfig` returns correct defaults for all 8 step types
  - Test each config has expected shape/keys

- [ ] T043 [P] Write unit tests for validation helpers at `src/lib/workflow-editor/__tests__/validation.test.ts`:
  - Test `isTriggerConfigComplete` for complete and incomplete triggers
  - Test `isStepConfigComplete` for complete and incomplete steps

- [ ] T044 [P] Write unit tests for TriggerBlock at `src/components/workflow-editor/__tests__/trigger-block.test.tsx`:
  - Render with null trigger, verify "Add trigger" button renders
  - Render with manual trigger, verify type name and summary display
  - Verify onClick callbacks fire correctly

- [ ] T045 [P] Write unit tests for StepCard at `src/components/workflow-editor/__tests__/step-card.test.tsx`:
  - Render with mock step data, verify number badge, icon, name render
  - Verify selected state applies ring/border highlight
  - Verify click calls onClick

- [ ] T046 [P] Write unit tests for StepCanvas at `src/components/workflow-editor/__tests__/step-canvas.test.tsx`:
  - Mock Zustand store, verify empty state (trigger null, no steps)
  - Verify trigger block + connector + steps + add-step render correctly
  - Verify connector lines appear between elements

### End-to-End Tests (Playwright)

- [ ] T047 Write e2e test at `e2e/workflow-editor.test.ts`:
  - Navigate to `/workflows/test-id/edit`, verify editor page loads
  - Verify top bar renders with "Untitled workflow" name
  - Click "Add trigger", verify selector dialog opens with 9 types
  - Select "Manual", verify trigger block updates
  - Click "Add step", verify selector dialog opens
  - Select "AI", verify step card appears with connector line
  - Add a second step, verify numbering (1, 2)
  - Click a step card, verify config panel opens on right
  - Edit step name in config panel, verify canvas updates
  - Click "Done", verify config panel closes
  - Click delete on step, verify removal and renumbering

- [ ] T048 Write e2e test at `e2e/workflow-editor-panels.test.ts`:
  - Verify AI Assistant panel renders on left with welcome message
  - Click collapse button, verify panel hides
  - Click "Open Assistant" button, verify panel reappears
  - Toggle star in top bar, verify icon changes

- [ ] T049 Run `bun run test` and `bun run test:e2e` -- fix any failures.

**Checkpoint**: All unit tests pass. All e2e tests pass. Store logic is fully tested.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 -- BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 (store, metadata, defaults)
- **US2 (Phase 4)**: Depends on Phase 3 (step canvas, trigger block, add-step button exist to wire selectors into)
- **US3 (Phase 5)**: Depends on Phase 3 (editor layout with panel slots). Can run in parallel with Phase 4 if placeholders are used for selectors.
- **Polish (Phase 6)**: Depends on Phases 3, 4, and 5
- **Testing (Phase 7)**: Depends on all previous phases being complete. Also depends on 001-foundation Phase 6 (tooling setup).

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 -- no dependencies on other stories
- **US2 (P2)**: Depends on US1 (needs canvas and trigger block to wire into)
- **US3 (P3)**: Depends on US1 (needs editor layout). Partially parallel with US2 (AI assistant has no dependency on selectors; step config panel benefits from having steps added via US2)

### Within Each User Story

- Presentational components (connector-line, trigger-block, step-card, add-step-button) can be built in parallel [P]
- Container components (step-canvas, editor-layout) depend on their child components
- The page (page.tsx) depends on all components for that phase
- Integration verification (T016, T022, T030) depends on all tasks in that phase

### Parallel Opportunities

- T003, T004, T005, T006 can all run in parallel (different files, no dependencies)
- T008, T009, T010, T011 can all run in parallel (independent presentational components)
- T017, T018 can run in parallel (trigger selector and step selector are independent)
- T023, T025 can run in parallel (use-case-card and step-config-panel are independent)
- T031, T032, T033, T034, T035, T036, T038 can mostly run in parallel (polish tasks on different files/concerns)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T007)
3. Complete Phase 3: User Story 1 (T008-T016)
4. **STOP and VALIDATE**: Editor page renders with top bar, tabs, canvas, connector lines
5. The editor is already usable for visual inspection even without selectors

### Incremental Delivery

1. Setup + Foundational --> Store and metadata ready
2. Add US1 --> Editor shell with canvas --> Test independently (T016)
3. Add US2 --> Selectors wired in --> Test independently (T022)
4. Add US3 --> All panels complete --> Test independently (T030)
5. Polish --> Edge cases, animations, keyboard shortcuts --> Final verification (T039)

### Task Count Summary

| Phase | Tasks | Parallelizable |
|-------|-------|---------------|
| Phase 1: Setup | 2 | 1 |
| Phase 2: Foundational | 5 | 3 |
| Phase 3: US1 | 9 | 4 |
| Phase 4: US2 | 6 | 1 |
| Phase 5: US3 | 8 | 1 |
| Phase 6: Polish | 9 | 6 |
| Phase 7: Testing | 10 | 5 |
| **Total** | **49** | **21** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- AI Assistant is UI-only in this phase -- no backend AI integration
- Supabase persistence (saving/loading workflows) is NOT in scope for this feature; it will be added as a separate task after the client-side editor is complete
- The "Runs" tab content is a placeholder -- it will be populated by a separate feature
- Sub-menus for "Apps" and "Table" trigger types are visual stubs -- full app browser is a separate feature
- Connected apps in step selector are stubs -- actual app integration is a separate feature
- Step config forms are placeholder/minimal -- detailed forms per step type can be iterated on after the editor shell is proven
