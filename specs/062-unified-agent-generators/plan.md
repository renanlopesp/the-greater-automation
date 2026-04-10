# Implementation Plan: Unified Agent Generators

**Branch**: `062-unified-agent-generators` | **Date**: 2026-04-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/062-unified-agent-generators/spec.md`

## Summary

Migrate all direct OpenAI model calls (`generateObject`, `createOpenAI`) to use the Managed Agent via Sessions API. Create an internal programmatic client (`askAgent`, `askAgentJSON`) that lets server-side code communicate with the team's Agent — leveraging its full context (brand DNA, store data, MCP tools). Remove the OpenAI SDK dependency entirely.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: `@anthropic-ai/sdk` (Sessions API), `zod` (schema validation), `@supabase/supabase-js`
**Storage**: Supabase PostgreSQL (existing `teams` table — `anthropic_agent_id`, `anthropic_env_id`)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Next.js 16 server-side (Route Handlers, Server Actions)
**Project Type**: Web application
**Performance Goals**: Generator response times within 2x of current (~10-30s per generation)
**Constraints**: Must not break existing chat streaming, must handle Agent unavailability gracefully
**Scale/Scope**: 6 generators to migrate, ~8 files to modify, 2 new files, 1 file to delete

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status | Notes                                                                        |
| ------------------------------ | ------ | ---------------------------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | All code runs server-side in Route Handlers                                  |
| II. shadcn/ui Component System | N/A    | No UI changes                                                                |
| III. Tailwind CSS v4 + OKLCH   | N/A    | No styling changes                                                           |
| IV. TypeScript Strict Mode     | PASS   | All new code in strict TypeScript with Zod validation                        |
| V. Simplicity and YAGNI        | PASS   | Removing complexity (6 providers → 1), no new abstractions beyond `askAgent` |
| VI. Supabase as Backend        | PASS   | Uses existing Supabase tables, no new schema                                 |

No violations. No complexity justifications needed.

## Project Structure

### Documentation (this feature)

```text
specs/062-unified-agent-generators/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (no schema changes)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── internal-agent-client.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/lib/ai/
├── agent-client.ts          # NEW — askAgent(), askAgentJSON()
├── agent-provisioning.ts    # NEW — extracted provisionAgent()
├── brand-dna-analyzer.ts    # MODIFY — use askAgentJSON
├── seasonal-campaign-generator.ts  # MODIFY — use askAgentJSON
├── asset-generator.ts       # MODIFY — use askAgentJSON
├── email-template-generator.ts     # MODIFY — use askAgentJSON
├── store-visual-analyzer.ts # MODIFY — use askAgentJSON
├── providers.ts             # DELETE — no longer needed
└── __tests__/
    └── agent-client.test.ts # NEW — unit tests

src/lib/actions/
└── follow-ups.ts            # MODIFY — remove OpenAI call

src/lib/workflows/
└── action-executor.ts       # MODIFY — OpenAI → Anthropic SDK

src/app/api/agents/
└── provision/route.ts       # MODIFY — use extracted provisionAgent()
```

**Structure Decision**: No new directories. New files live in existing `src/lib/ai/` alongside the generators they serve.

## Implementation Phases

### Phase 1: Internal Agent Client (P1 — Foundation)

Create `src/lib/ai/agent-client.ts` with two functions:

**`askAgent(teamId, prompt, options?)`**: Creates a session with the team's Managed Agent, sends a message, collects the full response via `events.stream()`, and returns the text. Handles auto-provisioning if the team has no Agent.

**`askAgentJSON<T>(teamId, prompt, schema, options?)`**: Wrapper that appends JSON instructions to the prompt, calls `askAgent`, parses the response, and validates with Zod. Retries once if parsing fails.

Extract provisioning logic from `/api/agents/provision/route.ts` into `src/lib/ai/agent-provisioning.ts` so both the API route and the internal client can reuse it.

**Deliverables**:

- `src/lib/ai/agent-client.ts`
- `src/lib/ai/agent-provisioning.ts`
- `src/lib/ai/__tests__/agent-client.test.ts`
- Updated `src/app/api/agents/provision/route.ts` (uses extracted function)

### Phase 2: Migrate Core Generators (P1 — Brand DNA + Campaigns)

Migrate the highest-impact generators:

1. **brand-dna-analyzer.ts**: Replace 2x `generateObject(openai)` with `askAgentJSON(teamId, prompt, BrandDnaSchema)`. Remove manual context fetching — the Agent already has store/product data via MCP.

2. **seasonal-campaign-generator.ts**: Replace 4x `generateObject(openai)` with `askAgentJSON()`. Each generation step (concept, copies, deliverables, video scripts) becomes a separate `askAgentJSON` call with the appropriate schema.

3. **store-visual-analyzer.ts**: Replace 1x `generateObject(openai.responses('gpt-5.2'))` with `askAgentJSON()`. The Agent can handle image analysis via its model capabilities.

**Deliverables**:

- Updated 3 generator files
- Verified via Playwright: onboarding brand DNA flow, campaign generation

### Phase 3: Migrate Secondary Generators (P1/P2)

1. **asset-generator.ts**: Replace 1x `generateObject(openai)` with `askAgentJSON()`.

2. **email-template-generator.ts**: Replace 1x `generateObject(openai)` with `askAgentJSON()`.

3. **follow-ups.ts**: Remove the separate OpenAI call entirely. The Agent already generates follow-up suggestions as part of its response (confirmed via Playwright — "Acompanhamentos" section). Verify the chat route correctly parses and surfaces them.

**Deliverables**:

- Updated 3 files
- `follow-ups.ts` either deleted or reduced to a no-op

### Phase 4: Workflow AI Steps + Cleanup (P3)

1. **action-executor.ts**: Replace `createOpenAI()` with Anthropic SDK (`@anthropic-ai/sdk`). Use `claude-haiku-4-5` for simple transforms (summarize, classify) and `claude-sonnet-4-6` for complex generation. This is a direct provider swap, not Agent-mediated.

2. **workflows/[id]/assistant/route.ts**: Replace `createOpenAI()` with Anthropic SDK.

3. **Delete `src/lib/ai/providers.ts`**: No longer needed — all callers migrated.

4. **Remove `@ai-sdk/openai` from `package.json`**: Run `bun remove @ai-sdk/openai`.

5. **Remove `OPEN_AI_API_KEY`** from environment documentation and any references.

6. **Update `agent-form.tsx`**: Remove GPT model options from the dropdown (GPT-4, GPT-3.5 Turbo).

**Deliverables**:

- Updated workflow files
- Removed OpenAI dependency
- Clean build with zero OpenAI references
- Updated agent form UI

## Risk Mitigation

| Risk                               | Mitigation                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| Agent structured output unreliable | `askAgentJSON` retries once with explicit prompt; Zod validation catches malformed responses |
| Generator latency increase         | Agent sessions add ~2-5s overhead; acceptable per SC-006 (within 2x)                         |
| Concurrent provisioning race       | Existing idempotency check (read before write) handles this                                  |
| MCP server unavailable             | Agent handles tool failures gracefully; generators receive error text in response            |
| Breaking existing chat flow        | Internal client creates separate sessions; chat sessions are independent                     |

## Complexity Tracking

No constitution violations. No complexity justifications needed.
