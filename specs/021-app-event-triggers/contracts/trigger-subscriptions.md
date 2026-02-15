# API Contract: Trigger Subscriptions

**Feature**: 021-app-event-triggers

## Server Actions (Next.js Server Actions)

These are server-side functions called from React components, not REST endpoints.

### `listAvailableTriggers(appId: string)`

**Purpose**: List available Composio trigger types for a connected app.

**Input**:

```typescript
{
  appId: string
} // e.g., "github", "discord", "slack"
```

**Output**:

```typescript
{
  triggers: Array<{
    slug: string // "GITHUB_COMMIT_EVENT"
    name: string // "New Commit"
    description: string // "Triggers when a new commit is pushed"
    config: Record<string, { type: string; required: boolean; description?: string }>
    payload_schema?: Record<string, unknown>
  }>
}
```

**Errors**: `{ error: string }` if app not connected or Composio API fails.

---

### `createTriggerSubscription(params)`

**Purpose**: Create a Composio trigger subscription and link it to a workflow.

**Input**:

```typescript
{
  agentWorkflowId: string
  agentId: string
  triggerSlug: string        // "GITHUB_COMMIT_EVENT"
  appId: string              // "github"
  triggerConfig: Record<string, unknown>  // { owner: "user", repo: "repo" }
  filters?: WorkflowCondition[]
  fieldMappings?: Record<string, string>
}
```

**Output**:

```typescript
{
  subscription: {
    id: string
    composio_trigger_id: string
    trigger_slug: string
    is_enabled: boolean
  }
}
```

**Errors**: `{ error: string }` if subscription limit reached, invalid config, or Composio API fails.

---

### `toggleTriggerSubscription(subscriptionId: string, enabled: boolean)`

**Purpose**: Enable or disable a trigger subscription.

**Input**:

```typescript
{
  subscriptionId: string
  enabled: boolean
}
```

**Output**:

```typescript
{
  success: boolean
}
```

---

### `deleteTriggerSubscription(subscriptionId: string)`

**Purpose**: Permanently delete a trigger subscription (also deletes from Composio).

**Input**:

```typescript
{
  subscriptionId: string
}
```

**Output**:

```typescript
{
  success: boolean
}
```

---

### `getTriggerSubscriptions(agentId: string)`

**Purpose**: List all trigger subscriptions for an agent.

**Input**:

```typescript
{
  agentId: string
}
```

**Output**:

```typescript
{
  subscriptions: Array<{
    id: string
    agent_workflow_id: string
    trigger_slug: string
    app_id: string
    is_enabled: boolean
    last_event_at: string | null
    event_count: number
    workflow_name: string
  }>
}
```
