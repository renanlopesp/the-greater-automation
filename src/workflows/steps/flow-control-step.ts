'use step'

import { sleep, FatalError } from 'workflow'
import type { FlowControlStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface FlowControlStepOutput {
  control_type: string
  path_taken?: string
  loop_iterations?: number
  wait_duration?: number
  result?: unknown
}

export async function flowControlStep(
  config: FlowControlStepConfig,
  context: Record<string, unknown>
): Promise<FlowControlStepOutput> {
  const { control_type, conditions, default_path, wait_duration, wait_unit } = config

  try {
    switch (control_type) {
      case 'path': {
        // Conditional branching - evaluate conditions and determine path
        if (!conditions || conditions.length === 0) {
          return {
            control_type: 'path',
            path_taken: default_path || 'default',
          }
        }

        // Evaluate conditions in order
        for (const condition of conditions) {
          if (evaluateCondition(condition, context)) {
            return {
              control_type: 'path',
              path_taken: condition.value, // The path to take
            }
          }
        }

        // No condition matched, use default
        return {
          control_type: 'path',
          path_taken: default_path || 'default',
        }
      }

      case 'loop': {
        // Loop control - this is informational; actual looping happens in executor
        const { loop_source, loop_count } = config

        if (loop_count !== undefined) {
          return {
            control_type: 'loop',
            loop_iterations: loop_count,
          }
        }

        if (loop_source) {
          // Resolve template variable from context
          const templateMatch = loop_source.match(/\{\{(.+?)\}\}/)
          const path = templateMatch ? templateMatch[1].trim() : loop_source
          const resolved = getNestedValue(context, path)

          if (Array.isArray(resolved)) {
            return { control_type: 'loop', loop_iterations: resolved.length }
          }
          if (typeof resolved === 'number') {
            return { control_type: 'loop', loop_iterations: resolved }
          }
          return { control_type: 'loop', loop_iterations: 1 }
        }

        throw new FatalError('Loop step requires loop_count or loop_source')
      }

      case 'wait': {
        // Wait/delay step - use workflow's sleep function
        if (!wait_duration || !wait_unit) {
          throw new FatalError('Wait step requires wait_duration and wait_unit')
        }

        // Convert to milliseconds
        let durationMs: number
        switch (wait_unit) {
          case 'seconds':
            durationMs = wait_duration * 1000
            break
          case 'minutes':
            durationMs = wait_duration * 60 * 1000
            break
          case 'hours':
            durationMs = wait_duration * 60 * 60 * 1000
            break
          default:
            throw new FatalError(`Invalid wait_unit: ${wait_unit}`)
        }

        // Use workflow sleep to suspend execution
        await sleep(durationMs)

        return {
          control_type: 'wait',
          wait_duration: durationMs,
        }
      }

      default:
        throw new FatalError(`Unknown control type: ${control_type}`)
    }
  } catch (error) {
    if (error instanceof FatalError) {
      throw error
    }

    if (error instanceof Error) {
      throw new FatalError(`Flow control step failed: ${error.message}`)
    }

    throw new FatalError('Flow control step failed')
  }
}

// Helper function to evaluate a condition
function evaluateCondition(
  condition: { field: string; operator: string; value: string },
  context: Record<string, unknown>
): boolean {
  const { field, operator, value } = condition

  // Get the field value from context
  const fieldValue = getNestedValue(context, field)

  // Evaluate based on operator
  switch (operator) {
    case 'equals':
    case '==':
      return String(fieldValue) === value

    case 'not_equals':
    case '!=':
      return String(fieldValue) !== value

    case 'contains':
      return String(fieldValue).includes(value)

    case 'not_contains':
      return !String(fieldValue).includes(value)

    case 'gt':
    case 'greater_than':
    case '>':
      return Number(fieldValue) > Number(value)

    case 'lt':
    case 'less_than':
    case '<':
      return Number(fieldValue) < Number(value)

    case 'greater_or_equal':
    case '>=':
      return Number(fieldValue) >= Number(value)

    case 'less_or_equal':
    case '<=':
      return Number(fieldValue) <= Number(value)

    case 'exists':
    case 'is_not_empty':
      return !!fieldValue && String(fieldValue).trim() !== ''

    case 'not_exists':
    case 'is_empty':
      return !fieldValue || String(fieldValue).trim() === ''

    default:
      return false
  }
}

// Helper to get nested value from context
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current === 'object' && !Array.isArray(current)) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}
