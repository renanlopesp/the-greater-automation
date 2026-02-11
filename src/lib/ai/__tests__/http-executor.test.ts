import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeHTTPStep } from '@/lib/ai/http-executor'
import type { HTTPStepConfig } from '@/lib/workflow-editor/step-defaults'

describe('executeHTTPStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should successfully execute GET request', async () => {
    const mockResponseData = { message: 'Success', data: [1, 2, 3] }

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify(mockResponseData),
      headers: new Headers({
        'content-type': 'application/json',
        'x-response-time': '123ms',
      }),
    } as Response)

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'GET',
      url: 'https://api.example.com/data',
      timeout_seconds: 30,
      retry_count: 0,
    }

    const result = await executeHTTPStep(config)

    expect(result.success).toBe(true)
    expect(result.status).toBe(200)
    expect(result.body).toBe(JSON.stringify(mockResponseData))
    expect(result.headers).toEqual({
      'content-type': 'application/json',
      'x-response-time': '123ms',
    })
    expect(result.error).toBeUndefined()
  })

  it('should successfully execute POST request with body', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 201,
      statusText: 'Created',
      text: async () => '{"id": 123}',
      headers: new Headers(),
    } as Response)

    const requestBody = JSON.stringify({ name: 'Test', value: 42 })

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'POST',
      url: 'https://api.example.com/create',
      body: requestBody,
      timeout_seconds: 30,
      retry_count: 0,
    }

    const result = await executeHTTPStep(config)

    expect(result.success).toBe(true)
    expect(result.status).toBe(201)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/create',
      expect.objectContaining({
        method: 'POST',
        body: requestBody,
      })
    )
  })

  it('should add Bearer authentication header', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'Success',
      headers: new Headers(),
    } as Response)

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'GET',
      url: 'https://api.example.com/secure',
      auth: { type: 'bearer', value: 'secret-token-123' },
      timeout_seconds: 30,
      retry_count: 0,
    }

    await executeHTTPStep(config)

    const callHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(callHeaders.Authorization).toBe('Bearer secret-token-123')
  })

  it('should add Basic authentication header', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'Success',
      headers: new Headers(),
    } as Response)

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'GET',
      url: 'https://api.example.com/secure',
      auth: { type: 'basic', value: 'dXNlcjpwYXNz' },
      timeout_seconds: 30,
      retry_count: 0,
    }

    await executeHTTPStep(config)

    const callHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(callHeaders.Authorization).toBe('Basic dXNlcjpwYXNz')
  })

  it('should add API key authentication header', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'Success',
      headers: new Headers(),
    } as Response)

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'GET',
      url: 'https://api.example.com/secure',
      auth: { type: 'api_key', value: 'api-key-xyz' },
      timeout_seconds: 30,
      retry_count: 0,
    }

    await executeHTTPStep(config)

    const callHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(callHeaders['X-API-Key']).toBe('api-key-xyz')
  })

  it('should not add auth header when type is none', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'Success',
      headers: new Headers(),
    } as Response)

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'GET',
      url: 'https://api.example.com/public',
      auth: { type: 'none', value: '' },
      timeout_seconds: 30,
      retry_count: 0,
    }

    await executeHTTPStep(config)

    const callHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(callHeaders.Authorization).toBeUndefined()
    expect(callHeaders['X-API-Key']).toBeUndefined()
  })

  it('should handle 404 error response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => 'Resource not found',
      headers: new Headers(),
    } as Response)

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'GET',
      url: 'https://api.example.com/missing',
      timeout_seconds: 30,
      retry_count: 0,
    }

    const result = await executeHTTPStep(config)

    expect(result.success).toBe(false)
    expect(result.status).toBe(404)
    expect(result.body).toBe('Resource not found')
    expect(result.error).toBe('HTTP 404: Not Found')
  })

  it('should handle 500 server error response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Server error occurred',
      headers: new Headers(),
    } as Response)

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'POST',
      url: 'https://api.example.com/action',
      timeout_seconds: 30,
      retry_count: 0,
    }

    const result = await executeHTTPStep(config)

    expect(result.success).toBe(false)
    expect(result.status).toBe(500)
    expect(result.error).toBe('HTTP 500: Internal Server Error')
  })

  it('should handle timeout error', async () => {
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'

    vi.spyOn(global, 'fetch').mockRejectedValue(abortError)

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'GET',
      url: 'https://api.example.com/slow',
      timeout_seconds: 5,
      retry_count: 0,
    }

    const result = await executeHTTPStep(config)

    expect(result.success).toBe(false)
    expect(result.status).toBe(0)
    expect(result.error).toBe('Request timed out after 5 seconds')
  })

  it('should retry on failure and eventually succeed', async () => {
    vi.useFakeTimers()

    let callCount = 0
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(() => {
      callCount++
      if (callCount < 3) {
        return Promise.reject(new Error('Network error'))
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => 'Success after retries',
        headers: new Headers(),
      } as Response)
    })

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'GET',
      url: 'https://api.example.com/flaky',
      timeout_seconds: 30,
      retry_count: 2,
    }

    const resultPromise = executeHTTPStep(config)

    // Advance through all retry backoff timers
    await vi.runAllTimersAsync()

    const result = await resultPromise

    expect(result.success).toBe(true)
    expect(result.status).toBe(200)
    expect(result.body).toBe('Success after retries')
    expect(fetchMock).toHaveBeenCalledTimes(3)

    vi.useRealTimers()
  })

  it('should fail after exhausting all retries', async () => {
    vi.useFakeTimers()

    const fetchMock = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'GET',
      url: 'https://api.example.com/broken',
      timeout_seconds: 30,
      retry_count: 2,
    }

    const resultPromise = executeHTTPStep(config)

    // Advance through all retry backoff timers
    await vi.runAllTimersAsync()

    const result = await resultPromise

    expect(result.success).toBe(false)
    expect(result.status).toBe(0)
    expect(result.error).toBe('Network error')
    expect(fetchMock).toHaveBeenCalledTimes(3) // Initial + 2 retries

    vi.useRealTimers()
  })

  it('should include custom headers in request', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'Success',
      headers: new Headers(),
    } as Response)

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'GET',
      url: 'https://api.example.com/data',
      headers: {
        'X-Custom-Header': 'custom-value',
        'X-Request-ID': '12345',
      },
      timeout_seconds: 30,
      retry_count: 0,
    }

    await executeHTTPStep(config)

    const callHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(callHeaders['X-Custom-Header']).toBe('custom-value')
    expect(callHeaders['X-Request-ID']).toBe('12345')
  })

  it('should not send body for GET requests', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'Success',
      headers: new Headers(),
    } as Response)

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'GET',
      url: 'https://api.example.com/data',
      body: '{"should":"not-be-sent"}',
      timeout_seconds: 30,
      retry_count: 0,
    }

    await executeHTTPStep(config)

    const callOptions = fetchMock.mock.calls[0]?.[1]
    expect(callOptions?.body).toBeUndefined()
  })

  it('should treat 3xx redirects as success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 301,
      statusText: 'Moved Permanently',
      text: async () => '',
      headers: new Headers({
        location: 'https://api.example.com/new-location',
      }),
    } as Response)

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'GET',
      url: 'https://api.example.com/old-location',
      timeout_seconds: 30,
      retry_count: 0,
    }

    const result = await executeHTTPStep(config)

    expect(result.success).toBe(true)
    expect(result.status).toBe(301)
    expect(result.error).toBeUndefined()
  })

  it('should handle PUT method', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '{"updated": true}',
      headers: new Headers(),
    } as Response)

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'PUT',
      url: 'https://api.example.com/resource/123',
      body: '{"name": "Updated Name"}',
      timeout_seconds: 30,
      retry_count: 0,
    }

    const result = await executeHTTPStep(config)

    expect(result.success).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/resource/123',
      expect.objectContaining({
        method: 'PUT',
      })
    )
  })

  it('should handle PATCH method', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '{"patched": true}',
      headers: new Headers(),
    } as Response)

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'PATCH',
      url: 'https://api.example.com/resource/456',
      body: '{"status": "active"}',
      timeout_seconds: 30,
      retry_count: 0,
    }

    const result = await executeHTTPStep(config)

    expect(result.success).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/resource/456',
      expect.objectContaining({
        method: 'PATCH',
      })
    )
  })

  it('should handle DELETE method', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      text: async () => '',
      headers: new Headers(),
    } as Response)

    const config: HTTPStepConfig = {
      request_type: 'custom',
      method: 'DELETE',
      url: 'https://api.example.com/resource/789',
      timeout_seconds: 30,
      retry_count: 0,
    }

    const result = await executeHTTPStep(config)

    expect(result.success).toBe(true)
    expect(result.status).toBe(204)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/resource/789',
      expect.objectContaining({
        method: 'DELETE',
      })
    )
  })
})
