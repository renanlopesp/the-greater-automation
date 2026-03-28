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
 * Validate and evaluate a math expression using a safe recursive-descent parser.
 * Only allows numbers, operators (+, -, *, /), decimal points, and parentheses.
 * NO `new Function()` or `eval()` — prevents code injection.
 */
function evaluateMath(expression: string): number {
  const cleaned = expression.replace(/\s+/g, '')
  if (!cleaned) throw new Error('Math expression is empty')

  if (!/^[\d+\-*/().]+$/.test(cleaned)) {
    throw new Error('Invalid math expression: only numbers and basic operators allowed')
  }

  let pos = 0

  function parseExpression(): number {
    let result = parseTerm()
    while (pos < cleaned.length && (cleaned[pos] === '+' || cleaned[pos] === '-')) {
      const op = cleaned[pos++]
      const right = parseTerm()
      result = op === '+' ? result + right : result - right
    }
    return result
  }

  function parseTerm(): number {
    let result = parseFactor()
    while (pos < cleaned.length && (cleaned[pos] === '*' || cleaned[pos] === '/')) {
      const op = cleaned[pos++]
      const right = parseFactor()
      if (op === '/' && right === 0) throw new Error('Division by zero')
      result = op === '*' ? result * right : result / right
    }
    return result
  }

  function parseFactor(): number {
    if (cleaned[pos] === '(') {
      pos++ // skip '('
      const result = parseExpression()
      if (cleaned[pos] !== ')') throw new Error('Mismatched parentheses')
      pos++ // skip ')'
      return result
    }

    // Handle unary minus
    if (cleaned[pos] === '-') {
      pos++
      return -parseFactor()
    }

    const start = pos
    while (pos < cleaned.length && (/\d/.test(cleaned[pos]) || cleaned[pos] === '.')) {
      pos++
    }
    if (start === pos) throw new Error('Expected number')
    const num = parseFloat(cleaned.slice(start, pos))
    if (!isFinite(num)) throw new Error('Invalid number')
    return num
  }

  const result = parseExpression()
  if (pos !== cleaned.length) throw new Error('Unexpected characters in expression')

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
      let items: unknown
      try {
        items = JSON.parse(config.input_source)
      } catch (err) {
        throw new Error(`Filter failed: ${err instanceof Error ? err.message : 'Invalid JSON'}`)
      }
      if (!Array.isArray(items)) {
        throw new Error('Filter utility requires an array')
      }
      // Safe filter: parse "item.field op value" pattern — NO eval/new Function
      const filterMatch = config.filter_condition
        .trim()
        .match(/^item\.(\w+(?:\.\w+)*)\s*(===?|!==?|>=?|<=?)\s*(.+)$/)
      if (!filterMatch) {
        throw new Error(
          'Filter condition must follow the pattern: item.field operator value (e.g., item.price > 100)'
        )
      }
      const [, path, op, rawValue] = filterMatch
      const parsedValue = rawValue.trim()
      // Parse the comparison value (number, boolean, string, or null)
      let compValue: unknown
      if (parsedValue === 'true') compValue = true
      else if (parsedValue === 'false') compValue = false
      else if (parsedValue === 'null') compValue = null
      else if (/^-?\d+(\.\d+)?$/.test(parsedValue)) compValue = Number(parsedValue)
      else if (/^["'].*["']$/.test(parsedValue)) compValue = parsedValue.slice(1, -1)
      else compValue = parsedValue

      const filtered = items.filter((item) => {
        // Safely traverse the property path
        let actual: unknown = item
        for (const key of path.split('.')) {
          if (actual == null || typeof actual !== 'object') return false
          actual = (actual as Record<string, unknown>)[key]
        }
        switch (op) {
          case '==':
          case '===':
            return actual === compValue
          case '!=':
          case '!==':
            return actual !== compValue
          case '>':
            return Number(actual) > Number(compValue)
          case '<':
            return Number(actual) < Number(compValue)
          case '>=':
            return Number(actual) >= Number(compValue)
          case '<=':
            return Number(actual) <= Number(compValue)
          default:
            return false
        }
      })
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
