# Quickstart: App Event Triggers

**Feature**: 021-app-event-triggers

## Prerequisites

- Supabase project running (production: `djohaxwfketlsjurwqne`)
- Composio API key configured in `.env.local`
- At least one app connected (e.g., GitHub via OAuth)
- Composio webhook URL configured in Composio dashboard settings

## Test Scenario 1: Create App Event Trigger via Chat

1. Open agent detail page for any agent
2. In chat, ask: "Create a workflow that triggers when a PR is opened on my GitHub repo"
3. Agent should:
   - Call `SNEW_LIST_APP_CAPABILITIES` to discover GitHub triggers
   - Find `GITHUB_PULL_REQUEST_OPENED` (or similar) trigger
   - Call `SNEW_CREATE_WORKFLOW` with trigger type `app_event`
4. Verify:
   - Workflow appears in sidebar workflows list
   - `trigger_subscriptions` row created in DB
   - Composio trigger instance created (check Composio dashboard)

## Test Scenario 2: Event Fires and Triggers Run

1. After creating the trigger subscription (Scenario 1)
2. Open a PR on the configured GitHub repo
3. Composio sends webhook to `/api/composio/webhook`
4. Verify:
   - New `agent_workflow_runs` record created with event payload
   - Run status progresses: `pending` → `running` → `completed`
   - Pipeline steps tracked in `pipeline_steps` JSONB
   - Run appears in sidebar "Run history"

## Test Scenario 3: Multi-Step Pipeline

1. Create workflow with 3+ steps: fetch data → Claude agent analysis → post comment
2. Trigger via test event
3. Verify:
   - Each step executes sequentially
   - Step outputs flow to next step via `{{prev.key}}` templates
   - Each step status is individually tracked
   - If a step fails, subsequent steps are skipped

## Test Scenario 4: Toggle Trigger Subscription

1. In sidebar, find a workflow with an active trigger subscription
2. Disable the subscription
3. Fire an event from the external app
4. Verify: no new run is created
5. Re-enable the subscription
6. Fire another event
7. Verify: new run is created

## Test Scenario 5: Duplicate Event Handling

1. Have an active trigger subscription
2. Send the same webhook payload twice (same `log_id`)
3. Verify: only ONE run is created (second is detected as duplicate)

## Test Scenario 6: Claude Agent Step

1. Create workflow with a `claude_agent` step (e.g., code review prompt)
2. Provide sample input data
3. Trigger the workflow
4. Verify:
   - Agent receives trigger data and previous step output
   - Agent produces structured JSON output
   - Output is available to next step via `{{prev.output_key}}`
   - Step respects configured timeout

## Environment Setup

```bash
# Required env vars
COMPOSIO_API_KEY=your_composio_key
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app  # For webhook URL

# Composio dashboard: configure webhook URL
# Settings → Webhooks → Add URL: https://your-app.vercel.app/api/composio/webhook
```

## Database Verification Queries

```sql
-- Check trigger subscriptions
SELECT ts.*, aw.name as workflow_name
FROM trigger_subscriptions ts
JOIN agent_workflows aw ON aw.id = ts.agent_workflow_id
WHERE ts.agent_id = 'your-agent-id';

-- Check pipeline runs with step details
SELECT id, status, event_log_id, pipeline_steps, duration_ms
FROM agent_workflow_runs
WHERE workflow_id IN (
  SELECT id FROM agent_workflows WHERE agent_id = 'your-agent-id'
)
ORDER BY created_at DESC
LIMIT 10;

-- Check for duplicate events
SELECT event_log_id, count(*)
FROM agent_workflow_runs
WHERE event_log_id IS NOT NULL
GROUP BY event_log_id
HAVING count(*) > 1;
```
