# Quickstart — Spec 063 Hybrid Chat API

Manual verification checklist once the implementation lands on branch `063-hybrid-chat-api`.

## Setup

1. Pull the branch.
2. `bun install` (no new deps expected, but refresh the lockfile anyway).
3. Confirm env vars:
   - `ANTHROPIC_API_KEY` — required
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` — required
   - `MCP_AUTH_TOKEN` — required (Edge Function still in play)
   - `FEATURE_HYBRID_CHAT=true` — **enable the new path for local dev**
4. `bun dev`.

## Baseline (flag off)

1. In `.env.local`, set `FEATURE_HYBRID_CHAT=false` and restart.
2. Open http://localhost:3000/dashboard, send "Olá".
3. Expect: 5-7s to first text (Managed Agents path, current behavior).

## Hybrid path — conversational

1. Set `FEATURE_HYBRID_CHAT=true`, restart.
2. Send "Olá" from the dashboard.
3. Expect:
   - Response header `X-Chat-Engine: messages-api`
   - First text byte within **~2s**
   - Short greeting, follow-ups marker (`<!-- snew:followups ... -->`) stripped from UI but present in raw response
   - `conversations` row created with `anthropic_session_id = NULL`

## Hybrid path — single-tool query

1. Send "Quanto vendi hoje?".
2. Expect:
   - `X-Chat-Engine: messages-api`
   - Right-side artifact panel populates with "Resumo de vendas — Hoje" card (3 big-number stats) within ~3s
   - Assistant text finishes streaming within **~5s** total
   - No duplicate `SNEW_MODIFY_ARTIFACT` call (inspect network to the Edge Function; you should see exactly one POST per tool the model invoked)

## Hybrid path — multi-turn cache hit

1. Still in the same task, send a second message: "Como está meu estoque?".
2. Expect:
   - First text byte within **~1s** (prompt cache hit on system + tools blocks)
   - Stock artifact renders in the panel

## Skill path

1. Click the "Seasonal Calendar" pill and ask "Gera o calendário de 2026".
2. Expect:
   - `X-Chat-Engine: managed-agents`
   - Immediate 200 with `{ ok: true, taskId, skill: 'seasonal-calendar', message: 'Gerando...' }`
   - Frontend navigates to `/chat/task/<taskId>`
   - Progress steps stream into the right panel over 30-60s (unchanged from current behavior)
   - Final calendar artifact renders via `SeasonalCalendarArtifact`

## Rollback

1. Set `FEATURE_HYBRID_CHAT=false` in Vercel env.
2. Next request uses the legacy Managed Agents proxy — no deploy needed.
3. Confirm `X-Chat-Engine: managed-agents` on chat-path responses.

## Verification via benchmark script

From the repo root:

```bash
bun run scripts/bench-chat.ts  # (to be added in tasks phase)
```

Expected aggregates (P50 across 10 runs):

- Legacy (`FEATURE_HYBRID_CHAT=false`): "Olá" ≈ 5-7s, "vendas" ≈ 14s
- Hybrid (`FEATURE_HYBRID_CHAT=true`): "Olá" ≤ 2s, "vendas" ≤ 5s

Missing the hybrid targets is a failure — investigate caching headers (`prompt_cache_read_input_tokens` on the Messages API response) and tool call count before accepting the release.

## Regression checks

- Conversation list at `/chat` still shows mixed-engine history, scrolls, and preserves order.
- Existing `/chat/task/<uuid>` with a legacy-written artifact still renders (ArtifactRenderer input unchanged).
- Follow-up clicks (`snew:followups`) still submit the chosen text to `/api/chat` and produce a new turn.
- Credit increment (`increment_ai_credits`) runs exactly once per assistant message (check Supabase logs).
