# Tasks: Task-Based Architecture

**Branch**: `feat/task-based-architecture` | **Plan**: [plan.md](./plan.md)

## Phase 1: Foundation (Task CRUD + Routing)

### Task 1.1: Create tasks table migration

- **File**: `supabase/migrations/XXX_create_tasks_table.sql`
- **Action**: Create new migration
- **Details**: Create `tasks` table with id, team_id, user_id, conversation_id, title, status, active_skill, artifact_type, artifact_data (jsonb), created_at, updated_at. Indexes on (team_id, user_id) and (status). RLS enabled: users can only see tasks from their team.
- **Dependencies**: None
- **Acceptance**: Migration runs cleanly. Table exists with RLS.

### Task 1.2: Add task_id to conversations and skill_executions

- **File**: `supabase/migrations/XXX_add_task_id_columns.sql`
- **Action**: Create new migration
- **Details**: ALTER TABLE conversations ADD COLUMN task_id UUID REFERENCES tasks(id). ALTER TABLE skill_executions ADD COLUMN task_id UUID REFERENCES tasks(id). Create indexes.
- **Dependencies**: Task 1.1
- **Acceptance**: Columns exist, foreign keys valid.

### Task 1.3: Create POST /api/tasks endpoint

- **File**: `src/app/api/tasks/route.ts`
- **Action**: Create new file
- **Details**: POST handler: authenticate user, get team_id, create task row, create conversation row linked to task, return { taskId, conversationId }. GET handler: list tasks for user's team, ordered by created_at desc.
- **Dependencies**: Tasks 1.1, 1.2
- **Acceptance**: POST creates task + conversation. GET returns task list.

### Task 1.4: Create GET /api/tasks/[id] endpoint

- **File**: `src/app/api/tasks/[id]/route.ts`
- **Action**: Create new file
- **Details**: GET handler: load task by id, verify team ownership, include conversation_id and artifact_data. Return task object.
- **Dependencies**: Task 1.1
- **Acceptance**: Returns task with artifact_data. 404 if not found. 403 if wrong team.

### Task 1.5: Create /chat/task/[id] page

- **File**: `src/app/(dashboard)/chat/task/[id]/page.tsx`
- **Action**: Create new file
- **Details**: Server Component. Load task via API, load conversation + messages. Pass to TaskPageClient (same pattern as current chat page but with task context). Render ChatContextProvider + ChatHeader (title from task.title) + ChatLayout with OrchestratorChatWrapper (left) + ArtifactRenderer (right).
- **Dependencies**: Tasks 1.3, 1.4
- **Acceptance**: Page renders with chat + artifact panel. Chat is functional.

### Task 1.6: Redirect /chat to /dashboard

- **File**: `src/app/(dashboard)/chat/page.tsx`
- **Action**: Modify
- **Details**: Replace entire page content with `redirect('/dashboard')`. Remove all existing chat setup code.
- **Dependencies**: None
- **Acceptance**: Navigating to /chat redirects to /dashboard.

### Task 1.7: Update ask bar to create tasks

- **File**: `src/components/home/ask-bar-new.tsx`
- **Action**: Modify
- **Details**: On submit: POST /api/tasks with { message }, get taskId back, redirect to /chat/task/[taskId]. Remove current router.push('/chat?q=...') behavior.
- **Dependencies**: Task 1.3
- **Acceptance**: Typing in ask bar and pressing Enter creates a task and navigates to task view.

### Task 1.8: Update sidebar New Task → /dashboard

- **File**: `src/components/layout/app-sidebar-new.tsx`
- **Action**: Modify
- **Details**: Change `+ New Task` nav item path from `/chat` to `/dashboard`. Ensure clicking it navigates to dashboard.
- **Dependencies**: None
- **Acceptance**: + New Task goes to dashboard.

---

## Phase 2: Orchestrator → Task Integration

### Task 2.1: Modify /api/chat to accept taskId

- **File**: `src/app/api/chat/route.ts`
- **Action**: Modify
- **Details**: Read `taskId` from request body. Pass it through to platform tools context. After response completes, if a skill was executed, update the task's artifact_data, artifact_type, and active_skill.
- **Dependencies**: Phase 1 complete
- **Acceptance**: /api/chat accepts taskId without breaking existing flow. taskId is optional for backward compatibility.

### Task 2.2: Modify SNEW_RUN_SKILL to update task artifacts

- **File**: `src/lib/ai/platform-tools.ts`
- **Action**: Modify
- **Details**: After skill execution completes, if taskId is available in context: UPDATE tasks SET artifact_data = skill_output, artifact_type = skill_slug, active_skill = skill_slug, updated_at = now(). The skill_output should be the actual structured data (PersonalizedCalendar, FullCampaign, etc.), not just the skill context.
- **Dependencies**: Task 2.1
- **Acceptance**: After SNEW_RUN_SKILL executes, task row has artifact_data populated.

### Task 2.3: Create ArtifactRenderer component

- **File**: `src/components/chat/artifact-renderer.tsx`
- **Action**: Create new file
- **Details**: Dynamic component that reads artifact_type and renders the correct component. Switch: 'seasonal-calendar' → SeasonalCalendarArtifact, default → GenericArtifact (renders JSON prettified or markdown). Also an ArtifactEmptyState for when no skill has been invoked.
- **Dependencies**: None
- **Acceptance**: Renders correct component based on type. Empty state when null.

### Task 2.4: Create useTask hook

- **File**: `src/hooks/use-task.ts`
- **Action**: Create new file
- **Details**: React Query hook. Fetches GET /api/tasks/[id]. Polls every 2s while task status is 'active' and a skill is running (to catch artifact updates). Returns { task, isLoading, refetch }.
- **Dependencies**: Task 1.4
- **Acceptance**: Hook returns task data. Polls for updates when skill is executing.

### Task 2.5: Wire task view to read artifact_data

- **File**: `src/app/(dashboard)/chat/task/[id]/page.tsx` + `src/components/chat/chat-page-client.tsx`
- **Action**: Modify
- **Details**: TaskPageClient reads task data via useTask hook. Passes task.artifact_type and task.artifact_data to ArtifactRenderer in the artifact panel. When artifact_data updates (from polling), the panel re-renders with new data.
- **Dependencies**: Tasks 2.3, 2.4
- **Acceptance**: Artifact panel shows real skill output after orchestrator invokes a skill.

---

## Phase 3: Seasonal Calendar Artifact

### Task 3.1: Create SeasonalCalendarArtifact component

- **File**: `src/components/chat/artifacts/seasonal-calendar-artifact.tsx`
- **Action**: Create new file
- **Details**: Renders PersonalizedCalendar data in the artifact panel. List of dates with name, date, estimatedRevenue, priority, relevanceReason. Clickable rows that could drill into campaign details. Reuse styling from the prototype's SeasonalCalendarArtifact (list with colored dots, revenue on right, chevron).
- **Dependencies**: Task 2.3
- **Acceptance**: Renders calendar data correctly in artifact panel.

### Task 3.2: Integrate SNEW_RUN_SKILL("seasonal-calendar") with real generation

- **File**: `src/lib/ai/platform-tools.ts`
- **Action**: Modify
- **Details**: When SNEW_RUN_SKILL is called with slug "seasonal-calendar", instead of returning skill context (Phase 0 behavior), actually call `generateCalendar()` from `seasonal-campaign-generator.ts` and return the PersonalizedCalendar data as the skill output. This data gets saved to task.artifact_data.
- **Dependencies**: Task 2.2
- **Acceptance**: Asking "mostra calendário sazonal" in a task → orchestrator invokes skill → real calendar data appears in artifact panel.

### Task 3.3: Remove standalone SeasonalCalendarWorkspace

- **File**: `src/app/(dashboard)/skills/[slug]/page.tsx`
- **Action**: Modify
- **Details**: Remove the special case that routes 'seasonal-calendar' to SeasonalCalendarWorkspace. All slugs now show SkillDetailNew (browse only) with a CTA "Ask Snew to use this skill" that redirects to dashboard with pre-filled prompt.
- **Dependencies**: Task 3.1
- **Acceptance**: /skills/seasonal-calendar shows info page, not workspace. CTA links to dashboard.

---

## Phase 4: Tasks List + Skills Browse

### Task 4.1: Create /tarefas page

- **File**: `src/app/(dashboard)/tarefas/page.tsx`
- **Action**: Create new file
- **Details**: Server Component. Fetch tasks via /api/tasks. Render list with: title, active_skill badge, status indicator, relative time. Click → navigate to /chat/task/[id]. Empty state if no tasks.
- **Dependencies**: Task 1.3
- **Acceptance**: Page lists all tasks. Click navigates to task view.

### Task 4.2: Update /skills/[slug] to browse-only

- **File**: `src/app/(dashboard)/skills/[slug]/page.tsx`
- **Action**: Modify
- **Details**: Remove SeasonalCalendarWorkspace import. All slugs render SkillDetailNew with skill info (description, category, what it does). Add CTA button: "Ask Snew to use this skill" → navigates to /dashboard with pre-filled prompt.
- **Dependencies**: None
- **Acceptance**: No skill page has a chat or workspace. All are info pages.

---

## Phase 5: Cleanup + QA

### Task 5.1: Remove deprecated code

- **Action**: Delete/clean files
- **Details**: Remove: SeasonalCalendarWorkspace component, use-seasonal-calendar hook (direct API calls), daily-summary-artifact mock, unused chat components from 046. Clean up imports.
- **Dependencies**: All previous phases
- **Acceptance**: No dead imports, no unused files.

### Task 5.2: Build + lint verification

- **Action**: `bun run build` + `bun run lint`
- **Dependencies**: Task 5.1
- **Acceptance**: Zero errors, zero new warnings.

### Task 5.3: Visual QA

- **Action**: Test all flows
- **Details**: Test: dashboard → create task → chat + artifact, task list, skill browse, + New Task, /chat redirect.
- **Dependencies**: All tasks
- **Acceptance**: All flows work end-to-end.
