import { describe, it, expect } from 'vitest'
import { getStepDefaultConfig, isStepConfigComplete } from '@/lib/workflow-editor/step-defaults'
import type { WorkflowStep } from '@/lib/workflow-editor/step-defaults'
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

describe('isStepConfigComplete – utility', () => {
  const makeStep = (config: Record<string, unknown>): WorkflowStep => ({
    id: 'test',
    type: 'utility',
    name: 'Utility',
    position: 0,
    config: config as unknown as WorkflowStep['config'],
  })

  it('format: complete when format_template is set', () => {
    expect(
      isStepConfigComplete(makeStep({ utility_type: 'format', format_template: 'Hello' }))
    ).toBe(true)
  })

  it('format: incomplete when format_template is empty', () => {
    expect(isStepConfigComplete(makeStep({ utility_type: 'format', format_template: '' }))).toBe(
      false
    )
  })

  it('math: complete when math_expression is set', () => {
    expect(isStepConfigComplete(makeStep({ utility_type: 'math', math_expression: '1+1' }))).toBe(
      true
    )
  })

  it('math: incomplete when math_expression is empty', () => {
    expect(isStepConfigComplete(makeStep({ utility_type: 'math', math_expression: '' }))).toBe(
      false
    )
  })

  it('parse_json: complete when input_source is set', () => {
    expect(isStepConfigComplete(makeStep({ utility_type: 'parse_json', input_source: '{}' }))).toBe(
      true
    )
  })

  it('parse_json: incomplete when input_source is empty', () => {
    expect(isStepConfigComplete(makeStep({ utility_type: 'parse_json', input_source: '' }))).toBe(
      false
    )
  })

  it('filter: complete when input_source and filter_condition set', () => {
    expect(
      isStepConfigComplete(
        makeStep({ utility_type: 'filter', input_source: '[]', filter_condition: 'item.x' })
      )
    ).toBe(true)
  })

  it('filter: incomplete when filter_condition missing', () => {
    expect(isStepConfigComplete(makeStep({ utility_type: 'filter', input_source: '[]' }))).toBe(
      false
    )
  })

  it('map: complete when input_source and format_template set', () => {
    expect(
      isStepConfigComplete(
        makeStep({ utility_type: 'map', input_source: '[]', format_template: '{{item.x}}' })
      )
    ).toBe(true)
  })

  it('map: incomplete when format_template missing', () => {
    expect(isStepConfigComplete(makeStep({ utility_type: 'map', input_source: '[]' }))).toBe(false)
  })
})
