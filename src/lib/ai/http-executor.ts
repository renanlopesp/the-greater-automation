import type { HTTPStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface HTTPExecutionResult {
  success: boolean
  status: number
  body: string
  headers: Record<string, string>
  error?: string
}

/**
 * Execute an HTTP request step
 */
export async function executeHTTPStep(config: HTTPStepConfig): Promise<HTTPExecutionResult> {
  const timeoutMs = (config.timeout_seconds || 30) * 1000
  const maxRetries = config.retry_count || 0

  let lastError: string | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      // Build request headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config.headers,
      }

      // Add authentication
      if (config.auth && config.auth.type !== 'none') {
        switch (config.auth.type) {
          case 'bearer':
            headers.Authorization = `Bearer ${config.auth.value}`
            break
          case 'basic':
            headers.Authorization = `Basic ${config.auth.value}`
            break
          case 'api_key':
            headers['X-API-Key'] = config.auth.value
            break
        }
      }

      // Make the request
      const response = await fetch(config.url, {
        method: config.method,
        headers,
        body: config.body && config.method !== 'GET' ? config.body : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Get response body
      const body = await response.text()

      // Convert headers to plain object
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      // Consider 2xx and 3xx as success
      const success = response.status >= 200 && response.status < 400

      return {
        success,
        status: response.status,
        body,
        headers: responseHeaders,
        error: success ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = `Request timed out after ${config.timeout_seconds} seconds`
        } else {
          lastError = error.message
        }
      } else {
        lastError = 'Unknown error occurred during HTTP request'
      }

      // If this is not the last retry, continue to next attempt
      if (attempt < maxRetries) {
        // Optional: add exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
        continue
      }
    }
  }

  // All retries failed
  return {
    success: false,
    status: 0,
    body: '',
    headers: {},
    error: lastError || 'HTTP request failed after all retries',
  }
}
