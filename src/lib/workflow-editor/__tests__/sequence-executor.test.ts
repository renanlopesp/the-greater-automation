import { describe, it, expect, vi } from 'vitest'
import { executeSequenceStep } from '../sequence-executor'
import type { SubWorkflowStep, StepDispatchFn } from '../sequence-executor'

function makeSteps(
  items: Array<{
    id?: string
    type?: string
    name?: string
    position?: number
    config?: Record<string, unknown>
  }>
): SubWorkflowStep[] {
  return items.map((s, i) => ({
    id: s.id ?? `step-${i}`,
    type: (s.type ?? 'utility') as SubWorkflowStep['type'],
    name: s.name ?? `Step ${i + 1}`,
    position: s.position ?? i,
    config: s.config ?? {},
  }))
}

const identityDispatch: StepDispatchFn = async (type) => ({ type })

describe('sequence-executor (sub-workflow)', () => {
  describe('basic execution', () => {
    it('executes a single sub-workflow step', async () => {
      const steps = makeSteps([{ id: 'a', type: 'utility' }])
      const result = await executeSequenceStep('wf-1', 'My Workflow', steps, {}, identityDispatch)

      expect(result.steps_executed).toBe(1)
      expect(result.outputs).toHaveLength(1)
      expect(result.outputs[0]).toEqual({ type: 'utility' })
    })

    it('executes multiple sub-workflow steps', async () => {
      const steps = makeSteps([
        { id: 'a', type: 'utility' },
        { id: 'b', type: 'ai' },
        { id: 'c', type: 'http' },
      ])
      const result = await executeSequenceStep('wf-1', 'Pipeline', steps, {}, identityDispatch)

      expect(result.steps_executed).toBe(3)
      expect(result.outputs).toHaveLength(3)
    })

    it('returns workflow metadata in result', async () => {
      const steps = makeSteps([{ type: 'utility' }])
      const result = await executeSequenceStep('wf-42', 'Data Cleanup', steps, {}, identityDispatch)

      expect(result.workflow_id).toBe('wf-42')
      expect(result.workflow_name).toBe('Data Cleanup')
    })
  })

  describe('sequential ordering', () => {
    it('executes steps in order', async () => {
      const order: string[] = []
      const dispatch: StepDispatchFn = async (type) => {
        order.push(type)
        return { type }
      }
      const steps = makeSteps([{ type: 'ai' }, { type: 'http' }, { type: 'utility' }])

      await executeSequenceStep('wf-1', 'Test', steps, {}, dispatch)

      expect(order).toEqual(['ai', 'http', 'utility'])
    })

    it('passes step config to dispatch function', async () => {
      const receivedConfigs: Record<string, unknown>[] = []
      const dispatch: StepDispatchFn = async (_type, cfg) => {
        receivedConfigs.push(cfg)
        return {}
      }
      const steps = makeSteps([
        { config: { math_expression: '1+1' } },
        { config: { url: 'https://example.com' } },
      ])

      await executeSequenceStep('wf-1', 'Test', steps, {}, dispatch)

      expect(receivedConfigs[0]).toEqual({ math_expression: '1+1' })
      expect(receivedConfigs[1]).toEqual({ url: 'https://example.com' })
    })
  })

  describe('context passing', () => {
    it('provides parent context to first step', async () => {
      let receivedCtx: Record<string, unknown> = {}
      const dispatch: StepDispatchFn = async (_type, _cfg, ctx) => {
        receivedCtx = ctx
        return {}
      }
      const steps = makeSteps([{ type: 'utility' }])
      const parentCtx = { step_1: { output: 'hello' } }

      await executeSequenceStep('wf-1', 'Test', steps, parentCtx, dispatch)

      expect(receivedCtx).toHaveProperty('step_1')
    })

    it('accumulates outputs for subsequent steps', async () => {
      const contexts: Record<string, unknown>[] = []
      const dispatch: StepDispatchFn = async (type, _cfg, ctx) => {
        contexts.push({ ...ctx })
        return { value: type }
      }
      const steps = makeSteps([
        { id: 'a', type: 'utility', position: 0 },
        { id: 'b', type: 'ai', position: 1 },
        { id: 'c', type: 'http', position: 2 },
      ])

      await executeSequenceStep('wf-1', 'Test', steps, {}, dispatch)

      expect(contexts[0]).not.toHaveProperty('sub_step_1')
      expect(contexts[1]).toHaveProperty('sub_step_1')
      expect(contexts[1].sub_step_1).toEqual({ output: { value: 'utility' } })
      expect(contexts[2]).toHaveProperty('sub_step_1')
      expect(contexts[2]).toHaveProperty('sub_step_2')
    })

    it('does not mutate the original context', async () => {
      const originalCtx = { existing: 'data' }
      const steps = makeSteps([{ type: 'utility' }])

      await executeSequenceStep('wf-1', 'Test', steps, originalCtx, identityDispatch)

      expect(originalCtx).toEqual({ existing: 'data' })
      expect(originalCtx).not.toHaveProperty('sub_step_1')
    })
  })

  describe('aggregated output', () => {
    it('keys outputs by step id', async () => {
      const steps = makeSteps([
        { id: 'first', type: 'utility' },
        { id: 'second', type: 'ai' },
      ])
      const result = await executeSequenceStep('wf-1', 'Test', steps, {}, identityDispatch)

      expect(result.aggregated_output).toHaveProperty('first')
      expect(result.aggregated_output).toHaveProperty('second')
      expect(result.aggregated_output.first).toEqual({ type: 'utility' })
      expect(result.aggregated_output.second).toEqual({ type: 'ai' })
    })

    it('maps outputs array indices to step order', async () => {
      const steps = makeSteps([
        { id: 'x', type: 'utility' },
        { id: 'y', type: 'http' },
      ])
      const result = await executeSequenceStep('wf-1', 'Test', steps, {}, identityDispatch)

      expect(result.outputs[0]).toEqual(result.aggregated_output.x)
      expect(result.outputs[1]).toEqual(result.aggregated_output.y)
    })
  })

  describe('error handling', () => {
    it('throws when steps array is empty', async () => {
      await expect(executeSequenceStep('wf-1', 'Test', [], {}, identityDispatch)).rejects.toThrow(
        'Sub-workflow has no steps to execute'
      )
    })

    it('throws when steps is undefined', async () => {
      await expect(
        executeSequenceStep(
          'wf-1',
          'Test',
          undefined as unknown as SubWorkflowStep[],
          {},
          identityDispatch
        )
      ).rejects.toThrow('Sub-workflow has no steps to execute')
    })

    it('wraps errors with workflow name and step info', async () => {
      const failingDispatch: StepDispatchFn = async () => {
        throw new Error('connection refused')
      }
      const steps = makeSteps([{ name: 'Fetch Data', type: 'http' }])

      await expect(
        executeSequenceStep('wf-1', 'Data Pipeline', steps, {}, failingDispatch)
      ).rejects.toThrow(
        'Sub-workflow "Data Pipeline" failed at step "Fetch Data" (1/1): connection refused'
      )
    })

    it('wraps non-Error throws', async () => {
      const failingDispatch: StepDispatchFn = async () => {
        throw 'string error'
      }
      const steps = makeSteps([{ type: 'utility' }])

      await expect(executeSequenceStep('wf-1', 'Test', steps, {}, failingDispatch)).rejects.toThrow(
        'Unknown error'
      )
    })

    it('stops at first failing step', async () => {
      const executed: string[] = []
      const dispatch: StepDispatchFn = async (type) => {
        executed.push(type)
        if (type === 'http') throw new Error('fail')
        return {}
      }
      const steps = makeSteps([{ type: 'utility' }, { type: 'http' }, { type: 'ai' }])

      await expect(executeSequenceStep('wf-1', 'Test', steps, {}, dispatch)).rejects.toThrow()
      expect(executed).toEqual(['utility', 'http'])
    })

    it('includes step position in error (e.g. 2/3)', async () => {
      const dispatch: StepDispatchFn = async (type) => {
        if (type === 'ai') throw new Error('quota exceeded')
        return {}
      }
      const steps = makeSteps([
        { name: 'Format', type: 'utility' },
        { name: 'Generate', type: 'ai' },
        { name: 'Send', type: 'http' },
      ])

      await expect(executeSequenceStep('wf-1', 'My Flow', steps, {}, dispatch)).rejects.toThrow(
        'Sub-workflow "My Flow" failed at step "Generate" (2/3): quota exceeded'
      )
    })
  })

  describe('result shape', () => {
    it('always includes all expected fields', async () => {
      const steps = makeSteps([{ type: 'utility' }])
      const result = await executeSequenceStep('wf-1', 'Test', steps, {}, identityDispatch)

      expect(result).toHaveProperty('workflow_id')
      expect(result).toHaveProperty('workflow_name')
      expect(result).toHaveProperty('steps_executed')
      expect(result).toHaveProperty('outputs')
      expect(result).toHaveProperty('aggregated_output')
      expect(typeof result.steps_executed).toBe('number')
      expect(Array.isArray(result.outputs)).toBe(true)
      expect(typeof result.aggregated_output).toBe('object')
    })

    it('steps_executed matches number of steps', async () => {
      const steps = makeSteps([
        { type: 'a' },
        { type: 'b' },
        { type: 'c' },
        { type: 'd' },
        { type: 'e' },
      ])
      const result = await executeSequenceStep('wf-1', 'Test', steps, {}, identityDispatch)

      expect(result.steps_executed).toBe(5)
      expect(result.outputs).toHaveLength(5)
    })
  })

  describe('dispatch function calls', () => {
    it('calls dispatch once per step', async () => {
      const dispatch = vi.fn().mockResolvedValue({})
      const steps = makeSteps([{ type: 'utility' }, { type: 'ai' }])

      await executeSequenceStep('wf-1', 'Test', steps, {}, dispatch)

      expect(dispatch).toHaveBeenCalledTimes(2)
    })

    it('passes correct type and config to dispatch', async () => {
      const dispatch = vi.fn().mockResolvedValue({})
      const steps = makeSteps([
        { type: 'utility', config: { utility_type: 'math', math_expression: '1+1' } },
      ])

      await executeSequenceStep('wf-1', 'Test', steps, {}, dispatch)

      expect(dispatch).toHaveBeenCalledWith(
        'utility',
        { utility_type: 'math', math_expression: '1+1' },
        expect.any(Object)
      )
    })

    it('handles dispatch returning various types', async () => {
      const dispatch: StepDispatchFn = async (type) => {
        if (type === 'utility') return 42
        if (type === 'ai') return 'hello'
        return null
      }
      const steps = makeSteps([
        { id: 'a', type: 'utility' },
        { id: 'b', type: 'ai' },
        { id: 'c', type: 'http' },
      ])

      const result = await executeSequenceStep('wf-1', 'Test', steps, {}, dispatch)

      expect(result.outputs).toEqual([42, 'hello', null])
      expect(result.aggregated_output.a).toBe(42)
      expect(result.aggregated_output.b).toBe('hello')
      expect(result.aggregated_output.c).toBeNull()
    })
  })
})
