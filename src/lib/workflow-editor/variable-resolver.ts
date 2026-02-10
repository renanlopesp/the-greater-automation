/**
 * Variable resolution utilities for workflow templates.
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
 * Extracts all variable references from a template string.
 * Returns array of variable paths like ['trigger.output', 'step_1.output']
 */
export function extractVariables(template: string): string[] {
  const variables: string[] = []
  const regex = /\{\{([^}]+)\}\}/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(template)) !== null) {
    const path = match[1].trim()
    if (!variables.includes(path)) {
      variables.push(path)
    }
  }

  return variables
}

/**
 * Validates that all variable references in a template point to existing steps.
 * Returns array of invalid references.
 */
export function validateVariables(template: string, availableSteps: number): string[] {
  const variables = extractVariables(template)
  const invalidRefs: string[] = []

  for (const variable of variables) {
    // Check if it's a step reference
    const stepMatch = variable.match(/^step_(\d+)/)
    if (stepMatch) {
      const stepNum = parseInt(stepMatch[1], 10)
      // step_1 is position 0, step_2 is position 1, etc.
      if (stepNum < 1 || stepNum > availableSteps) {
        invalidRefs.push(variable)
      }
    }
    // trigger.output is always valid if present in template (validation happens elsewhere)
  }

  return invalidRefs
}
