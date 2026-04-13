import type Anthropic from '@anthropic-ai/sdk'

type Tool = Anthropic.Messages.Tool

export const CHAT_TOOLS: Tool[] = [
  {
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
      required: [],
    },
  },
  {
    name: 'STORE_QUERY_STOCK',
    description: 'Query product stock levels.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        low_stock_only: { type: 'boolean' },
        limit: { type: 'number' },
      },
      required: [],
    },
  },
  {
    name: 'STORE_LIST_ORDERS',
    description: 'List recent orders.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['open', 'closed', 'cancelled'],
        },
        limit: { type: 'number' },
      },
      required: [],
    },
  },
  {
    name: 'STORE_GET_STORE_INFO',
    description: 'Get store information.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'SNEW_CHECK_CONNECTIONS',
    description: 'Check which apps the user has connected.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
]
