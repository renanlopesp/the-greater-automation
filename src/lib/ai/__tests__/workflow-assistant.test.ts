import { describe, it, expect } from 'vitest'
import {
  buildWorkflowAssistantPrompt,
  suggestWorkflowTool,
  VALID_TRIGGER_TYPES,
  VALID_STEP_TYPES,
  type WorkflowAssistantContext,
} from '@/lib/ai/workflow-assistant'

describe('workflow-assistant', () => {
  describe('VALID_TRIGGER_TYPES', () => {
    it('has exactly 9 trigger types', () => {
      expect(VALID_TRIGGER_TYPES).toHaveLength(9)
    })

    it('includes all expected trigger types', () => {
      const expected = [
        'manual',
        'scheduled',
        'webhook',
        'form',
        'rss',
        'mailhook',
        'app',
        'table',
        'mcp',
      ]
      expect(VALID_TRIGGER_TYPES).toEqual(expected)
    })
  })

  describe('VALID_STEP_TYPES', () => {
    it('has exactly 8 step types', () => {
      expect(VALID_STEP_TYPES).toHaveLength(8)
    })

    it('includes all expected step types', () => {
      const expected = [
        'app',
        'flow_control',
        'ai',
        'web_scraping',
        'human_in_loop',
        'utility',
        'http',
        'sequence',
      ]
      expect(VALID_STEP_TYPES).toEqual(expected)
    })
  })

  describe('suggestWorkflowTool', () => {
    it('has a description', () => {
      expect(suggestWorkflowTool.description).toBeDefined()
      expect(typeof suggestWorkflowTool.description).toBe('string')
      expect(suggestWorkflowTool.description.length).toBeGreaterThan(0)
    })

    it('has an inputSchema', () => {
      expect(suggestWorkflowTool.inputSchema).toBeDefined()
      expect(typeof suggestWorkflowTool.inputSchema).toBe('object')
    })

    it('execute function returns trigger, steps, explanation, and applied:false', async () => {
      const params = {
        trigger: { type: 'webhook', config: { url: '/test', method: 'POST' as const } },
        steps: [{ type: 'ai', name: 'Summarize', config: { ai_action: 'summarize' } }],
        explanation: 'A test workflow for webhooks',
      }

      const result = await suggestWorkflowTool.execute(params)

      expect(result).toEqual({
        trigger: params.trigger,
        steps: params.steps,
        explanation: params.explanation,
        applied: false,
      })
    })
  })

  describe('buildWorkflowAssistantPrompt', () => {
    it('mentions all 9 trigger types in the prompt', () => {
      const context: WorkflowAssistantContext = {
        workflowId: 'wf-123',
        workflowName: 'Test Workflow',
        trigger: null,
        steps: [],
      }

      const prompt = buildWorkflowAssistantPrompt(context)

      VALID_TRIGGER_TYPES.forEach((triggerType) => {
        expect(prompt).toContain(triggerType)
      })
    })

    it('mentions all 8 step types in the prompt', () => {
      const context: WorkflowAssistantContext = {
        workflowId: 'wf-123',
        workflowName: 'Test Workflow',
        trigger: null,
        steps: [],
      }

      const prompt = buildWorkflowAssistantPrompt(context)

      VALID_STEP_TYPES.forEach((stepType) => {
        expect(prompt).toContain(stepType)
      })
    })

    it('includes variable interpolation syntax documentation', () => {
      const context: WorkflowAssistantContext = {
        workflowId: 'wf-123',
        workflowName: 'Test Workflow',
        trigger: null,
        steps: [],
      }

      const prompt = buildWorkflowAssistantPrompt(context)

      expect(prompt).toContain('{{trigger.field}}')
      expect(prompt).toContain('{{step_1.output}}')
      expect(prompt).toContain('Variable Interpolation')
    })

    it('embeds current workflow name and ID', () => {
      const context: WorkflowAssistantContext = {
        workflowId: 'wf-456',
        workflowName: 'My Automation',
        trigger: null,
        steps: [],
      }

      const prompt = buildWorkflowAssistantPrompt(context)

      expect(prompt).toContain('My Automation')
      expect(prompt).toContain('wf-456')
      expect(prompt).toContain('Current Workflow State')
    })

    it('says "None (not configured yet)" when trigger is null', () => {
      const context: WorkflowAssistantContext = {
        workflowId: 'wf-123',
        workflowName: 'Test Workflow',
        trigger: null,
        steps: [],
      }

      const prompt = buildWorkflowAssistantPrompt(context)

      expect(prompt).toContain('Current Trigger: None (not configured yet)')
    })

    it('serializes trigger when trigger exists', () => {
      const context: WorkflowAssistantContext = {
        workflowId: 'wf-123',
        workflowName: 'Test Workflow',
        trigger: {
          type: 'webhook',
          config: { url: '/api/webhook', method: 'POST' },
        },
        steps: [],
      }

      const prompt = buildWorkflowAssistantPrompt(context)

      expect(prompt).toContain('Current Trigger: type="webhook"')
      expect(prompt).toContain('config=')
      expect(prompt).toContain('/api/webhook')
      expect(prompt).not.toContain('None (not configured yet)')
    })

    it('says "None (empty workflow)" when steps array is empty', () => {
      const context: WorkflowAssistantContext = {
        workflowId: 'wf-123',
        workflowName: 'Test Workflow',
        trigger: null,
        steps: [],
      }

      const prompt = buildWorkflowAssistantPrompt(context)

      expect(prompt).toContain('Current Steps: None (empty workflow)')
    })

    it('lists steps with type, name, and config when steps exist', () => {
      const context: WorkflowAssistantContext = {
        workflowId: 'wf-123',
        workflowName: 'Test Workflow',
        trigger: null,
        steps: [
          {
            id: 'step-1',
            type: 'ai',
            name: 'Summarize Content',
            config: { ai_action: 'summarize', prompt_template: 'Summarize this' },
          },
          {
            id: 'step-2',
            type: 'http',
            name: 'Send to API',
            config: { method: 'POST', url: 'https://api.example.com' },
          },
        ],
      }

      const prompt = buildWorkflowAssistantPrompt(context)

      expect(prompt).toContain('Current Steps (2)')
      expect(prompt).toContain('[ai] "Summarize Content"')
      expect(prompt).toContain('[http] "Send to API"')
      expect(prompt).toContain('ai_action')
      expect(prompt).toContain('https://api.example.com')
      expect(prompt).not.toContain('None (empty workflow)')
    })

    it('numbers steps sequentially starting from 1', () => {
      const context: WorkflowAssistantContext = {
        workflowId: 'wf-123',
        workflowName: 'Test Workflow',
        trigger: null,
        steps: [
          {
            id: 'step-1',
            type: 'ai',
            name: 'Step One',
            config: {},
          },
          {
            id: 'step-2',
            type: 'http',
            name: 'Step Two',
            config: {},
          },
          {
            id: 'step-3',
            type: 'utility',
            name: 'Step Three',
            config: {},
          },
        ],
      }

      const prompt = buildWorkflowAssistantPrompt(context)

      expect(prompt).toContain('1. [ai] "Step One"')
      expect(prompt).toContain('2. [http] "Step Two"')
      expect(prompt).toContain('3. [utility] "Step Three"')
    })
  })
})
