# Research: Snew Orchestrator System

**Date**: 2026-03-19

## R1: Orchestrator Chat Infrastructure

**Decision**: Reuse existing `/api/agents/[id]/chat` route and `useAgentChat` hook.

**Rationale**: The API route already has an orchestrator branch (checks `is_orchestrator=true`), builds a specialized system prompt with `buildOrchestratorSystemPrompt()`, and includes `SNEW_ASK_AGENT` for delegation. The `useAgentChat` hook handles streaming, conversation creation, real-time subscriptions, and tool call tracking. Building a separate system would duplicate significant logic.

**Alternatives considered**:

- Dedicated `/api/orchestrator/chat` route — Rejected: duplicates existing agent chat logic, harder to maintain
- Custom hook instead of `useAgentChat` — Rejected: the hook already handles all needed features

## R2: Co-worker Suggestion Delivery

**Decision**: Structured markers in AI response text, parsed client-side.

**Rationale**: The orchestrator's system prompt will instruct it to include co-worker references in a parseable format (e.g., `<!-- coworker:abandoned-cart -->` or JSON block). The frontend parses these markers and renders `CoworkerSuggestionCard` components. This approach requires no API changes — the suggestion data flows through the existing streaming response.

**Alternatives considered**:

- Separate API call after response — Rejected: adds latency, unnecessary network round-trip
- Tool call metadata — Rejected: `SNEW_ASK_AGENT` calls already visible in tool invocations, but need a user-friendly rendering layer on top
- Hardcoded keyword matching (reference implementation pattern) — Rejected: too brittle, doesn't leverage the AI's understanding of context

## R3: Follow-up Suggestion Delivery

**Decision**: AI-generated follow-ups in structured format at end of response.

**Rationale**: The orchestrator's system prompt instructs it to append 3-4 follow-up suggestions in a parseable format (e.g., `<!-- followups: ["Q1", "Q2", "Q3"] -->`). The frontend parses and renders them as clickable buttons. This allows context-aware suggestions without additional API calls.

**Alternatives considered**:

- Predefined follow-ups per topic — Rejected: doesn't adapt to conversation context
- Separate AI call for follow-ups — Rejected: adds latency and cost

## R4: Dashboard → Chat Navigation

**Decision**: Navigate to `/chat?q=encoded_message` with the initial message as a query parameter.

**Rationale**: The chat page reads `q` from searchParams, and the `OrchestratorChat` component auto-sends it on mount. This pattern is clean, bookmarkable, and works with suggestion chips. The reference implementation uses `location.state` (React Router), but Next.js App Router favors searchParams for server-component compatibility.

**Alternatives considered**:

- Router state via `useRouter().push()` with state — Not available in Next.js App Router
- Global Zustand store — Rejected: over-engineering for a single string
- Session storage — Rejected: query param is simpler and more transparent

## R5: Orchestrator Provisioning

**Decision**: Always create orchestrator in `provisionStore`, regardless of priorities. Idempotent — skip if one already exists.

**Rationale**: The orchestrator is the core of the workspace. Without it, chat, Telegram, and delegation don't work. It must exist from the first moment the user completes onboarding. Making it conditional on priorities was a bug, not a feature.

**Alternatives considered**:

- Lazy creation on first chat — Rejected: adds complexity, delays first interaction
- Database trigger on team creation — Rejected: business logic in DB triggers is hard to maintain and test

## R6: Message Metadata for Co-worker Attribution

**Decision**: Store co-worker references in `agent_messages.metadata` JSON field.

**Rationale**: The `metadata` column already exists and stores channel info, token usage, etc. Adding `coworker_used` and `coworker_suggested` fields to the metadata is non-breaking and doesn't require schema changes. The frontend reads metadata to render suggestion cards.

**Alternatives considered**:

- New `message_coworkers` junction table — Rejected: over-engineering for V1
- Separate columns on agent_messages — Rejected: requires migration for optional data
