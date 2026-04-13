# Research — Spec 064 Edge-Function-First Skills

## 1. Edge Function invocation pattern

### Decision

The MCP tool `SNEW_RUN_SKILL` (inside `supabase/functions/mcp-tools/index.ts`) dispatches to generator functions via a **direct `fetch()` to the function's HTTPS URL**, wrapped in `EdgeRuntime.waitUntil(...)` so the dispatch survives after the tool returns its 202-ish ack. The generator function itself also uses `EdgeRuntime.waitUntil` to continue heavy work after returning its own HTTP 202.

```ts
// Inside mcp-tools/index.ts, SNEW_RUN_SKILL handler
const endpoint = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-${skill_slug}`
const body = JSON.stringify({ team_id: teamId, task_id: taskId, user_id: userId, input })

// Fire the HTTP call; do NOT await (waitUntil lets it survive the tool response)
EdgeRuntime.waitUntil(
  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('MCP_AUTH_TOKEN')}`,
    },
    body,
  }).catch((err) => console.error('[SNEW_RUN_SKILL] dispatch failed:', err))
)

return {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        status: 'generating',
        skill: skill_slug,
        dispatched_at: new Date().toISOString(),
      }),
    },
  ],
}
```

The generator function returns `202 Accepted` immediately after validating input + marking the task, then runs the actual Anthropic + Nuvemshop work inside `EdgeRuntime.waitUntil(heavyWork())`.

### Rationale

- `fetch()` to the function's public URL is the officially supported cross-function call pattern on Supabase; the alternative (`supabase.functions.invoke()` from `@supabase/supabase-js`) adds no value in Deno-to-Deno calls and pulls extra dependency weight.
- `EdgeRuntime.waitUntil` is the only way to extend the 150s wall clock (up to ~400s CPU budget) once an HTTP response has been sent, which is exactly what a "fire-and-forget generator" needs.
- Keeps the dispatcher stateless: the MCP tool doesn't need to know anything about how the generator works.

### Alternatives considered

- **Invoke via `supabase.functions.invoke(slug, { body })`**: wraps the same HTTP call with SDK plumbing; provides no benefit for server-to-server dispatch and hides the auth header.
- **Queue via `pg_net` / `pgmq`**: overkill for a single-consumer fire-and-forget pipeline. Adds a table, a worker, and an operational surface we don't need.
- **Database trigger on `tasks.skill_status = 'running'`**: couples DB writes to HTTP side-effects; harder to observe and debug. Rejected.

---

## 2. Shared Deno modules

### Decision

Create `supabase/functions/_shared/` with small, single-purpose modules. Generator functions import via relative paths (`../_shared/anthropic.ts`). Supabase's deploy pipeline already bundles everything referenced by relative imports.

Layout:

```
supabase/functions/_shared/
├── anthropic.ts          # getAnthropicClient() + thin messages.create wrapper
├── supabase.ts           # createServiceRoleClient() — service_role key from env
├── auth.ts               # checkMcpSecret(req): reads Authorization header or ?secret= param
├── brand-dna.ts          # fetchBrandDna(client, teamId) → { niche, audience, tone, ... }
├── products.ts           # fetchProductsForTeam(client, teamId) → ({ name, price }[], source)
│                         #   Nuvemshop client inlined here (port of src/lib/nuvemshop/client.ts minimum)
├── progress.ts           # updateTaskProgress(client, taskId, steps[]) — writes artifact_data.steps
└── seasonal-prompt.ts    # buildSeasonalCalendarPrompt(input): ports the Zod schema + prompt string
                          #   from src/lib/ai/seasonal-campaign-generator.ts
```

### Rationale

- Relative imports out of `_shared/` are the canonical Supabase pattern (used across their own examples).
- Single-purpose files keep each generator's entrypoint short (`index.ts` = ~80-120 LOC: parse → fetch → call Anthropic → write → return).
- Types stay local: no attempt to share TS types with Next.js. The source of truth is the DB schema; both sides read the same `tasks.artifact_data` JSON.

### Alternatives considered

- **Private npm package (`@relay/skill-shared`)**: adds publish / versioning / CI overhead; for four consumers in one repo, the `_shared/` dir is strictly simpler.
- **Symlink `src/lib/ai/*.ts` into Supabase functions**: tried elsewhere in the ecosystem; Deno resolvers are fragile with cross-directory symlinks. Rejected.
- **Single monolithic `_shared/index.ts`**: harder to tree-shake and reason about. Rejected.

---

## 3. Long-running Edge Function budget

### Decision

Seasonal-calendar generation takes 30-60s end-to-end (measured on current Next.js implementation). Supabase Edge Functions allow 150s wall-clock from request start, and `EdgeRuntime.waitUntil` extends background work up to 400s CPU budget. This comfortably fits seasonal-calendar. The same envelope fits copywriter (~20s) and image-artifact (~40s).

Generator skeleton:

```ts
Deno.serve(async (req) => {
  if (!checkMcpSecret(req)) return new Response('Unauthorized', { status: 401 })
  const { team_id, task_id, user_id, input } = await req.json()

  EdgeRuntime.waitUntil(runGenerator({ teamId: team_id, taskId: task_id, userId: user_id, input }))
  return new Response(JSON.stringify({ status: 'generating', task_id }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Rationale

- Returning 202 immediately means the caller (`mcp-tools`) doesn't block and the HTTP connection isn't kept open for the full generation.
- `waitUntil` gives us a formal extension that Supabase acknowledges and bills accordingly.

### Fallback if a skill ever exceeds 400s

- Split into a queue (`pgmq`) + a cron-triggered worker function that picks one job per invocation.
- Out of scope for v1 — revisit only if we hit the limit.

---

## 4. Progress updates

### Decision

Generators emit progress by **periodically writing to `tasks.artifact_data.steps`** via the service-role Supabase client. The Next.js UI already subscribes to `tasks` changes via Supabase Realtime (feature delivered in prior specs), so steps propagate to the running-state UI without any new plumbing.

Shape (unchanged from current `generateCalendarInBackground`):

```ts
artifact_data: {
  steps: [
    { label: 'Analisando Brand DNA...', done: true },
    { label: 'Gerando com IA...', done: false },
  ]
}
```

Implemented in `_shared/progress.ts`:

```ts
export async function updateTaskProgress(
  client: SupabaseClient,
  taskId: string,
  steps: { label: string; done: boolean }[]
) {
  await client
    .from('tasks')
    .update({ artifact_data: { steps }, updated_at: new Date().toISOString() })
    .eq('id', taskId)
}
```

### Rationale

- Zero new infrastructure. The running-state renderer already understands `artifact_data.steps`.
- Writing JSON rows is cheap compared to the Anthropic call; no throttling needed at current skill granularity (3-5 steps per run).

### Alternatives considered

- **Supabase Realtime Broadcast channel**: requires client subscribing to a new channel. More moving parts, no user-visible gain. Rejected.
- **`jsonb_set` via `execute_sql`**: marginal atomicity gain at the cost of readability. Rejected.

---

## 5. Deployment & secrets

### Decision

Each new function reads the same three secrets as `mcp-tools`:

- `ANTHROPIC_API_KEY`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `MCP_AUTH_TOKEN` (validates the dispatcher's bearer token)

Additionally, `generate-seasonal-calendar` reads per-store Nuvemshop tokens from the `stores.platform_access_token` column it fetches at runtime — **no new env var** for Nuvemshop.

Secrets set via `supabase secrets set KEY=value --project-ref <ref>` or the dashboard. Deploy commands:

```bash
supabase functions deploy mcp-tools --no-verify-jwt
supabase functions deploy generate-seasonal-calendar --no-verify-jwt
# same for generate-copywriter, generate-image-artifact, generate-deliverable
```

### Rationale

- All generator functions run as trusted backend workers behind the `MCP_AUTH_TOKEN` guard, so `--no-verify-jwt` is correct (the bearer token replaces Supabase's default JWT check).
- Matches how `mcp-tools` is already deployed; no new operational patterns.

---

## 6. Error handling & stuck-task recovery

### Decision

If a generator function crashes mid-run (OOM, panic, network failure), the `tasks` row is left with `skill_status='running'` forever, which is the same bug we have today. Fix it via a **deadline + recovery job**:

1. `SNEW_RUN_SKILL` writes `metadata.skill_deadline = now() + interval '10 minutes'` when marking the task running.
2. Generator updates `metadata.skill_deadline` on each progress step (extends the deadline).
3. Generator clears `metadata.skill_deadline` on `completed` / `failed`.
4. A scheduled `pg_cron` job runs every 2 minutes:

```sql
UPDATE tasks
SET skill_status = 'failed',
    metadata = metadata - 'skill_deadline' || jsonb_build_object('skill_error', 'watchdog_timeout')
WHERE skill_status = 'running'
  AND (metadata->>'skill_deadline')::timestamptz < now();
```

### Rationale

- A database-side watchdog is independent of any runtime, so it catches crashes of any layer (generator, dispatcher, both).
- 10-minute deadline is generous vs. the 60s worst case but not so long that users wait all afternoon.

### Alternatives considered

- **Retry automatically**: risks duplicate Anthropic charges without user consent. Mark failed instead; let the UI offer a retry button.
- **Use Anthropic's Managed Agent session state**: we're explicitly moving AWAY from Managed Agents for generators.

---

## 7. Next.js cleanup

Files to delete in Phase C (verified against the spec's "Next.js side — what gets deleted" table):

| File                                                                                               | Replaced by                                                                     |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/lib/ai/seasonal-campaign-generator.ts`                                                        | `supabase/functions/generate-seasonal-calendar/` + `_shared/seasonal-prompt.ts` |
| `src/lib/ai/product-analyzer.ts`                                                                   | `supabase/functions/_shared/products.ts` (inlined into calendar for now)        |
| `src/lib/ai/email-template-generator.ts`                                                           | `supabase/functions/generate-deliverable/`                                      |
| `src/lib/ai/asset-generator.ts`                                                                    | `supabase/functions/generate-image-artifact/`                                   |
| `src/app/api/skills/seasonal-calendar/**/route.ts`                                                 | dispatched directly by `SNEW_RUN_SKILL`; no HTTP route needed                   |
| `src/app/api/skills/**/generate*/route.ts`                                                         | same as above                                                                   |
| `src/lib/chat/engine-agents.ts` — `generateCalendarInBackground`                                   | generator Edge Function                                                         |
| `src/lib/chat/engine-agents.ts` — skill-slug switch in `runAgentsEngineBackground` (Spec 063 T022) | reverts to single `askAgent` call; skill dispatch happens via MCP tool now      |

Simplification inside `engine-agents.ts`:

- `runAgentsEngineBackground` no longer branches on `skillSlug === 'seasonal-calendar'`. It just invokes `askAgent` and lets the agent call `SNEW_RUN_SKILL`, which dispatches to the Edge Function.
- `buildSkillContext` keeps its calendar status message but removes the direct `void generateCalendarInBackground(...)` invocation.

---

## 8. Migration order

| Phase | Scope                                                                                                                                                                                                   | Rollback                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A     | Ship `supabase/functions/_shared/*` + `generate-seasonal-calendar`. Update `SNEW_RUN_SKILL` to dispatch. Remove the `skillSlug === 'seasonal-calendar'` short-circuit from `runAgentsEngineBackground`. | Revert the `SNEW_RUN_SKILL` change; keep the short-circuit; `generate-seasonal-calendar` function stays deployed but idle. |
| B     | Port copywriter, deliverable, image-artifact one at a time to dedicated Edge Functions.                                                                                                                 | Per-skill revert: feature flag `FEATURE_EDGE_GENERATORS_<SLUG>` toggles dispatch vs. Next.js path during cutover.          |
| C     | Delete Next.js modules (`src/lib/ai/seasonal-campaign-generator.ts`, etc.) and `src/app/api/skills/**`. Remove the flag.                                                                                | Git revert of the cleanup commit; functions stay live.                                                                     |

### Rationale

- Phase A validates the whole pattern (dispatcher + `_shared` + one generator) before fanning out.
- Phase B parallelizable across developers; each skill is independent.
- Phase C is pure deletion — safest operation once production has run on Edge for at least a week.

### Decisions carried from Spec 063

- The chat-lane engine (Messages API, `engine-messages.ts`) is unchanged. This spec ONLY touches the skill lane.
- `tasks`, `conversations`, `conversation_messages` schema is unchanged.
- `saveArtifact` helper stays in `src/lib/chat/save-artifact.ts`; still used by the Messages API chat path for tool-result artifacts. It is NOT called by generator functions — they write `tasks.artifact_data` directly.
