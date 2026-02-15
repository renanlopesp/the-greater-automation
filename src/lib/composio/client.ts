import { Composio } from '@composio/core'
import { VercelProvider } from '@composio/vercel'

let _instance: Composio<VercelProvider> | null = null

/**
 * Get the Composio V2 SDK singleton instance.
 * Uses @composio/core with VercelProvider for AI SDK integration.
 * Requires COMPOSIO_API_KEY environment variable.
 */
export function getComposio(): Composio<VercelProvider> {
  if (!_instance) {
    const apiKey = process.env.COMPOSIO_API_KEY
    if (!apiKey) {
      throw new Error('COMPOSIO_API_KEY environment variable is not configured')
    }
    _instance = new Composio({
      apiKey,
      provider: new VercelProvider(),
    })
  }
  return _instance
}
