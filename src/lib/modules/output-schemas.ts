/**
 * Zod schemas for validating workflow_run_outputs.output_data JSONB.
 *
 * Each schema corresponds to an ArtifactOutputType value.
 * Use these to safely parse raw DB output before rendering artifact components.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// cart-table
// ---------------------------------------------------------------------------

export const CartItemSchema = z.object({
  customer_name: z.string(),
  product: z.string(),
  value: z.number(),
  abandoned_ago: z.string(),
  status: z.enum(['enviado', 'convertido', 'aguardando']),
})

export const CartTableOutputSchema = z.object({
  carts: z.array(CartItemSchema),
  total_detected: z.number(),
  total_recovered: z.number(),
  total_value_at_risk: z.number(),
})

export type CartTableOutput = z.infer<typeof CartTableOutputSchema>

// ---------------------------------------------------------------------------
// channel-performance
// ---------------------------------------------------------------------------

export const ChannelStatSchema = z.object({
  name: z.string(),
  sent: z.number(),
  converted: z.number(),
  conversion_rate: z.number(),
})

export const ChannelPerformanceOutputSchema = z.object({
  channels: z.array(ChannelStatSchema),
  insight: z.string(),
})

export type ChannelPerformanceOutput = z.infer<typeof ChannelPerformanceOutputSchema>

// ---------------------------------------------------------------------------
// conversion-list
// ---------------------------------------------------------------------------

export const ConversionItemSchema = z.object({
  customer_name: z.string(),
  product: z.string(),
  value: z.number(),
  channel: z.string(),
})

export const ConversionListOutputSchema = z.object({
  conversions: z.array(ConversionItemSchema),
  total_recovered_value: z.number(),
  insight: z.string(),
})

export type ConversionListOutput = z.infer<typeof ConversionListOutputSchema>

// ---------------------------------------------------------------------------
// message-approval
// ---------------------------------------------------------------------------

export const MessageApprovalOutputSchema = z.object({
  template: z.string(),
  store_name: z.string(),
  recipient_count: z.number(),
  scheduled_for: z.string(),
  status: z.enum(['pending_approval', 'approved', 'sent']),
})

export type MessageApprovalOutput = z.infer<typeof MessageApprovalOutputSchema>

// ---------------------------------------------------------------------------
// category-chart
// ---------------------------------------------------------------------------

export const CategoryItemSchema = z.object({
  name: z.string(),
  count: z.number(),
  color: z.string(),
})

export const CategoryChartOutputSchema = z.object({
  categories: z.array(CategoryItemSchema),
  total: z.number(),
  insight: z.string(),
})

export type CategoryChartOutput = z.infer<typeof CategoryChartOutputSchema>

// ---------------------------------------------------------------------------
// escalation-cards
// ---------------------------------------------------------------------------

export const EscalationCaseSchema = z.object({
  customer_name: z.string(),
  status: z.enum(['andamento', 'resolvido', 'aguardando']),
  problem: z.string(),
  action_taken: z.string(),
  escalation_reason: z.string(),
})

export const EscalationCardsOutputSchema = z.object({
  cases: z.array(EscalationCaseSchema),
})

export type EscalationCardsOutput = z.infer<typeof EscalationCardsOutputSchema>

// ---------------------------------------------------------------------------
// kpi-summary
// ---------------------------------------------------------------------------

export const KpiItemSchema = z.object({
  label: z.string(),
  value: z.string(),
})

export const KpiSummaryOutputSchema = z.object({
  kpis: z.array(KpiItemSchema),
  summary: z.string(),
})

export type KpiSummaryOutput = z.infer<typeof KpiSummaryOutputSchema>

// ---------------------------------------------------------------------------
// Union discriminated parser
// ---------------------------------------------------------------------------

export const OutputSchemaMap = {
  'cart-table': CartTableOutputSchema,
  'channel-performance': ChannelPerformanceOutputSchema,
  'conversion-list': ConversionListOutputSchema,
  'message-approval': MessageApprovalOutputSchema,
  'category-chart': CategoryChartOutputSchema,
  'escalation-cards': EscalationCardsOutputSchema,
  'kpi-summary': KpiSummaryOutputSchema,
} as const

export type OutputSchemaMap = typeof OutputSchemaMap
