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
  {
    name: 'SNEW_LIST_AVAILABLE_APPS',
    description:
      'List all apps available for connection (Instagram, Gmail, Meta Ads, Shopify, Slack, WhatsApp, TikTok, YouTube, LinkedIn, Twitter, Pinterest, Discord, Notion, Trello) with status showing which are already connected for the current user.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'SNEW_CONNECT_APP',
    description:
      'Generate an OAuth connection URL for the user to connect an external app. Use this whenever the user wants to connect (or asks to post/publish/share to) an integration like Instagram, Gmail, Meta Ads, TikTok, etc. Returns a clickable URL that MUST be included in the response as a markdown link — never tell the user to go to settings manually.',
    input_schema: {
      type: 'object',
      properties: {
        app_id: {
          type: 'string',
          description:
            'Slug of the app to connect (e.g. "instagram", "gmail", "meta-ads", "shopify", "whatsapp", "tiktok", "youtube", "linkedin", "twitter", "pinterest", "discord", "notion", "trello", "slack").',
        },
      },
      required: ['app_id'],
    },
  },
  {
    name: 'SNEW_CREATE_NOTIFICATION',
    description: 'Create a notification for the user (info, success, warning, or error).',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        message: { type: 'string' },
        type: {
          type: 'string',
          enum: ['info', 'success', 'warning', 'error'],
        },
      },
      required: ['title', 'message'],
    },
  },
]
