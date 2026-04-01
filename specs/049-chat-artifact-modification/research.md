# Research: Chat-Driven Artifact Modification

## Decision 1: Tool Architecture — Single Tool vs Multiple Tools

**Decision**: Single tool (`SNEW_MODIFY_ARTIFACT`) with operation enum.

**Rationale**: AI models handle one well-described tool with clear operation modes better than many separate tools. Reduces tool list size (important for gpt-5.2 which sees all tools). Each operation is a discrete function within the tool's execute handler.

**Alternatives considered**:

- Separate tools per operation (`SNEW_GENERATE_CAMPAIGN`, `SNEW_REMOVE_DATES`, etc.) — more tools in the model's context, higher chance of confusion
- Generic `SNEW_UPDATE_ARTIFACT` that takes raw JSON — too complex for the AI to construct correctly

## Decision 2: Data Loading Strategy — Tool Loads vs AI Passes Data

**Decision**: Tool loads current artifact data from DB internally. AI only passes operation + parameters (date IDs).

**Rationale**: The AI cannot reliably reconstruct the full artifact_data JSON. Passing just date IDs is simple and unambiguous. The tool handles loading, validation, mutation, and persistence as an atomic operation.

**Alternatives considered**:

- AI constructs modified artifact_data and passes full object — too error-prone, AI generates wrong structure
- AI passes diff/patch — over-engineered, unnecessary complexity

## Decision 3: Supabase Client — Service Role vs User Client

**Decision**: Tool uses `serviceClient` (service role) passed from the chat route.

**Rationale**: The user client (`createServerClient()`) uses RLS which blocks access to tasks. The service role client bypasses RLS and can read/write any row. The chat route already authenticates the user and passes `teamId` for authorization.

**Alternatives considered**:

- Add RLS policies for tasks table — complex policy management, fragile
- Create separate API endpoints for each operation — unnecessary HTTP overhead, duplicates auth

## Decision 4: Reactivity — Polling vs Event-Driven vs Websocket

**Decision**: Event-driven via React Query invalidation on chat status change, with polling fallback during skill execution.

**Rationale**: When the chat stream completes (`status: streaming → ready`), we know the AI may have modified data. Invalidating the task query at that moment triggers an immediate refetch. During initial calendar generation (programmatic dispatch), 2s polling catches the completion since the chat isn't streaming at that point.

**Alternatives considered**:

- Constant polling (2s) — wasteful, ~1.5s average latency
- Supabase Realtime subscription — adds complexity (websocket connection per task page), overkill for current scale
- Return modified data in the chat stream — breaks separation of concerns, complex protocol

## Decision 5: Keyword Detection — Regex vs AI Classification

**Decision**: Simple keyword matching with modification-intent exclusion list.

**Rationale**: The programmatic calendar dispatch needs to be fast (happens before AI). A simple check for calendar keywords + exclusion of modification words is sufficient and adds zero latency. The AI model handles nuanced intent classification for everything else via tool calling.

**Alternatives considered**:

- AI-based intent classification before dispatch — adds latency, defeats the purpose of programmatic dispatch
- Remove programmatic dispatch entirely — slower initial calendar generation (AI must decide to call the tool)

## Decision 6: AI Model for Tool Calling — gpt-5.2 vs gpt-4o

**Decision**: gpt-5.2 (Responses API with reasoning).

**Rationale**: gpt-5.2 has better tool calling accuracy than gpt-4o for complex operations. The reasoning capability helps the model decide WHEN to call tools vs respond conversationally. The tradeoff is higher latency (~3-10s for reasoning) but the user requested this model.

**Alternatives considered**:

- gpt-4o — faster (~1-2s) but less reliable tool calling, no reasoning visibility
- o4-mini — fast reasoning model but may not support all tool features
