# Quickstart: Task-Based Architecture

## Prerequisites

- Relay project with dependencies installed (`bun install`)
- Supabase running (local or cloud)
- `.env.local` configured with Supabase + OpenAI keys
- Dev server: `bun dev`

## Implementation Order

1. **Migrations first** — create tasks table, add task_id columns
2. **API routes** — /api/tasks CRUD
3. **New page** — /chat/task/[id]
4. **Routing changes** — /chat redirect, ask bar creates tasks
5. **Orchestrator integration** — /api/chat accepts taskId, SNEW_RUN_SKILL updates artifacts
6. **Artifact rendering** — ArtifactRenderer + SeasonalCalendarArtifact
7. **Tasks list** — /tarefas page
8. **Cleanup** — remove deprecated code

## Key Files

| File                                          | Purpose                               |
| --------------------------------------------- | ------------------------------------- |
| `supabase/migrations/`                        | New tasks table + modified columns    |
| `src/app/api/tasks/route.ts`                  | Task CRUD API                         |
| `src/app/(dashboard)/chat/task/[id]/page.tsx` | Task view page                        |
| `src/app/api/chat/route.ts`                   | Modified: accepts taskId              |
| `src/lib/ai/platform-tools.ts`                | Modified: SNEW_RUN_SKILL updates task |
| `src/components/chat/artifact-renderer.tsx`   | Dynamic artifact rendering            |
| `src/hooks/use-task.ts`                       | Task data hook with polling           |
| `src/components/home/ask-bar-new.tsx`         | Modified: creates task on submit      |

## Testing Checklist

- [ ] POST /api/tasks creates task + conversation
- [ ] GET /api/tasks returns task list
- [ ] /chat redirects to /dashboard
- [ ] Ask bar creates task and redirects to /chat/task/[id]
- [ ] Chat works in /chat/task/[id] (send message, get response)
- [ ] Asking about calendar → orchestrator invokes skill → artifact appears
- [ ] Artifact panel shows SeasonalCalendarArtifact with real data
- [ ] /tarefas lists all tasks
- [ ] /skills/seasonal-calendar shows info page (no workspace)
- [ ] - New Task → /dashboard
- [ ] Build passes, lint passes
