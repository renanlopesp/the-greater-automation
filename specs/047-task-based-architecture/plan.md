# Implementation Plan: Task-Based Architecture

**Branch**: `feat/task-based-architecture` | **Date**: 2026-03-31 | **Spec**: [spec.md](./spec.md)

## Summary

Restructure the application around a task-based model where every conversation is a Task, skills are invoked by the orchestrator, and deliverables render in the artifact panel. Core changes: new `tasks` table, new routing (`/chat/task/[id]`), orchestrator updates task artifacts on skill execution, dynamic artifact rendering.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, Vercel AI SDK, Supabase, TanStack React Query
**Storage**: Supabase PostgreSQL — new `tasks` table, modified `conversations` + `skill_executions`
**Testing**: Integration tests for task CRUD, visual QA for routing
**Target Platform**: Web (desktop-first)

## Constitution Check

| Principle                | Status   | Notes                                               |
| ------------------------ | -------- | --------------------------------------------------- |
| I. App Router First      | **PASS** | New routes in `src/app/(dashboard)/chat/task/[id]/` |
| II. shadcn/ui            | **PASS** | Reuses existing components                          |
| III. Tailwind + CSS vars | **PASS** | No new styling patterns                             |
| IV. TypeScript Strict    | **PASS** | Task types, API contracts typed                     |
| V. Simplicity/YAGNI      | **PASS** | Minimal new tables, reuse existing orchestrator     |
| VI. Supabase             | **PASS** | New migration, RLS enabled, service role for API    |

## Architecture

### Data Flow

```
Dashboard Ask Bar
  → POST /api/tasks { message }
  → Creates: tasks row + conversations row
  → Returns: { taskId, conversationId }
  → Redirect: /chat/task/[taskId]

Task View (/chat/task/[id])
  → Server: load task + conversation + messages
  → Client: OrchestratorChatWrapper (left) + ArtifactRenderer (right)
  → useChat → POST /api/chat { messages, conversationId, taskId }

Orchestrator (POST /api/chat)
  → AI identifies skill needed
  → Calls SNEW_RUN_SKILL(slug, input)
  → Skill executes, returns structured data
  → Updates: tasks.artifact_data, tasks.artifact_type, tasks.active_skill
  → Streams text response to chat

Artifact Panel
  → useTask() polls/subscribes to task data
  → ArtifactRenderer reads task.artifact_type
  → Renders correct component with task.artifact_data
```

### Component Hierarchy

```
/chat/task/[id] (Server Component — loads task + messages)
  └─ TaskPageClient (Client)
      └─ ChatContextProvider
          ├─ ChatHeader (title from task)
          └─ ChatLayout (50/50 split)
              ├─ OrchestratorChatWrapper (existing, unchanged)
              └─ Artifact side
                  ├─ ⋯ button (top)
                  └─ ArtifactRenderer
                      ├─ SeasonalCalendarArtifact (when artifact_type = 'seasonal-calendar')
                      ├─ GenericArtifact (JSON/markdown for other skills)
                      └─ ArtifactEmptyState (when no skill invoked yet)
```

## Phases

### Phase 1: Foundation (Task CRUD + Routing)

1. Migration: create `tasks` table
2. Migration: add `task_id` to `conversations` and `skill_executions`
3. API: POST /api/tasks (create task + conversation)
4. API: GET /api/tasks (list) + GET /api/tasks/[id] (single)
5. Page: /chat/task/[id] (task view)
6. Redirect: /chat → /dashboard
7. Update: ask bar creates task and redirects
8. Update: sidebar + New Task → /dashboard

### Phase 2: Orchestrator → Task Integration

9. Modify /api/chat to accept taskId
10. Modify SNEW_RUN_SKILL to update tasks.artifact_data
11. Create ArtifactRenderer + ArtifactEmptyState
12. Create useTask hook (React Query, polls for artifact updates)
13. Wire task view to read artifact_data in real time

### Phase 3: Seasonal Calendar Artifact

14. Create SeasonalCalendarArtifact component (renders PersonalizedCalendar)
15. Connect SNEW_RUN_SKILL("seasonal-calendar") → generateCalendar → artifact
16. Remove standalone SeasonalCalendarWorkspace page

### Phase 4: Tasks List + Skills Browse

17. Create /tarefas page (task history list)
18. Update /skills/[slug] to browse-only (remove workspace)
19. Add "Ask Snew" CTA on skill detail

### Phase 5: Cleanup

20. Remove deprecated code
21. Visual QA
22. Build verification

## Risks & Mitigations

| Risk                                                     | Impact | Mitigation                                                  |
| -------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| SNEW_RUN_SKILL currently returns skill context, not data | High   | Phase 2 changes execution to call skill-specific generators |
| Seasonal Calendar APIs are standalone                    | Medium | Phase 3 integrates them into SNEW_RUN_SKILL flow            |
| Real-time artifact updates                               | Medium | Polling via React Query (1-2s interval while skill running) |
| Breaking existing chat flows                             | High   | Keep /api/chat backward compatible, taskId is optional      |
