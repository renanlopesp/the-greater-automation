import type { ToolInvocation, ToolResult, ToolResultArtifact } from './types'

export async function invokeTool(invocation: ToolInvocation): Promise<ToolResult> {
  const secret = process.env.MCP_AUTH_TOKEN
  if (!secret) throw new Error('MCP_AUTH_TOKEN not configured')

  const { teamId, userId, storeId, taskId } = invocation.context
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/mcp-tools'
  const params = new URLSearchParams({ team_id: teamId, user_id: userId, secret })
  if (storeId) params.set('store_id', storeId)
  if (taskId) params.set('task_id', taskId)

  const url = `${base}?${params.toString()}`
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: invocation.name, arguments: invocation.input },
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`mcp-tools HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  const raw = await res.text()

  // Parse: SSE "data: {...}" line, or plain JSON body
  let parsed: unknown
  const sseLine = raw.split('\n').find((l) => l.startsWith('data:'))
  if (sseLine) {
    parsed = JSON.parse(sseLine.slice('data:'.length).trim())
  } else {
    parsed = JSON.parse(raw)
  }

  const rpc = parsed as {
    result?: { content?: Array<{ type: string; text?: string }>; isError?: boolean }
  }
  const result = rpc.result ?? {}
  const contentItems = result.content ?? []

  const content: ToolResult['content'] = contentItems.filter(
    (c): c is { type: 'text'; text: string } => c.type === 'text' && typeof c.text === 'string'
  )

  let artifact: ToolResultArtifact | undefined
  const firstText = content[0]?.text
  if (firstText) {
    try {
      const obj = JSON.parse(firstText) as Record<string, unknown>
      if (obj.__artifact) artifact = obj.__artifact as ToolResultArtifact
    } catch {
      artifact = undefined
    }
  }

  return { content, isError: result.isError ?? false, artifact }
}
