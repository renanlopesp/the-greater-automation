# Server Action Contracts

## Agent Skills (knowledge + procedure)

File: `src/lib/actions/agent-skills.ts` (renamed from `agent-knowledge-skills.ts`)

### createSkill(agentId, input)

```typescript
interface CreateSkillInput {
  name: string
  description?: string
  content: string
  type: 'knowledge' | 'procedure'
  parameters?: Record<string, unknown> | null
}

function createSkill(
  agentId: string,
  input: CreateSkillInput
): Promise<{ error?: string; skill?: { id: string } }>
```

### updateSkill(skillId, agentId, updates)

```typescript
interface UpdateSkillInput {
  name?: string
  description?: string
  content?: string
  parameters?: Record<string, unknown> | null
  is_enabled?: boolean
}

function updateSkill(
  skillId: string,
  agentId: string,
  updates: UpdateSkillInput
): Promise<{ error?: string }>
```

Note: Increments `version` when `content` or `parameters` change.

### deleteSkill(skillId, agentId)

```typescript
function deleteSkill(skillId: string, agentId: string): Promise<{ error?: string }>
```

### toggleSkill(skillId, agentId, enabled)

```typescript
function toggleSkill(
  skillId: string,
  agentId: string,
  enabled: boolean
): Promise<{ error?: string }>
```

### getSkillContent(skillId, agentId)

```typescript
function getSkillContent(
  skillId: string,
  agentId: string
): Promise<{ error?: string; skill?: AgentSkill }>
```

## Agent Workflows (automations)

File: `src/lib/actions/agent-workflows.ts` (renamed from `agent-skills.ts`)

### addWorkflow(agentId, workflowId)

```typescript
function addWorkflow(agentId: string, workflowId: string): Promise<{ error?: string }>
```

### removeWorkflow(workflowId, agentId)

```typescript
function removeWorkflow(workflowId: string, agentId: string): Promise<{ error?: string }>
```

### deleteWorkflow(workflowId, agentId)

```typescript
function deleteWorkflow(workflowId: string, agentId: string): Promise<{ error?: string }>
```

## API Routes

### Agent Workflow Execution

```
POST /api/agent-workflows/[id]/execute
Body: { trigger_data: Record<string, unknown> }
Response: { success: boolean, run_id?: string, error?: string }
```

### Agent Workflow Webhook

```
POST /api/agent-workflows/webhook/[token]
Body: (any webhook payload)
Response: { success: boolean, run_id?: string }
```

### Agent Workflow Cron

```
GET /api/agent-workflows/cron
Response: { executed: number, errors: string[] }
```
