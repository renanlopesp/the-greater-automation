# API Contracts: Task-Based Architecture

## POST /api/tasks

Creates a new task with its conversation.

```ts
// Request
POST /api/tasks
Authorization: Cookie (Supabase session)
Content-Type: application/json

{ "message": "Mostra o calendário sazonal" }

// Response 200
{ "taskId": "uuid", "conversationId": "uuid" }

// Response 401
{ "error": "Unauthorized" }
```

## GET /api/tasks

Lists tasks for the authenticated user's team.

```ts
// Request
GET /api/tasks
Authorization: Cookie (Supabase session)

// Response 200
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Calendário sazonal",
      "status": "active",
      "active_skill": "seasonal-calendar",
      "artifact_type": "seasonal-calendar",
      "created_at": "2026-03-31T12:00:00Z"
    }
  ]
}
```

## GET /api/tasks/[id]

Gets a single task with full artifact data.

```ts
// Request
GET /api/tasks/abc123
Authorization: Cookie (Supabase session)

// Response 200
{
  "task": {
    "id": "abc123",
    "title": "Calendário sazonal",
    "status": "active",
    "active_skill": "seasonal-calendar",
    "artifact_type": "seasonal-calendar",
    "artifact_data": { /* PersonalizedCalendar data */ },
    "conversation_id": "conv-uuid",
    "created_at": "2026-03-31T12:00:00Z",
    "updated_at": "2026-03-31T12:00:05Z"
  }
}

// Response 404
{ "error": "Task not found" }
```

## POST /api/chat (modified)

Now accepts optional `taskId`.

```ts
// Request (extended)
POST /api/chat
{
  "messages": [...],
  "conversationId": "uuid",
  "taskId": "uuid"          // NEW — optional
}

// Behavior when taskId present:
// After SNEW_RUN_SKILL completes:
// UPDATE tasks SET artifact_data = output, artifact_type = slug WHERE id = taskId
```
