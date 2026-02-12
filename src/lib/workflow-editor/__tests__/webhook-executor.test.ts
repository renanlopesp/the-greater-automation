import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateWebhookToken,
  buildWebhookUrl,
  validateWebhookSecret,
  validateWebhookMethod,
  captureWebhookPayload,
} from '../webhook-executor'
import type { WebhookTriggerConfig } from '../trigger-defaults'

describe('webhook-executor', () => {
  describe('generateWebhookToken', () => {
    it('returns a string', () => {
      const token = generateWebhookToken()
      expect(typeof token).toBe('string')
    })

    it('returns a UUID format', () => {
      const token = generateWebhookToken()
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(token).toMatch(uuidRegex)
    })

    it('returns unique values on each call', () => {
      const token1 = generateWebhookToken()
      const token2 = generateWebhookToken()
      const token3 = generateWebhookToken()
      expect(token1).not.toBe(token2)
      expect(token1).not.toBe(token3)
      expect(token2).not.toBe(token3)
    })
  })

  describe('buildWebhookUrl', () => {
    const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_SITE_URL
      delete process.env.NEXT_PUBLIC_APP_URL
    })

    afterEach(() => {
      if (originalSiteUrl !== undefined) process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
      if (originalAppUrl !== undefined) process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    })

    it('uses NEXT_PUBLIC_SITE_URL if set', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://site.example.com'
      const token = 'test-token-123'
      const url = buildWebhookUrl(token)
      expect(url).toBe('https://site.example.com/api/workflows/webhook/test-token-123')
    })

    it('falls back to NEXT_PUBLIC_APP_URL', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
      const token = 'test-token-456'
      const url = buildWebhookUrl(token)
      expect(url).toBe('https://app.example.com/api/workflows/webhook/test-token-456')
    })

    it('falls back to http://localhost:3000', () => {
      const token = 'test-token-789'
      const url = buildWebhookUrl(token)
      expect(url).toBe('http://localhost:3000/api/workflows/webhook/test-token-789')
    })

    it('constructs correct path format', () => {
      const token = 'abc-def-ghi'
      const url = buildWebhookUrl(token)
      expect(url).toContain('/api/workflows/webhook/abc-def-ghi')
    })
  })

  describe('validateWebhookSecret', () => {
    it('returns valid:true when no secret configured', () => {
      const config: WebhookTriggerConfig = {
        url: '',
        method: 'POST',
        response_status: 200,
        webhook_token: 'token-123',
      }
      const request = new Request('http://test.com')
      const result = validateWebhookSecret(config, request)
      expect(result).toEqual({ valid: true })
    })

    it('returns valid:true when secret matches header', () => {
      const config: WebhookTriggerConfig = {
        url: '',
        method: 'POST',
        response_status: 200,
        webhook_token: 'token-123',
        secret: 'my-secret',
      }
      const request = new Request('http://test.com', {
        headers: { 'x-webhook-secret': 'my-secret' },
      })
      const result = validateWebhookSecret(config, request)
      expect(result).toEqual({ valid: true })
    })

    it("returns valid:false when secret doesn't match", () => {
      const config: WebhookTriggerConfig = {
        url: '',
        method: 'POST',
        response_status: 200,
        webhook_token: 'token-123',
        secret: 'my-secret',
      }
      const request = new Request('http://test.com', {
        headers: { 'x-webhook-secret': 'wrong-secret' },
      })
      const result = validateWebhookSecret(config, request)
      expect(result).toEqual({ valid: false })
    })

    it('returns valid:false when header is missing but secret is configured', () => {
      const config: WebhookTriggerConfig = {
        url: '',
        method: 'POST',
        response_status: 200,
        webhook_token: 'token-123',
        secret: 'my-secret',
      }
      const request = new Request('http://test.com')
      const result = validateWebhookSecret(config, request)
      expect(result).toEqual({ valid: false })
    })
  })

  describe('validateWebhookMethod', () => {
    it('returns valid:true when methods match', () => {
      const config: WebhookTriggerConfig = {
        url: '',
        method: 'POST',
        response_status: 200,
        webhook_token: 'token-123',
      }
      const request = new Request('http://test.com', { method: 'POST' })
      const result = validateWebhookMethod(config, request)
      expect(result).toEqual({ valid: true, actual: 'POST' })
    })

    it("returns valid:false when methods don't match", () => {
      const config: WebhookTriggerConfig = {
        url: '',
        method: 'POST',
        response_status: 200,
        webhook_token: 'token-123',
      }
      const request = new Request('http://test.com', { method: 'GET' })
      const result = validateWebhookMethod(config, request)
      expect(result).toEqual({ valid: false, actual: 'GET' })
    })

    it('is case-insensitive on request method', () => {
      const config: WebhookTriggerConfig = {
        url: '',
        method: 'POST',
        response_status: 200,
        webhook_token: 'token-123',
      }
      const request = new Request('http://test.com', { method: 'post' })
      const result = validateWebhookMethod(config, request)
      expect(result).toEqual({ valid: true, actual: 'POST' })
    })
  })

  describe('captureWebhookPayload', () => {
    it('captures JSON body correctly', async () => {
      const request = new Request('http://test.com', {
        method: 'POST',
        body: JSON.stringify({ data: 'test', value: 42 }),
        headers: { 'content-type': 'application/json' },
      })
      const payload = await captureWebhookPayload(request)

      expect(payload.body).toEqual({ data: 'test', value: 42 })
      expect(payload.source).toBe('webhook')
      expect(payload.method).toBe('POST')
    })

    it('captures query parameters', async () => {
      const request = new Request('http://test.com?foo=bar&baz=qux', {
        method: 'GET',
      })
      const payload = await captureWebhookPayload(request)

      expect(payload.query).toEqual({ foo: 'bar', baz: 'qux' })
    })

    it('captures headers excluding sensitive ones', async () => {
      const request = new Request('http://test.com', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-custom': 'value',
          authorization: 'Bearer token',
          cookie: 'session=abc',
          'x-webhook-secret': 'secret123',
        },
      })
      const payload = await captureWebhookPayload(request)

      expect(payload.headers['content-type']).toBe('application/json')
      expect(payload.headers['x-custom']).toBe('value')
      expect(payload.headers.authorization).toBeUndefined()
      expect(payload.headers.cookie).toBeUndefined()
      expect(payload.headers['x-webhook-secret']).toBeUndefined()
    })

    it('handles empty body', async () => {
      const request = new Request('http://test.com', {
        method: 'GET',
      })
      const payload = await captureWebhookPayload(request)

      expect(payload.body).toBeNull()
    })

    it('handles non-JSON body (plain text)', async () => {
      const request = new Request('http://test.com', {
        method: 'POST',
        body: 'plain text content',
        headers: { 'content-type': 'text/plain' },
      })
      const payload = await captureWebhookPayload(request)

      expect(payload.body).toBe('plain text content')
    })

    it('sets source to webhook', async () => {
      const request = new Request('http://test.com')
      const payload = await captureWebhookPayload(request)

      expect(payload.source).toBe('webhook')
    })

    it('sets triggered_at to ISO string', async () => {
      const request = new Request('http://test.com')
      const payload = await captureWebhookPayload(request)

      expect(typeof payload.triggered_at).toBe('string')
      expect(new Date(payload.triggered_at).toISOString()).toBe(payload.triggered_at)
    })
  })
})
