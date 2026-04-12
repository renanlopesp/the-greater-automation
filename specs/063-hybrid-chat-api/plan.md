# Implementation Plan: Hybrid Chat Architecture

**Branch**: `063-hybrid-chat-api` | **Date**: 2026-04-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/063-hybrid-chat-api/spec.md`

## Summary

Split the chat lane from the skill lane. The `/api/chat` route, today a thin proxy over the Claude Managed Agents API, becomes a router that:

- Handles conversational messages and retail tool queries via the **Messages API** directly (`anthropic.messages.stream()` with inline tools + prompt caching), cutting "Olá" from 5-7s to ~2s and "Quanto vendi hoje?" from 14s to ~5s.
- Keeps long-running skill runs (seasonal-calendar, copywriter, image-generator, etc.) on **Managed Agents** (the current `askAgent` path), because they benefit from session state, progress tracking, and cancel/resume.

Rollout is gated by `FEATURE_HYBRID_CHAT`. Tool handlers stay in the MCP Edge Function in Phase 1 and are invoked over HTTP from the new chat engine to avoid code duplication; Phase 2 (extracting shared handlers to `lib/ai/tools/*.ts`) is out of scope for this spec.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Next.js 16.1.6 (App Router), React 19.2.3
**Primary Dependencies**: `@anthropic-ai/sdk` (Messages API + beta Managed Agents), `@supabase/ssr`, `@supabase/supabase-js`, `ai` (UIMessage streaming helpers), `zod/v4`
**Storage**: Supabase PostgreSQL — `conversations` (existing), `conversation_messages` (existing), `tasks` (existing, `artifact_type`/`artifact_data`/`skill_status` columns). No schema changes expected.
**Testing**: Vitest (`src/**/__tests__/*.test.ts`), Playwright for end-to-end latency validation
**Target Platform**: Vercel Node.js runtime (Next.js API routes), Supabase Edge Functions (Deno, unchanged for skills)
**Project Type**: web (Next.js monorepo)
**Performance Goals**: P50 first-token < 2s for tool-free chat, P50 complete response < 5s for single-tool chat; skills unchanged (30-60s for calendar)
**Constraints**: No regression in streaming UX, conversation history, artifact rendering, follow-ups; rollback via feature flag in one step
**Scale/Scope**: Single team tenancy, ~50-500 msgs/day per team; chat route changes isolated to `src/app/api/chat/route.ts` + `src/lib/chat/*` + `src/hooks/use-orchestrator-chat.ts` (adapter)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Compliance | Notes                                                                               |
| ------------------------------ | ---------- | ----------------------------------------------------------------------------------- |
| I. Next.js App Router First    | ✅         | Changes confined to existing Route Handler `src/app/api/chat/route.ts`              |
| II. shadcn/ui Component System | ✅         | No UI component changes; reuses `ArtifactRenderer`, `ChatDataArtifact`, `Reasoning` |
| III. Tailwind v4 + OKLCH       | ✅         | No styling changes                                                                  |
| IV. TypeScript Strict Mode     | ✅         | All new code in strict TS; `zod` for request body validation                        |
| V. Simplicity / YAGNI          | ✅         | No new abstractions; reuses `saveArtifact` helper; flag removed once stable         |
| VI. Supabase as Backend        | ✅         | Continues writing to existing tables via service role client                        |

**Quality gates:**

- `bun run build` passes (pre-push hook enforces)
- `bun run lint` clean
- `bun run test` — add unit tests for the router (skill detection, engine selection, tool-result handling)

No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/063-hybrid-chat-api/
├── plan.md              # This file
├── research.md          # Phase 0 output (engine + caching decisions)
├── data-model.md        # Phase 1 output (no new tables; request/response shapes)
├── quickstart.md        # Phase 1 output (manual verification checklist)
├── contracts/
│   └── chat-api.md      # /api/chat request/response contract
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/api/chat/
│   └── route.ts                  # router: detects skill vs chat, selects engine
├── lib/chat/
│   ├── engine-messages.ts        # NEW: Messages API streaming + tool loop + caching
│   ├── engine-agents.ts          # NEW (extracted from current route.ts): Managed Agents path
│   ├── skill-detector.ts         # NEW: maps body → { mode: 'chat' | 'skill', slug? }
│   ├── tools-client.ts           # NEW: HTTP client that calls mcp-tools Edge Function
│   └── __tests__/
│       ├── skill-detector.test.ts
│       └── tools-client.test.ts
├── lib/ai/
│   ├── prompt-cache.ts           # NEW: helpers to build system blocks with cache_control
│   └── agent-client.ts           # UNCHANGED (still used by skills path)
├── hooks/
│   └── use-orchestrator-chat.ts  # MINOR: pass `skill_slug` hint when the hero selector chose one
└── components/chat/
    └── orchestrator-chat-wrapper.tsx   # UNCHANGED (UI contract identical)
```

Feature flag consumer: `src/app/api/chat/route.ts` reads `process.env.FEATURE_HYBRID_CHAT`.

**Structure Decision**: Single Next.js web app (Option 2 style without split backend). Chat route is a thin router; engines live under `lib/chat/`. Skill detection and tool calls are isolated modules so each can be unit-tested without the full Anthropic/Supabase stack.

## Complexity Tracking

No violations to justify.
