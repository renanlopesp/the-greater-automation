import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { invokeTool } from '../tools-client'

// Helper to build a mock fetch Response for a JSON-RPC success
function makeJsonResponse(body: unknown, status = 200) {
  const text = JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
  } as unknown as Response
}

function makeSseResponse(body: unknown) {
  const json = JSON.stringify(body)
  const text = `data: ${json}\n\n`
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(text),
  } as unknown as Response
}

function makeErrorResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(body),
  } as unknown as Response
}

const RPC_SUCCESS_WITH_ARTIFACT = {
  jsonrpc: '2.0',
  id: 1,
  result: {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          foo: 'bar',
          __artifact: { type: 'chat-data', title: 'T', html: '<p/>' },
        }),
      },
    ],
  },
}

const baseContext = {
  teamId: 't',
  userId: 'u',
  storeId: 's',
  taskId: 'ta',
}

describe('invokeTool', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('MCP_AUTH_TOKEN', 'secret123')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('success: extracts artifact and content from JSON-RPC response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeJsonResponse(RPC_SUCCESS_WITH_ARTIFACT))

    const result = await invokeTool({
      name: 'STORE_LIST_ORDERS',
      input: {},
      context: baseContext,
    })

    expect(result.artifact?.type).toBe('chat-data')
    expect(result.content[0].text).toContain('"foo":"bar"')
    expect(result.isError).toBe(false)
  })

  it('no __artifact field: returns artifact === undefined and isError false', async () => {
    const rpc = {
      jsonrpc: '2.0',
      id: 1,
      result: {
        content: [{ type: 'text', text: JSON.stringify({ hello: 'world' }) }],
      },
    }
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeJsonResponse(rpc))

    const result = await invokeTool({
      name: 'STORE_QUERY_SALES',
      input: {},
      context: baseContext,
    })

    expect(result.artifact).toBeUndefined()
    expect(result.isError).toBe(false)
  })

  it('non-JSON text: swallows parse error and returns artifact === undefined', async () => {
    const rpc = {
      jsonrpc: '2.0',
      id: 1,
      result: {
        content: [{ type: 'text', text: 'raw error string' }],
      },
    }
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeJsonResponse(rpc))

    const result = await invokeTool({
      name: 'STORE_QUERY_STOCK',
      input: {},
      context: baseContext,
    })

    expect(result.artifact).toBeUndefined()
    // should not throw
  })

  it('401 from Edge Function: rejects with error containing 401', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeErrorResponse(401, 'Unauthorized'))

    await expect(
      invokeTool({ name: 'STORE_LIST_ORDERS', input: {}, context: baseContext })
    ).rejects.toThrow('401')
  })

  it('500 from Edge Function: rejects with error containing 500', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeErrorResponse(500, 'Internal Server Error'))

    await expect(
      invokeTool({ name: 'STORE_LIST_ORDERS', input: {}, context: baseContext })
    ).rejects.toThrow('500')
  })

  it('missing MCP_AUTH_TOKEN: rejects with "MCP_AUTH_TOKEN not configured"', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
    // MCP_AUTH_TOKEN intentionally not set

    await expect(
      invokeTool({ name: 'STORE_LIST_ORDERS', input: {}, context: baseContext })
    ).rejects.toThrow('MCP_AUTH_TOKEN not configured')
  })

  it('SSE framed response: parses JSON after "data: " prefix', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(makeSseResponse(RPC_SUCCESS_WITH_ARTIFACT))

    const result = await invokeTool({
      name: 'STORE_LIST_ORDERS',
      input: {},
      context: baseContext,
    })

    expect(result.artifact?.type).toBe('chat-data')
    expect(result.content[0].text).toContain('"foo":"bar"')
  })

  it('URL construction: includes team_id, user_id, store_id, task_id, secret in fetch URL', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(makeJsonResponse(RPC_SUCCESS_WITH_ARTIFACT))

    await invokeTool({
      name: 'STORE_LIST_ORDERS',
      input: { limit: 10 },
      context: { teamId: 't', userId: 'u', storeId: 's', taskId: 'ta' },
    })

    expect(fetchSpy).toHaveBeenCalledOnce()
    const calledUrl = (fetchSpy.mock.calls[0] as [string, ...unknown[]])[0]
    expect(calledUrl).toContain('team_id=t')
    expect(calledUrl).toContain('user_id=u')
    expect(calledUrl).toContain('store_id=s')
    expect(calledUrl).toContain('task_id=ta')
    expect(calledUrl).toContain('secret=secret123')
  })
})
