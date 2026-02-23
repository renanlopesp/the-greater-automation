import { z } from 'zod'

// Nuvemshop product variant
export const NuvemshopVariantSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  sku: z.string().nullable(),
  name: z
    .string()
    .nullable()
    .transform((v) => v ?? ''),
  price: z.string().nullable(),
  stock: z.number().nullable(),
  stock_management: z.boolean(),
  values: z
    .array(
      z.object({
        pt: z.string().optional(),
        en: z.string().optional(),
        es: z.string().optional(),
      })
    )
    .default([]),
})

export type NuvemshopVariant = z.infer<typeof NuvemshopVariantSchema>

// Nuvemshop product image
export const NuvemshopImageSchema = z.object({
  id: z.number(),
  src: z.string(),
  position: z.number().optional(),
})

// Nuvemshop product
export const NuvemshopProductSchema = z.object({
  id: z.number(),
  name: z.object({
    pt: z.string().optional(),
    en: z.string().optional(),
    es: z.string().optional(),
  }),
  description: z
    .object({
      pt: z.string().optional(),
      en: z.string().optional(),
      es: z.string().optional(),
    })
    .nullable()
    .optional(),
  handle: z
    .object({
      pt: z.string().optional(),
      en: z.string().optional(),
      es: z.string().optional(),
    })
    .nullable()
    .optional(),
  variants: z.array(NuvemshopVariantSchema).default([]),
  images: z.array(NuvemshopImageSchema).default([]),
  published: z.boolean().default(true),
  updated_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
})

export type NuvemshopProduct = z.infer<typeof NuvemshopProductSchema>

// Nuvemshop order item
export const NuvemshopOrderItemSchema = z.object({
  product_id: z.number().nullable(),
  variant_id: z.number().nullable(),
  name: z.string(),
  sku: z.string().nullable(),
  quantity: z.string(), // Nuvemshop sends as string
  price: z.string(), // Nuvemshop sends as string
})

// Nuvemshop order
export const NuvemshopOrderSchema = z.object({
  id: z.number(),
  number: z.string().nullable(),
  status: z.string(),
  payment_status: z.string().nullable().optional(),
  total: z.string(), // Nuvemshop sends as string
  currency: z.string().default('BRL'),
  customer: z
    .object({
      name: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  products: z.array(NuvemshopOrderItemSchema).default([]),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
})

export type NuvemshopOrder = z.infer<typeof NuvemshopOrderSchema>

// Nuvemshop webhook payload (minimal — only IDs, need to fetch full data)
export const NuvemshopWebhookPayloadSchema = z.object({
  store_id: z.number(),
  event: z.string(),
  id: z.number().optional(),
})

export type NuvemshopWebhookPayload = z.infer<typeof NuvemshopWebhookPayloadSchema>

// OAuth token response
export const NuvemshopTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  scope: z.string(),
  user_id: z.number(),
})

export type NuvemshopTokenResponse = z.infer<typeof NuvemshopTokenResponseSchema>

// Webhook registration response
export const NuvemshopWebhookResponseSchema = z.object({
  id: z.number(),
  url: z.string(),
  event: z.string(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type NuvemshopWebhookResponse = z.infer<typeof NuvemshopWebhookResponseSchema>
