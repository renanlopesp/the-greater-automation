# Data Model: Task-Based Architecture

## New Table: tasks

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  conversation_id UUID REFERENCES conversations(id),
  title TEXT NOT NULL DEFAULT 'New task',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  active_skill TEXT,
  artifact_type TEXT,
  artifact_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## TypeScript Types

### Task

```ts
interface Task {
  id: string
  team_id: string
  user_id: string
  conversation_id: string | null
  title: string
  status: 'active' | 'completed' | 'archived'
  active_skill: string | null
  artifact_type: string | null
  artifact_data: Record<string, unknown>
  created_at: string
  updated_at: string
}
```

### CreateTaskRequest / Response

```ts
interface CreateTaskRequest {
  message: string
}

interface CreateTaskResponse {
  taskId: string
  conversationId: string
}
```

### ArtifactRendererProps

```ts
interface ArtifactRendererProps {
  artifactType: string | null
  artifactData: Record<string, unknown>
}
```

## Existing Tables Modified

### conversations

- ADD `task_id UUID REFERENCES tasks(id)` — links conversation to its task

### skill_executions

- ADD `task_id UUID REFERENCES tasks(id)` — links execution to its task

## Entity Relationships

```
Task (1) ─── (1) Conversation ─── (N) ConversationMessages
  │
  └── (N) SkillExecutions
  │
  └── artifact_data (jsonb) ← written by SNEW_RUN_SKILL
```
