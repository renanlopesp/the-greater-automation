/**
 * Custom tool definitions for Managed Agent registration.
 *
 * These are registered on the agent via POST/PUT /v1/agents with tools: [...].
 * When the agent calls a tool, an agent.custom_tool_use event is emitted
 * and the chat route handles execution locally.
 */

interface CustomToolDef {
  type: 'custom'
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties?: Record<string, unknown>
    required?: string[]
  }
}

/** Platform tools — always registered */
const PLATFORM_TOOLS: CustomToolDef[] = [
  {
    type: 'custom',
    name: 'SNEW_LIST_SKILLS',
    description: 'List all skills available to the team with their status.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    type: 'custom',
    name: 'SNEW_GET_SKILL',
    description: 'Get detailed info about a specific skill, including recent executions.',
    input_schema: {
      type: 'object',
      properties: { skill_slug: { type: 'string', description: 'The skill slug' } },
      required: ['skill_slug'],
    },
  },
  {
    type: 'custom',
    name: 'SNEW_RUN_SKILL',
    description: 'Execute a skill with optional input data.',
    input_schema: {
      type: 'object',
      properties: {
        skill_slug: { type: 'string', description: 'The skill slug to execute' },
        input: { type: 'object', description: 'Optional input data' },
      },
      required: ['skill_slug'],
    },
  },
  {
    type: 'custom',
    name: 'SNEW_CHECK_CONNECTIONS',
    description: 'Check which apps the user has connected (active connections).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    type: 'custom',
    name: 'SNEW_LIST_AVAILABLE_APPS',
    description: 'List all apps available for connection, including which are already connected.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    type: 'custom',
    name: 'SNEW_LIST_APP_CAPABILITIES',
    description: 'List available actions and triggers for a specific app.',
    input_schema: {
      type: 'object',
      properties: { app_id: { type: 'string', description: 'The app ID (e.g. "instagram")' } },
      required: ['app_id'],
    },
  },
  {
    type: 'custom',
    name: 'SNEW_CREATE_NOTIFICATION',
    description: 'Create a notification for the team (insights, opportunities, urgent alerts).',
    input_schema: {
      type: 'object',
      properties: {
        urgency: {
          type: 'string',
          enum: ['urgent', 'opportunity', 'insight'],
          description: 'Urgency level',
        },
        title: { type: 'string', description: 'Short title (max ~80 chars)' },
        body: { type: 'string', description: 'Optional body text' },
        cta_url: { type: 'string', description: 'Optional CTA URL' },
      },
      required: ['urgency', 'title'],
    },
  },
  {
    type: 'custom',
    name: 'SNEW_ACTIVATE_SKILL',
    description: 'Activate a skill from the catalog for the current team.',
    input_schema: {
      type: 'object',
      properties: { skill_slug: { type: 'string', description: 'Skill slug to activate' } },
      required: ['skill_slug'],
    },
  },
  {
    type: 'custom',
    name: 'SNEW_LIST_WORKFLOWS',
    description: 'List workflows for the workspace.',
    input_schema: {
      type: 'object',
      properties: { agent_id: { type: 'string', description: 'Optional: filter by agent' } },
    },
  },
  {
    type: 'custom',
    name: 'SNEW_RUN_WORKFLOW',
    description: 'Trigger a manual workflow run.',
    input_schema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'Workflow ID to run' },
        input_data: { type: 'object', description: 'Optional input data' },
      },
      required: ['workflow_id'],
    },
  },
]

/** Artifact tool — only when task context exists */
const ARTIFACT_TOOL: CustomToolDef = {
  type: 'custom',
  name: 'SNEW_MODIFY_ARTIFACT',
  description:
    'Modify the artifact in the side panel. Supports replace (HTML), filter_dates, remove_dates, clear_campaigns, generate_campaign.',
  input_schema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['filter_dates', 'remove_dates', 'clear_campaigns', 'generate_campaign', 'replace'],
        description: 'Operation to perform',
      },
      date_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Date IDs for date operations',
      },
      except: { type: 'boolean', description: 'Invert selection. Default: false' },
      artifact_data: { type: 'object', description: 'Full artifact_data for replace operation' },
    },
    required: ['operation'],
  },
}

/** Retail tools — only when store is connected */
const RETAIL_TOOLS: CustomToolDef[] = [
  {
    type: 'custom',
    name: 'STORE_QUERY_SALES',
    description:
      'Get sales summary for a time period. Shows order count, revenue, average ticket, top products.',
    input_schema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'yesterday', 'this_week', 'this_month', 'custom'],
          description: 'Time period (default: today)',
        },
        start_date: { type: 'string', description: 'Start date YYYY-MM-DD (for custom period)' },
        end_date: { type: 'string', description: 'End date YYYY-MM-DD (for custom period)' },
      },
    },
  },
  {
    type: 'custom',
    name: 'STORE_QUERY_STOCK',
    description: 'Query product stock levels. Search by name/SKU or get low stock alerts.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search by product name or SKU' },
        low_stock_only: { type: 'boolean', description: 'Only show low stock products' },
        limit: { type: 'number', description: 'Max results (default: 20)' },
      },
    },
  },
  {
    type: 'custom',
    name: 'STORE_LIST_ORDERS',
    description: 'List recent orders with optional status filter.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['open', 'closed', 'cancelled'],
          description: 'Filter by status',
        },
        limit: { type: 'number', description: 'Max results (default: 10)' },
      },
    },
  },
  {
    type: 'custom',
    name: 'STORE_QUERY_CUSTOMERS',
    description: 'Query customers with optional search and RFM segmentation.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search by name or email' },
        segment: { type: 'string', description: 'Filter by RFM segment' },
        limit: { type: 'number', description: 'Max results (default: 20)' },
      },
    },
  },
  {
    type: 'custom',
    name: 'STORE_GET_STORE_INFO',
    description: 'Get store information (name, platform, settings).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    type: 'custom',
    name: 'STORE_QUERY_MARGINS',
    description: 'Get product margins (cost price vs sell price).',
    input_schema: {
      type: 'object',
      properties: {
        product_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific product IDs',
        },
      },
    },
  },
  {
    type: 'custom',
    name: 'STORE_UPDATE_PRODUCT',
    description: 'Update a product (price, stock, name, description).',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product ID' },
        name: { type: 'string' },
        price: { type: 'number' },
        stock: { type: 'number' },
        cost_price: { type: 'number' },
        description: { type: 'string' },
      },
      required: ['product_id'],
    },
  },
  {
    type: 'custom',
    name: 'STORE_CREATE_PRODUCT',
    description: 'Create a new product.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Product name' },
        price: { type: 'number', description: 'Price' },
        stock: { type: 'number', description: 'Initial stock' },
        description: { type: 'string' },
        sku: { type: 'string' },
        cost_price: { type: 'number' },
      },
      required: ['name', 'price'],
    },
  },
  {
    type: 'custom',
    name: 'STORE_TRIGGER_SYNC',
    description: 'Sync products from the connected e-commerce platform.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    type: 'custom',
    name: 'STORE_MANAGE_COUPONS',
    description: 'Create, list, or delete discount coupons.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'list', 'delete'], description: 'Action' },
        code: { type: 'string' },
        type: { type: 'string', enum: ['percentage', 'absolute'] },
        value: { type: 'number' },
        max_uses: { type: 'number' },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
      },
      required: ['action'],
    },
  },
  {
    type: 'custom',
    name: 'STORE_GET_ABANDONED_CHECKOUTS',
    description: 'Get abandoned checkout data.',
    input_schema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Max results (default: 20)' } },
    },
  },
]

/**
 * Build the list of custom tools to register on a Managed Agent.
 */
export function buildCustomToolDefinitions(opts: {
  hasStore: boolean
  hasTask: boolean
}): CustomToolDef[] {
  const tools: CustomToolDef[] = [...PLATFORM_TOOLS]

  if (opts.hasTask) {
    tools.push(ARTIFACT_TOOL)
  }

  if (opts.hasStore) {
    tools.push(...RETAIL_TOOLS)
  }

  return tools
}
