# Data Model — Spec 064 Edge-Function-First Skills

## Database schema

**No new tables. No column changes.** This spec moves compute, not data.

### `tasks` (existing — source of truth)

| Column            | Type        | Role in Edge-Function flow                                                                              |
| ----------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| `id`              | UUID PK     | Unchanged                                                                                               |
| `team_id`         | UUID        | Scoping for brand_dna / stores / products lookups inside the Edge Function                              |
| `selected_skill`  | text        | Unchanged (populated by the hero selector / `skill_slug`)                                               |
| `active_skill`    | text        | Written to the slug being dispatched (e.g. `'seasonal-calendar'`)                                       |
| `skill_status`    | text        | `idle` → `running` → `completed` \| `failed`. Dispatcher sets `running`; generator sets terminal states |
| `artifact_type`   | text        | Written by the generator on success (e.g. `'seasonal-calendar'`)                                        |
| `artifact_data`   | jsonb       | Progress (`{ steps: [...] }`) during run; full artifact JSON on completion                              |
| `metadata`        | jsonb       | NEW usage: stores `{ skill_deadline: <ISO timestamp> }` for watchdog recovery (research §6)             |
| `conversation_id` | UUID FK     | Unchanged                                                                                               |
| `updated_at`      | timestamptz | Written by both dispatcher and generator so Realtime clients re-render                                  |

### `brand_dna`, `stores`, `store_products`, `skills` (existing)

Read-only from generator functions via service-role client. Unchanged.

### `conversations`, `conversation_messages` (existing)

Unchanged by this spec. Spec 063's semantics continue to apply:

- Chat-path (Messages API): `metadata.engine = 'messages-api'`
- Skill-path background ack message: `metadata.engine = 'managed-agents'` + `metadata.skill = <slug>`

## Edge Function contracts

All generator functions share the same HTTP contract:

### `POST /functions/v1/generate-<skill-slug>`

**Auth**: `Authorization: Bearer <MCP_AUTH_TOKEN>` (validated by `_shared/auth.ts`)

**Request body**:

```ts
interface GeneratorRequest {
  team_id: string // required — used to fetch brand_dna, store, products
  task_id: string // required — the tasks row to update
  user_id: string // required — for audit / credit increments
  input?: Record<string, unknown> // optional, skill-specific; opaque to the dispatcher
}
```

**Response (immediate, ≤ 300ms)**:

```
HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "status": "generating",
  "task_id": "<uuid>",
  "dispatched_at": "2026-04-12T14:00:00.000Z"
}
```

**Error responses**:

| Status | Body                                       | Cause                                       |
| ------ | ------------------------------------------ | ------------------------------------------- |
| 400    | `{ "error": "Missing team_id" }`           | Malformed request                           |
| 401    | `"Unauthorized"` (plain text)              | Missing or invalid `MCP_AUTH_TOKEN`         |
| 404    | `{ "error": "Task not found", "task_id" }` | `task_id` does not belong to `team_id`      |
| 500    | `{ "error": "<safe message>" }`            | Dispatcher-level failure before `waitUntil` |

**Background work** (inside `EdgeRuntime.waitUntil`):

1. Fetch dependencies (brand_dna, store, products).
2. Emit progress via `updateTaskProgress(client, task_id, steps)`.
3. Call Anthropic Messages API with the skill prompt.
4. On success: `UPDATE tasks SET artifact_data=<result>, artifact_type='<slug>', skill_status='completed', active_skill='<slug>', metadata = metadata - 'skill_deadline', updated_at=now() WHERE id=$task_id`.
5. On failure: `UPDATE tasks SET skill_status='failed', metadata = metadata - 'skill_deadline' || {'skill_error': <message>}, updated_at=now()`.

Per-skill overrides (inputs / artifact shapes) live in each function's `index.ts`; the outer contract is invariant.

### Per-skill dispatch map

| Slug                | Endpoint                                   | Input shape                                  | Artifact type       |
| ------------------- | ------------------------------------------ | -------------------------------------------- | ------------------- |
| `seasonal-calendar` | `/functions/v1/generate-seasonal-calendar` | `{ year?: number }`                          | `seasonal-calendar` |
| `copywriter`        | `/functions/v1/generate-copywriter`        | `{ campaign_id, brief?: string }`            | `copywriter`        |
| `image-artifact`    | `/functions/v1/generate-image-artifact`    | `{ campaign_id, format: 'story' \| 'post' }` | `image-artifact`    |
| `deliverable`       | `/functions/v1/generate-deliverable`       | `{ campaign_id, deliverable_type: string }`  | `deliverable`       |

## Updated MCP tool contract: `SNEW_RUN_SKILL`

Inside `supabase/functions/mcp-tools/index.ts`. Tool registration unchanged; handler behavior changes as follows.

**Before (current)**: marks task running and returns `{ status:'generating' }`. Next.js-side `runAgentsEngineBackground` detects the slug and runs `generateCalendarInBackground` inline (Spec 063 T022 short-circuit).

**After (this spec)**: marks task running, writes `metadata.skill_deadline`, fires HTTP dispatch to the matching Edge Function, returns the ack.

```ts
async SNEW_RUN_SKILL({ skill_slug, input }) {
  // 1. Resolve skill
  const { data: skill } = await supabase
    .from('skills')
    .select('id, slug, status')
    .eq('team_id', teamId)
    .eq('slug', skill_slug)
    .single()
  if (!skill || skill.status !== 'active') {
    return { content: [{ type:'text', text: JSON.stringify({ error: 'Skill not active' }) }], isError: true }
  }

  // 2. Mark task running + set deadline
  if (taskId) {
    const deadline = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    await supabase.from('tasks').update({
      skill_status: 'running',
      active_skill: skill_slug,
      metadata: { skill_deadline: deadline },
      updated_at: new Date().toISOString(),
    }).eq('id', taskId)
  }

  // 3. Dispatch (fire-and-forget via waitUntil)
  const endpoint = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-${skill_slug}`
  EdgeRuntime.waitUntil(
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('MCP_AUTH_TOKEN')}`,
      },
      body: JSON.stringify({ team_id: teamId, task_id: taskId, user_id: userId, input }),
    }).catch((err) => console.error('[SNEW_RUN_SKILL] dispatch failed', err))
  )

  // 4. Return immediately
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        status: 'generating',
        skill: skill_slug,
        dispatched_at: new Date().toISOString(),
      }),
    }],
  }
}
```

## State transitions (unchanged from Spec 063)

```
skill_status:   'idle' ──SNEW_RUN_SKILL──► 'running' ──generator success──► 'completed'
                                                    └──generator failure──► 'failed'
                                                    └──watchdog timeout───► 'failed'

artifact_type:  null ─────────────────────► null (during run) ──► '<slug>' (on completion)
artifact_data:  null ─────────────────────► { steps: [...] }   ──► <full artifact JSON>
```

Watchdog recovery (pg_cron, research §6): if `now() > metadata->>'skill_deadline'` while `skill_status = 'running'`, force-transition to `'failed'` and clear the deadline.

## Runtime entities (in-memory, per Edge Function invocation)

### `GeneratorContext`

Assembled inside each function's `index.ts`:

```ts
interface GeneratorContext {
  client: SupabaseClient // service-role
  anthropic: Anthropic // _shared/anthropic.ts
  teamId: string
  taskId: string
  userId: string
  input: Record<string, unknown>
}
```

### `ProgressStep` (persisted inside `tasks.artifact_data.steps`)

```ts
interface ProgressStep {
  label: string
  done: boolean
}
```

Shape unchanged from the existing implementation — UI renderer does not require migration.

## Edge cases

- **Task belongs to a different team**: generator fetches `tasks` with `.eq('id', taskId).eq('team_id', teamId)`; mismatch returns 404 before starting work.
- **Dispatcher fires but generator URL is wrong / not deployed**: HTTP call fails; `waitUntil` logs error. Task sits in `running` until watchdog marks it `failed` at deadline.
- **Generator completes after watchdog marked task `failed`**: the final `UPDATE ... SET skill_status='completed'` wins (lexicographic last-writer-wins). Acceptable — preferable to hiding a successful result.
- **Same task dispatched twice in quick succession**: both dispatches race the `UPDATE tasks`; the second one overwrites `active_skill` and extends the deadline. End result: whichever generator finishes last writes the artifact. User-level duplicate prevention lives in the UI (disable the trigger while `skill_status='running'`).
- **Anthropic API returns an invalid JSON shape**: generator logs the error, sets `skill_status='failed'` with `metadata.skill_error`, and does not retry automatically.
