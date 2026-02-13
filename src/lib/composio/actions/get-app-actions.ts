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

interface ActionDetails {
  name: string
  displayName?: string
  description?: string
  parameters?: ActionParameters
  deprecated?: boolean
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

/**
 * Fetch actions from Composio for a given app
 */
export async function getAppActions(appId: string): Promise<ComposioAppAction[]> {
  try {
    const composio = getComposio()

    // Fetch actions for this app — the `apps` param is a string
    const response = await composio.actions.list({ apps: appId })

    if (!response?.items) {
      console.error(`No actions found for app: ${appId}`)
      return []
    }

    // Filter out deprecated actions and map to our format
    const actions = response.items
      .filter((action: ActionDetails) => !action.deprecated)
      .map((action: ActionDetails): ComposioAppAction => {
        const params: ActionParam[] = []
        const properties = action.parameters?.properties ?? {}
        const required = action.parameters?.required ?? []

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
          name: action.name,
          displayName: action.displayName ?? humanize(action.name),
          description: action.description ?? '',
          params,
        }
      })

    return actions
  } catch (error) {
    console.error(`Error fetching actions for app ${appId}:`, error)
    return []
  }
}
