# Implementation Plan: Workflow Editor

**Branch**: `004-workflow-editor` | **Date**: 2026-02-07 | **Spec**: `specs/004-workflow-editor/spec.md`
**Input**: Feature specification from `specs/004-workflow-editor/spec.md`, Phase 4 of `docs/DEVELOPMENT_SPEC.md`

## Summary

Implement the workflow editor -- the most complex feature in Relay. This is a client-heavy, interactive 3-panel editor page at `/workflows/[id]/edit` with a Zustand store managing all editor state. The center panel is a vertical step canvas (NOT React Flow), the left panel is a collapsible AI Assistant, and the right panel is a step config panel. Users add triggers (9 types) and steps (8 categories) via searchable selector dialogs built on cmdk. All trigger and step configs are typed JSONB structures.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19.2.3, Zustand (client state), shadcn/ui (dialog, popover, tabs, input, textarea, button, command, scroll-area, dropdown-menu, separator, tooltip, sheet), cmdk (via shadcn command component), Lucide React (icons), Zod (runtime validation), uuid or crypto.randomUUID (step IDs)
**Storage**: Supabase (workflows, workflow_triggers, workflow_steps tables) -- but this phase focuses on client-side store; persistence will be added in a later phase or as final polish
**Testing**: Unit tests (Vitest + Testing Library) for store, defaults, and components; e2e tests (Playwright) for editor flows. Plus `bun run build` and `bun run lint`. Testing infrastructure established in 001-foundation Phase 6.
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Next.js App Router web application
**Performance Goals**: Editor page loads in under 1 second, step operations under 100ms, smooth scroll with 50+ steps
**Constraints**: Must work at viewport widths down to 1024px (below that, panels collapse/overlay)
**Scale/Scope**: Single editor page with 7+ sub-components, 1 Zustand store, 9 trigger types, 8 step types

## Constitution Check

*GATE: Must pass before implementation. Re-check after design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. App Router First | PASS | Editor page at `src/app/(dashboard)/workflows/[id]/edit/page.tsx`. This page MUST be `"use client"` due to Zustand, event handlers, and interactive UI. |
| II. shadcn/ui Component System | PASS | All UI composed from shadcn primitives: Dialog, Command, Tabs, Input, Textarea, Button, DropdownMenu, ScrollArea, Sheet, Separator, Tooltip. Custom components compose these. |
| III. Tailwind v4 + OKLCH | PASS | All styling via Tailwind utilities. Colors reference CSS variable theme tokens. No raw hex/rgb. |
| IV. TypeScript Strict | PASS | Full type definitions for store state, trigger configs, step configs, component props. Zod schemas for config validation. No `any` types. |
| V. YAGNI | PASS | No AI backend integration (assistant is UI shell only). No workflow persistence to Supabase in this phase (store-only). No undo/redo. No real-time collaboration. |
| VI. Supabase as Backend | PASS | Database schema already defined in Phase 1. This phase is client-side store only; Supabase read/write will be layered on after the UI is complete. |

**Violation justification**: The editor page requires `"use client"` which is an acknowledged exception per Constitution Principle I -- client directives are permitted when client-side interactivity is required.

## Zustand Store TypeScript Interface

```typescript
// src/stores/workflow-editor-store.ts

import { create } from "zustand";

// ─── Trigger Types ───────────────────────────────────────────────

type TriggerType = "app" | "manual" | "scheduled" | "form" | "rss" | "mailhook" | "webhook" | "table" | "mcp";

interface AppsTriggerConfig {
  app_id: string;
  event: string;
  filters: Record<string, string>;
}

interface ManualTriggerConfig {
  run_inputs: Array<{
    id: string;
    name: string;
    type: "text" | "number" | "boolean" | "select" | "date";
    required: boolean;
    default_value?: string;
    options?: string[];
    description?: string;
  }>;
}

interface ScheduledTriggerConfig {
  schedule_type: "cron" | "interval";
  cron_expression?: string;
  interval_value?: number;
  interval_unit?: "minutes" | "hours" | "days" | "weeks";
  timezone: string;
  starts_at?: string;
  ends_at?: string;
}

interface FormTriggerConfig {
  fields: Array<{
    id: string;
    label: string;
    type: "text" | "textarea" | "number" | "email" | "select" | "checkbox" | "date" | "file";
    required: boolean;
    placeholder?: string;
    options?: string[];
    validation?: {
      min_length?: number;
      max_length?: number;
      pattern?: string;
    };
  }>;
  submit_button_text: string;
  success_message: string;
}

interface RSSTriggerConfig {
  feed_url: string;
  check_interval_minutes: number;
  max_items_per_check: number;
  filters?: {
    title_contains?: string;
    title_not_contains?: string;
    category?: string;
  };
}

interface MailhookTriggerConfig {
  address: string;
  allowed_senders?: string[];
  subject_filter?: string;
  save_attachments: boolean;
}

interface WebhookTriggerConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH";
  secret?: string;
  headers_required?: Record<string, string>;
  response_status: number;
  response_body?: string;
}

interface TableTriggerConfig {
  table_id: string;
  event: "row_created" | "row_updated" | "row_deleted" | "field_changed";
  watched_fields?: string[];
  filters?: Record<string, unknown>;
}

interface MCPServerTriggerConfig {
  server_name: string;
  description: string;
  tools: Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>;
}

type TriggerConfigMap = {
  app: AppsTriggerConfig;
  manual: ManualTriggerConfig;
  scheduled: ScheduledTriggerConfig;
  form: FormTriggerConfig;
  rss: RSSTriggerConfig;
  mailhook: MailhookTriggerConfig;
  webhook: WebhookTriggerConfig;
  table: TableTriggerConfig;
  mcp: MCPServerTriggerConfig;
};

interface WorkflowTrigger<T extends TriggerType = TriggerType> {
  type: T;
  config: TriggerConfigMap[T];
}

// ─── Step Types ──────────────────────────────────────────────────

type StepType = "app" | "flow_control" | "ai" | "web_scraping" | "human_in_loop" | "utility" | "http" | "sequence";

interface WorkflowStep {
  id: string;           // UUID
  type: StepType;
  name: string;
  position: number;     // 0-indexed ordering
  config: Record<string, unknown>; // Type-specific config (see spec.md for full shapes)
}

// ─── Store ───────────────────────────────────────────────────────

interface WorkflowEditorState {
  // Workflow metadata
  workflowId: string;
  workflowName: string;
  workflowEmoji: string;
  isStarred: boolean;

  // Trigger
  trigger: WorkflowTrigger | null;

  // Steps
  steps: WorkflowStep[];

  // UI state
  selectedStepId: string | null;
  isAssistantOpen: boolean;
}

interface WorkflowEditorActions {
  // Metadata
  setWorkflowName: (name: string) => void;
  setWorkflowEmoji: (emoji: string) => void;
  toggleStar: () => void;

  // Trigger
  setTrigger: (trigger: WorkflowTrigger | null) => void;

  // Steps
  addStep: (step: Omit<WorkflowStep, "position">) => void;
  updateStep: (id: string, updates: Partial<Omit<WorkflowStep, "id">>) => void;
  deleteStep: (id: string) => void;
  reorderSteps: (fromIndex: number, toIndex: number) => void;

  // UI
  selectStep: (id: string | null) => void;
  toggleAssistant: () => void;

  // Initialization
  initializeWorkflow: (data: Partial<WorkflowEditorState>) => void;
  resetStore: () => void;
}

type WorkflowEditorStore = WorkflowEditorState & WorkflowEditorActions;
```

## Component Tree

```
EditorPage (page.tsx, "use client")
├── TopBar
│   ├── EmojiPicker (workflow emoji)
│   ├── Input (editable workflow name)
│   ├── Button (star toggle)
│   ├── DropdownMenu (rename, change emoji, duplicate)
│   ├── Button (notifications bell)
│   ├── Button (add person)
│   ├── Button ("Sharing")
│   └── Button (more ...)
├── Tabs (shadcn Tabs)
│   ├── TabsList
│   │   ├── TabsTrigger "Editor"
│   │   └── TabsTrigger "Runs"
│   ├── TabsContent "editor"
│   │   └── EditorLayout (3-panel flex container)
│   │       ├── AIAssistantPanel (left, 320px, collapsible)
│   │       │   ├── PanelHeader (logo + title + collapse button)
│   │       │   ├── WelcomeSection (diamond icon + heading)
│   │       │   ├── UseCaseCards (4 cards grid)
│   │       │   │   ├── UseCaseCard ("Meeting briefings")
│   │       │   │   ├── UseCaseCard ("Competitor analysis")
│   │       │   │   ├── UseCaseCard ("Email assistant")
│   │       │   │   └── UseCaseCard ("YouTube summarizer")
│   │       │   └── InputArea (Textarea + send Button)
│   │       ├── StepCanvas (center, flex-1, scrollable)
│   │       │   ├── TriggerBlock
│   │       │   │   ├── (empty) → "Add trigger" Button → opens TriggerSelector
│   │       │   │   └── (set) → TriggerIcon + TriggerName + ConfigSummary
│   │       │   ├── ConnectorLine
│   │       │   ├── StepCard (repeated for each step)
│   │       │   │   ├── StepNumber
│   │       │   │   ├── StepIcon
│   │       │   │   └── StepName
│   │       │   ├── ConnectorLine (between each step)
│   │       │   └── AddStepButton → opens StepSelector
│   │       └── StepConfigPanel (right, 400px, conditional)
│   │           ├── ConfigHeader (icon + name input + run-as + delete + settings)
│   │           ├── ConfigDescription
│   │           ├── ConfigForm (varies by step type)
│   │           ├── OutputReference (badge)
│   │           └── DoneButton
│   └── TabsContent "runs"
│       └── RunsTab (placeholder / to be implemented in Phase 3 feature)
├── TriggerSelector (Dialog with Command)
│   ├── CommandInput (search)
│   └── CommandList
│       └── CommandItem (x9 trigger types)
└── StepSelector (Dialog with Command)
    ├── CommandInput (search)
    ├── CommandGroup "Steps"
    │   └── CommandItem (x8 step categories)
    └── CommandGroup "CONNECTED APPS"
        └── CommandItem (Email, LinkedIn, X, YouTube)
```

## Trigger Config Default Values

When a trigger type is selected, initialize with these defaults:

| Type | Default Config |
|------|---------------|
| app | `{ app_id: "", event: "", filters: {} }` |
| manual | `{ run_inputs: [] }` |
| scheduled | `{ schedule_type: "interval", interval_value: 1, interval_unit: "hours", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }` |
| form | `{ fields: [], submit_button_text: "Submit", success_message: "Form submitted successfully" }` |
| rss | `{ feed_url: "", check_interval_minutes: 15, max_items_per_check: 10 }` |
| mailhook | `{ address: "", save_attachments: true }` |
| webhook | `{ url: "", method: "POST", response_status: 200 }` |
| table | `{ table_id: "", event: "row_created" }` |
| mcp | `{ server_name: "", description: "", tools: [] }` |

## Step Config Default Values

When a step category is selected, initialize with these defaults:

| Type | Default Config |
|------|---------------|
| app | `{ app_id: "", action: "", inputs: {} }` |
| flow_control | `{ control_type: "path" }` |
| ai | `{ ai_action: "summarize", prompt_template: "", output_format: "text", temperature: 0.7, max_tokens: 1000 }` |
| web_scraping | `{ scrape_type: "url", url: "", output_format: "text" }` |
| human_in_loop | `{ action_type: "approval", assignee_type: "anyone", prompt: "", include_context: true }` |
| utility | `{ utility_type: "format" }` |
| http | `{ request_type: "custom", method: "GET", url: "", timeout_seconds: 30, retry_count: 0 }` |
| sequence | `{ inline_steps: [] }` |

## Source Code Structure

```text
src/
├── app/
│   └── (dashboard)/
│       └── workflows/
│           └── [id]/
│               └── edit/
│                   └── page.tsx              # Editor page ("use client")
├── components/
│   └── workflow-editor/
│       ├── top-bar.tsx                       # Top bar with name, star, actions
│       ├── editor-layout.tsx                 # 3-panel flex layout container
│       ├── ai-assistant-panel.tsx            # Left panel (collapsible)
│       ├── step-canvas.tsx                   # Center panel (vertical step list)
│       ├── trigger-block.tsx                 # Trigger card at top of canvas
│       ├── step-card.tsx                     # Individual step card
│       ├── connector-line.tsx                # Vertical connector between elements
│       ├── add-step-button.tsx               # "Add step" button at bottom
│       ├── step-config-panel.tsx             # Right panel (step configuration)
│       ├── trigger-selector.tsx              # Trigger type selection dialog
│       ├── step-selector.tsx                 # Step category selection dialog
│       └── use-case-card.tsx                 # AI assistant use case card
├── stores/
│   └── workflow-editor-store.ts             # Zustand store
└── lib/
    └── workflow-editor/
        ├── trigger-defaults.ts              # Default configs for each trigger type
        ├── step-defaults.ts                 # Default configs for each step type
        ├── trigger-metadata.ts              # Icons, names, descriptions for 9 trigger types
        └── step-metadata.ts                 # Icons, names, descriptions for 8 step types + connected apps
```

## Complexity Tracking

No constitution violations requiring justification. The `"use client"` directive on the editor page is an acknowledged exception explicitly permitted by Constitution Principle I.
