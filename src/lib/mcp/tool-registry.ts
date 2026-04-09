import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { buildPlatformTools } from '@/lib/ai/platform-tools'
import { buildRetailTools } from '@/lib/ai/retail-tools'
import type { ToolContext } from './context'

/**
 * Wrap an existing tool execute function into an MCP tool response.
 * Serializes the result as JSON text content.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapExecute(executeFn: (params: any) => Promise<unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (params: any) => {
    try {
      const result = await executeFn(params)
      const hasError = result && typeof result === 'object' && 'error' in result
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        isError: hasError ? true : undefined,
      }
    } catch (err) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
          },
        ],
        isError: true,
      }
    }
  }
}

/**
 * Register all SNEW_* and STORE_* tools on the MCP server.
 * Uses the existing buildPlatformTools() and buildRetailTools() to get
 * the tool execute functions, then wraps them for MCP.
 */
export function registerAllTools(server: McpServer, ctx: ToolContext) {
  // ── Platform tools (always available) ──
  const platformTools = buildPlatformTools(
    ctx.userId,
    ctx.teamId,
    ctx.supabase,
    ctx.storeId ?? undefined,
    ctx.taskId ?? undefined
  )

  // Zod schemas for each platform tool
  const platformSchemas: Record<string, z.ZodType> = {
    SNEW_LIST_SKILLS: z.object({}),
    SNEW_GET_SKILL: z.object({
      skill_slug: z.string().describe('The skill slug (e.g. "copywriter", "seasonal-calendar")'),
    }),
    SNEW_RUN_SKILL: z.object({
      skill_slug: z.string().describe('The skill slug to execute'),
      input: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Optional input data for the skill'),
    }),
    SNEW_LIST_WORKFLOWS: z.object({
      agent_id: z.string().optional().describe('Optional: filter by agent ID'),
    }),
    SNEW_LIST_APP_CAPABILITIES: z.object({
      app_id: z
        .string()
        .describe('The app ID (e.g. "github", "slack", "discord", "notion", "instagram")'),
    }),
    SNEW_CHECK_CONNECTIONS: z.object({}),
    SNEW_LIST_AVAILABLE_APPS: z.object({}),
    SNEW_CREATE_SKILL: z.object({
      agent_id: z.string().describe('The agent to add the context entry to'),
      name: z.string().describe('Context entry name'),
      description: z.string().optional().describe('What this context entry covers'),
      content: z.string().describe('Full context/knowledge text'),
    }),
    SNEW_RUN_WORKFLOW: z.object({
      workflow_id: z.string().describe('The agent_workflow ID to run'),
      input_data: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Optional input data for the workflow'),
    }),
    SNEW_LIST_RUNS: z.object({
      agent_id: z.string().optional().describe('Optional: filter by agent'),
      workflow_id: z.string().optional().describe('Optional: filter by workflow'),
      limit: z.number().optional().describe('Number of runs to return (default: 10)'),
    }),
    SNEW_ACTIVATE_SKILL: z.object({
      skill_slug: z
        .string()
        .describe("The skill slug to activate (e.g. 'copywriter', 'seasonal-calendar')"),
    }),
    SNEW_GET_SKILLS_ACTIVITY: z.object({}),
    SNEW_CREATE_NOTIFICATION: z.object({
      urgency: z
        .enum(['urgent', 'opportunity', 'insight'])
        .describe(
          'urgent = requires immediate attention, opportunity = time-sensitive, insight = informational'
        ),
      title: z.string().describe('Short, action-oriented title (max ~80 chars)'),
      body: z.string().optional().describe('Optional body text (1-3 sentences)'),
      cta_url: z.string().optional().describe('Optional URL for the call-to-action button'),
    }),
  }

  // Register each platform tool
  for (const [name, schema] of Object.entries(platformSchemas)) {
    const tool = platformTools[name as keyof typeof platformTools]
    if (!tool) continue

    server.registerTool(
      name,
      {
        description: tool.description,
        inputSchema: schema,
      },
      wrapExecute(tool.execute)
    )
  }

  // SNEW_MODIFY_ARTIFACT — only if taskId is present
  if (ctx.taskId && 'SNEW_MODIFY_ARTIFACT' in platformTools) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const artifactTool = platformTools.SNEW_MODIFY_ARTIFACT as any

    server.registerTool(
      'SNEW_MODIFY_ARTIFACT',
      {
        description: artifactTool.description,
        inputSchema: z.object({
          operation: z
            .enum([
              'filter_dates',
              'remove_dates',
              'clear_campaigns',
              'generate_campaign',
              'replace',
            ])
            .describe('Operation to perform on the artifact'),
          except: z
            .boolean()
            .optional()
            .describe('When true, inverts the date_ids selection. Default: false.'),
          date_ids: z
            .array(z.string())
            .optional()
            .describe('Date IDs to keep/remove (e.g. "dia-das-maes-2026")'),
          artifact_data: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Full artifact_data (only for "replace" operation)'),
        }),
      },
      wrapExecute(artifactTool.execute)
    )
  }

  // Module tools (AGENT_QUERY_MODULE_DATA, AGENT_TRIGGER_MODULE)
  if ('AGENT_QUERY_MODULE_DATA' in platformTools) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moduleTool = platformTools.AGENT_QUERY_MODULE_DATA as any
    server.registerTool(
      'AGENT_QUERY_MODULE_DATA',
      {
        description: moduleTool.description,
        inputSchema: z.object({
          timeframe: z.enum(['today', 'week', 'month']).describe('Time window for the data query'),
        }),
      },
      wrapExecute(moduleTool.execute)
    )
  }

  if ('AGENT_TRIGGER_MODULE' in platformTools) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const triggerTool = platformTools.AGENT_TRIGGER_MODULE as any
    server.registerTool(
      'AGENT_TRIGGER_MODULE',
      {
        description: triggerTool.description,
        inputSchema: z.object({
          module_type: z
            .string()
            .describe('The module type to trigger (e.g. "abandoned-cart", "conversion-optimizer")'),
        }),
      },
      wrapExecute(triggerTool.execute)
    )
  }

  // ── Retail tools (only if store is connected) ──
  if (!ctx.storeId) return

  const retailTools = buildRetailTools(ctx.storeId, ctx.teamId, ctx.supabase, ctx.userId)

  const retailSchemas: Record<string, { schema: z.ZodType }> = {
    STORE_QUERY_STOCK: {
      schema: z.object({
        search: z.string().optional().describe('Search by product name or SKU'),
        low_stock_only: z
          .boolean()
          .optional()
          .describe('Only show products with stock <= alert threshold'),
        limit: z.number().optional().describe('Max results (default: 20)'),
      }),
    },
    STORE_QUERY_SALES: {
      schema: z.object({
        period: z
          .enum(['today', 'yesterday', 'this_week', 'this_month', 'custom'])
          .optional()
          .describe('Time period (default: today). Use "custom" with start_date/end_date.'),
        start_date: z
          .string()
          .optional()
          .describe('Start date YYYY-MM-DD (required for "custom" period)'),
        end_date: z
          .string()
          .optional()
          .describe('End date YYYY-MM-DD (required for "custom" period)'),
      }),
    },
    STORE_LIST_ORDERS: {
      schema: z.object({
        status: z
          .enum(['open', 'closed', 'cancelled'])
          .optional()
          .describe('Filter by order status'),
        limit: z.number().optional().describe('Max results (default: 10)'),
      }),
    },
    STORE_UPDATE_ALERT: {
      schema: z.object({
        threshold: z.number().optional().describe('New stock alert threshold'),
        product_name: z
          .string()
          .optional()
          .describe('Specific product to update (searches by name)'),
        notify_orders: z.boolean().optional().describe('Enable/disable order notifications'),
      }),
    },
    STORE_UPDATE_SCHEDULE: {
      schema: z.object({
        enabled: z.boolean().optional().describe('Enable or disable scheduled reports'),
        frequency: z.enum(['daily', 'weekly']).optional().describe('Report frequency'),
        time: z.string().optional().describe('Time of day for report (HH:MM)'),
      }),
    },
    STORE_DELETE_PRODUCT: {
      schema: z.object({
        product_ids: z
          .array(z.string())
          .optional()
          .describe('Array of product IDs to delete (preferred)'),
        search: z.string().optional().describe('Search products by name to delete (fallback)'),
      }),
    },
    STORE_TRIGGER_SYNC: {
      schema: z.object({}),
    },
    STORE_UPDATE_PRODUCT: {
      schema: z.object({
        product_id: z.string().describe('Product ID to update'),
        name: z.string().optional().describe('New product name'),
        price: z.number().optional().describe('New price'),
        stock: z.number().optional().describe('New stock quantity'),
        cost_price: z.number().optional().describe('New cost price'),
        description: z.string().optional().describe('New description'),
      }),
    },
    STORE_CREATE_PRODUCT: {
      schema: z.object({
        name: z.string().describe('Product name'),
        price: z.number().describe('Product price'),
        stock: z.number().optional().describe('Initial stock (default: 0)'),
        description: z.string().optional().describe('Product description'),
        sku: z.string().optional().describe('SKU code'),
        cost_price: z.number().optional().describe('Cost price for margin calculation'),
      }),
    },
    STORE_QUERY_CATEGORIES: {
      schema: z.object({}),
    },
    STORE_MANAGE_CATEGORIES: {
      schema: z.object({
        action: z.enum(['create', 'update', 'delete']).describe('Category action'),
        category_id: z.string().optional().describe('Category ID (for update/delete)'),
        name: z.string().optional().describe('Category name (for create/update)'),
        parent_id: z.string().optional().describe('Parent category ID'),
      }),
    },
    STORE_QUERY_CUSTOMERS: {
      schema: z.object({
        search: z.string().optional().describe('Search by name or email'),
        segment: z.string().optional().describe('Filter by RFM segment'),
        limit: z.number().optional().describe('Max results (default: 20)'),
      }),
    },
    STORE_MANAGE_COUPONS: {
      schema: z.object({
        action: z.enum(['create', 'list', 'delete']).describe('Coupon action'),
        code: z.string().optional().describe('Coupon code'),
        type: z.enum(['percentage', 'absolute']).optional().describe('Discount type'),
        value: z.number().optional().describe('Discount value'),
        max_uses: z.number().optional().describe('Maximum number of uses'),
        start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
        end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
      }),
    },
    STORE_MANAGE_ORDERS: {
      schema: z.object({
        action: z.enum(['update_status', 'add_note', 'cancel']).describe('Order action'),
        order_id: z.string().describe('Order ID'),
        status: z.string().optional().describe('New status (for update_status)'),
        note: z.string().optional().describe('Note text (for add_note)'),
        reason: z.string().optional().describe('Cancellation reason (for cancel)'),
      }),
    },
    STORE_GET_ABANDONED_CHECKOUTS: {
      schema: z.object({
        limit: z.number().optional().describe('Max results (default: 20)'),
      }),
    },
    STORE_ADD_PRODUCT_IMAGE: {
      schema: z.object({
        product_id: z.string().describe('Product ID to add image to'),
        image_url: z.string().describe('Public URL of the image to add'),
      }),
    },
    STORE_MANAGE_DRAFT_ORDERS: {
      schema: z.object({
        action: z.enum(['create', 'list', 'delete']).describe('Draft order action'),
        customer_id: z.string().optional().describe('Customer ID'),
        products: z
          .array(
            z.object({
              product_id: z.string(),
              variant_id: z.string().optional(),
              quantity: z.number(),
            })
          )
          .optional()
          .describe('Products for the draft order'),
        draft_order_id: z.string().optional().describe('Draft order ID (for delete)'),
      }),
    },
    STORE_MANAGE_FULFILLMENT: {
      schema: z.object({
        action: z.enum(['fulfill', 'pack', 'ship']).describe('Fulfillment action'),
        order_id: z.string().describe('Order ID'),
        tracking_number: z.string().optional().describe('Shipping tracking number'),
        tracking_url: z.string().optional().describe('Tracking URL'),
        shipping_company: z.string().optional().describe('Shipping company name'),
      }),
    },
    STORE_GET_PAYMENT_OPTIONS: {
      schema: z.object({}),
    },
    STORE_QUERY_TRANSACTIONS: {
      schema: z.object({
        period: z.enum(['today', 'this_week', 'this_month']).optional().describe('Time period'),
        status: z.string().optional().describe('Payment status filter'),
      }),
    },
    STORE_MANAGE_PAGES: {
      schema: z.object({
        action: z.enum(['list', 'create', 'update', 'delete']).describe('Page action'),
        page_id: z.string().optional().describe('Page ID (for update/delete)'),
        title: z.string().optional().describe('Page title'),
        content: z.string().optional().describe('Page HTML content'),
        handle: z.string().optional().describe('Page URL handle'),
      }),
    },
    STORE_GET_STORE_INFO: {
      schema: z.object({}),
    },
    STORE_QUERY_MARGINS: {
      schema: z.object({
        product_ids: z
          .array(z.string())
          .optional()
          .describe('Specific product IDs to check margins'),
      }),
    },
  }

  // Register each retail tool
  for (const [name, { schema }] of Object.entries(retailSchemas)) {
    const tool = retailTools[name as keyof typeof retailTools]
    if (!tool) continue

    server.registerTool(
      name,
      {
        description: tool.description,
        inputSchema: schema,
      },
      wrapExecute(tool.execute)
    )
  }
}
