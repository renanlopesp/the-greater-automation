# Implementation Plan: Chat-Driven Artifact Modification

**Branch**: `049-chat-artifact-modification` | **Date**: 2026-04-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/049-chat-artifact-modification/spec.md`

## Summary

Enable the AI orchestrator (Snew) to reliably modify seasonal calendar artifacts via natural language. The user talks in the chat, the AI calls structured tools to modify the artifact data, and the panel updates reactively. Key challenges: ensuring the AI actually executes tools (no hallucinated confirmations), distinguishing generation from modification requests, and real-time panel updates.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, Vercel AI SDK (`ai@^6`, `@ai-sdk/openai`), TanStack React Query, Zustand
**Storage**: Supabase PostgreSQL (`tasks` table — `artifact_data` JSONB column)
**Testing**: Vitest + Playwright (manual E2E for AI tool calling)
**Target Platform**: Web (Next.js App Router)
**Project Type**: Web application
**Performance Goals**: Panel updates within 1 second of AI response completion
**Constraints**: gpt-5.2 Responses API for tool calling; Supabase Auth adds ~500ms per API call
**Scale/Scope**: Single artifact type (seasonal-calendar) with extensibility hooks for future types

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status | Notes                                                                           |
| ------------------------------ | ------ | ------------------------------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | All routes use App Router. Tool execution in Route Handlers.                    |
| II. shadcn/ui Component System | PASS   | Artifact panel uses existing components. No new UI components needed.           |
| III. Tailwind CSS v4 + OKLCH   | PASS   | No styling changes in this feature.                                             |
| IV. TypeScript Strict Mode     | PASS   | All tool definitions and handlers typed.                                        |
| V. Simplicity and YAGNI        | PASS   | Focused tool operations (not a generic modification framework).                 |
| VI. Supabase as Backend        | PASS   | All data in `tasks.artifact_data` JSONB. RLS via service role in Route Handler. |

## Project Structure

### Documentation (this feature)

```text
specs/049-chat-artifact-modification/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (files to modify)

```text
src/
├── lib/ai/
│   ├── platform-tools.ts          # SNEW_MODIFY_ARTIFACT tool definition + execution
│   └── agent-chat.ts              # Model config (reasoning settings)
├── app/api/
│   └── chat/route.ts              # Artifact context injection + keyword detection
├── components/chat/
│   └── orchestrator-chat-wrapper.tsx  # Query invalidation on status change
└── hooks/
    └── use-task.ts                # Polling config
```

## Architecture

### Design Approach

The feature uses a **tool-mediated modification pattern**: the AI doesn't modify data directly — it calls structured tools with validated parameters. The tools handle data loading, validation, mutation, and persistence.

```
User message → AI (gpt-5.2) → Tool call (SNEW_MODIFY_ARTIFACT) → DB update → Panel refetch
```

### Three-Layer Architecture

1. **Context Layer** (`/api/chat/route.ts`): Injects current artifact state into the AI system prompt so the model knows what dates exist, their IDs, campaign status, and available operations.

2. **Tool Layer** (`platform-tools.ts`): Defines `SNEW_MODIFY_ARTIFACT` with discrete operations. Each operation loads current data, validates inputs, performs the mutation, and persists. The tool uses `serviceClient` (service role) to bypass RLS.

3. **Reactivity Layer** (`orchestrator-chat-wrapper.tsx` + `use-task.ts`): When the chat stream completes (`status: streaming → ready`), invalidates the `['task', taskId]` React Query, causing the artifact panel to refetch and re-render.

### Tool Operations

| Operation           | Input                                 | Behavior                                                               |
| ------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| `generate_campaign` | `date_ids: [one_id]`                  | Calls `generateCampaign()`, saves to `artifact_data.campaigns[dateId]` |
| `filter_dates`      | `date_ids: [ids_to_keep]`             | Keeps only listed dates + their campaigns                              |
| `remove_dates`      | `date_ids: [ids_to_remove]`           | Removes listed dates + their campaigns                                 |
| `clear_campaigns`   | `date_ids: [ids]`, `except?: boolean` | Clears campaign content; `except=true` inverts selection               |

### Keyword Detection (Calendar Generation vs Modification)

The `/api/chat` route has programmatic skill dispatch that detects calendar-related keywords and generates a full calendar BEFORE the AI processes the message. This must NOT trigger on modification requests.

**Detection logic**: If the message contains modification-intent words (`remov`, `limp`, `delet`, `filtr`, `alter`, `modif`, `manten`, `deixe`, `atuali`), skip programmatic dispatch even if calendar keywords are present. Let the AI handle modification via tools.

### System Prompt Context

When a task has `artifact_data`, the route injects context into the system prompt:

- Summary of current state (date count, names, campaign count)
- Full list of date IDs mapped to names
- Available operations with examples
- Explicit instruction: "NEVER confirm a change without calling the tool first"

## Phases

### Phase 1: Tool Reliability (FR-001, FR-005, FR-009, FR-011)

**Goal**: Make the AI reliably call tools and validate inputs.

1. Refactor `SNEW_MODIFY_ARTIFACT` — single tool with clear operation enum
2. Add `loadAndValidate()` helper that loads artifact + validates date IDs for all operations
3. `generate_campaign` operation calls `generateCampaign()` internally using `serviceClient`
4. Each operation returns structured result with success/error + remaining state

### Phase 2: Context & Detection (FR-007, FR-008, FR-010)

**Goal**: Provide the AI with accurate context and prevent accidental regeneration.

1. Refactor artifact context injection — include date IDs, names, campaign status per date
2. Add explicit operation examples to context (reduces hallucination)
3. Fix keyword detection: skip programmatic dispatch when modification intent detected
4. Context only injected when task has existing `artifact_data` (no context for empty tasks)

### Phase 3: Reactivity (FR-006)

**Goal**: Panel updates immediately when AI finishes responding.

1. `orchestrator-chat-wrapper.tsx`: Watch `status` transition from `streaming` → `ready`
2. On transition, call `queryClient.invalidateQueries(['task', taskId])`
3. `use-task.ts`: Poll at 2s only when `skill_status` is `running`/`idle`; otherwise rely on invalidation
4. No polling when `skill_status` is `completed`/`failed` — updates driven by chat status

### Phase 4: Behavioral Guardrails (FR-008, FR-009)

**Goal**: AI only acts when asked and never hallucinates confirmations.

1. System prompt: "NUNCA diga que alterou sem chamar a tool. SEMPRE execute a tool primeiro."
2. Context clearly separates "available operations" from "when to use them"
3. Informational queries (questions about the calendar) should not trigger any tool
4. Test with various message types: questions, vague requests, explicit commands

### Phase 5: Error Handling & Edge Cases (FR-005, FR-012)

**Goal**: Graceful failures with clear user feedback.

1. Invalid date IDs → return error with list of valid IDs
2. Missing Brand DNA → return clear error message
3. Tool execution failure → artifact data unchanged, AI reports error
4. Empty calendar (no artifact_data) → AI tells user to generate calendar first

## Data Model

See [data-model.md](./data-model.md) for entity definitions.

The key data structure is `tasks.artifact_data` (JSONB):

```
{
  dates: Array<{ id, name, date, displayDate, month, day, emoji, priority, estimatedRevenue, ... }>
  year: number
  summary: string
  campaigns: Record<dateId, FullCampaign>  // keyed by date.id
}
```

A `FullCampaign` contains: concept (slogan, description, products), copies, emailSubject, emailPreview, assets, videoScripts, timeline.

## Risk Assessment

| Risk                               | Likelihood      | Impact | Mitigation                                          |
| ---------------------------------- | --------------- | ------ | --------------------------------------------------- |
| AI doesn't call tools reliably     | Medium          | High   | Strong system prompt instructions + tool validation |
| Accidental calendar regeneration   | Low (after fix) | High   | Modification-intent keyword detection               |
| Panel doesn't update               | Low             | Medium | Fallback 2s polling when skill_status is running    |
| Campaign generation fails silently | Medium          | Medium | Tool returns structured error, AI reports to user   |
