/**
 * Custom tool definitions for Managed Agent.
 * Registered on the agent at provisioning time.
 * When agent calls a tool, the chat route executes it locally.
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

const PLATFORM_TOOLS: CustomToolDef[] = [
  {
    type: 'custom',
    name: 'SNEW_LIST_SKILLS',
    description: 'List all skills available to the team with their status.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    type: 'custom',
    name: 'SNEW_RUN_SKILL',
    description: 'Execute a skill with optional input data.',
    input_schema: {
      type: 'object',
      properties: { skill_slug: { type: 'string' }, input: { type: 'object' } },
      required: ['skill_slug'],
    },
  },
  {
    type: 'custom',
    name: 'SNEW_ACTIVATE_SKILL',
    description: 'Activate a skill for the current team.',
    input_schema: {
      type: 'object',
      properties: { skill_slug: { type: 'string' } },
      required: ['skill_slug'],
    },
  },
  {
    type: 'custom',
    name: 'SNEW_CHECK_CONNECTIONS',
    description: 'Check which apps the user has connected.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    type: 'custom',
    name: 'SNEW_CREATE_NOTIFICATION',
    description: 'Create a notification for the team.',
    input_schema: {
      type: 'object',
      properties: {
        urgency: { type: 'string', enum: ['urgent', 'opportunity', 'insight'] },
        title: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['urgency', 'title'],
    },
  },
  {
    type: 'custom',
    name: 'SNEW_MODIFY_ARTIFACT',
    description: "Modify the artifact panel. Use operation='replace' with artifact_data.",
    input_schema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['replace', 'filter_dates', 'remove_dates', 'clear_campaigns'],
        },
        artifact_data: { type: 'object' },
        date_ids: { type: 'array', items: { type: 'string' } },
      },
      required: ['operation'],
    },
  },
]

const RETAIL_TOOLS: CustomToolDef[] = [
  {
    type: 'custom',
    name: 'STORE_QUERY_SALES',
    description: 'Get sales summary for a time period.',
    input_schema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'yesterday', 'this_week', 'this_month', 'custom'],
        },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
      },
    },
  },
  {
    type: 'custom',
    name: 'STORE_QUERY_STOCK',
    description: 'Query product stock levels.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        low_stock_only: { type: 'boolean' },
        limit: { type: 'number' },
      },
    },
  },
  {
    type: 'custom',
    name: 'STORE_LIST_ORDERS',
    description: 'List recent orders.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'closed', 'cancelled'] },
        limit: { type: 'number' },
      },
    },
  },
  {
    type: 'custom',
    name: 'STORE_QUERY_CUSTOMERS',
    description: 'Query customers.',
    input_schema: {
      type: 'object',
      properties: { search: { type: 'string' }, limit: { type: 'number' } },
    },
  },
  {
    type: 'custom',
    name: 'STORE_GET_STORE_INFO',
    description: 'Get store information.',
    input_schema: { type: 'object', properties: {} },
  },
]

export function buildCustomToolDefinitions(opts: { hasStore: boolean }): CustomToolDef[] {
  const tools = [...PLATFORM_TOOLS]
  if (opts.hasStore) tools.push(...RETAIL_TOOLS)
  return tools
}
