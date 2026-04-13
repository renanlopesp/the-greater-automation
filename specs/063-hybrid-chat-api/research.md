# Research — Spec 063 Hybrid Chat API

## Engine selection

### Decision

Use the **Messages API** (`anthropic.messages.stream()`) with explicit `tools: [...]` for the chat lane. Keep **Managed Agents** only for skills.

### Rationale

Benchmarks in `scripts/bench-agent.ts` measured:

- Managed Agents minimal agent (no MCP, 28-char system): **3.5-8s** variance for "Olá"
- Our provisioned agent (MCP + 4k system prompt): **5-7s** for "Olá", **14s** for single-tool query
- Architectural overhead is intrinsic: session create + event send + stream open is 3 RTT vs Messages API's 1 POST

Messages API supports the same tool_use / tool_result loop, streams `content_block_delta` events for token-by-token UI updates, and (critically) supports explicit `cache_control` on system/tool/message blocks — which Managed Agents does not expose.

### Alternatives considered

- **Stay on Managed Agents + optimize prompt**: cuts at most 1-2s; still ≥4s for a trivial reply.
- **Use Haiku on Managed Agents**: measured 9.9s for "Olá" (verbose default output + same arch overhead). Rejected.
- **Use Opus fast on Managed Agents**: 10-15s for "Olá". Verbose and slower. Rejected.
- **Messages API via Vercel AI SDK's `streamText`**: couples us to the SDK's tool abstractions. Rejected in favor of the native SDK for finer control over `cache_control`.

## Prompt caching strategy

### Decision

Use Anthropic's explicit prompt caching with `cache_control: { type: 'ephemeral' }` on:

1. The **system prompt block** (4k tokens, shared across all chats for a team).
2. The **tools block** (schemas are static).

Conversation messages are NOT cached (they change per turn).

### Rationale

- System prompt caching makes the first reply pay normal TTFT and subsequent replies in the same 5-minute window hit the cache (~80% cheaper + ~1s faster on long contexts).
- Tools block caching saves re-transmission of tool JSON schemas.
- Ephemeral TTL (5 min) aligns with typical chat burst patterns.

### Alternatives considered

- **No caching**: leaves 4k tokens re-processed per request. Rejected.
- **Persistent/1h cache**: same behavior at higher cost for low-traffic teams. Ephemeral is cheaper.

## Tool execution strategy

### Decision

**Phase 1: HTTP call to the existing `mcp-tools` Edge Function** via the MCP SDK's HTTP client, reusing the `secret` query-param auth already in place. The Edge Function stays online; the chat engine calls it as any other HTTP tool server.

### Rationale

- Zero code duplication between chat engine and skills pipeline.
- +100-300ms per tool call is acceptable; the raw query (e.g. Nuvemshop `/orders`) already takes 1-3s, so this is not the critical path.
- Matches the migration plan in spec.md "Phase 1 — Keep as-is".

### Alternatives considered

- **Extract handlers to `lib/ai/tools/*.ts`** imported by both sides: clean but requires either a private npm package (overhead) or a `supabase/functions/_shared` symlink build (flaky in Deno). Deferred to Phase 2 spec.
- **Re-implement tools inline in Next.js**: duplicates logic, doubles maintenance surface. Rejected.

## Skill detection strategy

### Decision

**Explicit `skill_slug` in the request body**, set by the frontend when the hero skill selector is non-empty; fall back to a small keyword regex ("calendário", "calendar", "seasonal", "campanha sazonal") to catch obvious freetext.

### Rationale

- Deterministic, no extra classifier latency.
- Matches current UX where users usually pick a skill pill before typing.
- Keyword regex covers the seasonal-calendar case that already works today; expanding the keyword list is cheap.

### Alternatives considered

- **Haiku classifier per message**: adds ~300ms, another LLM bill, and a new failure mode. Deferred until user telemetry shows free-text skill requests being missed.
- **Route all messages through chat engine + let the model call `SNEW_RUN_SKILL`**: that is effectively what the current Managed Agents implementation does; it is exactly the 14-second path we're replacing.

## Feature flag behaviour

### Decision

`FEATURE_HYBRID_CHAT` is an env var read per-request:

- `'true'` → new hybrid router
- anything else (including unset) → current Managed Agents proxy behaviour

Set via Vercel env vars; toggling requires no deploy (instant rollback).

### Rationale

Simple, standard Next.js pattern. Matches how existing flags in the project are wired (no central flag service).

## Streaming adapter

### Decision

Wrap Messages API's `content_block_delta` stream inside `createUIMessageStream` (the `ai` package's helper) so the frontend consumer (`useOrchestratorChat`) keeps receiving the same `UIMessageChunk` events it does today. No frontend changes required.

### Rationale

- Frontend already works with UIMessageChunk. Rewriting the hook to consume raw SSE is extra work for no user-visible gain.
- Adapter is ~30 lines: translate each text delta to `writer.write({ type: 'text-delta', ... })`, tool_use to `tool-input`, tool_result to `tool-output`.

### Alternatives considered

- **Switch frontend to consume Messages API stream directly**: requires rewriting `useOrchestratorChat` + its two call sites. Rejected; no benefit to UX.

## Persistence

### Decision

Reuse the existing `conversations` / `conversation_messages` tables. The Messages API path writes `role='user'` before the call and `role='assistant'` with the accumulated text after the stream closes, exactly as the current Managed Agents path does.

The `conversations.anthropic_session_id` column becomes nullable (already is) and is left NULL on hybrid-chat rows.

### Rationale

Keeps conversation history compatible with both engines; user can see the same chat list regardless of which engine handled each turn.

### Alternatives considered

- **New `chat_messages` table per engine**: overkill; data shape is identical.
- **Serialize Messages API response shape for future replays**: YAGNI.

## Open questions resolved

| Question (from spec.md)                    | Resolution                                                      |
| ------------------------------------------ | --------------------------------------------------------------- |
| Haiku classifier (B) vs explicit slug (A)? | **A** + keyword regex fallback                                  |
| Preserve `conversations` table vs new?     | **Preserve**; leave `anthropic_session_id` NULL for hybrid rows |
| Retire `mcp-tools` Edge Function?          | **Not in this spec** — retire later once skills also migrate    |
