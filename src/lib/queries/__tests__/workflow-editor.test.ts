import { describe, it, expect, vi } from 'vitest'
import { fetchWorkflowForEditor } from '@/lib/queries/workflow-editor'

function createMockSupabase(overrides: {
  workflow?: Record<string, unknown> | null
  trigger?: Record<string, unknown> | null
  steps?: Record<string, unknown>[] | null
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'workflows') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: overrides.workflow ?? null,
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'workflow_triggers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: overrides.trigger ?? null,
                error: null,
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
                data: overrides.steps ?? [],
                error: null,
              }),
            }),
          }),
        }
      }
      return { select: vi.fn() }
    }),
  } as never
}

describe('fetchWorkflowForEditor', () => {
  it('returns null when workflow not found', async () => {
    const supabase = createMockSupabase({ workflow: null })
    const result = await fetchWorkflowForEditor(supabase, 'nonexistent')
    expect(result).toBeNull()
  })

  it('returns workflow data with trigger and steps', async () => {
    const supabase = createMockSupabase({
      workflow: {
        id: 'w1',
        name: 'Test Workflow',
        emoji: '🔧',
        is_starred: true,
        status: 'published',
      },
      trigger: {
        type: 'webhook',
        config: { url: 'https://example.com', method: 'POST', response_status: 200 },
      },
      steps: [
        {
          id: 's1',
          type: 'ai',
          name: 'Summarize',
          config: { ai_action: 'summarize' },
          position: 0,
        },
        { id: 's2', type: 'http', name: 'Call API', config: { method: 'GET' }, position: 1 },
      ],
    })

    const result = await fetchWorkflowForEditor(supabase, 'w1')
    expect(result).not.toBeNull()
    expect(result!.workflowId).toBe('w1')
    expect(result!.workflowName).toBe('Test Workflow')
    expect(result!.workflowEmoji).toBe('🔧')
    expect(result!.isStarred).toBe(true)
    expect(result!.trigger).toEqual({
      type: 'webhook',
      config: { url: 'https://example.com', method: 'POST', response_status: 200 },
    })
    expect(result!.steps).toHaveLength(2)
    expect(result!.steps[0].name).toBe('Summarize')
    expect(result!.steps[1].name).toBe('Call API')
  })

  it('returns null trigger when no trigger exists', async () => {
    const supabase = createMockSupabase({
      workflow: { id: 'w2', name: 'No Trigger', emoji: null, is_starred: false, status: 'draft' },
      trigger: null,
      steps: [],
    })

    const result = await fetchWorkflowForEditor(supabase, 'w2')
    expect(result).not.toBeNull()
    expect(result!.trigger).toBeNull()
    expect(result!.workflowEmoji).toBe('')
  })
})
