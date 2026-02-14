# Implementation Plan: Autonomous Agent with Dynamic Skill Creation

**Branch**: `018-autonomous-agent-skills` | **Date**: 2026-02-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-autonomous-agent-skills/spec.md`

## Summary

Transform agents from text-only chatbots into autonomous AI entities that understand natural language requests, dynamically discover available tools from connected OAuth apps via Composio, execute actions in real time, chain multi-step workflows, and save successful executions as reusable skills. Leverages the existing Kiro Chat API (OpenAI-compatible with function calling support) and Composio SDK (250+ app actions) as the execution backbone.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6 (App Router), React 19, Composio SDK (`composio-core`), Kiro Chat API (OpenAI-compatible, streaming + function calling), TanStack React Query, Zustand
**Storage**: Supabase (PostgreSQL) — existing tables: `agents`, `agent_conversations`, `agent_messages`, `agent_skills`, `app_connections`
**Testing**: Vitest + @testing-library/react + happy-dom (unit), Playwright (E2E)
**Target Platform**: Web (Next.js SSR + client)
**Project Type**: Web application (Next.js monolith)
**Performance Goals**: Single action execution < 10s, streaming chat response starts < 1s, conversation history loads < 500ms
**Constraints**: Kiro Chat API 30s timeout, Composio rate limits per app, OAuth token expiry during execution
**Scale/Scope**: Per-agent tool catalog of 50-200 actions, conversations up to 100 messages, skill library per agent

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                            | Status | Notes                                                                                                                                                                     |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Next.js App Router First          | PASS   | Chat API route uses Route Handler. Conversation loading via Server Components. `"use client"` only for chat UI components.                                                |
| II. shadcn/ui Component System       | PASS   | Chat UI built with shadcn primitives (Button, Textarea, ScrollArea, Badge, Card). No parallel UI systems.                                                                 |
| III. Tailwind CSS v4 + OKLCH Theming | PASS   | All chat UI styling via Tailwind classes + CSS variables. No inline styles or hex colors.                                                                                 |
| IV. TypeScript Strict Mode           | PASS   | All new code in strict TS. Zod validation on API inputs (chat message, skill save). Generated DB types from Supabase.                                                     |
| V. Simplicity and YAGNI              | PASS   | Reuses existing `executeAppStepWithAI` pattern. No custom orchestration engine — the AI model handles planning via function calling. No scheduled execution (P3+ future). |
| VI. Supabase as Backend              | PASS   | All persistence via Supabase. RLS on all tables. RPC functions for complex operations. No external databases.                                                             |

## Project Structure

### Documentation (this feature)

```text
specs/018-autonomous-agent-skills/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── chat-api.md      # Chat API with tool calling
│   └── skill-api.md     # Skill save/invoke API
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/agents/[id]/
│       └── chat/route.ts              # REWRITE — tool-calling agent loop
├── lib/
│   ├── ai/
│   │   └── agent-chat.ts              # REWRITE — function calling + tool execution
│   ├── composio/
│   │   ├── client.ts                  # EXISTING — Composio singleton
│   │   ├── tool-catalog.ts            # NEW — build OpenAI-compatible tool definitions
│   │   ├── execute-with-ai.ts         # EXISTING — single action execution (reuse internally)
│   │   └── actions/
│   │       ├── get-app-actions.ts     # EXISTING — fetch action catalog
│   │       ├── get-available-apps.ts  # EXISTING — list integrations
│   │       └── get-app-connections.ts # EXISTING — user's connected apps
│   ├── actions/
│   │   └── agent-skills.ts           # NEW — save/invoke skill server actions
│   └── queries/
│       └── agent-conversations.ts    # NEW — conversation history queries
├── hooks/
│   ├── use-agent-chat.ts             # REWRITE — load history, tool execution display
│   └── use-app-connections.ts        # EXISTING — connected apps
├── components/
│   └── agent-detail/
│       ├── chat-panel.tsx            # MODIFY — tool execution display
│       ├── chat-messages.tsx         # MODIFY — tool result rendering
│       ├── chat-message.tsx          # MODIFY — tool call/result message types
│       ├── tool-execution-card.tsx   # NEW — inline tool execution display
│       └── save-skill-dialog.tsx     # NEW — save execution as skill
└── stores/                           # No new stores needed
```

**Structure Decision**: Single Next.js monolith (consistent with existing project). All new code extends existing modules. No new top-level directories needed.

## Complexity Tracking

No constitution violations. No complexity justifications needed.

---

## Phase 0: Research

### R1: Kiro Chat API Function Calling

**Decision**: Use OpenAI-compatible `tools` parameter with `tool_choice: "auto"` for the Kiro Chat API.

**Rationale**: The Kiro Chat API is OpenAI-compatible. OpenAI's function calling protocol sends `tools` array in the request, and the model returns `tool_calls` in the response. This is a standard protocol that the existing `executeAppStepWithAI` already uses implicitly (by asking the AI to return JSON). Moving to native function calling gives structured tool selection instead of fragile JSON parsing.

**Alternatives considered**:

- Continue with JSON-in-text approach (current `executeAppStepWithAI`): Fragile, no retry semantics, no multi-tool support
- Custom orchestration layer: Over-engineered, violates YAGNI

### R2: Tool Catalog Format

**Decision**: Map Composio action schemas to OpenAI function definitions at runtime. Each connected app's actions become available functions.

**Rationale**: Composio's `actions.list({ apps: appId })` returns JSON Schema parameters. OpenAI's function calling expects `{ name, description, parameters: JSONSchema }`. The mapping is nearly 1:1. Building the catalog at request time ensures it always reflects the user's current connections.

**Alternatives considered**:

- Pre-cached tool catalog in DB: Stale data problem, sync complexity
- Hardcoded tool definitions: Defeats the purpose of dynamic discovery

### R3: Multi-Step Execution Pattern

**Decision**: Use the AI model's native multi-turn tool calling. After each tool execution, feed results back as `tool` role messages and let the AI decide the next action.

**Rationale**: Modern LLMs with function calling naturally handle multi-step reasoning. The model calls a tool, gets the result, and decides whether to call another tool or respond to the user. This eliminates the need for a custom orchestration engine.

**Alternatives considered**:

- Custom step planner: Complex, requires maintaining execution DAGs
- Sequential pipeline with human confirmation: Too slow for interactive chat

### R4: Conversation Persistence Model

**Decision**: Extend existing `agent_messages` table. Store tool calls and results as messages with `role: 'assistant'` (with `metadata.tool_calls`) and `role: 'tool'` (with `metadata.tool_call_id`). Load last 50 messages as context window.

**Rationale**: Keeping all message types in a single table simplifies queries and maintains chronological order. The `metadata` JSONB field (already exists) stores structured tool call data without schema changes.

**Alternatives considered**:

- Separate tool_executions table: Breaks conversation flow, complex joins for context
- Embed tool data in content field: Loses structure, can't re-execute

### R5: Skill Persistence

**Decision**: Add `action_template JSONB` column to `agent_skills`. Skills store the action sequence and parameter patterns extracted from successful executions. The existing `workflow_id` FK becomes optional (NULL for dynamic skills).

**Rationale**: Skills are essentially saved tool call patterns. Storing them as JSONB templates means they can be re-invoked without a full workflow definition. The optional workflow_id preserves backward compatibility with manually-linked skills.

**Alternatives considered**:

- Create full workflow from skill: Over-engineered for chat-first skills
- New skills table: Unnecessary when agent_skills can be extended

---

## Phase 1: Design

See `data-model.md` for entity details, `contracts/` for API specifications, and `quickstart.md` for developer guide.

### Architecture Overview

```
┌─────────────┐     POST /api/agents/[id]/chat
│  Chat UI    │ ──────────────────────────────────────┐
│  (client)   │ ← SSE stream (text + tool status)     │
└─────────────┘                                        ▼
                                              ┌─────────────────┐
                                              │  Chat Route     │
                                              │  (route.ts)     │
                                              └────────┬────────┘
                                                       │
                                          ┌────────────┼────────────┐
                                          ▼            ▼            ▼
                                   ┌───────────┐ ┌──────────┐ ┌──────────┐
                                   │ Load      │ │ Build    │ │ Persist  │
                                   │ History   │ │ Tool     │ │ Messages │
                                   │ (Supabase)│ │ Catalog  │ │ (Supabase│
                                   └───────────┘ └────┬─────┘ └──────────┘
                                                      │
                                                      ▼
                                              ┌─────────────────┐
                                              │  Kiro Chat API  │
                                              │  (function call) │
                                              └────────┬────────┘
                                                       │
                                              ┌────────┴────────┐
                                              │ tool_calls?     │
                                              ├─── YES ─────────┤
                                              │                 │
                                              ▼                 │
                                     ┌─────────────────┐        │
                                     │ Execute via     │        │
                                     │ Composio SDK    │        │
                                     └────────┬────────┘        │
                                              │                 │
                                              │ result          │
                                              ▼                 │
                                     ┌─────────────────┐        │
                                     │ Feed result     │        │
                                     │ back to AI      │──── LOOP
                                     └─────────────────┘
                                              │
                                              │ (when AI responds with text)
                                              ▼
                                     ┌─────────────────┐
                                     │ Stream text to  │
                                     │ client via SSE  │
                                     └─────────────────┘
```

### Tool Calling Loop (Detailed)

1. Client sends `{ message, conversationId? }` to chat route
2. Route loads agent config, conversation history (last 50 messages), connected apps
3. `buildToolCatalog(connectedApps)` → fetches Composio actions for each app → maps to OpenAI function definitions
4. Call Kiro Chat API with `{ messages, tools, tool_choice: "auto", stream: true }`
5. Parse streaming response:
   - If `delta.content` → stream text to client
   - If `delta.tool_calls` → accumulate tool call, then:
     a. Send `event: tool_start` SSE to client (shows "Executing GitHub: Create Issue...")
     b. Execute via `composio.actions.execute()`
     c. Send `event: tool_result` SSE to client (shows result)
     d. Persist tool call + result as messages
     e. Call Kiro Chat API again with tool results appended
6. When AI finishes with text response → persist assistant message → close stream

### Key Reuse Points

| Existing Code             | Reused For                                                |
| ------------------------- | --------------------------------------------------------- |
| `executeAppStepWithAI`    | Internal pattern for action selection + execution + retry |
| `getAppActions(appId)`    | Fetching action catalog per connected app                 |
| `getAppConnections()`     | Discovering user's connected OAuth apps                   |
| `getComposio()`           | Composio SDK singleton                                    |
| `streamAgentChat()`       | Base streaming pattern (to be extended with tool calling) |
| `agent_messages.metadata` | Storing tool call details without schema changes          |
| Chat route SSE pattern    | Extended with tool execution events                       |
