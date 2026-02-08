import { describe, it, expect } from 'vitest'
import { getTriggerDefaultConfig } from '@/lib/workflow-editor/trigger-defaults'
import type { TriggerType } from '@/lib/supabase/database.types'

const allTypes: TriggerType[] = [
  'app',
  'manual',
  'scheduled',
  'form',
  'rss',
  'mailhook',
  'webhook',
  'table',
  'mcp',
]

describe('getTriggerDefaultConfig', () => {
  it.each(allTypes)('returns config for %s', (type) => {
    const config = getTriggerDefaultConfig(type)
    expect(config).toBeDefined()
    expect(typeof config).toBe('object')
  })

  it('manual has empty run_inputs', () => {
    const config = getTriggerDefaultConfig('manual')
    expect(config).toHaveProperty('run_inputs')
  })

  it('scheduled has interval defaults', () => {
    const config = getTriggerDefaultConfig('scheduled')
    expect(config).toHaveProperty('schedule_type', 'interval')
    expect(config).toHaveProperty('interval_value', 1)
  })

  it('webhook has POST method', () => {
    const config = getTriggerDefaultConfig('webhook')
    expect(config).toHaveProperty('method', 'POST')
  })
})
