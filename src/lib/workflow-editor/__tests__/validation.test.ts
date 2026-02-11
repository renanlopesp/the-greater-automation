import { describe, it, expect } from 'vitest'
import { isTriggerConfigComplete } from '@/lib/workflow-editor/trigger-defaults'
import { isStepConfigComplete } from '@/lib/workflow-editor/step-defaults'
import type { WorkflowStep } from '@/lib/workflow-editor/step-defaults'
import type { WorkflowTrigger } from '@/lib/workflow-editor/trigger-defaults'

describe('isTriggerConfigComplete', () => {
  it('manual trigger is always complete', () => {
    const trigger: WorkflowTrigger = { type: 'manual', config: { run_inputs: [] } }
    expect(isTriggerConfigComplete(trigger)).toBe(true)
  })

  it('webhook trigger is incomplete without url', () => {
    const trigger: WorkflowTrigger = {
      type: 'webhook',
      config: { url: '', method: 'POST', response_status: 200 },
    }
    expect(isTriggerConfigComplete(trigger)).toBe(false)
  })

  it('webhook trigger is complete with url', () => {
    const trigger: WorkflowTrigger = {
      type: 'webhook',
      config: { url: 'https://example.com', method: 'POST', response_status: 200 },
    }
    expect(isTriggerConfigComplete(trigger)).toBe(true)
  })

  it('scheduled trigger is complete with interval', () => {
    const trigger: WorkflowTrigger = {
      type: 'scheduled',
      config: {
        schedule_type: 'interval',
        interval_value: 1,
        interval_unit: 'hours',
        timezone: 'UTC',
      },
    }
    expect(isTriggerConfigComplete(trigger)).toBe(true)
  })
})

describe('isStepConfigComplete', () => {
  it('ai step is incomplete without prompt', () => {
    const step: WorkflowStep = {
      id: '1',
      type: 'ai',
      name: 'AI',
      position: 0,
      config: {
        ai_action: 'summarize',
        prompt_template: '',
        output_format: 'text',
        temperature: 0.7,
        max_tokens: 1000,
      },
    }
    expect(isStepConfigComplete(step)).toBe(false)
  })

  it('ai step is complete with prompt', () => {
    const step: WorkflowStep = {
      id: '1',
      type: 'ai',
      name: 'AI',
      position: 0,
      config: {
        ai_action: 'summarize',
        prompt_template: 'Summarize this',
        output_format: 'text',
        temperature: 0.7,
        max_tokens: 1000,
      },
    }
    expect(isStepConfigComplete(step)).toBe(true)
  })

  it('utility step is incomplete without required fields', () => {
    const step: WorkflowStep = {
      id: '1',
      type: 'utility',
      name: 'Utility',
      position: 0,
      config: { utility_type: 'format' },
    }
    expect(isStepConfigComplete(step)).toBe(false)
  })

  it('utility step is complete with required fields', () => {
    const step: WorkflowStep = {
      id: '1',
      type: 'utility',
      name: 'Utility',
      position: 0,
      config: { utility_type: 'format', format_template: 'Hello {{name}}' },
    }
    expect(isStepConfigComplete(step)).toBe(true)
  })
})
