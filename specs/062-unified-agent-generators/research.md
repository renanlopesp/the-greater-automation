# Research: Unified Agent Generators

## R-001: Programmatic Sessions API Usage

**Decision**: Use the existing streaming approach (`events.stream()`) but collect the full response synchronously instead of writing to a stream. No polling needed.

**Rationale**: The streaming event loop already blocks via `for await` until the session completes (`session.status_idle` with `stop_reason.type === 'end_turn'`). Collecting text into a string instead of writing to a `WritableStream` is trivial. This avoids the complexity of polling with `events.list()` and reuses proven code from the chat route.

**Alternatives considered**:

- `events.list()` polling: adds latency (500ms poll intervals), more complex, same end result
- Custom SDK wrapper: unnecessary abstraction, the SDK already supports what we need

**Pattern**:

```
1. sessions.create({ agent, environment_id })
2. sessions.events.send(sessionId, { events: [{ type: 'user.message', content }] })
3. for await (event of sessions.events.stream(sessionId))
   → collect agent.message text blocks
   → break on session.status_idle + end_turn
4. return collected text
```

## R-002: Structured Output Extraction

**Decision**: Use explicit JSON instructions in the prompt. The Agent responds with JSON when instructed, and we parse it from the response text.

**Rationale**: The current `generateObject` approach uses Zod schemas + structured output mode. The Agent doesn't have a native "structured output" mode, but Claude models reliably output valid JSON when instructed. We include the schema description in the prompt and extract JSON from the response.

**Alternatives considered**:

- Keep `generateObject` alongside Agent: defeats the purpose of using Agent context
- Custom MCP tool for structured output: over-engineered, the Agent already outputs JSON reliably
- JSON mode via API parameter: not available in Sessions API beta

**Pattern**:

```
Prompt: "Analyze this store's brand DNA. Respond ONLY with valid JSON matching this schema:
{niche: string, tone: string, audience: string, ...}
No explanation, no markdown, just the JSON object."
→ Parse response with JSON.parse()
→ Validate with Zod schema
→ Retry once if parsing fails
```

## R-003: Agent Auto-Provisioning for Internal Client

**Decision**: Reuse the existing provisioning logic from `/api/agents/provision/route.ts`. Extract it into a shared function that both the API route and the internal client can call.

**Rationale**: The provisioning logic (build system prompt, create agent + environment, persist IDs) already exists and works. Duplicating it would create drift. Extracting it into `src/lib/ai/agent-provisioning.ts` keeps it DRY.

**Alternatives considered**:

- Call the provision API route internally: adds HTTP overhead for an internal call
- Lazy provisioning only: risk of first-call latency; better to extract the function

## R-004: Workflow AI Steps Provider Migration

**Decision**: Migrate workflow AI steps from OpenAI to Anthropic SDK directly (not through the Agent). Workflows are generic automation — they don't need brand context for most steps.

**Rationale**: Workflow AI steps do data transformations (summarize, classify, extract, generate). Routing these through the Agent adds latency (~30s provisioning + MCP overhead) for tasks that don't benefit from brand context. Using `@anthropic-ai/sdk` directly with `claude-haiku-4-5` (for simple transforms) or `claude-sonnet-4-6` (for complex generation) is faster and cheaper.

**Alternatives considered**:

- Route all through Agent: too slow for simple transforms, unnecessary MCP overhead
- Keep OpenAI: defeats the goal of single-provider consolidation
- Dual mode (Agent + direct): adds complexity; direct Anthropic is sufficient for all workflow cases

## R-005: Follow-ups via Agent Conversation Context

**Decision**: Generate follow-ups as part of the Agent's response by adding instructions in the system prompt, rather than making a separate call after the response.

**Rationale**: The Agent already generates follow-up suggestions (visible in Playwright tests as "Acompanhamentos"). The current separate `follow-ups.ts` call to OpenAI is redundant — the Agent's system prompt already includes instructions to generate follow-ups. We just need to ensure the chat route parses and surfaces them.

**Alternatives considered**:

- Separate Agent session for follow-ups: wasteful, adds latency
- Keep separate OpenAI call: defeats the purpose
- Post-process Agent response to extract follow-ups: the Agent already formats them
