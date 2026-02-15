import { describe, it, expect } from 'vitest'

describe('Skill Parameter Resolution', () => {
  // Utility function to resolve parameter placeholders
  function resolveParameters(
    template: string,
    params: Record<string, unknown>,
    prevOutputs?: Record<string, unknown>
  ): string {
    let resolved = template

    // Replace {{param.name}} with actual values
    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`\\{\\{param\\.${key}\\}\\}`, 'g')
      resolved = resolved.replace(regex, String(value))
    }

    // Replace {{prev.field}} with previous step outputs if available
    if (prevOutputs) {
      for (const [key, value] of Object.entries(prevOutputs)) {
        const regex = new RegExp(`\\{\\{prev\\.${key}\\}\\}`, 'g')
        resolved = resolved.replace(regex, String(value))
      }
    }

    return resolved
  }

  it('should resolve {{param.name}} placeholders', () => {
    const template = 'Deploy branch {{param.branch}} to {{param.environment}}'
    const params = { branch: 'main', environment: 'production' }

    const resolved = resolveParameters(template, params)

    expect(resolved).toBe('Deploy branch main to production')
  })

  it('should keep {{prev.field}} placeholders when no previous outputs', () => {
    const template = 'Use build {{prev.build_id}} from {{param.branch}}'
    const params = { branch: 'develop' }

    const resolved = resolveParameters(template, params)

    expect(resolved).toBe('Use build {{prev.build_id}} from develop')
  })

  it('should resolve {{prev.field}} when previous outputs provided', () => {
    const template = 'Deploy {{prev.build_id}} to {{param.environment}}'
    const params = { environment: 'staging' }
    const prevOutputs = { build_id: 'build-12345' }

    const resolved = resolveParameters(template, params, prevOutputs)

    expect(resolved).toBe('Deploy build-12345 to staging')
  })

  it('should handle mixed parameter types', () => {
    const template = 'Run {{param.command}} on {{prev.server}} with {{param.timeout}} seconds'
    const params = { command: 'deploy.sh', timeout: 300 }
    const prevOutputs = { server: 'server-01' }

    const resolved = resolveParameters(template, params, prevOutputs)

    expect(resolved).toBe('Run deploy.sh on server-01 with 300 seconds')
  })

  it('should handle multiple occurrences of same placeholder', () => {
    const template =
      'Copy {{param.file}} from {{param.source}} to {{param.dest}}, verify {{param.file}} exists'
    const params = { file: 'app.jar', source: '/build', dest: '/deploy' }

    const resolved = resolveParameters(template, params)

    expect(resolved).toBe('Copy app.jar from /build to /deploy, verify app.jar exists')
  })

  it('should not replace partial matches', () => {
    const template = 'Use {{param.branch_name}} not {{param.branch}}'
    const params = { branch: 'main', branch_name: 'feature/new-ui' }

    const resolved = resolveParameters(template, params)

    expect(resolved).toBe('Use feature/new-ui not main')
  })

  it('should handle empty parameter values', () => {
    const template = 'Deploy to {{param.environment}}'
    const params = { environment: '' }

    const resolved = resolveParameters(template, params)

    expect(resolved).toBe('Deploy to ')
  })

  it('should preserve unreferenced placeholders', () => {
    const template = 'Use {{param.defined}} and {{param.undefined}} and {{prev.unknown}}'
    const params = { defined: 'value' }

    const resolved = resolveParameters(template, params)

    expect(resolved).toBe('Use value and {{param.undefined}} and {{prev.unknown}}')
  })

  it('should handle complex nested step references', () => {
    const steps = [
      'Checkout {{param.branch}}',
      'Build project from {{prev.checkout_path}}',
      'Test build {{prev.build_id}}',
      'Deploy {{prev.build_id}} to {{param.environment}}',
    ]

    const params = { branch: 'main', environment: 'production' }

    // Simulate step-by-step execution
    const step1 = resolveParameters(steps[0], params)
    expect(step1).toBe('Checkout main')

    const step2 = resolveParameters(steps[1], params, { checkout_path: '/tmp/repo' })
    expect(step2).toBe('Build project from /tmp/repo')

    const step3 = resolveParameters(steps[2], params, { build_id: 'build-567' })
    expect(step3).toBe('Test build build-567')

    const step4 = resolveParameters(steps[3], params, { build_id: 'build-567' })
    expect(step4).toBe('Deploy build-567 to production')
  })
})
