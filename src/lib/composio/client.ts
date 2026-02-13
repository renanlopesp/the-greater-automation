import { Composio } from 'composio-core'

let _instance: Composio | null = null

/**
 * Get the Composio SDK singleton instance.
 * Requires COMPOSIO_API_KEY environment variable.
 */
export function getComposio(): Composio {
  if (!_instance) {
    const apiKey = process.env.COMPOSIO_API_KEY
    if (!apiKey) {
      throw new Error('COMPOSIO_API_KEY environment variable is not configured')
    }
    _instance = new Composio({ apiKey })
  }
  return _instance
}
