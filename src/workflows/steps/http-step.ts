'use step'

import { FatalError } from 'workflow'
import type { HTTPStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface HTTPStepOutput {
  status: number
  statusText: string
  headers: Record<string, string>
  body: unknown
}

export async function httpStep(config: HTTPStepConfig): Promise<HTTPStepOutput> {
  const { method, url, headers = {}, body, auth, timeout_seconds = 30 } = config

  // Build headers
  const requestHeaders: Record<string, string> = { ...headers }

  // Add authentication if configured
  if (auth && auth.type !== 'none') {
    switch (auth.type) {
      case 'bearer':
        requestHeaders['Authorization'] = `Bearer ${auth.value}`
        break
      case 'basic':
        requestHeaders['Authorization'] = `Basic ${auth.value}`
        break
      case 'api_key':
        requestHeaders['X-API-Key'] = auth.value
        break
    }
  }

  // Build request options
  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
    signal: AbortSignal.timeout(timeout_seconds * 1000),
  }

  // Add body for methods that support it
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    requestOptions.body = body
    if (!requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json'
    }
  }

  try {
    const response = await fetch(url, requestOptions)

    // Extract response headers
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    // Parse response body
    const contentType = response.headers.get('content-type') || ''
    let responseBody: unknown

    if (contentType.includes('application/json')) {
      try {
        responseBody = await response.json()
      } catch {
        responseBody = await response.text()
      }
    } else {
      responseBody = await response.text()
    }

    // Throw FatalError for 4xx client errors (non-retryable)
    if (response.status >= 400 && response.status < 500) {
      throw new FatalError(`HTTP ${response.status}: ${response.statusText}`)
    }

    // 5xx errors will be retried by the workflow engine
    if (response.status >= 500) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
    }
  } catch (error) {
    if (error instanceof FatalError) {
      throw error
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new Error(`Request timeout after ${timeout_seconds} seconds`)
      }
      throw error
    }

    throw new Error('HTTP request failed')
  }
}
