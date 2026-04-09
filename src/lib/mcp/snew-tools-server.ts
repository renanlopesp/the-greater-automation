#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createToolContext } from './context.js'
import { registerAllTools } from './tool-registry.js'

async function main() {
  console.error('[snew-tools] Starting MCP server...')

  const ctx = createToolContext()
  console.error(
    `[snew-tools] Context: team=${ctx.teamId}, user=${ctx.userId}, store=${ctx.storeId ?? 'none'}, task=${ctx.taskId ?? 'none'}`
  )

  const server = new McpServer(
    { name: 'snew-tools', version: '1.0.0' },
    {
      capabilities: { logging: {} },
      instructions:
        'Snew business tools — query sales, stock, orders, manage skills, artifacts, notifications, and app connections.',
    }
  )

  registerAllTools(server, ctx)

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[snew-tools] MCP server running on stdio')
}

main().catch((err) => {
  console.error('[snew-tools] Fatal error:', err)
  process.exit(1)
})
