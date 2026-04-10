# Data Model: Unified Agent Generators

## No Schema Changes Required

This feature does not introduce new database tables or columns. It restructures how existing data flows through the system:

### Existing Entities Used

- **teams** (`anthropic_agent_id`, `anthropic_env_id`): Looked up by the internal client to find the team's Managed Agent
- **stores** (`platform_store_id`, `platform_access_token`): Accessed by MCP tools (already in Edge Function)
- **brand_dna**: Read by the Agent via system prompt context (already in `buildOrchestratorSystemPrompt`)
- **skills**: Listed by MCP tool `SNEW_LIST_SKILLS` (already working)
- **store_products**: Accessed by MCP tools for product context (already working)

### Data Flow Change

**Before** (direct model calls):

```
Generator → fetchBrandDna() → fetchProducts() → buildPrompt() → OpenAI generateObject() → result
```

**After** (Agent-mediated):

```
Generator → internalAgentClient(teamId, prompt) → Managed Agent (has brand DNA + products + MCP tools) → result
```

The Agent already has all context loaded via:

1. System prompt (`buildOrchestratorSystemPrompt`) — includes brand DNA, store info, skills
2. MCP server — provides STORE\_\* tools for real-time data queries
