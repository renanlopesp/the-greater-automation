# API Contract: Composio Webhook Endpoint

**Feature**: 021-app-event-triggers

## `POST /api/composio/webhook`

**Purpose**: Receive ALL Composio trigger event callbacks. Routes events to the correct workflow.

**Authentication**: Composio sends events to a pre-configured webhook URL. No user auth — validated by matching `composio_trigger_id` in our DB.

### Request (from Composio)

```typescript
// POST /api/composio/webhook
// Content-Type: application/json

{
  type: string                     // Trigger slug, e.g., "github_commit_event"
  data: Record<string, unknown>    // Event-specific payload
  timestamp: string                // ISO 8601
  log_id: string                   // Unique event ID (idempotency key)
  metadata?: {
    triggerSlug: string
    connectedAccount: {
      userId: string
      id: string
    }
    triggerConfig: Record<string, unknown>
  }
}
```

### Response

**Success (200)**:

```json
{ "status": "ok", "runs_created": 1 }
```

**Duplicate event (200)**:

```json
{ "status": "duplicate", "log_id": "log_123" }
```

**No matching subscription (200)**:

```json
{ "status": "no_subscription" }
```

**Error (500)**:

```json
{ "error": "Internal server error" }
```

### Processing Flow

1. Parse payload, extract `log_id` and trigger metadata
2. Look up `trigger_subscriptions` by Composio trigger info (trigger slug + connected account)
3. Check idempotency: skip if `event_log_id` already exists in `agent_workflow_runs`
4. Check if subscription is enabled
5. Apply event filters from subscription
6. If filters pass: create `agent_workflow_runs` record and execute workflow pipeline
7. Update subscription `last_event_at` and `event_count`
8. Return success

---

## `POST /api/agent-workflows/[workflowId]/retry`

**Purpose**: Retry a failed workflow run with the same event payload.

**Authentication**: Supabase session (authenticated user).

### Request

```typescript
// POST /api/agent-workflows/{workflowId}/retry
// Body:
{
  runId: string
}
```

### Response

**Success (200)**:

```json
{ "success": true, "new_run_id": "uuid" }
```

**Error (404)**:

```json
{ "error": "Run not found" }
```
