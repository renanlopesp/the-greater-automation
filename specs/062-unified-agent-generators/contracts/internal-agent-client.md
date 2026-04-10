# Contract: Internal Agent Client

## `askAgent(teamId, prompt, options?)`

Internal programmatic client for server-side code to communicate with the Managed Agent.

### Input

```typescript
interface AskAgentOptions {
  /** Timeout in ms (default: 120_000) */
  timeout?: number
  /** If true, auto-provision agent if team has none (default: true) */
  autoProvision?: boolean
}

function askAgent(teamId: string, prompt: string, options?: AskAgentOptions): Promise<AgentResponse>
```

### Output

```typescript
interface AgentResponse {
  text: string
  usage: { inputTokens: number; outputTokens: number }
  sessionId: string
}
```

### Behavior

1. Look up `anthropic_agent_id` and `anthropic_env_id` from `teams` table
2. If not provisioned and `autoProvision` is true, call `provisionAgent(teamId)`
3. Create a new session: `sessions.create({ agent, environment_id })`
4. Send message: `sessions.events.send(sessionId, { events: [{ type: 'user.message', content }] })`
5. Collect response via `sessions.events.stream(sessionId)` — accumulate `agent.message` text blocks
6. Break on `session.status_idle` with `stop_reason.type === 'end_turn'`
7. Return `{ text, usage, sessionId }`

### Error Handling

- Agent not provisioned + autoProvision false → throw `AgentNotProvisionedError`
- Session timeout → throw `AgentTimeoutError`
- Session error event → throw `AgentSessionError` with event details

---

## `askAgentJSON<T>(teamId, prompt, schema, options?)`

Wrapper that asks the Agent for structured JSON output and validates it.

### Input

```typescript
function askAgentJSON<T>(
  teamId: string,
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: AskAgentOptions & { retries?: number }
): Promise<T>
```

### Behavior

1. Append JSON instruction to prompt: "Respond ONLY with valid JSON matching this schema: {schema description}. No explanation, no markdown code blocks, just the raw JSON."
2. Call `askAgent(teamId, enrichedPrompt, options)`
3. Extract JSON from response (strip markdown fences if present)
4. Validate with `schema.parse()`
5. If parse fails and retries > 0, retry with more explicit prompt
6. Return validated data

### Error Handling

- JSON parse failure after retries → throw `AgentStructuredOutputError`

---

## `provisionAgent(teamId)`

Extracted from `/api/agents/provision/route.ts` — shared provisioning logic.

### Input/Output

```typescript
function provisionAgent(teamId: string): Promise<{ agentId: string; envId: string }>
```

### Behavior

1. Check if team already has `anthropic_agent_id` + `anthropic_env_id` → return if exists (idempotent)
2. Gather context: team name, skills, store, brand DNA
3. Build system prompt via `buildOrchestratorSystemPrompt()`
4. Determine model from plan (pro → opus, free → sonnet)
5. Build MCP URL with team/user/store context
6. Create Agent + Environment via Anthropic API
7. Persist IDs to `teams` table
8. Return `{ agentId, envId }`
