import { z } from 'zod'

/**
 * Zod schema for Composio webhook event payloads.
 * Validates the incoming webhook POST body from Composio trigger callbacks.
 */
export const composioWebhookPayloadSchema = z.object({
  type: z.string().min(1, { message: 'Trigger type is required' }),
  data: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.string().optional(),
  log_id: z.string().min(1, { message: 'Event log_id is required' }),
  metadata: z
    .object({
      triggerSlug: z.string().optional(),
      connectedAccount: z
        .object({
          userId: z.string(),
          id: z.string(),
        })
        .optional(),
      triggerConfig: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
})

export type ComposioWebhookPayload = z.infer<typeof composioWebhookPayloadSchema>
