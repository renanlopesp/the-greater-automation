# Spec 063: Hybrid Chat Architecture — Messages API + Managed Agents

**Status:** Proposed
**Date:** 2026-04-12
**Depends on:** Spec 058 (Managed Agents migration), Spec 062 (Unified agent generators)

## Problem

The chat (`/api/chat`) currently runs on the Claude Managed Agents API. For simple conversational messages, this is too slow:

| Scenario                          | Current latency | Expected    |
| --------------------------------- | --------------- | ----------- |
| "Olá" (no tools)                  | 5-7s            | 1-2s        |
| "Quanto vendi hoje?" (1 MCP tool) | 14s             | 4-6s        |
| Seasonal calendar generation      | 30-60s          | 30-60s (OK) |

### Measured baseline (via `scripts/bench-agent.ts`)

- Managed Agent minimal (no MCP, 28-char prompt): **3.5-8s** variance
- Managed Agent real (MCP + 4k system prompt): **5-7s** for "Olá"
- Tool-using query: **14s** total (tool ~3s, agent post-tool thinking ~6s)

### Root causes

1. **Architectural overhead**: Managed Agents requires 3 HTTP requests per message (session create → event send → stream open) vs Messages API's single POST.
2. **No explicit prompt caching**: 4k-token system prompt is re-processed on each new session.
3. **Model fixed on agent**: Can't select model per request; requires `agents.update()` + version bump.
4. **Opaque thinking**: `agent.thinking` event is a progress signal only — no access to reasoning content for streaming UI.

The Managed Agents API is designed for long-lived autonomous agents (Claude Code, Cursor) and human-in-the-loop workflows. For short conversational chat, Messages API is a better fit.

## Goals

- Cut simple chat latency from 5-7s → 1-2s.
- Cut tool-using chat latency from 14s → 4-6s.
- Preserve current artifact pipeline (Spec 058-E, Opção B).
- Preserve skill execution via Managed Agents (seasonal-calendar, copywriter, image-gen, etc.) — they are a good fit.
- Preserve current UX: streaming text, artifact panel, task-based history, follow-ups.

## Non-Goals

- Do not replace Managed Agents for skills — they benefit from state, progress, cancel/resume.
- Do not change how skills store `tasks.artifact_data` / `artifact_type`.
- Do not break existing conversation / task history schema.

## Proposed architecture

Two clear lanes:

| Lane           | Engine                              | Use cases                                                                                 |
| -------------- | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| **Chat lane**  | Messages API (direct, streaming)    | Conversational replies, retail tool queries (sales, stock, orders), app integrations list |
| **Skill lane** | Managed Agents (current, unchanged) | Seasonal Calendar, Copywriter, Image Generator, Campaign Deliverables, Brand DNA refresh  |

The chat route becomes a **router**:

```
POST /api/chat
  │
  ├─ Detect skill request? (via regex / classifier / explicit skill_slug)
  │    YES → fire-and-forget Managed Agent skill run (background)
  │         return taskId + short ack text
  │         artifact panel fills via Supabase Realtime
  │
  └─ Normal chat → Messages API (streaming)
       with tools (same MCP tools, but declared inline)
       responds directly in 1-6s
```

## Design details

### 1. Messages API chat engine (new `lib/chat/engine.ts`)

- Use `anthropic.messages.stream()` with `tools` declared inline.
- System prompt: same builder as today (`buildOrchestratorSystemPrompt`), but **with `cache_control: { type: 'ephemeral' }`** on the system block for prompt caching (reduces TTFT on subsequent requests in the same conversation window).
- Maintain conversation history in `conversation_messages` (already does). Load last N messages and pass as `messages: [...]`.
- Handle tool_use events inline:
  - Execute tool call (hit the same Edge Function tool handlers, factored out of MCP server).
  - If tool returns `__artifact`, write to `tasks.artifact_data` (fire-and-forget — reuses `saveArtifact` helper from Spec 058-E).
  - Feed tool_result back to model, continue streaming.

### 2. Tool layer refactor

Today's MCP Edge Function (`supabase/functions/mcp-tools/index.ts`) is where tools live. We need the same tool logic accessible to **both** lanes:

- **Extract tool handlers** to a shared TypeScript module (e.g. `lib/ai/tools/retail.ts`, `lib/ai/tools/platform.ts`).
- MCP Edge Function imports shared handlers and wraps them in `McpServer.registerTool(...)`.
- New Messages-API chat engine imports the same handlers and wraps them as Anthropic `tools: [...]` definitions.

Trade-off: tool handlers must now run in two environments (Deno Edge Function + Node.js Next.js runtime). Keep them pure (no Deno/Node-specific APIs).

Alternative: keep tools only in Edge Function, call them over HTTP from Next.js. Simpler code, +100-300ms per tool call. Acceptable.

### 3. Skill-request detection

Two approaches (pick one):

**A. Explicit skill_slug in request body**
Frontend always knows which skill the user selected (via the skill selector in the hero). Chat sends `skill_slug` as a hint. Backend just checks `body.skill_slug` and routes.

- Pros: deterministic, no classifier cost.
- Cons: free-text requests like "me dá o calendário" don't trigger unless UI explicitly picks skill.

**B. Lightweight classifier (Haiku)**
First pass: Haiku 4.5 quick-classifies the message as `chat` vs `skill:<slug>`. ~300ms.

- Pros: works for any natural phrasing.
- Cons: extra latency + extra call.

**Recommended: A** (explicit hint) combined with a simple keyword match fallback for obvious cases ("calendário", "campanha sazonal", etc.).

### 4. Artifact flow (unchanged)

Opção B from Spec 058-E remains:

- Tools return `{ ...data, __artifact: { type, title, html } }`.
- Chat route (now Messages API) sees tool_result, extracts `__artifact`, saves to `tasks.artifact_data` + `artifact_type='chat-data'` + `skill_status='completed'`.
- Frontend picks up via Realtime; `ArtifactRenderer` renders the HTML in the right panel.

### 5. Skills (unchanged)

When chat route detects a skill request:

- Fire-and-forget: call `askAgent(teamId, prompt, {...})` in background (the existing Managed Agents path).
- Immediately respond to user with "Gerando X…" + `taskId`.
- Frontend navigates to `/chat/task/:id`, shows progress, artifact appears when done.

## Edge Functions impact

Current Edge Functions in `supabase/functions/`:

| Function      | Used by                                      | Decision                         |
| ------------- | -------------------------------------------- | -------------------------------- |
| `mcp-tools`   | Managed Agents (skills + current chat route) | **Keep initially, retire later** |
| `studio-chat` | Studio assistant                             | **Out of scope** (unchanged)     |

### `mcp-tools` — retention path

**Phase 1 (during hybrid rollout):** Keep as-is.

- Skills still run on Managed Agents → still need MCP tools over HTTP.
- Chat route (new) uses the **shared handler modules** directly, bypassing the Edge Function.
- Tool logic lives in `lib/ai/tools/*.ts`; the Edge Function becomes a thin MCP adapter that imports those modules (if Deno allows) or mirrors them with minimal duplication.

**Phase 2 (post-hybrid, evaluate):** Retire if no caller remains.

- Trigger for retirement:
  - All skills migrated off Managed Agents to direct Messages API + tools (future spec).
  - No external MCP client (e.g. Claude Code `.mcp.json`) depending on the HTTP endpoint.
- Action:
  - Remove `supabase/functions/mcp-tools/index.ts`.
  - Delete Edge Function via Supabase dashboard (or `supabase functions delete mcp-tools`).
  - Remove `MCP_AUTH_TOKEN` from Supabase Secrets.
  - Drop `mcp_servers` + `mcp_toolset` from existing agents via `agents.update()`.
  - Remove `.mcp.json` reference if present.
  - Update `docs/MCP_EDGE_FUNCTION_ARCHITECTURE.md` — mark as archived.

**Phase 2 is NOT part of this spec.** It requires a follow-up spec once all skills are verified to work with direct Messages API.

### Shared code strategy

To avoid divergence between `mcp-tools` Edge Function and the new chat engine:

- Create `lib/ai/tools/` with **pure handler functions** (e.g., `listOrders(ctx, input)`, `querySales(ctx, input)`, `queryStock(ctx, input)`).
- Each handler receives a minimal `ctx` object (teamId, userId, storeId, supabase client, nuvemshop token) — no platform-specific globals.
- Edge Function imports handlers via `npm:` specifier once published, OR duplicates via automated codegen (simpler short-term).
- Chat engine imports directly.

Trade-off: Deno Edge Function can't natively import from `src/lib`. Options:

- Publish shared modules as a private npm package (clean, but overhead).
- Copy handlers into `supabase/functions/_shared/` and have both sides import from there via symlink or build step (pragmatic).
- Keep tool logic only in Edge Function, have Next.js chat engine call it over HTTP (simpler, +100-300ms per tool call — acceptable for v1).

**Recommended:** Option 3 (HTTP call) for the initial hybrid rollout. Zero duplication, zero build complexity. Revisit in Phase 2 if latency needs to drop further.

## Migration plan

1. **Extract tool handlers** from MCP Edge Function to `lib/ai/tools/*.ts`.
2. **Build `lib/chat/engine.ts`** with Messages API streaming + inline tools + prompt caching + same persistence.
3. **New `/api/chat`** uses `engine.ts`; the old Managed Agents path is kept behind a feature flag (`FEATURE_HYBRID_CHAT`) for quick rollback.
4. **Skill detection**: add `skill_slug` to request body; route to Managed Agents for skills, to new engine for chat.
5. **Verify**: `bench-agent.ts` + manual Playwright tests comparing latency before/after.
6. **Clean up**: remove feature flag, remove dead code, update memory note.

### Feature flag

```ts
// src/app/api/chat/route.ts
if (process.env.FEATURE_HYBRID_CHAT === 'true' && !isSkillRequest) {
  return chatViaMessagesApi(body, user, teamId)
}
// existing Managed Agents path
```

## Risks

- **Tool duplication**: Shared tool handlers must work in both Deno (Edge) and Node.js (Next.js). Pure functions only; no platform-specific APIs.
- **Prompt caching TTL**: ephemeral cache lasts 5 minutes. Bursty conversations benefit; sparse ones don't.
- **Streaming UX divergence**: Messages API emits `content_block_delta` directly; today's chat wrapper expects `UIMessageChunk` (via `createUIMessageStream`). Need a thin adapter.
- **Fallback**: if Messages API call fails, fallback to Managed Agents (seamless to user).

## Success metrics

- P50 latency for "Olá": **< 2s** (from 5-7s)
- P50 latency for "quanto vendi hoje?" (1 tool): **< 5s** (from 14s)
- Skill start-to-artifact: **unchanged** (still via Managed Agents)
- Zero regression in artifact rendering, follow-ups, conversation history.

## Rollback plan

- Feature flag `FEATURE_HYBRID_CHAT=false` returns to current behavior instantly.
- Keep dead code for one sprint after launch.

## Open questions

- Should we use Haiku for the classifier (Option B) for free-text skill detection, or is explicit `skill_slug` enough?
- Do we preserve the `conversations` table (Anthropic session ID → null when using Messages API), or introduce a new column to distinguish engines?
- Should the Edge Function MCP server stay for external callers (Claude Code, etc.), or retire it entirely once the hybrid path is live?
