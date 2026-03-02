import { describe, it, expect } from 'vitest'
import type { UIMessage } from 'ai'
import { extractSuggestion } from '@/hooks/use-workflow-assistant'

describe('use-workflow-assistant', () => {
  describe('extractSuggestion', () => {
    it('returns null for user messages', () => {
      const userMessage: UIMessage = {
        id: 'msg-1',
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Create a workflow for me',
          },
        ],
      }

      const result = extractSuggestion(userMessage)

      expect(result).toBeNull()
    })

    it('returns null when no SUGGEST_WORKFLOW tool parts exist', () => {
      const assistantMessage: UIMessage = {
        id: 'msg-2',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'I can help you with that',
          },
        ],
      }

      const result = extractSuggestion(assistantMessage)

      expect(result).toBeNull()
    })

    it('returns null when tool part state is not output-available', () => {
      const assistantMessage: UIMessage = {
        id: 'msg-2',
        role: 'assistant',
        parts: [
          {
            type: 'dynamic-tool',
            toolName: 'SUGGEST_WORKFLOW',
            state: 'input-available',
            toolCallId: 'call-1',
            input: {},
          },
        ],
      }

      const result = extractSuggestion(assistantMessage)

      expect(result).toBeNull()
    })

    it('extracts trigger and steps from a valid SUGGEST_WORKFLOW dynamic-tool part', () => {
      const assistantMessage: UIMessage = {
        id: 'msg-2',
        role: 'assistant',
        parts: [
          {
            type: 'dynamic-tool',
            toolName: 'SUGGEST_WORKFLOW',
            state: 'output-available',
            toolCallId: 'call-1',
            input: {},
            output: {
              trigger: {
                type: 'webhook',
                config: {
                  url: '/api/webhook',
                  method: 'POST',
                },
              },
              steps: [
                {
                  type: 'ai',
                  name: 'Summarize',
                  config: {
                    ai_action: 'summarize',
                    prompt_template: 'Summarize the content',
                  },
                },
              ],
              explanation: 'A workflow that processes webhooks',
            },
          },
        ],
      }

      const result = extractSuggestion(assistantMessage)

      expect(result).not.toBeNull()
      expect(result).toEqual({
        trigger: {
          type: 'webhook',
          config: {
            url: '/api/webhook',
            method: 'POST',
          },
        },
        steps: [
          {
            type: 'ai',
            name: 'Summarize',
            config: {
              ai_action: 'summarize',
              prompt_template: 'Summarize the content',
            },
          },
        ],
      })
    })

    it('returns null when output is missing trigger', () => {
      const assistantMessage: UIMessage = {
        id: 'msg-2',
        role: 'assistant',
        parts: [
          {
            type: 'dynamic-tool',
            toolName: 'SUGGEST_WORKFLOW',
            state: 'output-available',
            toolCallId: 'call-1',
            input: {},
            output: {
              steps: [
                {
                  type: 'ai',
                  name: 'Summarize',
                  config: { ai_action: 'summarize' },
                },
              ],
              explanation: 'Missing trigger',
            },
          },
        ],
      }

      const result = extractSuggestion(assistantMessage)

      expect(result).toBeNull()
    })

    it('returns null when output is missing steps', () => {
      const assistantMessage: UIMessage = {
        id: 'msg-2',
        role: 'assistant',
        parts: [
          {
            type: 'dynamic-tool',
            toolName: 'SUGGEST_WORKFLOW',
            state: 'output-available',
            toolCallId: 'call-1',
            input: {},
            output: {
              trigger: {
                type: 'webhook',
                config: { url: '/test', method: 'POST' },
              },
              explanation: 'Missing steps',
            },
          },
        ],
      }

      const result = extractSuggestion(assistantMessage)

      expect(result).toBeNull()
    })

    it('handles messages with multiple parts and finds SUGGEST_WORKFLOW', () => {
      const assistantMessage: UIMessage = {
        id: 'msg-2',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'Let me create that for you',
          },
          {
            type: 'dynamic-tool',
            toolName: 'SUGGEST_WORKFLOW',
            state: 'output-available',
            toolCallId: 'call-1',
            input: {},
            output: {
              trigger: {
                type: 'manual',
                config: { run_inputs: [] },
              },
              steps: [
                {
                  type: 'utility',
                  name: 'Format Data',
                  config: { utility_type: 'format' },
                },
              ],
              explanation: 'A manual workflow',
            },
          },
        ],
      }

      const result = extractSuggestion(assistantMessage)

      expect(result).not.toBeNull()
      expect(result?.trigger.type).toBe('manual')
      expect(result?.steps).toHaveLength(1)
      expect(result?.steps[0].name).toBe('Format Data')
    })

    it('returns first valid SUGGEST_WORKFLOW when multiple exist', () => {
      const assistantMessage: UIMessage = {
        id: 'msg-2',
        role: 'assistant',
        parts: [
          {
            type: 'dynamic-tool',
            toolName: 'SUGGEST_WORKFLOW',
            state: 'output-available',
            toolCallId: 'call-1',
            input: {},
            output: {
              trigger: {
                type: 'webhook',
                config: { url: '/first', method: 'POST' },
              },
              steps: [
                {
                  type: 'ai',
                  name: 'First',
                  config: {},
                },
              ],
              explanation: 'First workflow',
            },
          },
          {
            type: 'dynamic-tool',
            toolName: 'SUGGEST_WORKFLOW',
            state: 'output-available',
            toolCallId: 'call-2',
            input: {},
            output: {
              trigger: {
                type: 'scheduled',
                config: { schedule_type: 'cron' },
              },
              steps: [
                {
                  type: 'http',
                  name: 'Second',
                  config: {},
                },
              ],
              explanation: 'Second workflow',
            },
          },
        ],
      }

      const result = extractSuggestion(assistantMessage)

      expect(result).not.toBeNull()
      expect(result?.trigger.type).toBe('webhook')
      expect(result?.steps[0].name).toBe('First')
    })

    it('ignores other dynamic-tool types', () => {
      const assistantMessage: UIMessage = {
        id: 'msg-2',
        role: 'assistant',
        parts: [
          {
            type: 'dynamic-tool',
            toolName: 'SOME_OTHER_TOOL',
            state: 'output-available',
            toolCallId: 'call-1',
            input: {},
            output: {
              trigger: { type: 'webhook', config: {} },
              steps: [],
            },
          },
        ],
      }

      const result = extractSuggestion(assistantMessage)

      expect(result).toBeNull()
    })

    it('handles messages with no parts array', () => {
      const assistantMessage: UIMessage = {
        id: 'msg-2',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'Plain text message',
          },
        ],
      }

      const result = extractSuggestion(assistantMessage)

      expect(result).toBeNull()
    })

    it('handles messages with empty parts array', () => {
      const assistantMessage: UIMessage = {
        id: 'msg-2',
        role: 'assistant',
        parts: [],
      }

      const result = extractSuggestion(assistantMessage)

      expect(result).toBeNull()
    })
  })
})
