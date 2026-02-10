'use step'

import { FatalError } from 'workflow'
import type { UtilityStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface UtilityStepOutput {
  utility_type: string
  result: unknown
}

export async function utilityStep(config: UtilityStepConfig): Promise<UtilityStepOutput> {
  const { utility_type, input_source, format_template, filter_condition, math_expression } = config

  try {
    let result: unknown

    switch (utility_type) {
      case 'format':
        if (!format_template) {
          throw new FatalError('Format utility requires a format_template')
        }
        result = format_template // Variables already resolved by executor
        break

      case 'parse_json':
        if (!input_source) {
          throw new FatalError('Parse JSON utility requires input_source')
        }
        try {
          result = JSON.parse(input_source)
        } catch (error) {
          throw new FatalError(
            `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
        break

      case 'parse_csv':
        if (!input_source) {
          throw new FatalError('Parse CSV utility requires input_source')
        }
        result = parseCsv(input_source)
        break

      case 'merge':
        // Merge multiple inputs (assumes input_source contains JSON array)
        if (!input_source) {
          throw new FatalError('Merge utility requires input_source')
        }
        try {
          const items = JSON.parse(input_source)
          if (!Array.isArray(items)) {
            throw new FatalError('Merge utility requires an array of objects')
          }
          result = Object.assign({}, ...items)
        } catch (error) {
          throw new FatalError(
            `Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
        break

      case 'filter':
        if (!input_source || !filter_condition) {
          throw new FatalError('Filter utility requires input_source and filter_condition')
        }
        try {
          const items = JSON.parse(input_source)
          if (!Array.isArray(items)) {
            throw new FatalError('Filter utility requires an array')
          }
          // Simple filter implementation - in production, use a proper expression evaluator
          result = items.filter(() => true) // Placeholder
        } catch (error) {
          throw new FatalError(
            `Filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
        break

      case 'map':
        if (!input_source || !format_template) {
          throw new FatalError('Map utility requires input_source and format_template')
        }
        try {
          const items = JSON.parse(input_source)
          if (!Array.isArray(items)) {
            throw new FatalError('Map utility requires an array')
          }
          // Simple map implementation - variables in format_template would be resolved per item
          result = items.map(() => format_template) // Placeholder
        } catch (error) {
          throw new FatalError(
            `Map failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
        break

      case 'math':
        if (!math_expression) {
          throw new FatalError('Math utility requires math_expression')
        }
        result = evaluateMathExpression(math_expression)
        break

      default:
        throw new FatalError(`Unknown utility type: ${utility_type}`)
    }

    return {
      utility_type,
      result,
    }
  } catch (error) {
    if (error instanceof FatalError) {
      throw error
    }

    if (error instanceof Error) {
      throw new FatalError(`Utility step failed: ${error.message}`)
    }

    throw new FatalError('Utility step failed')
  }
}

// Helper function to parse CSV
function parseCsv(csv: string): Array<Record<string, string>> {
  const lines = csv.trim().split('\n')
  if (lines.length === 0) {
    return []
  }

  const headers = lines[0].split(',').map((h) => h.trim())
  const rows: Array<Record<string, string>> = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim())
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    rows.push(row)
  }

  return rows
}

// Helper function to evaluate simple math expressions
function evaluateMathExpression(expression: string): number {
  // Security note: In production, use a proper math expression parser
  // This is a very basic implementation for demonstration

  // Remove whitespace
  const cleaned = expression.replace(/\s+/g, '')

  // Only allow numbers, operators, and parentheses
  if (!/^[\d+\-*/().]+$/.test(cleaned)) {
    throw new FatalError('Invalid math expression: only numbers and basic operators allowed')
  }

  try {
    // Use Function constructor as a safer alternative to eval
    // Still needs validation in production
    const result = new Function(`return ${cleaned}`)()

    if (typeof result !== 'number' || !isFinite(result)) {
      throw new FatalError('Math expression did not produce a valid number')
    }

    return result
  } catch (error) {
    throw new FatalError(
      `Math evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
