import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

// Mock the step executors that webhook-executor imports
vi.mock('@/lib/ai/chat', () => ({
  executeAIStep: vi.fn().mockResolvedValue({ success: true, content: 'test output' }),
}))
vi.mock('@/lib/ai/http-executor', () => ({
  executeHTTPStep: vi
    .fn()
    .mockResolvedValue({ success: true, status: 200, body: '{}', headers: {} }),
}))
vi.mock('@/lib/workflow-editor/flow-control-executor', () => ({
  executeFlowControlStep: vi.fn(),
}))
vi.mock('@/lib/workflow-editor/web-scraping-executor', () => ({
  executeWebScrapingStep: vi.fn(),
}))
vi.mock('@/lib/workflow-editor/utility-executor', () => ({ executeUtilityStep: vi.fn() }))
vi.mock('@/lib/workflow-editor/sequence-executor', () => ({ executeSequenceStep: vi.fn() }))

import { handleWebhookRequest } from '@/lib/workflow-editor/webhook-executor'

describe('webhook route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createMockSupabase(overrides: {
    trigger?: {
      id: string
      workflow_id: string
      type: string
      config: Record<string, unknown>
    } | null
    workflow?: { id: string; name: string; status: string } | null
    steps?: Array<{
      id: string
      position: number
      type: string
      name: string
      config: Record<string, unknown>
    }> | null
    run?: { id: string } | null
  }) {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'workflow_triggers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              filter: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: overrides.trigger ?? null,
                  error: overrides.trigger ? null : { message: 'Not found' },
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'workflows') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: overrides.workflow ?? null,
                error: overrides.workflow ? null : { message: 'Not found' },
              }),
            }),
          }),
        }
      }
      if (table === 'workflow_steps') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: overrides.steps ?? null,
                error: overrides.steps ? null : { message: 'Not found' },
              }),
            }),
          }),
        }
      }
      if (table === 'workflow_runs') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: overrides.run ?? null,
                error: overrides.run ? null : { message: 'Failed to create' },
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }
      }
      if (table === 'workflow_run_steps') {
        return {
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
            }),
          }),
        }
      }
      return { select: vi.fn(), insert: vi.fn(), update: vi.fn() }
    })

    return { from: mockFrom } as unknown as SupabaseClient<Database>
  }

  it('returns 404 for unknown token', async () => {
    const mockSupabase = createMockSupabase({ trigger: null })
    const request = new Request('http://test.com', { method: 'POST' })

    const result = await handleWebhookRequest('unknown-token', request, mockSupabase)

    expect(result.status).toBe(404)
    expect(result.body).toEqual({ error: 'Webhook not found' })
  })

  it('returns 405 for wrong method', async () => {
    const mockSupabase = createMockSupabase({
      trigger: {
        id: 'trigger-1',
        workflow_id: 'workflow-1',
        type: 'webhook',
        config: { method: 'POST', webhook_token: 'valid-token' },
      },
    })
    const request = new Request('http://test.com', { method: 'GET' })

    const result = await handleWebhookRequest('valid-token', request, mockSupabase)

    expect(result.status).toBe(405)
    expect(result.body).toEqual({ error: 'Method not allowed' })
  })

  it('returns 401 for wrong secret', async () => {
    const mockSupabase = createMockSupabase({
      trigger: {
        id: 'trigger-1',
        workflow_id: 'workflow-1',
        type: 'webhook',
        config: { method: 'POST', webhook_token: 'valid-token', secret: 'correct-secret' },
      },
    })
    const request = new Request('http://test.com', {
      method: 'POST',
      headers: { 'x-webhook-secret': 'wrong-secret' },
    })

    const result = await handleWebhookRequest('valid-token', request, mockSupabase)

    expect(result.status).toBe(401)
    expect(result.body).toEqual({ error: 'Invalid or missing webhook secret' })
  })

  it('returns 404 for unpublished workflow', async () => {
    const mockSupabase = createMockSupabase({
      trigger: {
        id: 'trigger-1',
        workflow_id: 'workflow-1',
        type: 'webhook',
        config: { method: 'POST', webhook_token: 'valid-token' },
      },
      workflow: {
        id: 'workflow-1',
        name: 'Test Workflow',
        status: 'draft',
      },
    })
    const request = new Request('http://test.com', { method: 'POST' })

    const result = await handleWebhookRequest('valid-token', request, mockSupabase)

    expect(result.status).toBe(404)
    expect(result.body).toEqual({ error: 'Webhook not found' })
  })

  it('returns 200 and creates run for valid request', async () => {
    const mockSupabase = createMockSupabase({
      trigger: {
        id: 'trigger-1',
        workflow_id: 'workflow-1',
        type: 'webhook',
        config: { method: 'POST', webhook_token: 'valid-token' },
      },
      workflow: {
        id: 'workflow-1',
        name: 'Test Workflow',
        status: 'published',
      },
      steps: [
        { id: 'step-1', position: 0, type: 'ai', name: 'AI Step', config: {} },
        { id: 'step-2', position: 1, type: 'http', name: 'HTTP Step', config: {} },
      ],
      run: { id: 'run-123' },
    })
    const request = new Request('http://test.com', { method: 'POST' })

    const result = await handleWebhookRequest('valid-token', request, mockSupabase)

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
    expect(result.body.run_id).toBe('run-123')
    expect(result.body).toHaveProperty('output')
  })

  it('returns configured status code', async () => {
    const mockSupabase = createMockSupabase({
      trigger: {
        id: 'trigger-1',
        workflow_id: 'workflow-1',
        type: 'webhook',
        config: { method: 'POST', webhook_token: 'valid-token', response_status: 201 },
      },
      workflow: {
        id: 'workflow-1',
        name: 'Test Workflow',
        status: 'published',
      },
      steps: [{ id: 'step-1', position: 0, type: 'ai', name: 'AI Step', config: {} }],
      run: { id: 'run-456' },
    })
    const request = new Request('http://test.com', { method: 'POST' })

    const result = await handleWebhookRequest('valid-token', request, mockSupabase)

    expect(result.status).toBe(201)
    expect(result.body.success).toBe(true)
    expect(result.body.run_id).toBe('run-456')
  })
})
