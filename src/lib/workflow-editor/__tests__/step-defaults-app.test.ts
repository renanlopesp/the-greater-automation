import { describe, it, expect } from 'vitest'
import { isStepConfigComplete, type WorkflowStep } from '@/lib/workflow-editor/step-defaults'

describe('isStepConfigComplete - app type', () => {
  function makeAppStep(app_id: string, action: string): WorkflowStep {
    return {
      id: 'test-1',
      type: 'app',
      name: 'Test App Step',
      position: 0,
      config: { app_id, action, inputs: {} },
    }
  }

  it('returns true when app_id and action are set', () => {
    expect(isStepConfigComplete(makeAppStep('github', 'create_issue'))).toBe(true)
  })

  it('returns false when app_id is empty', () => {
    expect(isStepConfigComplete(makeAppStep('', 'create_issue'))).toBe(false)
  })

  it('returns false when action is empty', () => {
    expect(isStepConfigComplete(makeAppStep('github', ''))).toBe(false)
  })

  it('returns false when both are empty', () => {
    expect(isStepConfigComplete(makeAppStep('', ''))).toBe(false)
  })
})
