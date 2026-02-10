/**
 * Server-side variable resolution utilities for workflow runtime execution.
 * Supports variable references like {{trigger.output}}, {{step_1.output}}, {{step_1.output.field.nested}}
 */

/**
 * Resolves variable references in a template string.
 * Supports: {{trigger.output}}, {{step_N.output}}, {{step_N.output.field.nested}}
 */
export function resolveVariables(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim()
    const value = getNestedValue(context, trimmedPath)

    if (value === undefined) {
      // Leave placeholder as-is if variable doesn't exist
      return match
    }

    // Convert value to string
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }

    return String(value)
  })
}

/**
 * Gets a nested value from an object using dot notation.
 * Example: getNestedValue({step_1: {output: {name: 'test'}}}, 'step_1.output.name') -> 'test'
 */
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

/**
 * Resolves variables in an object's values recursively.
 * Used for resolving step configs before execution.
 */
export function resolveObjectVariables(
  obj: Record<string, unknown>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      resolved[key] = resolveVariables(value, context)
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      resolved[key] = resolveObjectVariables(value as Record<string, unknown>, context)
    } else if (Array.isArray(value)) {
      resolved[key] = value.map((item) =>
        typeof item === 'string'
          ? resolveVariables(item, context)
          : item && typeof item === 'object'
            ? resolveObjectVariables(item as Record<string, unknown>, context)
            : item
      )
    } else {
      resolved[key] = value
    }
  }

  return resolved
}
