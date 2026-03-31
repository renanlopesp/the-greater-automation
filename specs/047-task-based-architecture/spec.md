# Feature Specification: Task-Based Architecture (Perplexity Computer Model)

**Feature Branch**: `feat/task-based-architecture`
**Created**: 2026-03-31
**Status**: Draft
**Reference**: Perplexity Computer (`perplexity.ai/computer`)
**Input**: Restructure the entire application around a task-based model where every conversation is a Task, skills are invoked by the orchestrator (never accessed directly), and deliverables render in the artifact panel.

---

## Overview

Fundamental architectural shift from the current model (standalone chat + standalone skill pages) to a **task-based model** inspired by Perplexity Computer:

- **Every interaction is a Task** — a conversation with a purpose and deliverables
- **Dashboard is the entry point** — the ask bar creates tasks, not chats
- **Skills have no standalone pages** — they're invoked by the orchestrator inside a task
- **Deliverables appear in the artifact panel** — the right side of the task view renders skill output dynamically
- **`+ New Task` returns to dashboard** — never opens a blank chat

---

## Current Architecture (what exists today)

```
/dashboard           → Home with ask bar (redirects to /chat?q=...)
/chat                → Standalone chat page (functional, has its own conversation)
/chat/[id]           → Specific conversation view
/skills              → Skill catalog (browse)
/skills/[slug]       → Skill page with its OWN workspace/chat (e.g., SeasonalCalendarWorkspace)
```

**Problems:**

1. `/chat` is a standalone page with a chat — should not exist
2. `/skills/seasonal-calendar` has its own full workspace, bypasses orchestrator entirely
3. Dashboard ask bar redirects to `/chat?q=...` — should create a task
4. No concept of "tasks" in the database
5. Skills have their own API routes called directly, not through the orchestrator
6. Artifact panel shows mock data, not real skill output

---

## Target Architecture

```
/dashboard           → Home with ask bar (CREATES a task, redirects to /chat/task/[id])
/chat                → REDIRECT to /dashboard (no standalone chat)
/chat/task/[id]      → Task view: chat (left) + deliverable (right)
/tarefas             → List of all tasks (history)
/skills              → Skill catalog (browse only, no chat/workspace)
/apps                → Integrations
```

### Flow

```
1. User lands on /dashboard
2. Types "Mostra o calendário sazonal" in the ask bar
3. System:
   a. POST /api/tasks → creates task { id, title: "Calendário sazonal", status: "active" }
   b. Creates conversation linked to task
   c. Redirects to /chat/task/[task-id]
4. On /chat/task/[task-id]:
   a. Orchestrator receives the message
   b. Identifies intent → calls SNEW_RUN_SKILL("seasonal-calendar")
   c. Skill generates PersonalizedCalendar data
   d. Orchestrator responds in chat (left): text summary
   e. Skill output saved to task.artifact_data
   f. Artifact panel (right) renders SeasonalCalendarArtifact with real data
5. User continues chatting → can drill into dates, generate campaigns, etc.
6. All within the same task
```

### Sidebar Navigation

```
[Logo Snew]
─────────────
Home            → /dashboard
+ New Task      → /dashboard (not /chat)
Tarefas         → /tarefas (replaces current nav)
Skills          → /skills (browse catalog)
Apps            → /apps
─────────────
[Skill shortcuts]
─────────────
[Credits]
[Settings]
```

---

## User Scenarios & Testing

### US1 — Create Task from Dashboard (P0)

User types a question in the dashboard ask bar. System creates a task, redirects to the task view, and processes the message.

**Acceptance:**

1. User types "Mostra calendário sazonal" → task created in DB → redirect to `/chat/task/[id]`
2. Task title auto-generated from first message
3. Chat shows orchestrator response on the left
4. If skill invoked, artifact panel shows skill output on the right

### US2 — Task View with Chat + Deliverable (P0)

User views `/chat/task/[id]` and sees 2-panel layout with conversation and deliverables.

**Acceptance:**

1. Left panel: full chat (OrchestratorChatWrapper) with message history
2. Right panel: artifact panel with skill output (or empty/welcome state if no skill invoked yet)
3. Chat is fully functional (streaming, follow-ups, tool calls)
4. Artifact updates when orchestrator invokes a skill

### US3 — New Task Button (P0)

`+ New Task` in sidebar always goes back to dashboard.

**Acceptance:**

1. Clicking `+ New Task` navigates to `/dashboard`
2. Does NOT open a blank chat page
3. Dashboard ask bar is focused/ready

### US4 — Tasks List (P1)

`/tarefas` shows all past tasks with title, status, skill used, and timestamp.

**Acceptance:**

1. Lists tasks ordered by most recent
2. Each task shows: title, active skill (if any), status, created date
3. Clicking a task navigates to `/chat/task/[id]`

### US5 — Skills Catalog (Browse Only) (P1)

`/skills` shows the skill library for browsing. No chat, no workspace.

**Acceptance:**

1. Shows all 30 skills in a grid/list with name, description, category
2. Clicking a skill shows detail info (description, what it does)
3. NO chat interface, NO workspace, NO "generate" buttons
4. CTA: "Ask Snew to use this skill" → redirects to dashboard with pre-filled prompt

### US6 — Skill Invocation via Orchestrator (P0)

When the orchestrator identifies a question requires a skill, it invokes it and the output appears in the artifact panel.

**Acceptance:**

1. Orchestrator calls `SNEW_RUN_SKILL` with the appropriate skill slug
2. Skill executes and returns structured data
3. Artifact panel renders the correct component for that skill
4. `skill_executions` record created with input/output

### US7 — Redirect /chat to Dashboard (P0)

`/chat` no longer has a standalone chat. It redirects to dashboard.

**Acceptance:**

1. Navigating to `/chat` redirects to `/dashboard`
2. `/chat/task/[id]` works (task view)
3. All other `/chat/*` routes are handled gracefully

---

## Data Model

### New Table: `tasks`

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  conversation_id UUID REFERENCES conversations(id),
  title TEXT NOT NULL DEFAULT 'New task',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  active_skill TEXT,                    -- current skill slug (nullable)
  artifact_type TEXT,                   -- component to render: 'seasonal-calendar', 'campaign', etc.
  artifact_data JSONB DEFAULT '{}',     -- structured output from skill
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_team_user ON tasks(team_id, user_id);
CREATE INDEX idx_tasks_status ON tasks(status);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

### Modified: `conversations`

Add `task_id` column to link conversations to tasks:

```sql
ALTER TABLE conversations ADD COLUMN task_id UUID REFERENCES tasks(id);
CREATE INDEX idx_conversations_task ON conversations(task_id);
```

### Modified: `skill_executions`

Already has `conversation_id`. Add `task_id` for direct linking:

```sql
ALTER TABLE skill_executions ADD COLUMN task_id UUID REFERENCES tasks(id);
```

---

## API Routes

### New: `POST /api/tasks`

Creates a new task and its associated conversation.

```ts
// Request
{ message: string }

// Response
{ taskId: string, conversationId: string }

// Logic:
// 1. Create task row
// 2. Create conversation row linked to task
// 3. Return IDs for redirect
```

### New: `GET /api/tasks`

List tasks for the current user/team.

```ts
// Response
{
  tasks: Array<{ id; title; status; active_skill; artifact_type; created_at }>
}
```

### New: `GET /api/tasks/[id]`

Get a single task with its conversation and artifact data.

```ts
// Response
{
  task: {
    ;(id, title, status, active_skill, artifact_type, artifact_data, conversation_id)
  }
}
```

### Modified: `POST /api/chat`

Add `taskId` to the request body. When a skill is invoked via `SNEW_RUN_SKILL`, update the task's `artifact_data`, `artifact_type`, and `active_skill`.

```ts
// Request body now includes:
{
  ;(messages, conversationId, taskId)
}

// After SNEW_RUN_SKILL executes:
// UPDATE tasks SET artifact_data = skill_output, artifact_type = skill_slug, active_skill = skill_slug
```

---

## Artifact Rendering

The artifact panel dynamically renders components based on `task.artifact_type`:

```ts
function ArtifactRenderer({ artifactType, artifactData }: { artifactType: string | null; artifactData: unknown }) {
  switch (artifactType) {
    case 'seasonal-calendar':
      return <SeasonalCalendarArtifact data={artifactData as PersonalizedCalendar} />
    case 'campaign':
      return <CampaignArtifact data={artifactData as FullCampaign} />
    case 'daily-summary':
      return <DailySummaryArtifact />
    default:
      return <ArtifactEmptyState />  // "Ask Snew something to see results here"
  }
}
```

**Phase 1**: Only `seasonal-calendar` artifact has real rendering. Others show a generic JSON/markdown view.

**Future**: Each skill defines its own artifact component that knows how to render its output data.

---

## Routing Changes

### New Routes

- `/chat/task/[id]/page.tsx` — Task view (chat + artifact)
- `/api/tasks/route.ts` — Create/list tasks
- `/api/tasks/[id]/route.ts` — Get task details

### Modified Routes

- `/chat/page.tsx` — Redirect to `/dashboard`
- `/dashboard/page.tsx` — Ask bar now creates tasks (POST /api/tasks → redirect)
- `/skills/[slug]/page.tsx` — Browse only, no workspace. CTA → dashboard

### Deprecated Routes

- `/chat/[id]/page.tsx` — Replaced by `/chat/task/[id]` (can redirect)
- `/skills/seasonal-calendar` workspace — Replaced by artifact panel in task view

---

## Files to Create

1. `supabase/migrations/XXX_create_tasks_table.sql` — Tasks table + indexes + RLS
2. `supabase/migrations/XXX_add_task_id_to_conversations.sql` — Link conversations to tasks
3. `src/app/api/tasks/route.ts` — POST (create) + GET (list)
4. `src/app/api/tasks/[id]/route.ts` — GET (single task)
5. `src/app/(dashboard)/chat/task/[id]/page.tsx` — Task view page
6. `src/components/chat/artifact-renderer.tsx` — Dynamic artifact component switcher
7. `src/components/chat/artifact-empty-state.tsx` — Empty state for artifact panel
8. `src/hooks/use-task.ts` — React Query hook for task data + artifact polling
9. `src/lib/queries/tasks.ts` — Task DB query helpers

## Files to Modify

10. `src/app/(dashboard)/chat/page.tsx` — Redirect to /dashboard
11. `src/app/(dashboard)/dashboard/page.tsx` — Ask bar creates task instead of redirecting to /chat
12. `src/components/home/ask-bar-new.tsx` — POST /api/tasks on submit, redirect to /chat/task/[id]
13. `src/app/api/chat/route.ts` — Accept taskId, update task on skill invocation
14. `src/lib/ai/platform-tools.ts` — SNEW_RUN_SKILL updates task's artifact_data
15. `src/components/layout/app-sidebar-new.tsx` — `+ New Task` → /dashboard
16. `src/app/(dashboard)/skills/[slug]/page.tsx` — Browse only, remove workspace
17. `src/components/chat/chat-page-client.tsx` — Read task data, render ArtifactRenderer

## Files to Remove/Deprecate

18. `src/components/skills/seasonal-calendar/seasonal-calendar-workspace.tsx` — Replaced by artifact
19. `src/components/chat/daily-summary-artifact.tsx` — Move to artifact-renderer
20. `src/hooks/use-seasonal-calendar.ts` — Skill invoked via orchestrator, not directly

---

## Phases

### Phase 1: Foundation (Task CRUD + Routing)

- Create `tasks` table + migrations
- Create `/api/tasks` routes
- Create `/chat/task/[id]` page
- Redirect `/chat` → `/dashboard`
- Update ask bar to create tasks
- Update sidebar `+ New Task` → `/dashboard`

### Phase 2: Orchestrator → Task Integration

- Modify `/api/chat` to accept `taskId`
- Modify `SNEW_RUN_SKILL` to update `tasks.artifact_data`
- Create `ArtifactRenderer` component
- Wire artifact panel to read `task.artifact_data` in real time

### Phase 3: Seasonal Calendar in Artifact

- Move `SeasonalCalendarWorkspace` rendering into `SeasonalCalendarArtifact`
- Remove standalone skill page
- Skill invoked via orchestrator → output renders in artifact panel

### Phase 4: Tasks List + Skills Browse

- Create `/tarefas` page (task history)
- Update `/skills/[slug]` to browse-only
- Add "Ask Snew to use this skill" CTA

### Phase 5: Polish + Cleanup

- Remove deprecated code (standalone workspace, direct skill APIs)
- Visual QA
- Build verification

---

## Non-Functional Requirements

- Chat remains fully functional (Vercel AI SDK, streaming, tool calls)
- Task creation is instant (< 200ms)
- Artifact panel updates in real time when skill finishes executing
- All existing auth, billing, team management unchanged
- RLS on tasks table (users see only their team's tasks)

---

## Out of Scope

- Multiple skills per task (future: task can chain skills)
- Task scheduling/automation
- Task sharing between team members
- File uploads in tasks
- Real-time collaboration on tasks
- Mobile responsive layout
