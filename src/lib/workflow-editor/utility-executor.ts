import type { UtilityStepConfig } from './step-defaults'
import { getNestedValue } from './flow-control-executor'

export interface UtilityResult {
  utility_type: string
  result: unknown
  item_count?: number
}

/**
 * Resolve {{variable}} placeholders in a template string using context.
 * Supports dot-notation paths like {{step_1.output.content}}.
 */
export function resolveTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, path: string) => {
    const value = getNestedValue(context, path.trim())
    return value != null ? String(value) : ''
  })
}

/**
 * Parse CSV string into array of record objects.
 * First row = headers, subsequent rows = values.
 */
function parseCsv(csv: string): Array<Record<string, string>> {
  const lines = csv.trim().split('\n')
  if (lines.length === 0) return []

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

/**
 * Validate and evaluate a math expression.
 * Only allows numbers, operators (+, -, *, /), decimal points, and parentheses.
 */
function evaluateMath(expression: string): number {
  const cleaned = expression.replace(/\s+/g, '')
  if (!cleaned) throw new Error('Math expression is empty')

  if (!/^[\d+\-*/().]+$/.test(cleaned)) {
    throw new Error('Invalid math expression: only numbers and basic operators allowed')
  }

  const result = new Function(`return ${cleaned}`)()

  if (typeof result !== 'number' || !isFinite(result)) {
    throw new Error('Math expression did not produce a valid number')
  }

  return result
}

/**
 * Execute a utility step. Pure function — no I/O.
 */
export function executeUtilityStep(
  config: UtilityStepConfig,
  context: Record<string, unknown>
): UtilityResult {
  const { utility_type } = config

  switch (utility_type) {
    case 'format': {
      if (!config.format_template) {
        throw new Error('Format utility requires a format_template')
      }
      const result = resolveTemplate(config.format_template, context)
      return { utility_type: 'format', result }
    }

    case 'parse_json': {
      if (!config.input_source) {
        throw new Error('Parse JSON utility requires input_source')
      }
      try {
        const result = JSON.parse(config.input_source)
        return { utility_type: 'parse_json', result }
      } catch (err) {
        throw new Error(`Invalid JSON: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    case 'parse_csv': {
      if (!config.input_source) {
        throw new Error('Parse CSV utility requires input_source')
      }
      const result = parseCsv(config.input_source)
      return { utility_type: 'parse_csv', result, item_count: result.length }
    }

    case 'merge': {
      if (!config.input_source) {
        throw new Error('Merge utility requires input_source')
      }
      let items: unknown
      try {
        items = JSON.parse(config.input_source)
      } catch (err) {
        throw new Error(`Merge failed: ${err instanceof Error ? err.message : 'Invalid JSON'}`)
      }
      if (!Array.isArray(items)) {
        throw new Error('Merge utility requires an array of objects')
      }
      const result = Object.assign({}, ...items) as Record<string, unknown>
      return { utility_type: 'merge', result, item_count: items.length }
    }

    case 'filter': {
      if (!config.input_source || !config.filter_condition) {
        throw new Error('Filter utility requires input_source and filter_condition')
      }
      // Allowlist: property access (item.x), comparisons, logical ops, literals
      if (!/^[a-zA-Z0-9_.\s!=<>&|"'()+\-*/,%]+$/.test(config.filter_condition)) {
        throw new Error('Filter condition contains unsafe characters')
      }
      let items: unknown
      try {
        items = JSON.parse(config.input_source)
      } catch (err) {
        throw new Error(`Filter failed: ${err instanceof Error ? err.message : 'Invalid JSON'}`)
      }
      if (!Array.isArray(items)) {
        throw new Error('Filter utility requires an array')
      }
      const filterFn = new Function('item', `return ${config.filter_condition}`) as (
        item: unknown
      ) => boolean
      const filtered = items.filter((item) => filterFn(item))
      return { utility_type: 'filter', result: filtered, item_count: filtered.length }
    }

    case 'map': {
      if (!config.input_source || !config.format_template) {
        throw new Error('Map utility requires input_source and format_template')
      }
      let items: unknown
      try {
        items = JSON.parse(config.input_source)
      } catch (err) {
        throw new Error(`Map failed: ${err instanceof Error ? err.message : 'Invalid JSON'}`)
      }
      if (!Array.isArray(items)) {
        throw new Error('Map utility requires an array')
      }
      const template = config.format_template
      const mapped = items.map((item: unknown) => {
        return template.replace(/\{\{item\.(.+?)\}\}/g, (_, path: string) => {
          const value = getNestedValue({ item } as Record<string, unknown>, `item.${path.trim()}`)
          return value != null ? String(value) : ''
        })
      })
      return { utility_type: 'map', result: mapped, item_count: mapped.length }
    }

    case 'math': {
      if (!config.math_expression) {
        throw new Error('Math utility requires math_expression')
      }
      const result = evaluateMath(config.math_expression)
      return { utility_type: 'math', result }
    }

    default:
      throw new Error(`Unknown utility type: ${utility_type}`)
  }
}
