# Managed Agents Migration — Master Plan

**Date**: 2026-04-09
**Scope**: Full migration from Vercel AI SDK to Claude Managed Agents API
**Approach**: 6 specs, each independently testable, executed in order

---

## Spec Order & Dependencies

```
058-A: MCP Server (snew-tools)         ← no dependencies, standalone
058-B: Agent Provisioning + Onboarding ← depends on 058-A
058-C: Chat Engine Replacement         ← depends on 058-B
058-D: Composio MCP Integration        ← depends on 058-C
058-E: Skills + Artifacts via MCP      ← depends on 058-C
058-F: Billing + Cleanup               ← depends on all above
```

---

## 058-A: MCP Server (snew-tools)

**What**: Create a remote MCP server that exposes all SNEW*\* and STORE*\* tools.
**Why**: The Managed Agent needs to call our business logic tools. These must exist as an MCP server before the agent can use them.

**Tools to expose**:

- STORE_QUERY_SALES — query sales data by period/status
- STORE_QUERY_STOCK — query stock levels, low stock alerts
- STORE_LIST_ORDERS — list orders with status/filters
- SNEW_MODIFY_ARTIFACT — write HTML artifacts to tasks table
- SNEW_CHECK_CONNECTIONS — list connected Composio apps
- SNEW_LIST_AVAILABLE_APPS — all connectable apps
- SNEW_LIST_APP_CAPABILITIES — actions/triggers for an app
- SNEW_RUN_SKILL — execute a skill (seasonal-calendar, copywriter)
- SNEW_LIST_SKILLS — list active skills
- SNEW_CREATE_NOTIFICATION — send notifications

**How to test independently**: Run the MCP server locally, connect to it with a test client, call each tool and verify results come from Supabase.

**Deliverable**: `src/lib/mcp/snew-tools-server.ts` — stdio MCP server using `@modelcontextprotocol/sdk`

---

## 058-B: Agent Provisioning + Onboarding

**What**: Two-phase agent provisioning — generic agent at signup, personalized after brand DNA.
**Why**: Each customer needs their own agent, but brand DNA only exists after onboarding completes.

**Architecture Decision**: The onboarding flow IS conversational via the Managed Agent. The agent is created BEFORE brand DNA exists, with a generic "Snew Onboarding" prompt. After brand DNA analysis completes, the agent's system prompt is updated via `PATCH /v1/agents/{id}`.

**Flow**:

1. User signs up → `POST /v1/agents` with **generic onboarding prompt** (no brand DNA)
   - Model: claude-sonnet-4-6 (free) or claude-opus-4-6 (pro)
   - System prompt: `buildOrchestratorSystemPrompt({ mode: 'onboarding' })`
   - MCP servers: snew-tools (from 058-A)
2. `POST /v1/environments` for the container
3. Saves agent_id + env_id to teams table
4. User goes through onboarding **chatting with the generic agent**
5. Brand DNA analysis completes → `PATCH /v1/agents/{id}` with **full personalized prompt**
   - System prompt: `buildOrchestratorSystemPrompt({ mode: 'full', brandDna: {...} })`
6. Next conversation is with the specialized agent

**`buildOrchestratorSystemPrompt()` modes**:

- **`onboarding`**: Focused on guiding setup (connect store, analyze brand, configure skills). No brand-specific language.
- **`full`**: Complete prompt with brand DNA, palette, tone of voice, retail tools, marketing capabilities.

**How to test independently**: Run `/api/agents/provision` with a real team ID. Verify agent appears in Anthropic Console. Send a test message to the agent via curl. Complete onboarding, verify prompt updates.

**Deliverable**:

- `POST /api/agents/provision` route (creates generic agent)
- `POST /api/agents/update-prompt` route (upgrades to full prompt after brand DNA)
- `buildOrchestratorSystemPrompt()` refactored to support `onboarding` | `full` modes
- Migration: teams.anthropic_agent_id + teams.anthropic_env_id columns

---

## 058-C: Chat Engine Replacement

**What**: Replace `/api/chat` route — from Vercel AI SDK `streamText()` to Anthropic Sessions API proxy.
**Why**: This is the core of the product. Every chat message goes through this route.

**Flow**:

1. Auth + team lookup (keep)
2. Get team's agent_id + env_id (new)
3. Find/create conversation + Anthropic session (new)
4. Send user message via `sessions.events.send()` (new)
5. Stream response via `sessions.events.stream()` (new)
6. Translate events to UIMessageStream format (new)
7. Persist messages + deduct credits (keep)

**What gets deleted**:

- `agent-chat.ts` — entire file (manual agent loop)
- OpenAI provider setup
- Step count limiting (`stepCountIs(10)`)
- Manual tool routing

**What stays**:

- `buildOrchestratorSystemPrompt()` — still generates the prompt
- Auth, billing, conversation persistence logic
- Frontend hook + wrapper (zero changes)

**How to test independently**: Open chat, ask "Quanto vendi hoje?". Snew responds with sales data via MCP tools. Verify streaming works, reasoning shows, artifacts render.

**Deliverable**: Rewritten `/api/chat/route.ts`

---

## 058-D: Composio MCP Integration

**What**: Replace `@composio/vercel` + manual session management with `@composio/mcp` as a remote MCP server attached to the Managed Agent.
**Why**: The agent needs to execute actions on connected apps (Instagram, Gmail, Meta Ads) via Composio.

**What changes**:

- Composio tools load as MCP server (not in-process Vercel SDK)
- Connection management (MANAGE_CONNECTIONS) works via MCP
- Agent config includes composio MCP server URL

**What gets deleted**:

- `composio-session.ts` — replaced by MCP config on agent
- `filterComposioMetaTools()` — no longer needed
- `wrapComposioTools()` — no longer needed

**How to test independently**: Ask "quantos seguidores tenho no instagram?" in chat. Snew uses Composio MCP to query Instagram and returns real data.

**Deliverable**: Composio MCP server config on the Managed Agent

---

## 058-E: Skills + Artifacts via MCP

**What**: Make SNEW_RUN_SKILL and SNEW_MODIFY_ARTIFACT work through the MCP server.
**Why**: Skills (seasonal-calendar, copywriter) and artifacts (HTML dashboards) are core features.

**Skills flow**:

1. User asks "cria uma campanha de Dia das Mães"
2. Agent calls SNEW_RUN_SKILL via MCP → triggers seasonal-calendar skill
3. Skill generates calendar data → writes to task.artifact_data
4. Agent responds with summary, artifact renders in side panel

**Artifacts flow**:

1. User asks "Quanto vendi hoje?"
2. Agent queries sales via STORE_QUERY_SALES (MCP)
3. Agent calls SNEW_MODIFY_ARTIFACT (MCP) → writes HTML to task
4. Frontend renders HTML artifact with theme toggle

**How to test independently**: Ask for sales data → verify artifact renders. Ask for campaign → verify calendar appears.

**Deliverable**: MCP tools for skills + artifacts validated end-to-end

---

## 058-F: Billing + Cleanup

**What**:

1. Track credits per session with model-aware pricing
2. Remove dead code (agent-chat.ts, OpenAI provider, Kiro legacy, step counting)
3. Update CLAUDE.md, documentation

**Billing changes**:

- Extract token usage from session events
- Apply model-specific rates (Sonnet vs Opus)
- Track runtime cost ($0.08/session-hour)
- Pre-chat credit limit check

**Cleanup list**:

- DELETE: `src/lib/ai/agent-chat.ts` (874 lines)
- DELETE: `src/lib/ai/chat.ts` (Kiro legacy)
- DELETE: `src/lib/composio/composio-session.ts`
- TRIM: `src/lib/ai/platform-tools.ts` — keep only `buildOrchestratorSystemPrompt()`, delete all tool definitions (moved to MCP)
- DELETE: OpenAI imports and provider routing
- UPDATE: CLAUDE.md — remove stale Active Technologies entries

**How to test independently**: Build passes. All tests pass. No dead imports. Credit usage shows in billing.

**Deliverable**: Clean codebase, accurate billing

---

## Execution Order

Each spec follows: `/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/oh-my-claudecode:ralph`

```
Week 1:  058-A (MCP Server)           → foundation, no risk to current product
Week 1:  058-B (Agent Provisioning)   → can run in parallel with A
Week 2:  058-C (Chat Engine)          → the big switch
Week 2:  058-D (Composio MCP)         → can run in parallel with E
Week 2:  058-E (Skills + Artifacts)   → can run in parallel with D
Week 3:  058-F (Billing + Cleanup)    → final polish
```

## Risk Mitigation

- 058-A and 058-B are additive (don't break anything existing)
- 058-C is the only destructive change — keep the old route as fallback during development
- 058-D and 058-E depend on MCP server working — validate 058-A first
- 058-F is cleanup — only after everything works
