import { describe, it, expect } from 'vitest'
import { getStepDefaultConfig } from '@/lib/workflow-editor/step-defaults'
import type { StepType } from '@/lib/supabase/database.types'

const allTypes: StepType[] = [
  'app',
  'flow_control',
  'ai',
  'web_scraping',
  'human_in_loop',
  'utility',
  'http',
  'sequence',
]

describe('getStepDefaultConfig', () => {
  it.each(allTypes)('returns config for %s', (type) => {
    const config = getStepDefaultConfig(type)
    expect(config).toBeDefined()
    expect(typeof config).toBe('object')
  })

  it('ai has default temperature 0.7', () => {
    const config = getStepDefaultConfig('ai')
    expect(config).toHaveProperty('temperature', 0.7)
  })

  it('http has GET method', () => {
    const config = getStepDefaultConfig('http')
    expect(config).toHaveProperty('method', 'GET')
  })

  it('sequence has empty inline_steps', () => {
    const config = getStepDefaultConfig('sequence')
    expect(config).toHaveProperty('inline_steps', [])
  })
})
