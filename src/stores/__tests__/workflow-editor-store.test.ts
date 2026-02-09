import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'

describe('workflow-editor-store', () => {
  beforeEach(() => {
    useWorkflowEditorStore.getState().resetStore()
  })

  it('has correct initial state', () => {
    const state = useWorkflowEditorStore.getState()
    expect(state.workflowName).toBe('Untitled')
    expect(state.workflowEmoji).toBe('')
    expect(state.isStarred).toBe(false)
    expect(state.trigger).toEqual({ type: 'manual', config: { run_inputs: [] } })
    expect(state.steps).toEqual([])
    expect(state.selectedStepId).toBeNull()
    expect(state.isAssistantOpen).toBe(false)
  })

  it('setWorkflowName updates name', () => {
    useWorkflowEditorStore.getState().setWorkflowName('My Workflow')
    expect(useWorkflowEditorStore.getState().workflowName).toBe('My Workflow')
  })

  it('toggleStar flips isStarred', () => {
    useWorkflowEditorStore.getState().toggleStar()
    expect(useWorkflowEditorStore.getState().isStarred).toBe(true)
    useWorkflowEditorStore.getState().toggleStar()
    expect(useWorkflowEditorStore.getState().isStarred).toBe(false)
  })

  it('setTrigger sets and clears trigger', () => {
    useWorkflowEditorStore.getState().setTrigger({ type: 'manual', config: { run_inputs: [] } })
    expect(useWorkflowEditorStore.getState().trigger).toEqual({
      type: 'manual',
      config: { run_inputs: [] },
    })
    useWorkflowEditorStore.getState().setTrigger(null)
    expect(useWorkflowEditorStore.getState().trigger).toBeNull()
  })

  it('addStep appends with correct position', () => {
    const store = useWorkflowEditorStore.getState()
    store.addStep({
      id: 's1',
      type: 'ai',
      name: 'AI',
      config: {
        ai_action: 'summarize',
        prompt_template: '',
        output_format: 'text',
        temperature: 0.7,
        max_tokens: 1000,
      },
    })
    store.addStep({
      id: 's2',
      type: 'http',
      name: 'HTTP',
      config: {
        request_type: 'custom',
        method: 'GET',
        url: '',
        timeout_seconds: 30,
        retry_count: 0,
      },
    })
    const steps = useWorkflowEditorStore.getState().steps
    expect(steps).toHaveLength(2)
    expect(steps[0].position).toBe(0)
    expect(steps[1].position).toBe(1)
  })

  it('deleteStep removes step and recomputes positions', () => {
    const store = useWorkflowEditorStore.getState()
    store.addStep({ id: 's1', type: 'ai', name: 'AI', config: {} as never })
    store.addStep({ id: 's2', type: 'http', name: 'HTTP', config: {} as never })
    store.addStep({ id: 's3', type: 'app', name: 'App', config: {} as never })
    store.deleteStep('s2')
    const steps = useWorkflowEditorStore.getState().steps
    expect(steps).toHaveLength(2)
    expect(steps[0].id).toBe('s1')
    expect(steps[0].position).toBe(0)
    expect(steps[1].id).toBe('s3')
    expect(steps[1].position).toBe(1)
  })

  it('reorderSteps moves step and recomputes positions', () => {
    const store = useWorkflowEditorStore.getState()
    store.addStep({ id: 's1', type: 'ai', name: 'First', config: {} as never })
    store.addStep({ id: 's2', type: 'http', name: 'Second', config: {} as never })
    store.addStep({ id: 's3', type: 'app', name: 'Third', config: {} as never })
    store.reorderSteps(0, 2)
    const steps = useWorkflowEditorStore.getState().steps
    expect(steps[0].id).toBe('s2')
    expect(steps[1].id).toBe('s3')
    expect(steps[2].id).toBe('s1')
    expect(steps[0].position).toBe(0)
    expect(steps[1].position).toBe(1)
    expect(steps[2].position).toBe(2)
  })

  it('selectStep sets selectedStepId', () => {
    useWorkflowEditorStore.getState().selectStep('step-1')
    expect(useWorkflowEditorStore.getState().selectedStepId).toBe('step-1')
    useWorkflowEditorStore.getState().selectStep(null)
    expect(useWorkflowEditorStore.getState().selectedStepId).toBeNull()
  })

  it('resetStore returns to defaults', () => {
    const store = useWorkflowEditorStore.getState()
    store.setWorkflowName('Changed')
    store.toggleStar()
    store.resetStore()
    const state = useWorkflowEditorStore.getState()
    expect(state.workflowName).toBe('Untitled')
    expect(state.isStarred).toBe(false)
  })

  it('initializeWorkflow bulk-sets state', () => {
    useWorkflowEditorStore.getState().initializeWorkflow({
      workflowId: 'w1',
      workflowName: 'Test',
      isStarred: true,
    })
    const state = useWorkflowEditorStore.getState()
    expect(state.workflowId).toBe('w1')
    expect(state.workflowName).toBe('Test')
    expect(state.isStarred).toBe(true)
    expect(state.isDirty).toBe(false)
  })

  it('initializeWorkflow sets trigger and steps from DB data', () => {
    useWorkflowEditorStore.getState().initializeWorkflow({
      workflowId: 'w2',
      workflowName: 'DB Workflow',
      workflowEmoji: '🔧',
      isStarred: false,
      trigger: {
        type: 'webhook',
        config: { url: 'https://example.com', method: 'POST', response_status: 200 },
      },
      steps: [
        {
          id: 's1',
          type: 'ai',
          name: 'Summarize',
          position: 0,
          config: {
            ai_action: 'summarize',
            prompt_template: 'test',
            output_format: 'text',
            temperature: 0.7,
            max_tokens: 1000,
          },
        },
        {
          id: 's2',
          type: 'http',
          name: 'Call API',
          position: 1,
          config: {
            request_type: 'custom',
            method: 'GET',
            url: 'https://api.example.com',
            timeout_seconds: 30,
            retry_count: 0,
          },
        },
      ],
    })
    const state = useWorkflowEditorStore.getState()
    expect(state.workflowId).toBe('w2')
    expect(state.workflowName).toBe('DB Workflow')
    expect(state.workflowEmoji).toBe('🔧')
    expect(state.trigger?.type).toBe('webhook')
    expect(state.steps).toHaveLength(2)
    expect(state.steps[0].name).toBe('Summarize')
    expect(state.steps[1].name).toBe('Call API')
    expect(state.isDirty).toBe(false)
  })
})
