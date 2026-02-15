# Research: App Event Triggers

**Feature**: 021-app-event-triggers
**Date**: 2026-02-15

## R1: Composio Trigger Subscription API

**Decision**: Use Composio SDK's `triggers.create()` + webhook-based delivery for production.

**Rationale**: Composio supports both SDK polling (`triggers.subscribe()`) and webhook delivery. The SDK `subscribe()` is for prototyping only — it opens a long-lived connection. For production, Composio calls a configured webhook URL with event payloads via POST. This aligns with our existing webhook infrastructure.

**Key API methods**:

- `composio.triggers.list({ toolkit_slugs: [appId] })` — discover available trigger types per app
- `composio.triggers.getType(slug)` — get config requirements and payload schema
- `composio.triggers.create(userId, triggerSlug, { triggerConfig })` — create subscription, returns `triggerId`
- `composio.triggers.enable(triggerId)` / `composio.triggers.disable(triggerId)` — toggle
- `DELETE /api/v3/trigger_instances/manage/{triggerId}` — permanent removal

**Webhook payload structure**:

```json
{
  "type": "github_commit_event",
  "data": {
    /* event-specific fields */
  },
  "timestamp": "2026-02-15T10:30:00Z",
  "log_id": "log_123456"
}
```

**Alternatives considered**:

- SDK `subscribe()` polling — rejected: prototyping only, not production-ready
- Custom GitHub webhooks — rejected: reinventing what Composio already provides
- pg_listen/notify for trigger events — rejected: only useful for internal DB events, not external app events

## R2: Webhook Routing Strategy

**Decision**: Create a single Composio callback endpoint at `/api/composio/webhook/route.ts` that receives ALL Composio trigger events, then routes them to the correct workflow based on the trigger metadata.

**Rationale**: Composio allows configuring ONE webhook URL per account in the dashboard settings. All trigger events for all apps are delivered to this single URL. The payload includes `triggerSlug` and `metadata.connectedAccount.userId` which we use to look up the matching trigger subscription and workflow.

**Alternatives considered**:

- Per-workflow webhook URLs — rejected: Composio only supports one webhook URL per account
- Reuse existing `/api/agent-workflows/webhook/[token]` — rejected: different signature/payload format, would conflate two systems

## R3: Pipeline Execution Architecture

**Decision**: Extend the existing `workflow-executor.ts` and `action-executor.ts` to support sequential pipeline execution with step-by-step tracking, using the existing `agent_workflow_runs` table extended with step-level records.

**Rationale**: The current execution engine already supports:

- Sequential action execution with `previousOutputs` data passing
- Template resolution (`{{trigger.field}}`, `{{prev.key}}`)
- Condition evaluation
- Run status tracking

We extend rather than replace. Add a `pipeline_steps` JSONB array to runs for step-by-step tracking, and add a new `claude_agent` action type alongside existing `composio_action`, `ai_transform`, `notify`.

**Alternatives considered**:

- Separate pipeline engine from workflow engine — rejected: violates YAGNI, same execution model
- Use the `workflows`/`workflow_steps`/`workflow_run_steps` tables from the editor — rejected: the agent skill system (`agent_workflows`) is the active system users interact with via chat; the editor system is a separate flow

## R4: Claude Agent Step Implementation

**Decision**: Add a new `claude_agent` action type that uses the existing AI SDK (`@ai-sdk/openai`) with tool calling to perform analysis tasks within workflows.

**Rationale**: The existing `ai_transform` step type already uses the AI SDK for simple transformations. A `claude_agent` step extends this with:

- Configurable system prompt template
- Tool access (Composio tools for the connected apps)
- Structured output via tool-calling or JSON mode
- Configurable timeout (default 5 minutes)

This reuses the same infrastructure as the agent chat system but in a headless/server-side context.

**Alternatives considered**:

- Use Anthropic SDK directly — rejected: project already uses `@ai-sdk/openai` (OpenAI-compatible endpoint via Kiro), consistent approach
- Spawn a full agent conversation — rejected: too heavy for a single pipeline step, needs to be a focused single-turn call

## R5: Real-time Step Progress

**Decision**: Use Supabase Realtime subscriptions on the `agent_workflow_runs` table to push step progress updates to the client.

**Rationale**: Supabase Realtime is already available in the stack and provides row-level change notifications. When a step completes, the run record is updated with the new step result in `actions_executed`, triggering a Realtime event. The client subscribes to changes on the specific run ID.

**Alternatives considered**:

- Server-Sent Events (SSE) — rejected: requires custom endpoint, Supabase Realtime already handles this
- WebSocket server — rejected: additional infrastructure, Supabase Realtime is sufficient
- Polling — rejected: poor UX, 2-second polling interval is wasteful

## R6: Idempotency for Duplicate Events

**Decision**: Use Composio's `log_id` as an idempotency key. Before creating a run, check if a run with the same `log_id` already exists in `trigger_data.log_id`. If so, skip.

**Rationale**: Composio uses at-least-once delivery semantics. The `log_id` in the webhook payload is unique per event delivery. Storing it and checking before execution prevents duplicate runs.

**Alternatives considered**:

- Timestamp-based dedup — rejected: unreliable, events can arrive with similar timestamps
- No dedup — rejected: could cause duplicate workflow runs from the same event
