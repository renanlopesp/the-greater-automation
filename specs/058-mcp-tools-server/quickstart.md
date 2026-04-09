# Quickstart: MCP Tools Server

## Prerequisites

- Node.js 22+ or Bun
- Supabase project credentials (URL + service role key)
- A valid team_id and user_id from the database

## Install Dependencies

```bash
bun add @modelcontextprotocol/sdk zod
```

## Run the MCP Server

```bash
SUPABASE_URL="https://xxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
SNEW_TEAM_ID="uuid-of-team" \
SNEW_USER_ID="uuid-of-user" \
SNEW_STORE_ID="uuid-of-store" \
SNEW_TASK_ID="uuid-of-task" \
bun run src/lib/mcp/snew-tools-server.ts
```

The server starts and listens on stdio. It logs to stderr (not stdout — stdout is reserved for MCP protocol).

## Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector bun run src/lib/mcp/snew-tools-server.ts
```

This opens a web UI where you can:

1. See all registered tools
2. Call any tool with parameters
3. Inspect responses

## Test Programmatically

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const transport = new StdioClientTransport({
  command: 'bun',
  args: ['run', 'src/lib/mcp/snew-tools-server.ts'],
  env: {
    SUPABASE_URL: '...',
    SUPABASE_SERVICE_ROLE_KEY: '...',
    SNEW_TEAM_ID: '...',
    SNEW_USER_ID: '...',
  },
})

const client = new Client({ name: 'test-client', version: '1.0.0' })
await client.connect(transport)

// List available tools
const { tools } = await client.listTools()
console.log(
  'Available tools:',
  tools.map((t) => t.name)
)

// Call a tool
const result = await client.callTool({
  name: 'SNEW_LIST_SKILLS',
  arguments: {},
})
console.log('Result:', result)

await client.close()
```

## Verify Tool Count

- Without store context: 13 SNEW\_\* tools (SNEW_MODIFY_ARTIFACT excluded without task)
- With store context: 13 + 23 = 36 tools
- With store + task context: 14 + 23 = 37 tools (all tools available)
