# Spec 064 — Edge-Function-First Skills

**Status:** Proposed
**Date:** 2026-04-12
**Depends on:** Spec 063 (Hybrid chat API)
**Supersedes:** The short-circuit dispatch introduced in Spec 063 T022 (`generateCalendarInBackground` called directly from Next.js)

## Problem

Skill generators (seasonal-calendar, copywriter, image-generator, campaign-deliverable, asset-generator, email-template-generator) currently live inside the Next.js runtime:

- `src/lib/ai/seasonal-campaign-generator.ts`
- `src/lib/chat/engine-agents.ts::generateCalendarInBackground`
- `src/lib/ai/product-analyzer.ts`
- `src/lib/ai/email-template-generator.ts`
- `src/lib/ai/asset-generator.ts`
- `src/app/api/skills/seasonal-calendar/*/route.ts`
- Several other route handlers

This creates multiple problems:

1. **Next.js carries heavy work it shouldn't.** The web app allocates memory and CPU for 30-60s AI generations, competing with HTTP request handling.
2. **Vercel timeouts.** `maxDuration = 120` pushes against platform limits; long skills risk 504s in production.
3. **Split-brain logic.** Tool data-fetching lives in the MCP Edge Function but skill generation lives in Next.js. Same logic re-implemented in two runtimes (Deno vs Node).
4. **Heavy deploy surface.** Every AI change redeploys the whole Next.js app.
5. **Violates the original Spec 063 contract.** Spec 063 said "fire-and-forget `askAgent`"; we short-circuited it to avoid the Managed-Agent overhead, making the implementation inconsistent with the design.

The correct split the user articulated: **Next.js = dumb UI that reads the DB. Supabase Edge Functions + Managed Agents = all heavy work.**

## Target architecture

```
┌───────────────────────────────────────────────┐
│ Next.js                                       │
│                                               │
│ • Chat (fast, Messages API direct)            │
│ • UI — Server Components + shadcn/ui          │
│ • Reads tasks.artifact_data via Realtime      │
│ • ZERO AI generation logic                    │
│ • ZERO heavy data fetching                    │
└───────────────┬───────────────────────────────┘
                │ (1 POST per skill request)
                ▼
┌───────────────────────────────────────────────┐
│ Managed Agent (Anthropic, via askAgent)       │
│                                               │
│ • Interprets the user's intent                │
│ • Calls MCP tool SNEW_RUN_SKILL(slug, input)  │
│ • Writes a short ack message to chat          │
└───────────────┬───────────────────────────────┘
                │ (MCP tool invocation over HTTP)
                ▼
┌───────────────────────────────────────────────┐
│ Supabase Edge Functions (per skill)           │
│                                               │
│ • generate-seasonal-calendar                  │
│ • generate-copywriter                         │
│ • generate-image-artifact                     │
│ • generate-deliverable                        │
│ • Each function:                              │
│   - Reads brand_dna, store, products from DB  │
│   - Calls Nuvemshop API if needed             │
│   - Invokes Anthropic Messages API            │
│   - WRITES tasks.artifact_data + artifact_type│
│   - Sets skill_status = 'completed'           │
└───────────────┬───────────────────────────────┘
                │ (Supabase Realtime)
                ▼
          Next.js UI renders
```

## Goals

- **Move all skill generators to Supabase Edge Functions.** Remove them from Next.js source.
- **Restore Spec 063 fire-and-forget semantics:** the chat router's skill path just calls `askAgent`; the agent is responsible for triggering the generator via MCP tool.
- **Delete `src/lib/ai/seasonal-campaign-generator.ts`, `product-analyzer.ts`, `email-template-generator.ts`, `asset-generator.ts`** from the Next.js bundle.
- **Delete `src/app/api/skills/*/route.ts`** — generation endpoints become dead code.
- **Keep the Next.js chat engine lean** — just Messages API streaming + tool-call proxy to the MCP Edge Function.

## Non-goals

- Do not change how artifacts render in the UI. `tasks.artifact_data` / `artifact_type` schema stays identical; renderer components untouched.
- Do not change the MCP tool contract for the existing retail tools (`STORE_QUERY_SALES`, etc.).
- Do not rewrite chat history persistence — conversations/messages tables stay as-is.

## Scope — per-skill Edge Functions

### `supabase/functions/generate-seasonal-calendar/`

**Trigger**: MCP tool `SNEW_RUN_SKILL` in the existing `mcp-tools` Edge Function invokes this new function via HTTP or Supabase's function-to-function call. Alternatively: Edge Function wraps the Managed Agent's skill invocation signal in `SNEW_RUN_SKILL` and fans out.

**Input**: `{ team_id, task_id, user_id }` (store_id resolved inside).

**Behavior**:

1. Fetch brand_dna, store, products (from DB + Nuvemshop).
2. Call Anthropic Messages API (generateObject pattern) with the calendar prompt.
3. Write `tasks.artifact_data` (full calendar JSON), `artifact_type='seasonal-calendar'`, `skill_status='completed'`.
4. Emit progress updates during generation by writing `artifact_data.steps` periodically.

**Lifetime**: long-running (up to Supabase's Edge Function max — 150s wall clock; 400s CPU budget with background tasks).

### `supabase/functions/generate-copywriter/`

### `supabase/functions/generate-image-artifact/`

### `supabase/functions/generate-deliverable/`

Same pattern. Each one owns its pipeline end-to-end.

## MCP tool `SNEW_RUN_SKILL` — update

Currently returns a "generating" placeholder. After this spec, it becomes the dispatcher:

```ts
async SNEW_RUN_SKILL({ skill_slug, input }) {
  // 1. Mark task running
  await supabase.from('tasks').update({ skill_status: 'running', active_skill: skill_slug }).eq('id', taskId)

  // 2. Invoke the appropriate Edge Function (fire-and-forget)
  const endpoint = getSkillEndpoint(skill_slug)  // e.g. /functions/v1/generate-seasonal-calendar
  // Fire a POST but don't await; the Edge Function self-invokes via EdgeRuntime.waitUntil
  fetch(endpoint, { method: 'POST', body: JSON.stringify({ task_id: taskId, team_id, user_id, input }) })
    .catch((err) => console.error('Failed to dispatch skill:', err))

  // 3. Return immediately
  return { content: [{ type:'text', text: JSON.stringify({ status:'generating', skill: skill_slug }) }] }
}
```

## Next.js side — what gets deleted

| Remove                                                                    | Reason                                        |
| ------------------------------------------------------------------------- | --------------------------------------------- |
| `src/lib/ai/seasonal-campaign-generator.ts`                               | Moves to Edge Function                        |
| `src/lib/ai/product-analyzer.ts`                                          | Moves to Edge Function (shared with calendar) |
| `src/lib/ai/email-template-generator.ts`                                  | Moves to `generate-deliverable`               |
| `src/lib/ai/asset-generator.ts`                                           | Moves to `generate-image-artifact`            |
| `src/lib/chat/engine-agents.ts::generateCalendarInBackground`             | Merged into Edge Function                     |
| Skill-slug dispatch switch in `runAgentsEngineBackground` (Spec 063 T022) | Reverts to pure `askAgent` call               |
| `src/app/api/skills/seasonal-calendar/*/route.ts`                         | Dead code                                     |
| `src/app/api/skills/*/generate*/route.ts`                                 | Dead code                                     |

Net impact on Next.js bundle: ~3000+ LOC removed.

## Next.js side — what stays

- `src/app/api/chat/route.ts` — router
- `src/lib/chat/engine-messages.ts` — fast chat
- `src/lib/chat/engine-agents.ts::runAgentsEngine` — kept for chat-only Managed-Agent calls (legacy fallback)
- `src/lib/chat/engine-agents.ts::runAgentsEngineBackground` — simplified: just `askAgent`; the agent calls SNEW_RUN_SKILL which triggers the Edge Function
- `src/components/chat/artifacts/*` — renderers (read-only, consume DB rows)

## Schema / data contract

No changes. `tasks.artifact_data`, `tasks.artifact_type`, `tasks.skill_status` stay the source of truth. The Edge Functions write them; Next.js reads them.

## Migration plan

1. **Phase A — Move seasonal-calendar to Edge Function** (pilot):
   - Create `supabase/functions/generate-seasonal-calendar/` mirroring `generateCalendarInBackground` logic.
   - Deploy with `verify_jwt=false` + MCP secret check.
   - Update `SNEW_RUN_SKILL` MCP tool to dispatch.
   - Remove `generateCalendarInBackground` from engine-agents.
   - Remove the skill-slug dispatch switch from `runAgentsEngineBackground`.
   - Verify end-to-end.

2. **Phase B — Move remaining skills** one at a time (copywriter, deliverable, image-artifact).

3. **Phase C — Cleanup**:
   - Delete Next.js generator modules.
   - Delete unused `/api/skills/*` routes.
   - Remove the spec 063 temporary dispatch logic.
   - Verify bundle size reduction.

## Success metrics

- Next.js bundle size reduced by at least 2000 LOC (target: 3000+).
- `src/lib/ai/` contains only `agent-client.ts` (for chat's Managed-Agent fallback), `prompt-cache.ts`, `platform-tools.ts` (system-prompt builder).
- All heavy AI generations happen in Edge Functions (verifiable by checking `supabase/functions/` directory).
- `/api/skills/*` directory is empty or deleted.
- Chat latency unchanged or better.
- Skill generation latency unchanged or better.

## Risks

- **Deno vs Node differences**: some Next.js code uses Node-specific APIs. Each generator needs review (crypto, buffer handling, etc.). Most should port cleanly since they already use fetch + SDKs.
- **Supabase Edge Function timeout (150s wall)**: seasonal-calendar runs ~30-60s typically — fits. If a skill consistently exceeds 150s, break into a queue + worker pattern.
- **Shared helpers**: `buildOrchestratorSystemPrompt` etc. may be imported by multiple Edge Functions. Copy-paste or use `supabase/functions/_shared/` module.
- **MCP `SNEW_RUN_SKILL` dispatch**: if the Edge Function call fails, the task sits in `running` forever. Add a timeout watchdog cron that marks stale tasks `failed` after 10min.

## Rollback

Per-phase. If `generate-seasonal-calendar` misbehaves in production: revert the `SNEW_RUN_SKILL` dispatch to the old inline path and re-add `generateCalendarInBackground`. Flag: `FEATURE_EDGE_GENERATORS` (env).

## Why this is the right architecture

- **Clear separation of concerns** (what the user asked for):
  - Next.js = UI + router
  - Edge Function = compute
  - Managed Agent = intent + orchestration
- **Scales independently**: Edge Functions scale per-invocation; Next.js handles burst chat without contention.
- **Cheaper**: Edge compute is cheaper than Vercel Node time for long jobs.
- **Deployable independently**: redeploying a skill generator doesn't redeploy Next.js.
- **Aligns with the MCP-first design**: tools as Edge Functions is already the pattern (`mcp-tools/`); skills become peers, not Next.js neighbors.
