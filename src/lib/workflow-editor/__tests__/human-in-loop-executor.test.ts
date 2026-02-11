import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create a fluent chainable mock builder
function createChainMock(resolveValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const self = () => chain

  chain.select = vi.fn(() => self())
  chain.insert = vi.fn(() => self())
  chain.update = vi.fn(() => self())
  chain.eq = vi.fn(() => self())
  chain.neq = vi.fn(() => self())
  chain.order = vi.fn(() => self())
  chain.limit = vi.fn(() => self())
  chain.single = vi.fn(() => Promise.resolve(resolveValue))
  chain.maybeSingle = vi.fn(() => Promise.resolve(resolveValue))

  return chain
}

let chainQueue: ReturnType<typeof createChainMock>[] = []
let insertCaptures: unknown[] = []
let updateCaptures: unknown[] = []

const mockFrom = vi.fn(() => {
  const chain = chainQueue.shift()!
  // Wrap insert/update to capture args
  const origInsert = chain.insert as (...args: unknown[]) => unknown
  chain.insert = vi.fn((...args: unknown[]) => {
    insertCaptures.push(args[0])
    return origInsert(...args)
  })
  const origUpdate = chain.update as (...args: unknown[]) => unknown
  chain.update = vi.fn((...args: unknown[]) => {
    updateCaptures.push(args[0])
    return origUpdate(...args)
  })
  return chain
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
    })
  ),
}))

import {
  createHumanApproval,
  submitApprovalResponse,
  getApprovalForStep,
} from '../human-in-loop-executor'
import type { HumanInLoopStepConfig } from '../step-defaults'

describe('human-in-loop-executor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainQueue = []
    insertCaptures = []
    updateCaptures = []
  })

  const baseConfig: HumanInLoopStepConfig = {
    action_type: 'approval',
    assignee_type: 'anyone',
    prompt: 'Please approve this deployment',
    include_context: true,
  }

  describe('createHumanApproval', () => {
    it('should create approval with correct fields', async () => {
      chainQueue.push(createChainMock({ data: { id: 'approval-1' }, error: null }))

      const result = await createHumanApproval(baseConfig, 'run-1', 'step-1', 0, 'workflow-1', {
        step_1: { output: 'test' },
      })

      expect(result.success).toBe(true)
      expect(result.approval_id).toBe('approval-1')
      expect(mockFrom).toHaveBeenCalledWith('human_approvals')
      expect(insertCaptures[0]).toEqual(
        expect.objectContaining({
          run_id: 'run-1',
          step_id: 'step-1',
          step_position: 0,
          workflow_id: 'workflow-1',
          action_type: 'approval',
          assignee_type: 'anyone',
          prompt: 'Please approve this deployment',
          include_context: true,
          status: 'pending',
        })
      )
    })

    it('should calculate expires_at from timeout_minutes', async () => {
      chainQueue.push(createChainMock({ data: { id: 'approval-2' }, error: null }))

      const configWithTimeout: HumanInLoopStepConfig = {
        ...baseConfig,
        timeout_minutes: 120,
      }

      const beforeTime = Date.now()
      await createHumanApproval(configWithTimeout, 'run-1', null, 0, 'workflow-1', {})
      const afterTime = Date.now()

      const insertCall = insertCaptures[0] as Record<string, unknown>
      const expiresAt = new Date(insertCall.expires_at as string).getTime()
      const expectedMin = beforeTime + 120 * 60 * 1000
      const expectedMax = afterTime + 120 * 60 * 1000

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin)
      expect(expiresAt).toBeLessThanOrEqual(expectedMax)
      expect(insertCall.timeout_minutes).toBe(120)
    })

    it('should use default timeout of 60 minutes', async () => {
      chainQueue.push(createChainMock({ data: { id: 'approval-3' }, error: null }))

      await createHumanApproval(baseConfig, 'run-1', null, 0, 'workflow-1', {})

      const insertCall = insertCaptures[0] as Record<string, unknown>
      expect(insertCall.timeout_minutes).toBe(60)
    })

    it('should include context_data when include_context is true', async () => {
      chainQueue.push(createChainMock({ data: { id: 'approval-4' }, error: null }))

      const contextData = { step_1: { output: { content: 'hello' } } }
      await createHumanApproval(baseConfig, 'run-1', null, 0, 'workflow-1', contextData)

      const insertCall = insertCaptures[0] as Record<string, unknown>
      expect(insertCall.context_data).toEqual(contextData)
    })

    it('should exclude context_data when include_context is false', async () => {
      chainQueue.push(createChainMock({ data: { id: 'approval-5' }, error: null }))

      const configNoContext: HumanInLoopStepConfig = {
        ...baseConfig,
        include_context: false,
      }

      await createHumanApproval(configNoContext, 'run-1', null, 0, 'workflow-1', {
        step_1: { output: 'should not appear' },
      })

      const insertCall = insertCaptures[0] as Record<string, unknown>
      expect(insertCall.context_data).toEqual({})
    })

    it('should return error when prompt is empty', async () => {
      const emptyPromptConfig: HumanInLoopStepConfig = {
        ...baseConfig,
        prompt: '',
      }

      const result = await createHumanApproval(
        emptyPromptConfig,
        'run-1',
        null,
        0,
        'workflow-1',
        {}
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Prompt is required for human-in-loop step')
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('should return error on DB insert failure', async () => {
      chainQueue.push(createChainMock({ data: null, error: { message: 'DB connection failed' } }))

      const result = await createHumanApproval(baseConfig, 'run-1', null, 0, 'workflow-1', {})

      expect(result.success).toBe(false)
      expect(result.error).toBe('DB connection failed')
    })

    it('should set assignee from config', async () => {
      chainQueue.push(createChainMock({ data: { id: 'approval-6' }, error: null }))

      const configWithAssignee: HumanInLoopStepConfig = {
        ...baseConfig,
        assignee_type: 'specific',
        assignee: 'user@example.com',
      }

      await createHumanApproval(configWithAssignee, 'run-1', null, 0, 'workflow-1', {})

      const insertCall = insertCaptures[0] as Record<string, unknown>
      expect(insertCall.assignee_type).toBe('specific')
      expect(insertCall.assignee).toBe('user@example.com')
    })

    it('should set assignee to null when not provided', async () => {
      chainQueue.push(createChainMock({ data: { id: 'approval-7' }, error: null }))

      await createHumanApproval(baseConfig, 'run-1', null, 0, 'workflow-1', {})

      const insertCall = insertCaptures[0] as Record<string, unknown>
      expect(insertCall.assignee).toBeNull()
    })

    it('should handle different action types', async () => {
      chainQueue.push(createChainMock({ data: { id: 'approval-8' }, error: null }))

      const inputConfig: HumanInLoopStepConfig = {
        ...baseConfig,
        action_type: 'input',
      }

      await createHumanApproval(inputConfig, 'run-1', null, 0, 'workflow-1', {})

      const insertCall = insertCaptures[0] as Record<string, unknown>
      expect(insertCall.action_type).toBe('input')
    })

    it('should handle review action type', async () => {
      chainQueue.push(createChainMock({ data: { id: 'approval-9' }, error: null }))

      const reviewConfig: HumanInLoopStepConfig = {
        ...baseConfig,
        action_type: 'review',
      }

      await createHumanApproval(reviewConfig, 'run-1', null, 0, 'workflow-1', {})

      const insertCall = insertCaptures[0] as Record<string, unknown>
      expect(insertCall.action_type).toBe('review')
    })
  })

  describe('submitApprovalResponse', () => {
    it('should update approval with approved status', async () => {
      // fetch approval
      chainQueue.push(
        createChainMock({
          data: {
            id: 'approval-1',
            status: 'pending',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          },
          error: null,
        })
      )
      // update approval
      chainQueue.push(
        createChainMock({
          data: {
            id: 'approval-1',
            status: 'approved',
            response: { decision: 'approved', comment: null, input_data: null },
            responded_by: 'user-1',
            responded_at: '2026-02-11T00:00:00Z',
          },
          error: null,
        })
      )

      const result = await submitApprovalResponse('approval-1', 'user-1', 'approved')

      expect(result.success).toBe(true)
      expect(result.approval?.status).toBe('approved')
    })

    it('should update approval with rejected status', async () => {
      chainQueue.push(
        createChainMock({
          data: {
            id: 'approval-1',
            status: 'pending',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          },
          error: null,
        })
      )
      chainQueue.push(
        createChainMock({
          data: {
            id: 'approval-1',
            status: 'rejected',
            response: { decision: 'rejected', comment: 'Not ready', input_data: null },
            responded_by: 'user-1',
            responded_at: '2026-02-11T00:00:00Z',
          },
          error: null,
        })
      )

      const result = await submitApprovalResponse('approval-1', 'user-1', 'rejected', 'Not ready')

      expect(result.success).toBe(true)
      expect(result.approval?.status).toBe('rejected')
    })

    it('should update approval with input_provided status and input_data', async () => {
      chainQueue.push(
        createChainMock({
          data: {
            id: 'approval-1',
            status: 'pending',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          },
          error: null,
        })
      )
      chainQueue.push(
        createChainMock({
          data: {
            id: 'approval-1',
            status: 'input_provided',
            response: {
              decision: 'input_provided',
              comment: null,
              input_data: 'user input text',
            },
            responded_by: 'user-1',
            responded_at: '2026-02-11T00:00:00Z',
          },
          error: null,
        })
      )

      const result = await submitApprovalResponse(
        'approval-1',
        'user-1',
        'input_provided',
        undefined,
        'user input text'
      )

      expect(result.success).toBe(true)
      expect(result.approval?.status).toBe('input_provided')
    })

    it('should set responded_by and responded_at', async () => {
      chainQueue.push(
        createChainMock({
          data: {
            id: 'approval-1',
            status: 'pending',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          },
          error: null,
        })
      )
      chainQueue.push(
        createChainMock({
          data: {
            id: 'approval-1',
            status: 'approved',
            response: { decision: 'approved', comment: null, input_data: null },
            responded_by: 'user-42',
            responded_at: '2026-02-11T12:00:00Z',
          },
          error: null,
        })
      )

      const result = await submitApprovalResponse('approval-1', 'user-42', 'approved')

      expect(result.approval?.responded_by).toBe('user-42')
      expect(result.approval?.responded_at).toBe('2026-02-11T12:00:00Z')
    })

    it('should return error for already-responded approval', async () => {
      chainQueue.push(
        createChainMock({
          data: {
            id: 'approval-1',
            status: 'approved',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          },
          error: null,
        })
      )

      const result = await submitApprovalResponse('approval-1', 'user-1', 'approved')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Approval already approved')
    })

    it('should return error for non-existent approval', async () => {
      chainQueue.push(createChainMock({ data: null, error: { message: 'Not found' } }))

      const result = await submitApprovalResponse('nonexistent', 'user-1', 'approved')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Approval not found')
    })

    it('should return error for timed-out approval and update status', async () => {
      chainQueue.push(
        createChainMock({
          data: {
            id: 'approval-1',
            status: 'pending',
            expires_at: new Date(Date.now() - 1000).toISOString(), // expired
          },
          error: null,
        })
      )
      // For the timeout update call
      chainQueue.push(createChainMock({ data: null, error: null }))

      const result = await submitApprovalResponse('approval-1', 'user-1', 'approved')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Approval has timed out')
    })

    it('should return error on DB update failure', async () => {
      chainQueue.push(
        createChainMock({
          data: {
            id: 'approval-1',
            status: 'pending',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          },
          error: null,
        })
      )
      chainQueue.push(createChainMock({ data: null, error: { message: 'Update failed' } }))

      const result = await submitApprovalResponse('approval-1', 'user-1', 'approved')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })
  })

  describe('getApprovalForStep', () => {
    it('should return approval matching run_id and step_position', async () => {
      chainQueue.push(
        createChainMock({
          data: {
            id: 'approval-1',
            status: 'approved',
            response: { decision: 'approved', comment: 'Looks good' },
            responded_by: 'user-1',
            responded_at: '2026-02-11T00:00:00Z',
          },
          error: null,
        })
      )

      const result = await getApprovalForStep('run-1', 0)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('approval-1')
      expect(result?.status).toBe('approved')
      expect(mockFrom).toHaveBeenCalledWith('human_approvals')
    })

    it('should return null when no approval exists', async () => {
      chainQueue.push(createChainMock({ data: null, error: { message: 'Not found' } }))

      const result = await getApprovalForStep('run-1', 0)

      expect(result).toBeNull()
    })

    it('should return correct response structure for pending approval', async () => {
      chainQueue.push(
        createChainMock({
          data: {
            id: 'approval-3',
            status: 'pending',
            response: null,
            responded_by: null,
            responded_at: null,
          },
          error: null,
        })
      )

      const result = await getApprovalForStep('run-1', 2)

      expect(result).toEqual({
        id: 'approval-3',
        status: 'pending',
        response: null,
        responded_by: null,
        responded_at: null,
      })
    })

    it('should return response with decision data', async () => {
      chainQueue.push(
        createChainMock({
          data: {
            id: 'approval-4',
            status: 'rejected',
            response: { decision: 'rejected', comment: 'Not ready' },
            responded_by: 'user-2',
            responded_at: '2026-02-11T12:00:00Z',
          },
          error: null,
        })
      )

      const result = await getApprovalForStep('run-1', 1)

      expect(result?.status).toBe('rejected')
      expect(result?.response).toEqual({ decision: 'rejected', comment: 'Not ready' })
      expect(result?.responded_by).toBe('user-2')
    })
  })
})
