# Quickstart: Unified Agent Generators

## Prerequisites

- Anthropic API key configured (`ANTHROPIC_API_KEY` in `.env.local`)
- MCP server deployed (`mcp-tools` Edge Function on Supabase)
- `MCP_AUTH_TOKEN` set in both `.env.local` and Supabase Secrets
- A team with a connected store (for testing generators that need store context)

## Key Files

| File                                        | Purpose                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `src/lib/ai/agent-client.ts`                | NEW — Internal programmatic Agent client (`askAgent`, `askAgentJSON`)     |
| `src/lib/ai/agent-provisioning.ts`          | NEW — Extracted provisioning logic (shared by API route + client)         |
| `src/lib/ai/brand-dna-analyzer.ts`          | MODIFY — Replace `generateObject(openai)` with `askAgentJSON()`           |
| `src/lib/ai/seasonal-campaign-generator.ts` | MODIFY — Replace 4x `generateObject(openai)` with `askAgentJSON()`        |
| `src/lib/ai/asset-generator.ts`             | MODIFY — Replace `generateObject(openai)` with `askAgentJSON()`           |
| `src/lib/ai/email-template-generator.ts`    | MODIFY — Replace `generateObject(openai)` with `askAgentJSON()`           |
| `src/lib/ai/store-visual-analyzer.ts`       | MODIFY — Replace `generateObject(openai)` with `askAgentJSON()`           |
| `src/lib/actions/follow-ups.ts`             | MODIFY — Remove separate OpenAI call (Agent already generates follow-ups) |
| `src/lib/workflows/action-executor.ts`      | MODIFY — Replace `createOpenAI()` with Anthropic SDK                      |
| `src/lib/ai/providers.ts`                   | DELETE — No longer needed after migration                                 |
| `src/app/api/agents/provision/route.ts`     | MODIFY — Use extracted `provisionAgent()` function                        |

## Migration Pattern (per generator)

**Before:**

```typescript
import { getOpenAIProvider } from '@/lib/ai/providers'
const openai = getOpenAIProvider()
const result = await generateObject({
  model: openai.chat('gpt-4o'),
  schema: MySchema,
  prompt: buildPromptWithManualContext(brandDna, products, ...),
})
```

**After:**

```typescript
import { askAgentJSON } from '@/lib/ai/agent-client'
const result = await askAgentJSON(teamId, prompt, MySchema)
// Agent already has brandDna, products, store context via system prompt + MCP tools
```

## Testing

```bash
# Unit test the internal client
bun test src/lib/ai/__tests__/agent-client.test.ts

# Integration test: brand DNA via Agent
bun test src/lib/ai/__tests__/brand-dna-agent.test.ts

# Full build
bun run build

# Playwright: test onboarding brand DNA flow
bunx playwright test tests/onboarding-brand-dna.spec.ts
```
