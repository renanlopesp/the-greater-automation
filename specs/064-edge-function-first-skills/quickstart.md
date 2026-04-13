# Quickstart: Edge-Function-First Skills (Spec 064)

Manual verification checklist for the pilot skill (`seasonal-calendar`) and
the rollout path for remaining skills. Run through these steps end-to-end
before declaring the spec complete.

**Prerequisites:** Spec 063 is shipped. You can already send a "Gera o
calendário de 2026" request and get a `taskId` back.

---

## 1. Setup

- [ ] Checkout branch `feat/064-edge-function-first-skills`.
- [ ] Confirm Supabase secrets set on project `apsfeutbqvgfgznmaesg`:
  ```
  supabase secrets list
  ```
  Expected: `MCP_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_URL`.
- [ ] Confirm `.env.local` contains `MCP_AUTH_TOKEN` (same value) and
      `FEATURE_EDGE_GENERATORS=true`.
- [ ] Deploy the pilot function:
  ```
  supabase functions deploy generate-seasonal-calendar --no-verify-jwt
  ```
- [ ] Redeploy `mcp-tools` after updating its `SNEW_RUN_SKILL` dispatcher:
  ```
  supabase functions deploy mcp-tools --no-verify-jwt
  ```
- [ ] `bun run dev` starts without import errors (Node-side modules for the
      calendar generator should no longer be imported).

---

## 2. Happy path — seasonal-calendar via chat

- [ ] Open `http://localhost:3000`, log in, pick a team with a connected store
      and populated brand_dna.
- [ ] In the chat bar, click the **Calendário** skill pill.
- [ ] Type `Gera o calendário de 2026` and submit.
- [ ] Observe:
  - [ ] Next.js `/api/chat` returns JSON `{ ok: true, taskId, skill: 'seasonal-calendar' }` in ≤ 500ms (check DevTools Network tab).
  - [ ] Frontend navigates to `/chat/task/<taskId>`.
  - [ ] `X-Chat-Engine: managed-agents` header present.
- [ ] Open Supabase Dashboard → Edge Functions → `generate-seasonal-calendar` logs.
      Expect within ~3s of submission:
      `     [generate-seasonal-calendar] start task=<id> team=<id>
    [generate-seasonal-calendar] loaded brand_dna + N products
    `
- [ ] Wait 30–60s. Expect:
      `     [generate-seasonal-calendar] completed task=<id> total=<ms> dates=<n>
    `
- [ ] In Supabase SQL editor:
      `sql
    select skill_status, artifact_type, jsonb_array_length(artifact_data->'dates') as n
    from tasks where id = '<taskId>';
    `
      Expected: `completed`, `seasonal-calendar`, `n ≥ 16`.
- [ ] Right panel renders the calendar (month/week grid, product suggestions).

---

## 3. Error path — bad Anthropic key

- [ ] In Supabase secrets, temporarily overwrite:
      `     supabase secrets set ANTHROPIC_API_KEY=sk-bogus
    `
- [ ] Retry step 2 with a new chat message.
- [ ] Expect 202 from the Edge Function; background work fails.
- [ ] In SQL:
      `sql
    select skill_status, metadata->'error'
    from tasks where id = '<taskId>';
    `
      Expected: `failed`, `error` field non-null (e.g. `"anthropic_auth_error"`).
- [ ] Restore the real `ANTHROPIC_API_KEY`.

---

## 4. Dead-man's switch (T027)

- [ ] Manually insert a stale task:
      `sql
    insert into tasks (id, team_id, user_id, skill_status, active_skill, created_at)
    values (gen_random_uuid(), '<team>', '<user>', 'running', 'seasonal-calendar', now() - interval '15 min');
    `
- [ ] Wait for the cron to fire (or invoke it manually).
- [ ] Confirm the row flipped to `skill_status='failed'` with
      `metadata.error = 'stale_timeout'`.

---

## 5. Remaining skills (US3 — repeat per skill)

For each of `copywriter`, `deliverable`, `image-artifact`:

- [ ] Deploy `generate-<skill>` Edge Function.
- [ ] Trigger from chat via the matching skill pill.
- [ ] Confirm artifact type + data shape unchanged from Spec 063 baseline.
- [ ] Confirm the Next.js-side module (e.g. `asset-generator.ts`) is deleted
      and not imported anywhere (`bun run build` stays green).

---

## 6. Rollback verification

- [ ] Set `FEATURE_EDGE_GENERATORS=false` in Vercel env (no redeploy needed
      if read per-request).
- [ ] Submit the same "Gera o calendário" request.
- [ ] Confirm the legacy in-Next.js path runs (Vercel function logs show
      `[generateCalendarInBackground] start`).
- [ ] Restore `FEATURE_EDGE_GENERATORS=true`.

> Note: after T031 (delete dead code), rollback only works via git revert —
> the legacy path no longer exists. Gate T031 on one full week of clean
> production telemetry.

---

## 7. Bundle size check (T031)

- [ ] Run `bun run build`.
- [ ] Compare `.next/server/app/api/chat/route.js` size before/after. Expect
      reduction of ≥ 2000 LOC worth of bundled code.
- [ ] `ls src/app/api/skills/` — directory should be empty or deleted.
- [ ] `ls src/lib/ai/` — should contain only `agent-client.ts`,
      `prompt-cache.ts`, `platform-tools.ts` (chat-side helpers).

---

## 8. Final checks

- [ ] `bun run test` green.
- [ ] `bun run build` green.
- [ ] `bun run lint` green.
- [ ] Supabase function logs show no repeated 5xx in the last hour of canary.
- [ ] Memory note updated in
      `~/.claude/projects/-home-renanl-Projects-relay/memory/`.
