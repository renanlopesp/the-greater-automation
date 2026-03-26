import { z } from 'zod'

// Nuvemshop product variant
export const NuvemshopVariantSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  sku: z.string().nullable(),
  name: z
    .string()
    .nullish()
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

export type NuvemshopImage = z.infer<typeof NuvemshopImageSchema>

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
  variant_id: z.coerce.number().nullable(),
  name: z.string(),
  sku: z.string().nullable(),
  quantity: z.coerce.string(),
  price: z.coerce.string(),
})

// Nuvemshop order
export const NuvemshopOrderSchema = z.object({
  id: z.number(),
  number: z.coerce.string().nullable(),
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

// Reusable address schema
export const NuvemshopAddressSchema = z.object({
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  zip_code: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  floor: z.string().nullable().optional(),
  locality: z.string().nullable().optional(),
})

export type NuvemshopAddress = z.infer<typeof NuvemshopAddressSchema>

// Nuvemshop category
export const NuvemshopCategorySchema = z.object({
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
  parent: z.number().nullable().optional(),
  subcategories: z.array(z.number()).default([]),
  google_shopping_category: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type NuvemshopCategory = z.infer<typeof NuvemshopCategorySchema>

// Nuvemshop customer
export const NuvemshopCustomerSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable().optional(),
  identification: z.string().nullable().optional(),
  total_spent: z.coerce.string().default('0'),
  total_spent_currency: z.string().default('BRL'),
  last_order_id: z.number().nullable().optional(),
  active: z.boolean().optional(),
  note: z.string().nullable().optional(),
  default_address: NuvemshopAddressSchema.nullable().optional(),
  addresses: z.array(NuvemshopAddressSchema).default([]),
  created_at: z.string(),
  updated_at: z.string(),
})

export type NuvemshopCustomer = z.infer<typeof NuvemshopCustomerSchema>

// Nuvemshop coupon
export const NuvemshopCouponSchema = z.object({
  id: z.number(),
  code: z.string(),
  type: z.enum(['percentage', 'absolute', 'shipping']),
  value: z.union([z.string(), z.number()]).nullable().optional(),
  valid: z.boolean(),
  used: z.number(),
  max_uses: z.number().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  min_price: z.union([z.string(), z.number()]).nullable().optional(),
  categories: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  products: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  includes_shipping: z.boolean().optional().default(false),
  first_consumer_purchase: z.boolean().optional().default(false),
  combines_with_other_discounts: z.boolean().optional().default(false),
  only_cheapest_shipping: z.boolean().optional().default(false),
  deleted_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})

export type NuvemshopCoupon = z.infer<typeof NuvemshopCouponSchema>

// Nuvemshop abandoned checkout
export const NuvemshopAbandonedCheckoutSchema = z.object({
  id: z.number(),
  token: z.string(),
  store_id: z.number(),
  abandoned_checkout_url: z.string(),
  contact_email: z.string().nullable().optional(),
  contact_name: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  contact_identification: z.string().nullable().optional(),
  shipping_name: z.string().nullable().optional(),
  shipping_phone: z.string().nullable().optional(),
  shipping_address: NuvemshopAddressSchema.nullable().optional(),
  billing_name: z.string().nullable().optional(),
  billing_phone: z.string().nullable().optional(),
  billing_address: NuvemshopAddressSchema.nullable().optional(),
  currency: z.string(),
  subtotal: z.string(),
  discount: z.string(),
  total: z.string(),
  products: z.array(z.record(z.string(), z.unknown())).default([]),
  created_at: z.string(),
  updated_at: z.string(),
  completed_at: z.string().nullable().optional(),
  customer: z
    .object({
      id: z.number(),
      name: z.string(),
      email: z.string(),
    })
    .nullable()
    .optional(),
})

export type NuvemshopAbandonedCheckout = z.infer<typeof NuvemshopAbandonedCheckoutSchema>

// Nuvemshop draft order
export const NuvemshopDraftOrderSchema = z.object({
  id: z.number(),
  contact_name: z.string(),
  contact_lastname: z.string(),
  contact_email: z.string(),
  contact_phone: z.string().nullable().optional(),
  payment_status: z.string(),
  products: z
    .array(
      z.object({
        variant_id: z.coerce.number(),
        quantity: z.number(),
        price: z.string().optional(),
        name: z.string().optional(),
      })
    )
    .default([]),
  note: z.string().nullable().optional(),
  shipping: z.record(z.string(), z.unknown()).nullable().optional(),
  total: z.string().nullable().optional(),
  currency: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type NuvemshopDraftOrder = z.infer<typeof NuvemshopDraftOrderSchema>

// Nuvemshop fulfillment order
export const NuvemshopFulfillmentOrderSchema = z.object({
  id: z.number(),
  number: z.number(),
  order_id: z.number(),
  status: z.enum(['open', 'packed', 'dispatched', 'delivered', 'not_delivered']),
  assigned_location: z.record(z.string(), z.unknown()).nullable().optional(),
  destination: z.record(z.string(), z.unknown()).nullable().optional(),
  recipient: z.record(z.string(), z.unknown()).nullable().optional(),
  shipping: z
    .object({
      type: z.string(),
      tracking_number: z.string().nullable().optional(),
      tracking_url: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  line_items: z
    .array(
      z.object({
        id: z.number(),
        variant_id: z.coerce.number(),
        product_id: z.number(),
        quantity: z.number(),
        name: z.string(),
      })
    )
    .default([]),
  created_at: z.string(),
  updated_at: z.string(),
})

export type NuvemshopFulfillmentOrder = z.infer<typeof NuvemshopFulfillmentOrderSchema>

// Nuvemshop fulfillment tracking event
export const NuvemshopFulfillmentTrackingEventSchema = z.object({
  id: z.number(),
  fulfillment_order_id: z.number(),
  status: z.string(),
  description: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  happened_at: z.string(),
  estimated_delivery_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type NuvemshopFulfillmentTrackingEvent = z.infer<
  typeof NuvemshopFulfillmentTrackingEventSchema
>

// Nuvemshop store
export const NuvemshopStoreSchema = z.object({
  id: z.number(),
  name: z.object({
    pt: z.string().optional(),
    en: z.string().optional(),
    es: z.string().optional(),
  }),
  description: z
    .object({
      pt: z.string().nullable().optional(),
      en: z.string().nullable().optional(),
      es: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  email: z.string(),
  logo: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  pinterest: z.string().nullable().optional(),
  blog: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  business_id: z.string().nullable().optional(),
  business_name: z.string().nullable().optional(),
  customer_accounts: z.string().nullable().optional(),
  plan_name: z.string(),
  main_language: z.string(),
  main_currency: z.string(),
  domains: z.array(z.string()).default([]),
  original_domain: z.string(),
  languages: z.record(z.string(), z.unknown()),
  created_at: z.string(),
})

export type NuvemshopStore = z.infer<typeof NuvemshopStoreSchema>
