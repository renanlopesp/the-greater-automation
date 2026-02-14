import type { SkillCondition, ConditionResult } from './types'

/**
 * Get a nested value from an object using dot-path notation.
 * e.g. getNestedValue({ body: { sender: "foo" } }, "body.sender") => "foo"
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/**
 * Evaluate a single condition against trigger data.
 */
function evaluateCondition(
  condition: SkillCondition,
  data: Record<string, unknown>
): ConditionResult {
  const actual = getNestedValue(data, condition.field)

  let passed = false

  switch (condition.operator) {
    case 'equals':
      passed = String(actual) === String(condition.value)
      break

    case 'not_equals':
      passed = String(actual) !== String(condition.value)
      break

    case 'contains':
      if (typeof actual === 'string' && typeof condition.value === 'string') {
        passed = actual.toLowerCase().includes(condition.value.toLowerCase())
      }
      break

    case 'not_contains':
      if (typeof actual === 'string' && typeof condition.value === 'string') {
        passed = !actual.toLowerCase().includes(condition.value.toLowerCase())
      } else {
        passed = true
      }
      break

    case 'matches':
      if (typeof actual === 'string' && typeof condition.value === 'string') {
        try {
          const regex = new RegExp(condition.value)
          passed = regex.test(actual)
        } catch {
          passed = false
        }
      }
      break

    case 'exists':
      passed = actual !== undefined && actual !== null
      break

    case 'not_exists':
      passed = actual === undefined || actual === null
      break

    case 'gt':
      if (typeof actual === 'number' && typeof condition.value === 'number') {
        passed = actual > condition.value
      }
      break

    case 'lt':
      if (typeof actual === 'number' && typeof condition.value === 'number') {
        passed = actual < condition.value
      }
      break

    case 'gte':
      if (typeof actual === 'number' && typeof condition.value === 'number') {
        passed = actual >= condition.value
      }
      break

    case 'lte':
      if (typeof actual === 'number' && typeof condition.value === 'number') {
        passed = actual <= condition.value
      }
      break
  }

  return {
    condition,
    passed,
    actual_value: actual,
  }
}

/**
 * Evaluate all conditions. Returns true only if ALL conditions pass (AND logic).
 */
export function evaluateConditions(
  conditions: SkillCondition[],
  data: Record<string, unknown>
): { passed: boolean; results: ConditionResult[] } {
  if (conditions.length === 0) return { passed: true, results: [] }

  const results = conditions.map((c) => evaluateCondition(c, data))
  return {
    passed: results.every((r) => r.passed),
    results,
  }
}
