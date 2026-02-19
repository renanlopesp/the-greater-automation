import { z } from 'zod'

export const provisionRequestSchema = z.object({
  llm: z.object({
    provider: z.enum(['openai', 'anthropic', 'openrouter', 'custom']),
    apiKey: z.string().min(1, 'API key is required'),
    model: z.string().min(1, 'Model is required'),
    baseUrl: z.union([z.string().url(), z.literal('')]).optional(),
  }),
  messaging: z
    .object({
      telegram: z.string().optional(),
      whatsapp: z.string().optional(),
      discord: z.string().optional(),
      signal: z.string().optional(),
    })
    .optional(),
  permissions: z.object({
    webSearch: z.boolean().default(false),
    fileSystem: z.boolean().default(false),
    exec: z.boolean().default(false),
    browser: z.boolean().default(false),
    messaging: z.boolean().default(false),
  }),
  region: z.string().default('gru'),
})

export const chatMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  sessionId: z.string().optional(),
})

export const secretsUpdateSchema = z.object({
  secrets: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string().min(1),
    })
  ),
})

export const configPatchSchema = z.object({
  config: z.record(z.string(), z.unknown()),
})

export type ProvisionRequest = z.infer<typeof provisionRequestSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type SecretsUpdate = z.infer<typeof secretsUpdateSchema>
export type ConfigPatch = z.infer<typeof configPatchSchema>
