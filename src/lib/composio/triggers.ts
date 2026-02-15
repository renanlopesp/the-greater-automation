import { getComposio } from './client'

/**
 * Get the typed triggers API from the Composio SDK.
 */
function getTriggersApi() {
  return getComposio().triggers
}

/**
 * List available trigger types for an app (toolkit).
 * Uses `triggers.listTypes({ toolkits: [appId] })`.
 */
export async function listTriggers(appId: string) {
  const result = await getTriggersApi().listTypes({ toolkits: [appId] })
  return (result.items ?? []).map((t) => ({
    trigger_name: t.slug,
    display_name: t.name,
    description: t.description ?? '',
    config_params: t.config ?? {},
  }))
}

/**
 * Create a trigger subscription in Composio.
 * Returns the trigger instance ID from Composio.
 *
 * SDK signature: `triggers.create(userId, slug, { connectedAccountId?, triggerConfig? })`
 */
export async function createTrigger(params: {
  userId: string
  triggerSlug: string
  connectedAccountId: string
  triggerConfig?: Record<string, unknown>
}): Promise<string> {
  const result = await getTriggersApi().create(params.userId, params.triggerSlug, {
    connectedAccountId: params.connectedAccountId,
    triggerConfig: params.triggerConfig,
  })
  return result.triggerId
}

/**
 * Enable an existing trigger subscription.
 */
export async function enableTrigger(triggerId: string): Promise<void> {
  await getTriggersApi().enable(triggerId)
}

/**
 * Disable a trigger subscription without deleting it.
 */
export async function disableTrigger(triggerId: string): Promise<void> {
  await getTriggersApi().disable(triggerId)
}

/**
 * Delete a trigger subscription from Composio.
 */
export async function deleteTrigger(triggerId: string): Promise<void> {
  await getTriggersApi().delete(triggerId)
}

/**
 * Get details about a specific trigger type.
 */
export async function getTriggerType(triggerSlug: string) {
  return await getTriggersApi().getType(triggerSlug)
}
