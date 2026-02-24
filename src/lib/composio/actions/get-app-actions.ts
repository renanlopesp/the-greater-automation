'use server'

import { getComposio } from '../client'

export interface ActionParam {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'url'
  required: boolean
  description?: string
  placeholder?: string
}

export interface ComposioAppAction {
  name: string // e.g., "GITHUB_CREATE_ISSUE" — Composio's action name
  displayName: string // e.g., "Create Issue"
  description: string
  params: ActionParam[]
}

interface JSONSchemaProperty {
  type?: string
  description?: string
  title?: string
}

interface ActionParameters {
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
}

interface V2Tool {
  slug: string // SCREAMING_SNAKE action name (e.g., "GITHUB_CREATE_ISSUE")
  name: string // Human readable name
  description?: string
  inputParameters?: ActionParameters
  isDeprecated?: boolean
}

/**
 * Humanize a camelCase or snake_case string to title case
 */
function humanize(str: string): string {
  return str
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Map JSON Schema type to our input type
 */
function mapJsonSchemaType(
  jsonType: string | undefined,
  description: string = ''
): ActionParam['type'] {
  if (!jsonType) return 'text'

  if (jsonType === 'integer' || jsonType === 'number') return 'number'

  // Long text fields → textarea
  if (jsonType === 'string' && description.length > 100) return 'textarea'
  if (
    jsonType === 'string' &&
    (description.toLowerCase().includes('description') ||
      description.toLowerCase().includes('content') ||
      description.toLowerCase().includes('body'))
  ) {
    return 'textarea'
  }

  // URL detection
  if (
    jsonType === 'string' &&
    (description.toLowerCase().includes('url') || description.toLowerCase().includes('link'))
  ) {
    return 'url'
  }

  return 'text'
}

// Native actions for apps not in Composio
const NATIVE_APP_ACTIONS: Record<string, ComposioAppAction[]> = {
  nuvemshop: [
    {
      name: 'NUVEMSHOP_GET_PRODUCTS',
      displayName: 'Get products',
      description:
        'Fetch all products from the Nuvemshop store with stock, price, and variant info.',
      params: [],
    },
    {
      name: 'NUVEMSHOP_GET_ORDERS',
      displayName: 'Get orders',
      description: 'Fetch recent orders from the Nuvemshop store.',
      params: [
        {
          key: 'created_at_min',
          label: 'Created after',
          type: 'text',
          required: false,
          description: 'ISO 8601 date to filter orders created after this date (e.g. 2025-01-01)',
          placeholder: '2025-01-01',
        },
      ],
    },
    {
      name: 'NUVEMSHOP_GET_CUSTOMERS',
      displayName: 'Get customers',
      description: 'Fetch customers from the Nuvemshop store.',
      params: [
        {
          key: 'q',
          label: 'Search',
          type: 'text',
          required: false,
          description: 'Search by customer name or email',
          placeholder: 'Customer name or email',
        },
      ],
    },
    {
      name: 'NUVEMSHOP_GET_CATEGORIES',
      displayName: 'Get categories',
      description: 'Fetch all product categories from the Nuvemshop store.',
      params: [],
    },
    {
      name: 'NUVEMSHOP_GET_ABANDONED_CHECKOUTS',
      displayName: 'Get abandoned checkouts',
      description: 'Fetch abandoned checkout carts from the Nuvemshop store.',
      params: [],
    },
    {
      name: 'NUVEMSHOP_GET_COUPONS',
      displayName: 'Get coupons',
      description: 'Fetch discount coupons from the Nuvemshop store.',
      params: [],
    },
    {
      name: 'NUVEMSHOP_GET_STORE_INFO',
      displayName: 'Get store info',
      description: 'Fetch store metadata (name, domain, plan, contact info).',
      params: [],
    },
  ],
}

/**
 * Fetch actions from Composio for a given app, or return native actions for native apps.
 */
export async function getAppActions(appId: string): Promise<ComposioAppAction[]> {
  // Native apps have hardcoded actions (not in Composio)
  if (NATIVE_APP_ACTIONS[appId]) {
    return NATIVE_APP_ACTIONS[appId]
  }

  try {
    const composio = getComposio()

    // Fetch tools (actions) for this app using V2 SDK
    const tools = await composio.tools.getRawComposioTools({ toolkits: [appId], limit: 500 })

    if (!tools || tools.length === 0) {
      console.error(`No actions found for app: ${appId}`)
      return []
    }

    // Filter out deprecated actions and map to our format
    const actions = tools
      .filter((tool: V2Tool) => !tool.isDeprecated)
      .map((tool: V2Tool): ComposioAppAction => {
        const params: ActionParam[] = []
        const properties = tool.inputParameters?.properties ?? {}
        const required = tool.inputParameters?.required ?? []

        // Parse parameters from JSON Schema
        for (const [key, prop] of Object.entries(properties)) {
          const description = prop.description ?? ''
          const label = prop.title ?? humanize(key)
          const type = mapJsonSchemaType(prop.type, description)

          params.push({
            key,
            label,
            type,
            required: required.includes(key),
            description,
            placeholder: description.slice(0, 50),
          })
        }

        return {
          name: tool.slug, // SCREAMING_SNAKE action name (e.g., "GITHUB_CREATE_ISSUE")
          displayName: tool.name, // Human readable name from V2
          description: tool.description ?? '',
          params,
        }
      })

    return actions
  } catch (error) {
    console.error(`Error fetching actions for app ${appId}:`, error)
    return []
  }
}
