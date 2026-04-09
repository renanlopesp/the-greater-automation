import { NextRequest } from 'next/server'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { registerAllTools } from '@/lib/mcp/tool-registry'
import type { ToolContext } from '@/lib/mcp/context'

/**
 * MCP server over Streamable HTTP.
 *
 * The Managed Agent connects to this URL via ngrok and calls tools directly.
 * Context is passed via query params in the MCP server URL:
 *   https://ngrok-url/api/mcp/snew-tools?team_id=X&user_id=Y&store_id=Z&task_id=T
 *
 * Stateless mode: each request gets a fresh transport + server.
 */
async function handleMcp(request: NextRequest) {
  const teamId = request.nextUrl.searchParams.get('team_id') ?? ''
  const userId = request.nextUrl.searchParams.get('user_id') ?? ''
  const storeId = request.nextUrl.searchParams.get('store_id') ?? null
  const taskId = request.nextUrl.searchParams.get('task_id') ?? null

  if (!teamId || !userId) {
    return new Response(JSON.stringify({ error: 'Missing team_id or user_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createServiceRoleClient()
  const ctx: ToolContext = { teamId, userId, storeId, taskId, supabase }

  const mcpServer = new McpServer(
    { name: 'snew-tools', version: '1.0.0' },
    { capabilities: { logging: {} } }
  )
  registerAllTools(mcpServer, ctx)

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await mcpServer.connect(transport)

  return transport.handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handleMcp(request)
}

export async function GET(request: NextRequest) {
  return handleMcp(request)
}

export async function DELETE(request: NextRequest) {
  return handleMcp(request)
}
