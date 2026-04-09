# Implementation Plan: Chat Engine Replacement

**Branch**: `060-chat-engine-replacement` | **Date**: 2026-04-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/060-chat-engine-replacement/spec.md`

## Summary

The chat engine was already rewritten as a Sessions API proxy in the rushed 057 branch. This spec hardens that implementation: add pre-chat credit check, replace inline provisioning with the proper route, add session error recovery, ensure file attachments work, and delete legacy code (agent-chat.ts, chat.ts).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: `@anthropic-ai/sdk` (Sessions API), `ai` (createUIMessageStream), `@supabase/ssr`
**Storage**: Supabase PostgreSQL — conversations table (anthropic_session_id column)
**Testing**: Vitest + manual integration testing against real API
**Target Platform**: Next.js 16 App Router (API route)
**Project Type**: Web application (existing monorepo)
**Performance Goals**: First token within 2 seconds, full streaming support
**Constraints**: Zero frontend changes, must maintain UIMessageStream format
**Scale/Scope**: Harden 360-line route, delete ~874 lines of legacy code

## Constitution Check

| Principle                      | Status | Notes                                  |
| ------------------------------ | ------ | -------------------------------------- |
| I. Next.js App Router First    | PASS   | API route in `src/app/api/chat/`       |
| II. shadcn/ui Component System | N/A    | No UI                                  |
| III. Tailwind CSS v4 + OKLCH   | N/A    | No styling                             |
| IV. TypeScript Strict Mode     | PASS   | Strict TypeScript                      |
| V. Simplicity and YAGNI        | PASS   | Hardening existing code, not rewriting |
| VI. Supabase as Backend        | PASS   | Supabase for conversations + messages  |

## Project Structure

```text
src/app/api/chat/
└── route.ts               # EXISTING — harden (credit check, error recovery, cleanup)

src/lib/ai/
├── agent-chat.ts          # TO DELETE — old chat engine (874 lines)
└── chat.ts                # TO DELETE — Kiro legacy

src/lib/billing/
└── credits.ts             # EXISTING — tokensToCredits() + add pre-chat credit check
```

## Architecture

The existing route (057) already implements the core flow:

```
Auth → Parse message → Get agent_id → Find/create session → Send event → Stream response → Persist
```

What's missing/needs hardening:

1. **Pre-chat credit check** — reject if team has 0 credits
2. **Replace inline provisionAgent()** — use the refactored provision logic from 059
3. **Session error recovery** — if session is expired/terminated, create a new one and retry
4. **File attachment handling** — ensure uploaded file URLs are passed to the agent
5. **Delete legacy files** — agent-chat.ts, chat.ts

## Complexity Tracking

No constitution violations.
