import { getAppActions, type ActionParam, type ComposioAppAction } from './actions/get-app-actions'
import type { AppConnection } from './actions/get-app-connections'

export interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<
        string,
        {
          type: string
          description?: string
        }
      >
      required: string[]
    }
  }
}

export interface ToolCatalogResult {
  tools: OpenAITool[]
  actionMap: Map<string, { appId: string; connectionId: string }>
}

/**
 * Maximum number of tool definitions per connected app.
 * LLMs degrade in quality when given too many tools (800+ from Composio).
 * We score and select the most useful actions per app.
 */
const MAX_ACTIONS_PER_APP = 25

/**
 * Score an action by relevance. Higher = more likely to be useful.
 * Actions with common verbs and user-facing resource types score higher.
 */
function scoreAction(action: ComposioAppAction): number {
  const name = action.name.toUpperCase()
  let score = 0

  // High-value verbs
  if (name.includes('_LIST_')) score += 10
  if (name.includes('_GET_')) score += 10
  if (name.includes('_CREATE_')) score += 8
  if (name.includes('_SEARCH_')) score += 8
  if (name.includes('_SEND_')) score += 8
  if (name.includes('_UPDATE_')) score += 6
  if (name.includes('_DELETE_')) score += 4
  if (name.includes('_MERGE_')) score += 6

  // High-value resource types
  if (name.includes('ISSUE')) score += 5
  if (name.includes('PULL_REQUEST') || name.includes('PULL_REQUESTS')) score += 5
  if (name.includes('REPOSITOR')) score += 5
  if (name.includes('BRANCH')) score += 4
  if (name.includes('COMMENT')) score += 4
  if (name.includes('LABEL')) score += 3
  if (name.includes('MESSAGE')) score += 5
  if (name.includes('CHANNEL')) score += 4
  if (name.includes('USER')) score += 3
  if (name.includes('FILE')) score += 3
  if (name.includes('STAR')) score += 2
  if (name.includes('REVIEW')) score += 3
  if (name.includes('COMMIT')) score += 3
  if (name.includes('RELEASE')) score += 2

  // Low-value / admin resource types — penalize
  if (name.includes('CODESPACE')) score -= 10
  if (name.includes('RUNNER')) score -= 10
  if (name.includes('WEBHOOK')) score -= 8
  if (name.includes('MIGRATION')) score -= 8
  if (name.includes('DEPLOY')) score -= 6
  if (name.includes('PAGES')) score -= 5
  if (name.includes('PACKAGE')) score -= 5
  if (name.includes('SECRET')) score -= 8
  if (name.includes('VARIABLE')) score -= 5
  if (name.includes('ARTIFACT')) score -= 6
  if (name.includes('CHECK_RUN') || name.includes('CHECK_SUITE')) score -= 6
  if (name.includes('OIDC')) score -= 10
  if (name.includes('BILLING')) score -= 10
  if (name.includes('INSTALLATION')) score -= 6
  if (name.includes('CACHE')) score -= 6
  if (name.includes('BLOB') || name.includes('_TREE_')) score -= 6
  if (name.includes('_TAG_')) score -= 4
  if (name.includes('STATUS_CHECK')) score -= 5

  // Bonus for shorter, simpler names (less niche)
  const segments = name.split('_').length
  if (segments <= 6) score += 2

  return score
}

/**
 * Map ActionParam type to JSON Schema type string
 */
function mapParamTypeToJsonSchema(paramType: ActionParam['type']): string {
  switch (paramType) {
    case 'number':
      return 'number'
    case 'text':
    case 'textarea':
    case 'url':
      return 'string'
    default:
      return 'string'
  }
}

/**
 * Convert a ComposioAppAction to an OpenAI function definition
 */
function actionToOpenAITool(action: ComposioAppAction, appId: string): OpenAITool {
  const properties: Record<string, { type: string; description?: string }> = {}
  const required: string[] = []

  for (const param of action.params) {
    properties[param.key] = {
      type: mapParamTypeToJsonSchema(param.type),
      description: param.description,
    }

    if (param.required) {
      required.push(param.key)
    }
  }

  return {
    type: 'function',
    function: {
      name: action.name,
      description: `[${appId}] ${action.description || action.displayName}`,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  }
}

/**
 * Build a catalog of OpenAI-compatible tools from connected apps
 *
 * @param appConnections - Array of app connections from Supabase
 * @returns Tool catalog with OpenAI function definitions and action mapping
 */
export async function buildToolCatalog(
  appConnections: AppConnection[]
): Promise<ToolCatalogResult> {
  const tools: OpenAITool[] = []
  const actionMap = new Map<string, { appId: string; connectionId: string }>()

  // Fetch actions for all connected apps in parallel
  const actionsPerApp = await Promise.all(
    appConnections.map(async (connection) => ({
      connection,
      actions: await getAppActions(connection.app_id),
    }))
  )

  // Score, sort, and cap actions per app to avoid overwhelming the LLM
  for (const { connection, actions } of actionsPerApp) {
    const scored = actions
      .map((action) => ({ action, score: scoreAction(action) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ACTIONS_PER_APP)

    for (const { action } of scored) {
      const tool = actionToOpenAITool(action, connection.app_id)
      tools.push(tool)

      // Store mapping for later execution (use Composio connection ID for execution)
      actionMap.set(action.name, {
        appId: connection.app_id,
        connectionId: connection.composio_connection_id ?? connection.id,
      })
    }
  }

  return {
    tools,
    actionMap,
  }
}
