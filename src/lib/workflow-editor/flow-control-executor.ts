import type { FlowControlStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface FlowControlResult {
  control_type: string
  path_taken?: string
  loop_iterations?: number
  wait_duration_ms?: number
  conditions_evaluated?: number
  matched_condition?: { field: string; operator: string; value: string } | null
}

/**
 * Traverse dot-notation paths in an object.
 * E.g., getNestedValue({step_1: {output: {result: "hello"}}}, "step_1.output.result") → "hello"
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[key]
  }

  return current
}

/**
 * Evaluates a single condition against a context object.
 * Supports all operators including aliases from both UI and existing executor.
 */
export function evaluateCondition(
  condition: { field: string; operator: string; value: string },
  context: Record<string, unknown>
): boolean {
  const fieldValue = getNestedValue(context, condition.field)
  const { operator, value } = condition

  // Convert values to strings for comparison (except for numeric operators)
  const fieldStr = fieldValue != null ? String(fieldValue) : ''
  const valueStr = value != null ? String(value) : ''

  switch (operator) {
    // Equality operators
    case 'equals':
    case '==':
      return fieldStr === valueStr

    case 'not_equals':
    case '!=':
      return fieldStr !== valueStr

    // String operators
    case 'contains':
      return fieldStr.includes(valueStr)

    case 'not_contains':
      return !fieldStr.includes(valueStr)

    // Numeric operators
    case 'gt':
    case 'greater_than':
    case '>': {
      const fieldNum = Number(fieldValue)
      const valueNum = Number(value)
      return !isNaN(fieldNum) && !isNaN(valueNum) && fieldNum > valueNum
    }

    case 'lt':
    case 'less_than':
    case '<': {
      const fieldNum = Number(fieldValue)
      const valueNum = Number(value)
      return !isNaN(fieldNum) && !isNaN(valueNum) && fieldNum < valueNum
    }

    case 'greater_or_equal':
    case '>=': {
      const fieldNum = Number(fieldValue)
      const valueNum = Number(value)
      return !isNaN(fieldNum) && !isNaN(valueNum) && fieldNum >= valueNum
    }

    case 'less_or_equal':
    case '<=': {
      const fieldNum = Number(fieldValue)
      const valueNum = Number(value)
      return !isNaN(fieldNum) && !isNaN(valueNum) && fieldNum <= valueNum
    }

    // Existence operators
    case 'exists':
    case 'is_not_empty':
      return Boolean(fieldValue) && fieldStr.trim() !== ''

    case 'not_exists':
    case 'is_empty':
      return !fieldValue || fieldStr.trim() === ''

    // Unknown operator
    default:
      return false
  }
}

/**
 * Resolve a loop source template like {{step_1.output}} from context.
 * Returns the number of iterations to perform.
 */
export function resolveLoopSource(loopSource: string, context: Record<string, unknown>): number {
  // Strip {{ and }} from the template
  const path = loopSource.replace(/^\{\{|\}\}$/g, '').trim()
  const value = getNestedValue(context, path)

  // If value is an array, return its length
  if (Array.isArray(value)) {
    return value.length
  }

  // If value is a number, return that number
  if (typeof value === 'number' && !isNaN(value)) {
    return value
  }

  // Otherwise return 1 as fallback
  return 1
}

/**
 * Main flow control executor function.
 * Handles path, loop, and wait modes.
 */
export async function executeFlowControlStep(
  config: FlowControlStepConfig,
  context: Record<string, unknown>
): Promise<FlowControlResult> {
  const controlType = config.control_type

  switch (controlType) {
    case 'path': {
      const conditions = config.conditions || []
      let conditionsEvaluated = 0
      let matchedCondition: { field: string; operator: string; value: string } | null = null
      let pathTaken: string | undefined

      // Evaluate conditions in order
      for (let i = 0; i < conditions.length; i++) {
        conditionsEvaluated++
        const condition = conditions[i]

        if (evaluateCondition(condition, context)) {
          matchedCondition = condition
          pathTaken = `condition_${i + 1}`
          break
        }
      }

      // If no match, use default path
      if (!pathTaken) {
        pathTaken = config.default_path || 'default'
      }

      return {
        control_type: 'path',
        path_taken: pathTaken,
        conditions_evaluated: conditionsEvaluated,
        matched_condition: matchedCondition,
      }
    }

    case 'loop': {
      let loopIterations: number

      if (config.loop_count != null) {
        loopIterations = config.loop_count
      } else if (config.loop_source) {
        loopIterations = resolveLoopSource(config.loop_source, context)
      } else {
        throw new Error('Loop step requires either loop_count or loop_source')
      }

      return {
        control_type: 'loop',
        loop_iterations: loopIterations,
      }
    }

    case 'wait': {
      if (config.wait_duration == null || !config.wait_unit) {
        throw new Error('Wait step requires wait_duration and wait_unit')
      }

      const duration = config.wait_duration
      let durationMs: number

      switch (config.wait_unit) {
        case 'seconds':
          durationMs = duration * 1000
          break
        case 'minutes':
          durationMs = duration * 60000
          break
        case 'hours':
          durationMs = duration * 3600000
          break
        default:
          throw new Error(`Unknown wait_unit: ${config.wait_unit}`)
      }

      // Cap at 5 seconds for test execution
      const actualWaitMs = Math.min(durationMs, 5000)
      await new Promise((resolve) => setTimeout(resolve, actualWaitMs))

      return {
        control_type: 'wait',
        wait_duration_ms: durationMs,
      }
    }

    default:
      throw new Error(`Unknown control_type: ${controlType}`)
  }
}
