# Contract: `generate-seasonal-calendar` Edge Function

**Status:** Proposed
**Runtime:** Supabase Edge Function (Deno)
**Transport:** HTTP POST (fire-and-forget)
**Path:** `supabase/functions/generate-seasonal-calendar/index.ts`

This is the pilot Edge Function for Spec 064. It owns the full seasonal-calendar
generation pipeline end-to-end: reads brand DNA + products, calls Anthropic,
and writes the artifact back to `tasks.artifact_data`. Next.js never touches
this logic.

---

## Endpoint

```
POST https://<project-ref>.supabase.co/functions/v1/generate-seasonal-calendar?secret=<MCP_AUTH_TOKEN>
Content-Type: application/json
```

- **Auth:** `secret` query param must match `MCP_AUTH_TOKEN` Supabase secret.
  Same mechanism used by `mcp-tools/index.ts`. No JWT; deployed with
  `verify_jwt = false`.
- **CORS:** `Access-Control-Allow-Origin: *`, `POST, OPTIONS`.
- **Caller:** the MCP tool `SNEW_RUN_SKILL` (inside `mcp-tools/index.ts`) fans
  out to this endpoint when `skill_slug === 'seasonal-calendar'`.

---

## Request body

```ts
{
  team_id: string        // uuid — team that owns the task
  task_id: string        // uuid — row in `tasks` to write artifact to
  user_id: string        // uuid — requesting user (for audit)
  input?: {
    year?: number        // default: current year
    focus?: string       // optional user-provided focus hint
  }
}
```

**Zod schema:**

```ts
const RequestSchema = z.object({
  team_id: z.string().uuid(),
  task_id: z.string().uuid(),
  user_id: z.string().uuid(),
  input: z
    .object({
      year: z.number().int().min(2024).max(2030).optional(),
      focus: z.string().max(500).optional(),
    })
    .optional(),
})
```

---

## Response — 202 Accepted (success dispatch)

Returned immediately (target ≤ 200ms) once the request is validated and the
background task is scheduled via `EdgeRuntime.waitUntil`.

```json
{
  "ok": true,
  "taskId": "b3c8e2c4-...",
  "dispatched_at": "2026-04-12T14:22:11.402Z"
}
```

The actual generation continues in the background for 30–60s.

---

## Response — 400 Bad Request

Zod validation failure on request body.

```json
{ "ok": false, "error": "invalid_request", "details": [ ... zod issues ... ] }
```

## Response — 401 Unauthorized

Missing or mismatched `secret` query param.

```json
{ "ok": false, "error": "unauthorized" }
```

## Response — 500 Internal Server Error

Only returned for pre-dispatch failures (env/DB unreachable). Once the 202
is sent, further failures are recorded on the task row, not on the HTTP
response.

```json
{ "ok": false, "error": "internal", "message": "Supabase env missing" }
```

---

## Background work (post-202)

Runs under `EdgeRuntime.waitUntil(...)`:

1. `UPDATE tasks SET skill_status='running', active_skill='seasonal-calendar'
WHERE id = task_id` (idempotent if MCP tool already set it).
2. Load brand_dna for team, store record, up to 100 products (Nuvemshop via
   `_shared/nuvemshop.ts` + `store_products` for cost).
3. Call Anthropic Messages API via `_shared/anthropic.ts` with the calendar
   prompt; request a structured JSON calendar (16+ dates).
4. Emit progress by writing `artifact_data.steps[]` periodically (every
   major step) so the UI can render progress in real time via Realtime.
5. On success:
   ```sql
   UPDATE tasks SET
     artifact_type = 'seasonal-calendar',
     artifact_data = <full calendar JSON>,
     skill_status  = 'completed',
     updated_at    = now()
   WHERE id = task_id
   ```
6. On failure anywhere in steps 2–5:
   ```sql
   UPDATE tasks SET
     skill_status = 'failed',
     metadata     = jsonb_set(coalesce(metadata,'{}'), '{error}', to_jsonb(<msg>)),
     updated_at   = now()
   WHERE id = task_id
   ```

---

## Observability

All logs prefixed so Supabase dashboard filters cleanly:

```
[generate-seasonal-calendar] start task=<id> team=<id>
[generate-seasonal-calendar] loaded brand_dna + 84 products
[generate-seasonal-calendar] anthropic first-token t=4821ms
[generate-seasonal-calendar] completed task=<id> total=47300ms dates=18
[generate-seasonal-calendar] error task=<id> stage=anthropic msg=<...>
```

No PII or access tokens are logged.

---

## Timing targets

| Metric                      | Target                              |
| --------------------------- | ----------------------------------- |
| 202 dispatch response       | ≤ 200ms                             |
| Background generation (P50) | ≤ 35s                               |
| Background generation (P95) | ≤ 60s                               |
| Hard ceiling (wall clock)   | 150s (Supabase Edge Function limit) |

If a generation consistently exceeds 150s, the function must fail the task
with `metadata.error = 'timeout'` rather than leaving it `running`.

---

## Idempotency + retries

- Callers (MCP tool) MUST NOT retry on 202. The work is already scheduled.
- On 401/400, retry is safe (no work started).
- On 500, retry is safe (work not yet dispatched).
- If the same `task_id` is dispatched twice, both background runs will race
  on the `tasks` row. The MCP tool short-circuits if `skill_status='running'`
  to avoid this.

---

## Shared modules used

From `supabase/functions/_shared/`:

- `anthropic.ts` — Messages API client (thin wrapper over REST).
- `supabase.ts` — service-role client factory.
- `nuvemshop.ts` — `fetchProducts`, `fetchStore` (ported from
  `src/lib/nuvemshop/*`).
- `brand-dna.ts` — `loadBrandDna(supabase, teamId)`.
- `errors.ts` — `failTask(supabase, taskId, stage, message)`.
- `logging.ts` — `log(tag, fields)` helper.

---

## Dependencies on other contracts

- **Spec 063 chat-api contract:** unchanged. The chat router still returns
  `{ ok: true, taskId }` to the client when a skill is dispatched. Internally
  it now calls `askAgent`, which calls `SNEW_RUN_SKILL`, which calls this
  endpoint.
- **`mcp-tools` Edge Function:** `SNEW_RUN_SKILL` is updated to fan out to
  this URL based on `skill_slug`. See spec.md §"MCP tool update".
