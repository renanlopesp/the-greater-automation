# Server Actions Contract: Workspace CRUD

**File**: `src/lib/actions/workspace.ts`

All actions use `'use server'` directive and follow the pattern in `src/lib/actions/auth.ts`.

## Action: createWorkflow

```typescript
createWorkflow(teamId: string, userId: string): Promise<{ id: string } | { error: string }>
```

- Creates workflow with: name "Untitled Workflow", emoji "📋", status "draft"
- Returns the new workflow ID for redirect

## Action: createWorkflowFromTemplate

```typescript
createWorkflowFromTemplate(teamId: string, userId: string, templateId: string): Promise<{ id: string } | { error: string }>
```

- Looks up template by ID from hardcoded definitions
- Creates workflow + steps + trigger from template config
- Returns the new workflow ID for redirect

## Action: duplicateWorkflow

```typescript
duplicateWorkflow(workflowId: string, teamId: string, userId: string): Promise<{ id: string } | { error: string }>
```

- Fetches source workflow, steps, and trigger
- Creates new workflow with name "[Original] (copy)" or "[Original] (copy N)"
- Copies all steps with new IDs, preserving position and config
- Copies trigger with new ID
- Returns the new workflow ID for redirect

## Action: deleteWorkflow

```typescript
deleteWorkflow(workflowId: string): Promise<{ error?: string }>
```

- Checks for active runs (status = 'running' or 'pending')
- If active run exists, returns error
- Deletes workflow (cascade handles steps, triggers, runs, agent_skills)
- Calls `revalidatePath('/workspace')`

## Action: deleteAgent

```typescript
deleteAgent(agentId: string): Promise<{ error?: string }>
```

- Deletes agent (cascade handles agent_skills, orphaning workflows)
- Calls `revalidatePath('/workspace')`

## Action: renameWorkflow

```typescript
renameWorkflow(workflowId: string, name: string): Promise<{ error?: string }>
```

- Validates name is non-empty
- Updates workflow name
- Calls `revalidatePath('/workspace')`

## Action: bulkDeleteItems

```typescript
bulkDeleteItems(items: { id: string; type: 'workflow' | 'agent' }[]): Promise<{ error?: string }>
```

- Separates workflow IDs and agent IDs
- Checks for active runs on workflows
- Deletes all workflows then all agents
- Calls `revalidatePath('/workspace')`

## Action: bulkToggleStatus

```typescript
bulkToggleStatus(workflowIds: string[], newStatus: 'draft' | 'published'): Promise<{ error?: string }>
```

- Updates all specified workflows to newStatus
- Sets published_at to now() if publishing, null if drafting
- Calls `revalidatePath('/workspace')`
