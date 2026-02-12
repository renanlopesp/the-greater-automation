import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeAppAction } from '@/lib/oauth/app-handlers'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('App Handlers', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('executeAppAction', () => {
    it('returns error for unknown app_id', async () => {
      const result = await executeAppAction(
        { app_id: 'unknown', action: 'test', inputs: {} },
        'token'
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown app_id')
    })

    it('catches thrown errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      const result = await executeAppAction(
        { app_id: 'github', action: 'list_repos', inputs: {} },
        'token'
      )
      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('GitHub handler', () => {
    it('creates an issue successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ number: 42, html_url: 'https://github.com/test/repo/issues/42' }),
      })

      const result = await executeAppAction(
        {
          app_id: 'github',
          action: 'create_issue',
          inputs: { owner: 'test', repo: 'repo', title: 'Bug' },
        },
        'ghp_token123'
      )

      expect(result.success).toBe(true)
      expect(result.app_id).toBe('github')
      expect(result.action).toBe('create_issue')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/test/repo/issues',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('validates required fields for create_issue', async () => {
      const result = await executeAppAction(
        { app_id: 'github', action: 'create_issue', inputs: {} },
        'token'
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required fields')
    })

    it('lists repos', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [{ name: 'repo1' }, { name: 'repo2' }],
      })

      const result = await executeAppAction(
        { app_id: 'github', action: 'list_repos', inputs: {} },
        'token'
      )
      expect(result.success).toBe(true)
    })

    it('handles API error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      const result = await executeAppAction(
        { app_id: 'github', action: 'list_repos', inputs: {} },
        'bad-token'
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('401')
    })

    it('returns error for unknown GitHub action', async () => {
      const result = await executeAppAction(
        { app_id: 'github', action: 'unknown_action', inputs: {} },
        'token'
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown GitHub action')
    })
  })

  describe('Slack handler', () => {
    it('sends a message successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, ts: '1234567890.123456' }),
      })

      const result = await executeAppAction(
        {
          app_id: 'slack',
          action: 'send_message',
          inputs: { channel: '#general', text: 'Hello!' },
        },
        'xoxb-token'
      )

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('validates required fields for send_message', async () => {
      const result = await executeAppAction(
        { app_id: 'slack', action: 'send_message', inputs: {} },
        'token'
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required fields')
    })
  })

  describe('Notion handler', () => {
    it('validates required fields for create_page', async () => {
      const result = await executeAppAction(
        { app_id: 'notion', action: 'create_page', inputs: {} },
        'token'
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required fields')
    })

    it('searches successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ results: [], has_more: false }),
      })

      const result = await executeAppAction(
        { app_id: 'notion', action: 'search', inputs: { query: 'test' } },
        'token'
      )
      expect(result.success).toBe(true)
    })
  })

  describe('Discord handler', () => {
    it('validates required fields for send_message', async () => {
      const result = await executeAppAction(
        { app_id: 'discord', action: 'send_message', inputs: {} },
        'token'
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required fields')
    })
  })

  describe('LinkedIn handler', () => {
    it('validates required fields for create_post', async () => {
      const result = await executeAppAction(
        { app_id: 'linkedin', action: 'create_post', inputs: {} },
        'token'
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required field')
    })
  })
})
