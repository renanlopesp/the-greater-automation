# Implementation Plan: Agent Provisioning + Onboarding

**Branch**: `059-agent-provisioning` | **Date**: 2026-04-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/059-agent-provisioning/spec.md`

## Summary

Implement two-phase agent provisioning: create a generic Managed Agent at signup (onboarding mode), then update its system prompt with brand DNA after analysis completes (full mode). Refactor `buildOrchestratorSystemPrompt()` to support both modes. Add database migration for agent/environment identifiers. Create update-prompt endpoint.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: `@anthropic-ai/sdk` (Managed Agents API), `@supabase/ssr`, `@supabase/supabase-js`
**Storage**: Supabase PostgreSQL — new columns on `teams` table
**Testing**: Vitest (unit tests for prompt builder modes)
**Target Platform**: Next.js 16 App Router (API routes)
**Project Type**: Web application (existing monorepo)
**Performance Goals**: Provisioning within 10 seconds, prompt update within 5 seconds
**Constraints**: Must be idempotent, must handle partial brand DNA gracefully
**Scale/Scope**: One agent per team, ~hundreds of teams

## Constitution Check

| Principle                      | Status | Notes                                                                               |
| ------------------------------ | ------ | ----------------------------------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | API routes in `src/app/api/`                                                        |
| II. shadcn/ui Component System | N/A    | No UI components in this spec                                                       |
| III. Tailwind CSS v4 + OKLCH   | N/A    | No styling                                                                          |
| IV. TypeScript Strict Mode     | PASS   | All code in strict TypeScript                                                       |
| V. Simplicity and YAGNI        | PASS   | Minimal changes — refactor existing prompt builder, add one endpoint, one migration |
| VI. Supabase as Backend        | PASS   | Migration via Supabase, service role client for provisioning                        |

All gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/059-agent-provisioning/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-routes.md
└── tasks.md
```

### Source Code (repository root)

```text
src/app/api/agents/
├── provision/route.ts        # EXISTING — refactor for two-phase provisioning
└── update-prompt/route.ts    # NEW — update agent personality after brand DNA

src/lib/ai/
└── platform-tools.ts         # EXISTING — refactor buildOrchestratorSystemPrompt() for modes

src/lib/
└── anthropic.ts              # EXISTING — Anthropic SDK client singleton

supabase/migrations/
└── YYYYMMDD_add_agent_columns_to_teams.sql  # NEW — anthropic_agent_id + anthropic_env_id
```

## Architecture

### Two-Phase Flow

```
Phase 1: Signup                          Phase 2: Post Brand DNA
─────────────────────                    ──────────────────────────
User signs up                            Brand DNA analysis completes
    ↓                                        ↓
POST /api/agents/provision               POST /api/agents/update-prompt
    ↓                                        ↓
buildOrchestratorSystemPrompt(           buildOrchestratorSystemPrompt(
  mode: 'onboarding'                       mode: 'full',
)                                          brandDna: {...}
    ↓                                    )
POST /v1/agents (Anthropic API)              ↓
POST /v1/environments                   PATCH /v1/agents/{id} (Anthropic API)
    ↓                                        ↓
Save agent_id + env_id to teams          Agent personality updated
    ↓                                        ↓
Agent ready (generic)                    Agent ready (personalized)
```

### Key Design Decisions

1. **Refactor, don't rewrite**: The existing `POST /api/agents/provision` route already handles agent creation and ID persistence. We refactor it to use the two-mode prompt builder instead of always generating the full prompt.

2. **Prompt mode parameter**: `buildOrchestratorSystemPrompt()` gets a new `mode` parameter:
   - `'onboarding'`: Generates a setup-focused prompt without brand DNA. Guides users through connecting store, analyzing brand, configuring skills.
   - `'full'`: Generates the complete personalized prompt with brand DNA, retail tools, marketing capabilities (current behavior).

3. **Update-prompt endpoint**: New `POST /api/agents/update-prompt` route. Called after brand DNA completes. Fetches the latest brand DNA, generates the full system prompt, and calls `PATCH /v1/agents/{id}` to update the agent.

4. **Model selection**: Provisioning checks the team's Stripe subscription plan. Free → `claude-sonnet-4-6`. Pro → `claude-opus-4-6`. Model stored alongside agent_id so we don't re-check on every request.

5. **Migration**: Add `anthropic_agent_id` (text, nullable) and `anthropic_env_id` (text, nullable) columns to the `teams` table. These already exist in the rushed 057 implementation but need a proper migration.

6. **Idempotency**: Existing logic already handles this — check if `anthropic_agent_id` exists before creating. The update-prompt endpoint is also idempotent (PATCH is naturally idempotent).

## Complexity Tracking

No constitution violations. No complexity justifications needed.
