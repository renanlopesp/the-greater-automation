import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  getNestedValue,
  evaluateCondition,
  resolveLoopSource,
  executeFlowControlStep,
} from '../flow-control-executor'
import type { FlowControlStepConfig } from '../step-defaults'

describe('flow-control-executor', () => {
  describe('getNestedValue', () => {
    it('should access simple key', () => {
      const obj = { status: '200' }
      expect(getNestedValue(obj, 'status')).toBe('200')
    })

    it('should access deep nested path', () => {
      const obj = {
        step_1: {
          output: {
            result: 'hello',
          },
        },
      }
      expect(getNestedValue(obj, 'step_1.output.result')).toBe('hello')
    })

    it('should return undefined for missing key', () => {
      const obj = { status: '200' }
      expect(getNestedValue(obj, 'nonexistent')).toBeUndefined()
    })

    it('should return undefined when traversing null', () => {
      const obj = { step_1: null }
      expect(getNestedValue(obj, 'step_1.output.result')).toBeUndefined()
    })

    it('should handle arrays as intermediate values', () => {
      const obj = { items: [1, 2, 3] }
      expect(getNestedValue(obj, 'items.length')).toBe(3)
    })
  })

  describe('evaluateCondition', () => {
    const context = {
      step_1: { output: { status: '200', count: '5', name: 'hello world' } },
      step_2: { output: { result: '' } },
    }

    describe('equals operator', () => {
      it('should return true when values match with equals', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.status', operator: 'equals', value: '200' },
            context
          )
        ).toBe(true)
      })

      it('should return true when values match with ==', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.status', operator: '==', value: '200' },
            context
          )
        ).toBe(true)
      })

      it('should return false when values do not match', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.status', operator: 'equals', value: '404' },
            context
          )
        ).toBe(false)
      })
    })

    describe('not_equals operator', () => {
      it('should return true when values differ with not_equals', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.status', operator: 'not_equals', value: '404' },
            context
          )
        ).toBe(true)
      })

      it('should return true when values differ with !=', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.status', operator: '!=', value: '404' },
            context
          )
        ).toBe(true)
      })

      it('should return false when values match', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.status', operator: 'not_equals', value: '200' },
            context
          )
        ).toBe(false)
      })
    })

    describe('contains operator', () => {
      it('should return true when substring is present', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.name', operator: 'contains', value: 'hello' },
            context
          )
        ).toBe(true)
      })

      it('should return false when substring is absent', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.name', operator: 'contains', value: 'goodbye' },
            context
          )
        ).toBe(false)
      })
    })

    describe('not_contains operator', () => {
      it('should return true when substring is absent', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.name', operator: 'not_contains', value: 'goodbye' },
            context
          )
        ).toBe(true)
      })

      it('should return false when substring is present', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.name', operator: 'not_contains', value: 'hello' },
            context
          )
        ).toBe(false)
      })
    })

    describe('greater_than operator', () => {
      it('should return true with gt alias', () => {
        expect(
          evaluateCondition({ field: 'step_1.output.count', operator: 'gt', value: '3' }, context)
        ).toBe(true)
      })

      it('should return true with greater_than', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.count', operator: 'greater_than', value: '3' },
            context
          )
        ).toBe(true)
      })

      it('should return true with > symbol', () => {
        expect(
          evaluateCondition({ field: 'step_1.output.count', operator: '>', value: '3' }, context)
        ).toBe(true)
      })

      it('should return false when not greater', () => {
        expect(
          evaluateCondition({ field: 'step_1.output.count', operator: 'gt', value: '10' }, context)
        ).toBe(false)
      })
    })

    describe('less_than operator', () => {
      it('should return true with lt alias', () => {
        expect(
          evaluateCondition({ field: 'step_1.output.count', operator: 'lt', value: '10' }, context)
        ).toBe(true)
      })

      it('should return true with less_than', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.count', operator: 'less_than', value: '10' },
            context
          )
        ).toBe(true)
      })

      it('should return true with < symbol', () => {
        expect(
          evaluateCondition({ field: 'step_1.output.count', operator: '<', value: '10' }, context)
        ).toBe(true)
      })

      it('should return false when not less', () => {
        expect(
          evaluateCondition({ field: 'step_1.output.count', operator: 'lt', value: '3' }, context)
        ).toBe(false)
      })
    })

    describe('greater_or_equal operator', () => {
      it('should return true when greater with greater_or_equal', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.count', operator: 'greater_or_equal', value: '3' },
            context
          )
        ).toBe(true)
      })

      it('should return true when equal with >=', () => {
        expect(
          evaluateCondition({ field: 'step_1.output.count', operator: '>=', value: '5' }, context)
        ).toBe(true)
      })

      it('should return false when less', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.count', operator: 'greater_or_equal', value: '10' },
            context
          )
        ).toBe(false)
      })
    })

    describe('less_or_equal operator', () => {
      it('should return true when less with less_or_equal', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.count', operator: 'less_or_equal', value: '10' },
            context
          )
        ).toBe(true)
      })

      it('should return true when equal with <=', () => {
        expect(
          evaluateCondition({ field: 'step_1.output.count', operator: '<=', value: '5' }, context)
        ).toBe(true)
      })

      it('should return false when greater', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.count', operator: 'less_or_equal', value: '3' },
            context
          )
        ).toBe(false)
      })
    })

    describe('exists operator', () => {
      it('should return true for non-empty field with exists', () => {
        expect(
          evaluateCondition({ field: 'step_1.output.name', operator: 'exists', value: '' }, context)
        ).toBe(true)
      })

      it('should return true for non-empty field with is_not_empty', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.name', operator: 'is_not_empty', value: '' },
            context
          )
        ).toBe(true)
      })

      it('should return false for empty field', () => {
        expect(
          evaluateCondition(
            { field: 'step_2.output.result', operator: 'exists', value: '' },
            context
          )
        ).toBe(false)
      })
    })

    describe('not_exists operator', () => {
      it('should return true for empty field with not_exists', () => {
        expect(
          evaluateCondition(
            { field: 'step_2.output.result', operator: 'not_exists', value: '' },
            context
          )
        ).toBe(true)
      })

      it('should return true for empty field with is_empty', () => {
        expect(
          evaluateCondition(
            { field: 'step_2.output.result', operator: 'is_empty', value: '' },
            context
          )
        ).toBe(true)
      })

      it('should return false for non-empty field', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.name', operator: 'not_exists', value: '' },
            context
          )
        ).toBe(false)
      })
    })

    describe('unknown operator', () => {
      it('should return false for unknown operator', () => {
        expect(
          evaluateCondition(
            { field: 'step_1.output.status', operator: 'unknown_op', value: '200' },
            context
          )
        ).toBe(false)
      })
    })
  })

  describe('resolveLoopSource', () => {
    it('should resolve array from context and return length', () => {
      const context = {
        step_1: { output: [1, 2, 3, 4, 5] },
      }
      expect(resolveLoopSource('{{step_1.output}}', context)).toBe(5)
    })

    it('should resolve number from context and return that number', () => {
      const context = {
        step_1: { output: { count: 10 } },
      }
      expect(resolveLoopSource('{{step_1.output.count}}', context)).toBe(10)
    })

    it('should return 1 for missing key', () => {
      const context = {}
      expect(resolveLoopSource('{{step_1.output.missing}}', context)).toBe(1)
    })

    it('should strip {{ and }} from template', () => {
      const context = {
        step_1: { output: { items: [1, 2, 3] } },
      }
      expect(resolveLoopSource('{{ step_1.output.items }}', context)).toBe(3)
    })
  })

  describe('executeFlowControlStep', () => {
    describe('path mode', () => {
      const context = {
        step_1: { output: { status: '200', count: '5' } },
        step_2: { output: { result: 'success' } },
      }

      it('should evaluate conditions and return first match', async () => {
        const config: FlowControlStepConfig = {
          control_type: 'path',
          conditions: [
            { field: 'step_1.output.status', operator: 'equals', value: '200' },
            { field: 'step_2.output.result', operator: 'equals', value: 'success' },
          ],
        }

        const result = await executeFlowControlStep(config, context)

        expect(result.control_type).toBe('path')
        expect(result.path_taken).toBe('condition_1')
        expect(result.conditions_evaluated).toBe(1)
        expect(result.matched_condition).toEqual({
          field: 'step_1.output.status',
          operator: 'equals',
          value: '200',
        })
      })

      it('should return default_path when no conditions match', async () => {
        const config: FlowControlStepConfig = {
          control_type: 'path',
          conditions: [{ field: 'step_1.output.status', operator: 'equals', value: '404' }],
          default_path: 'fallback',
        }

        const result = await executeFlowControlStep(config, context)

        expect(result.control_type).toBe('path')
        expect(result.path_taken).toBe('fallback')
        expect(result.conditions_evaluated).toBe(1)
        expect(result.matched_condition).toBeNull()
      })

      it('should return "default" when no conditions and no default_path', async () => {
        const config: FlowControlStepConfig = {
          control_type: 'path',
          conditions: [{ field: 'step_1.output.status', operator: 'equals', value: '404' }],
        }

        const result = await executeFlowControlStep(config, context)

        expect(result.control_type).toBe('path')
        expect(result.path_taken).toBe('default')
      })

      it('should return default path for empty conditions array', async () => {
        const config: FlowControlStepConfig = {
          control_type: 'path',
          conditions: [],
          default_path: 'empty',
        }

        const result = await executeFlowControlStep(config, context)

        expect(result.control_type).toBe('path')
        expect(result.path_taken).toBe('empty')
        expect(result.conditions_evaluated).toBe(0)
      })

      it('should evaluate multiple conditions and match second', async () => {
        const config: FlowControlStepConfig = {
          control_type: 'path',
          conditions: [
            { field: 'step_1.output.status', operator: 'equals', value: '404' },
            { field: 'step_2.output.result', operator: 'equals', value: 'success' },
          ],
        }

        const result = await executeFlowControlStep(config, context)

        expect(result.control_type).toBe('path')
        expect(result.path_taken).toBe('condition_2')
        expect(result.conditions_evaluated).toBe(2)
        expect(result.matched_condition).toEqual({
          field: 'step_2.output.result',
          operator: 'equals',
          value: 'success',
        })
      })
    })

    describe('loop mode', () => {
      it('should use loop_count when provided', async () => {
        const config: FlowControlStepConfig = {
          control_type: 'loop',
          loop_count: 5,
        }

        const result = await executeFlowControlStep(config, {})

        expect(result.control_type).toBe('loop')
        expect(result.loop_iterations).toBe(5)
      })

      it('should use loop_source to resolve from context', async () => {
        const context = {
          step_1: { output: { items: [1, 2, 3, 4] } },
        }

        const config: FlowControlStepConfig = {
          control_type: 'loop',
          loop_source: '{{step_1.output.items}}',
        }

        const result = await executeFlowControlStep(config, context)

        expect(result.control_type).toBe('loop')
        expect(result.loop_iterations).toBe(4)
      })

      it('should throw when neither loop_count nor loop_source', async () => {
        const config: FlowControlStepConfig = {
          control_type: 'loop',
        }

        await expect(executeFlowControlStep(config, {})).rejects.toThrow(
          'Loop step requires either loop_count or loop_source'
        )
      })
    })

    describe('wait mode', () => {
      afterEach(() => {
        vi.useRealTimers()
      })

      it('should wait and return duration_ms for seconds', async () => {
        vi.useFakeTimers()

        const config: FlowControlStepConfig = {
          control_type: 'wait',
          wait_duration: 3,
          wait_unit: 'seconds',
        }

        const promise = executeFlowControlStep(config, {})
        await vi.advanceTimersByTimeAsync(3000)
        const result = await promise

        expect(result.control_type).toBe('wait')
        expect(result.wait_duration_ms).toBe(3000)
      })

      it('should wait and return duration_ms for minutes', async () => {
        vi.useFakeTimers()

        const config: FlowControlStepConfig = {
          control_type: 'wait',
          wait_duration: 2,
          wait_unit: 'minutes',
        }

        const promise = executeFlowControlStep(config, {})
        await vi.advanceTimersByTimeAsync(5000) // capped at 5s
        const result = await promise

        expect(result.control_type).toBe('wait')
        expect(result.wait_duration_ms).toBe(120000)
      })

      it('should wait and return duration_ms for hours', async () => {
        vi.useFakeTimers()

        const config: FlowControlStepConfig = {
          control_type: 'wait',
          wait_duration: 1,
          wait_unit: 'hours',
        }

        const promise = executeFlowControlStep(config, {})
        await vi.advanceTimersByTimeAsync(5000) // capped at 5s
        const result = await promise

        expect(result.control_type).toBe('wait')
        expect(result.wait_duration_ms).toBe(3600000)
      })

      it('should cap actual wait at 5000ms', async () => {
        const startTime = Date.now()

        const config: FlowControlStepConfig = {
          control_type: 'wait',
          wait_duration: 10,
          wait_unit: 'minutes',
        }

        const result = await executeFlowControlStep(config, {})
        const elapsed = Date.now() - startTime

        expect(result.control_type).toBe('wait')
        expect(result.wait_duration_ms).toBe(600000)
        expect(elapsed).toBeGreaterThanOrEqual(4900) // Waited ~5s (allow small timer variance)
        expect(elapsed).toBeLessThan(6000) // But not the full 10 minutes
      }, 10000)

      it('should throw when wait_duration missing', async () => {
        const config: FlowControlStepConfig = {
          control_type: 'wait',
          wait_unit: 'seconds',
        }

        await expect(executeFlowControlStep(config, {})).rejects.toThrow(
          'Wait step requires wait_duration and wait_unit'
        )
      })

      it('should throw when wait_unit missing', async () => {
        const config: FlowControlStepConfig = {
          control_type: 'wait',
          wait_duration: 5,
        }

        await expect(executeFlowControlStep(config, {})).rejects.toThrow(
          'Wait step requires wait_duration and wait_unit'
        )
      })
    })

    describe('unknown control_type', () => {
      it('should throw error', async () => {
        const config = {
          control_type: 'unknown',
        } as unknown as FlowControlStepConfig

        await expect(executeFlowControlStep(config, {})).rejects.toThrow(
          'Unknown control_type: unknown'
        )
      })
    })
  })
})
