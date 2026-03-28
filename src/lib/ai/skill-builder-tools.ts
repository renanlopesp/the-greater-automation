import { jsonSchema } from 'ai'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getComposio } from '@/lib/composio/client'
import type {
  WorkflowTriggerConfig,
  WorkflowActionConfig,
  WorkflowCondition,
} from '@/lib/workflows/types'
import type { Json, Database } from '@/lib/supabase/database.types'

type TriggerType = Database['public']['Enums']['trigger_type']
type StepType = Database['public']['Enums']['step_type']

// ---------------------------------------------------------------------------
// flattenTriggerConfig — sanitize LLM-generated trigger configs
// ---------------------------------------------------------------------------

/**
 * Convert camelCase to snake_case.
 * Composio's listTypes returns camelCase keys (e.g. "channelId") but
 * triggers.create expects snake_case (e.g. "channel_id").
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * Convert all keys in an object from camelCase to snake_case.
 */
function keysToSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    result[camelToSnake(key)] = val
  }
  return result
}

/**
 * LLMs frequently copy Composio's trigger config JSON schema structure instead of
 * passing flat key-value pairs. For example, the LLM sends:
 *   { type: "object", title: "ActivityPayload", properties: "{\"channelId\":\"UCxxx\"}", ... }
 * But Composio expects:
 *   { channel_id: "UCxxx" }
 *
 * This function:
 * 1. Detects schema-shaped configs and extracts the actual values
 * 2. Converts camelCase keys to snake_case (Composio API convention)
 */
function flattenTriggerConfig(
  config: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!config || Object.keys(config).length === 0) return {}

  // Detect JSON schema shape: has "type": "object" plus "properties" or "title"
  const looksLikeSchema = config.type === 'object' && ('properties' in config || 'title' in config)

  if (!looksLikeSchema) {
    // Already flat — just convert keys to snake_case
    return keysToSnakeCase(config)
  }

  // Known JSON schema metadata keys — anything matching these is NOT real config
  const schemaMetaKeys = new Set(['type', 'title', 'properties', 'required', 'description'])

  // Try to extract values from "properties"
  let properties = config.properties
  if (typeof properties === 'string') {
    try {
      properties = JSON.parse(properties)
    } catch {
      // properties is a non-JSON string — it's garbage, not real config
      // Fall through to non-schema key extraction below
      properties = undefined
    }
  }

  if (typeof properties === 'object' && properties !== null) {
    const flat: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(properties as Record<string, unknown>)) {
      // If val is a schema descriptor ({ type: "string", ... }), skip it
      if (typeof val === 'object' && val !== null && 'type' in (val as Record<string, unknown>)) {
        continue
      }
      // Otherwise it's an actual value the LLM embedded
      flat[camelToSnake(key)] = val
    }
    if (Object.keys(flat).length > 0) return flat
  }

  // Check for non-schema keys that might contain real config values
  const nonSchemaEntries: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(config)) {
    if (!schemaMetaKeys.has(key)) {
      nonSchemaEntries[camelToSnake(key)] = val
    }
  }
  if (Object.keys(nonSchemaEntries).length > 0) return nonSchemaEntries

  // All keys are schema metadata — this is garbage, return empty to trigger validation
  return {}
}

// ---------------------------------------------------------------------------
// JSON Schema definitions for tool parameters
// ---------------------------------------------------------------------------

const conditionJsonSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    field: { type: 'string', description: 'Dot-path to check in trigger data, e.g. "body.sender"' },
    operator: {
      type: 'string',
      enum: [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'matches',
        'exists',
        'not_exists',
        'gt',
        'lt',
        'gte',
        'lte',
      ],
    },
    value: {
      description: 'Value to compare against',
      oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
    },
  },
  required: ['field', 'operator'],
}

const actionJsonSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['composio_action', 'ai_transform', 'notify', 'claude_agent', 'web_scraping'],
    },
    action: { type: 'string', description: 'Composio action ID like SLACK_SEND_MESSAGE' },
    app_id: { type: 'string', description: 'App ID like slack' },
    url: { type: 'string', description: 'URL to scrape (for web_scraping type)' },
    scraping_action: {
      type: 'string',
      enum: ['scrape', 'map', 'search'],
      description:
        "Scraping action: 'scrape' (extract page), 'map' (site URLs), 'search' (search query). Default: 'scrape'",
    },
    query: { type: 'string', description: 'Search query (for web_scraping search action)' },
    params: {
      type: 'object',
      additionalProperties: { type: 'string' },
      description:
        'REQUIRED for composio_action. Map ALL required params from SNEW_LIST_APP_CAPABILITIES using {{trigger.field.path}} for webhook data, {{prev.key}} for previous action output, or literal values the user provided. NEVER leave empty for composio_action.',
    },
    prompt: { type: 'string', description: 'AI prompt with {{trigger.field}} templates' },
    output_key: { type: 'string', description: 'Key to store AI output for next action' },
    model: { type: 'string' },
    channel: { type: 'string', enum: ['internal', 'slack', 'email', 'telegram'] },
    message: { type: 'string', description: 'Notification message with templates' },
    target: { type: 'string', description: 'Channel name, email, etc.' },
    tools: {
      type: 'array',
      items: { type: 'string' },
      description: 'Composio tool names the Claude agent can use (for claude_agent type)',
    },
    timeout_ms: {
      type: 'number',
      description: 'Max execution time in ms for claude_agent (default: 300000)',
    },
    output_format: {
      type: 'string',
      enum: ['text', 'json', 'markdown', 'html'],
      description:
        "Output format: 'text'/'json' for claude_agent, 'markdown'/'html' for web_scraping",
    },
  },
  required: ['type'],
}

// ---------------------------------------------------------------------------
// Helper types for execute params
// ---------------------------------------------------------------------------

interface ConditionParam {
  field: string
  operator: string
  value?: string | number | boolean
}

interface ActionParam {
  type: 'composio_action' | 'ai_transform' | 'notify' | 'claude_agent' | 'web_scraping'
  action?: string
  app_id?: string
  params?: Record<string, string>
  prompt?: string
  output_key?: string
  model?: string
  channel?: 'internal' | 'slack' | 'email' | 'telegram'
  message?: string
  target?: string
  tools?: string[]
  timeout_ms?: number
  output_format?: 'text' | 'json' | 'markdown' | 'html'
  url?: string
  scraping_action?: 'scrape' | 'map' | 'search'
  query?: string
}

// ---------------------------------------------------------------------------
// Helper: build typed WorkflowActionConfig[] from raw params
// ---------------------------------------------------------------------------

function buildActions(raw: ActionParam[]): WorkflowActionConfig[] {
  return raw.map((a) => {
    if (a.type === 'composio_action') {
      return {
        type: 'composio_action' as const,
        action: a.action || '',
        app_id: a.app_id || '',
        params: a.params || {},
      }
    } else if (a.type === 'ai_transform') {
      return {
        type: 'ai_transform' as const,
        prompt: a.prompt || '',
        output_key: a.output_key || 'result',
        model: a.model,
      }
    } else if (a.type === 'claude_agent') {
      const fmt =
        a.output_format === 'text' || a.output_format === 'json' ? a.output_format : undefined
      return {
        type: 'claude_agent' as const,
        prompt: a.prompt || '',
        output_key: a.output_key || 'analysis',
        tools: a.tools,
        model: a.model,
        timeout_ms: a.timeout_ms,
        output_format: fmt,
      }
    } else if (a.type === 'web_scraping') {
      const fmt =
        a.output_format === 'markdown' || a.output_format === 'html'
          ? a.output_format
          : ('markdown' as const)
      return {
        type: 'web_scraping' as const,
        url: a.url || '',
        scraping_action: a.scraping_action || 'scrape',
        output_format: fmt,
        query: a.query,
      }
    } else {
      return {
        type: 'notify' as const,
        channel: (a.channel || 'internal') as 'internal' | 'slack' | 'email' | 'telegram',
        message: a.message || '',
        target: a.target,
      }
    }
  })
}

// ---------------------------------------------------------------------------
// buildSkillBuilderTools — plain tool objects with jsonSchema() for Zod v4
// compatibility. zodSchema() does not work with Zod v4.
// ---------------------------------------------------------------------------

export function buildSkillBuilderTools(
  agentId: string,
  userId: string,
  teamId: string,
  toolMode: 'full' | 'chat' = 'full'
) {
  const allTools = {
    SNEW_LIST_APP_CAPABILITIES: {
      description:
        'List available Composio actions AND triggers for an app (e.g. github, slack, discord). ALWAYS call this before creating a workflow with composio_action to get the correct action names and required parameters. Never guess action names. Triggers are events the app can listen for (e.g. new message, new issue).',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          app_id: {
            type: 'string',
            description:
              'The app ID to list capabilities for (e.g. "github", "slack", "discord", "notion")',
          },
        },
        required: ['app_id'],
      }),
      execute: async (params: { app_id: string }) => {
        try {
          const composio = getComposio()

          // Query both tools (actions) and trigger types in parallel
          const [tools, triggerTypesResult] = await Promise.all([
            composio.tools.getRawComposioTools({ toolkits: [params.app_id], limit: 500 }),
            composio.triggers.listTypes({ toolkits: [params.app_id] }).catch(() => ({ items: [] })),
          ])

          const actions = tools
            .filter((t: { isDeprecated?: boolean }) => !t.isDeprecated)
            .map(
              (t: {
                slug: string
                name: string
                description?: string
                version?: string
                inputParameters?: {
                  properties?: Record<string, { type?: string; description?: string }>
                  required?: string[]
                }
              }) => ({
                action_name: t.slug,
                display_name: t.name,
                description: t.description?.slice(0, 120) || '',
                version: t.version,
                required_params: t.inputParameters?.required || [],
                params: Object.entries(t.inputParameters?.properties || {}).map(([key, prop]) => ({
                  key,
                  type: prop.type || 'string',
                  description: prop.description?.slice(0, 80) || '',
                })),
              })
            )

          const triggerItems = triggerTypesResult?.items || []
          const triggers = triggerItems.map(
            (t: {
              slug: string
              name: string
              description?: string
              config?: Record<string, unknown>
              payload?: Record<string, unknown>
            }) => {
              // Build sample payload with dot-paths so the AI knows the exact template paths
              // e.g. { "activity.snippet.title": "string", "activity.contentDetails.upload.videoId": "string" }
              const flattenPayload = (
                obj: Record<string, unknown>,
                prefix = ''
              ): Record<string, string> => {
                const result: Record<string, string> = {}
                let count = 0
                for (const [key, val] of Object.entries(obj)) {
                  if (count >= 30) break // cap total fields
                  const path = prefix ? `${prefix}.${key}` : key
                  if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                    const nested = flattenPayload(val as Record<string, unknown>, path)
                    for (const [nk, nv] of Object.entries(nested)) {
                      if (count >= 30) break
                      result[nk] = nv
                      count++
                    }
                  } else {
                    result[path] = Array.isArray(val)
                      ? 'array'
                      : typeof val === 'string'
                        ? val.slice(0, 40)
                        : String(val ?? 'unknown')
                    count++
                  }
                }
                return result
              }
              const samplePayload = t.payload ? flattenPayload(t.payload) : null

              // Build config details — extract simple key/type/description for LLM, NOT the raw JSON schema
              const configDetails = t.config
                ? Object.entries(t.config).map(([key, val]) => {
                    const schema =
                      typeof val === 'object' && val !== null
                        ? (val as Record<string, unknown>)
                        : {}
                    return {
                      key,
                      type: (schema.type as string) || 'string',
                      description: (schema.description as string) || '',
                      required: true,
                    }
                  })
                : []

              const configKeys = configDetails.map((c) => c.key)
              // Build an example showing the EXACT format: { key1: "user_value", key2: "user_value" }
              const exampleConfig =
                configKeys.length > 0
                  ? `{ ${configKeys.map((k) => `${k}: "<user_provided_value>"`).join(', ')} }`
                  : '{}'

              return {
                trigger_name: t.slug,
                display_name: t.name,
                description: t.description?.slice(0, 120) || '',
                config_params: configKeys,
                config_details: configDetails,
                payload_fields: samplePayload ? Object.keys(samplePayload) : [],
                sample_payload: samplePayload,
                _trigger_hint:
                  configKeys.length > 0
                    ? `Use trigger_slug '${t.slug}' with trigger_app_id '${params.app_id}' in SNEW_CREATE_WORKFLOW with trigger.type='app_event'. REQUIRED: You MUST pass trigger_config as a FLAT object with user-provided values like: ${exampleConfig}. Do NOT copy the schema — just pass the key-value pairs. NEVER leave trigger_config empty when config_params exist. For action params, use {{trigger.<path>}} where <path> is an EXACT dot-path from sample_payload.`
                    : `Use trigger_slug '${t.slug}' with trigger_app_id '${params.app_id}' in SNEW_CREATE_WORKFLOW with trigger.type='app_event'. Use the sample_payload keys as template paths: {{trigger.<path>}} where <path> is the EXACT dot-path from sample_payload. NEVER guess field paths — only use paths shown in sample_payload.`,
              }
            }
          )

          return {
            app_id: params.app_id,
            actions_count: actions.length,
            actions,
            triggers_count: triggers.length,
            triggers,
            _hint:
              'Use action names from "actions" for composio_action steps. Use trigger names from "triggers" for event-driven workflows (Composio polls for events automatically). You MUST populate the params object with ALL required_params. Use {{trigger.<exact_path>}} where <exact_path> is a dot-path from the trigger\'s sample_payload (e.g., {{trigger.activity.snippet.title}}). NEVER invent paths like {{trigger.data.X}} — always use the exact paths shown in sample_payload. Use {{prev.key}} for previous action output, or ask the user for values you cannot derive.',
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list capabilities',
          }
        }
      },
    },

    SNEW_CREATE_WORKFLOW: {
      description:
        "Create a new executable workflow for this agent. Use this when the user wants to set up an automation rule (WHEN trigger, IF conditions, THEN actions). CRITICAL RULES: 1) Before using composio_action, ALWAYS call SNEW_LIST_APP_CAPABILITIES first. 2) For EVERY composio_action, the params object MUST map ALL required parameters using {{trigger.field}} templates or {{prev.key}} references. NEVER leave params empty. 3) NEVER hardcode context-dependent values (repo names, channel names, etc.) — ask the user if you don't know them. 4) Only use action slugs returned by SNEW_LIST_APP_CAPABILITIES — invented slugs will be rejected.",
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Short, descriptive name for the workflow' },
          description: { type: 'string', description: 'What this workflow does' },
          trigger: {
            type: 'object',
            description: 'When should this workflow run?',
            properties: {
              type: {
                type: 'string',
                enum: ['manual', 'chat_command', 'webhook', 'scheduled', 'app_event'],
              },
              command: { type: 'string', description: 'For chat_command triggers' },
              cron_expression: {
                type: 'string',
                description: 'For scheduled triggers, e.g. "0 9 * * 1-5"',
              },
              timezone: { type: 'string' },
              trigger_slug: {
                type: 'string',
                description:
                  'Composio trigger slug (e.g., GITHUB_PULL_REQUEST_OPENED) — required for app_event triggers',
              },
              trigger_app_id: {
                type: 'string',
                description:
                  'App ID for the trigger (e.g., github) — required for app_event triggers',
              },
              trigger_config: {
                type: 'object',
                additionalProperties: true,
                description:
                  'App-specific trigger config — a FLAT key-value object, NOT a JSON schema. REQUIRED when config_params exist. Example: { "channelId": "UCxxxx" } for YouTube. Just pass the param name and the user-provided value. Do NOT include type/title/required/properties schema fields.',
              },
              filters: {
                type: 'array',
                description:
                  'Event filters — only run when ALL conditions match the event data. Each filter checks a field in the event payload.',
                items: conditionJsonSchema,
              },
              field_mappings: {
                type: 'object',
                additionalProperties: { type: 'string' },
                description:
                  'Map event fields to workflow variables. Key = variable name, Value = dot-path in event data (e.g., {"pr_title": "data.pull_request.title"})',
              },
            },
            required: ['type'],
          },
          conditions: {
            type: 'array',
            description: 'Conditions that must all be true for actions to run',
            items: conditionJsonSchema,
          },
          actions: {
            type: 'array',
            description: 'Actions to execute in order',
            items: actionJsonSchema,
            minItems: 1,
          },
          execution_mode: {
            type: 'string',
            enum: ['auto', 'confirm', 'draft'],
            description:
              'Execution mode: auto (run immediately), confirm (ask first), draft (save only)',
          },
        },
        required: ['name', 'trigger', 'actions'],
      }),
      execute: async (params: {
        name: string
        description?: string
        trigger: {
          type: string
          command?: string
          cron_expression?: string
          timezone?: string
          trigger_slug?: string
          trigger_app_id?: string
          trigger_config?: Record<string, unknown>
          filters?: Array<{ field: string; operator: string; value?: unknown }>
          field_mappings?: Record<string, string>
        }
        conditions?: ConditionParam[]
        actions: ActionParam[]
        execution_mode?: string
      }) => {
        // Sanitize trigger_config: LLMs often pass JSON schema structure instead of flat values
        if (params.trigger.trigger_config) {
          params.trigger.trigger_config = flattenTriggerConfig(params.trigger.trigger_config)
        }

        // Validate: app_event triggers MUST have trigger_config with actual values
        if (params.trigger.type === 'app_event') {
          const tc = params.trigger.trigger_config
          if (!tc || Object.keys(tc).length === 0) {
            // Try to fetch required config fields from Composio for a helpful error
            let requiredFields = 'the required config fields'
            try {
              const { listTriggers } = await import('@/lib/composio/triggers')
              const triggers = await listTriggers(params.trigger.trigger_app_id || '')
              const match = triggers.find((t) => t.trigger_name === params.trigger.trigger_slug)
              if (match && match.config_params) {
                // config_params is a JSON schema — extract field names from properties
                const schema = match.config_params as Record<string, unknown>
                const props = schema.properties as Record<string, unknown> | undefined
                if (props && typeof props === 'object') {
                  const keys = Object.keys(props)
                  requiredFields = keys.map((k) => camelToSnake(k)).join(', ')
                } else {
                  // Fallback: use top-level keys minus JSON schema metadata
                  const schemaKeys = new Set([
                    'type',
                    'title',
                    'properties',
                    'required',
                    'description',
                  ])
                  const keys = Object.keys(schema).filter((k) => !schemaKeys.has(k))
                  if (keys.length > 0) {
                    requiredFields = keys.map((k) => camelToSnake(k)).join(', ')
                  }
                }
              }
            } catch {
              // Ignore — use generic message
            }
            return {
              success: false,
              error: `app_event triggers REQUIRE trigger_config with actual values. You are missing: ${requiredFields}. Pass trigger_config as a flat object like { "channel_id": "UCxxxx" } — do NOT use filters for config params. Each trigger subscription monitors ONE channel/repo/resource, so create separate workflows per channel.`,
            }
          }
        }

        // Validate composio_action params are not empty
        const emptyParamActions = params.actions.filter(
          (a) => a.type === 'composio_action' && (!a.params || Object.keys(a.params).length === 0)
        )
        if (emptyParamActions.length > 0) {
          const actionNames = emptyParamActions.map((a) => a.action).join(', ')
          return {
            success: false,
            error: `composio_action(s) [${actionNames}] have empty params. You MUST map all required parameters using {{trigger.field}} templates or {{prev.key}} references. Call SNEW_LIST_APP_CAPABILITIES to see required params for each action, then retry with fully mapped params.`,
          }
        }

        // Validate that all composio_action slugs actually exist in Composio
        const composioActions = params.actions.filter((a) => a.type === 'composio_action')
        if (composioActions.length > 0) {
          const composio = getComposio()
          const appIds = [
            ...new Set(
              composioActions.map((a) => a.app_id).filter((id): id is string => Boolean(id))
            ),
          ]
          const allSlugs = new Set<string>()

          for (const appId of appIds) {
            try {
              const tools = await composio.tools.getRawComposioTools({
                toolkits: [appId],
                limit: 500,
              })
              for (const t of tools) {
                allSlugs.add((t as { slug: string }).slug)
              }
            } catch {
              // If we can't fetch tools for an app, skip validation for that app
            }
          }

          if (allSlugs.size > 0) {
            const invalidActions = composioActions.filter(
              (a) => a.action && !allSlugs.has(a.action)
            )
            if (invalidActions.length > 0) {
              return {
                success: false,
                error: `Action(s) not found in Composio: ${invalidActions.map((a) => a.action).join(', ')}. Call SNEW_LIST_APP_CAPABILITIES to see real action names.`,
              }
            }
          }
        }

        const supabase = await createServerClient()

        // 1. Create the workflow
        const { data: workflow, error: wfError } = await supabase
          .from('workflows')
          .insert({
            team_id: teamId,
            name: params.name,
            emoji: '⚡',
            description: params.description || `Skill: ${params.name}`,
            status: 'published',
            created_by: userId,
          })
          .select('id')
          .single()

        if (wfError || !workflow) {
          return { success: false, error: `Failed to create workflow: ${wfError?.message}` }
        }

        // 2. Create the workflow trigger
        const webhookToken = crypto.randomUUID()
        const webhookSecret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`
        let triggerType: TriggerType = params.trigger.type as TriggerType
        let triggerConfig: Record<string, unknown>

        if (params.trigger.type === 'webhook') {
          triggerType = 'webhook'
          triggerConfig = {
            url: '',
            method: 'POST',
            response_status: 200,
            webhook_token: webhookToken,
            secret: webhookSecret,
            response_mode: 'final',
          }
        } else if (params.trigger.type === 'scheduled') {
          triggerType = 'scheduled'
          triggerConfig = {
            schedule_type: 'cron',
            cron_expression: params.trigger.cron_expression || '0 9 * * *',
            timezone: params.trigger.timezone || 'America/Sao_Paulo',
          }
        } else if (params.trigger.type === 'app_event') {
          triggerType = 'app'
          triggerConfig = {
            app_id: params.trigger.trigger_app_id || '',
            event: params.trigger.trigger_slug || '',
            filters: {},
            trigger_config: params.trigger.trigger_config || {},
          }
        } else {
          triggerType = 'manual'
          triggerConfig = { run_inputs: [] }
        }

        await supabase.from('workflow_triggers').insert({
          workflow_id: workflow.id,
          type: triggerType,
          config: triggerConfig as unknown as Json,
        })

        // 3. Create workflow steps from actions
        for (let i = 0; i < params.actions.length; i++) {
          const action = params.actions[i]
          let stepType: StepType
          let stepName: string
          let stepConfig: Record<string, unknown>

          if (action.type === 'composio_action') {
            stepType = 'app'
            stepName = action.action || 'App Action'
            stepConfig = {
              app_id: action.app_id || '',
              action: action.action || '',
              inputs: action.params || {},
            }
          } else if (action.type === 'ai_transform') {
            stepType = 'ai'
            stepName = `AI: ${action.output_key || 'transform'}`
            stepConfig = {
              ai_action: 'transform',
              prompt_template: action.prompt || '',
              output_format: 'text',
              temperature: 0.3,
              max_tokens: 500,
            }
          } else if (action.type === 'web_scraping') {
            stepType = 'web_scraping'
            stepName = `Scrape: ${action.url ? new URL(action.url).hostname : 'URL'}`
            stepConfig = {
              action: action.scraping_action || 'scrape',
              url: action.url || '',
              output_format: action.output_format || 'markdown',
              only_main_content: true,
              ...(action.query ? { query: action.query } : {}),
            }
          } else {
            // notify → utility step (send_telegram when channel is telegram, format otherwise)
            stepType = 'utility'
            if (action.channel === 'telegram') {
              stepName = 'Send Telegram Alert'
              stepConfig = {
                utility_type: 'send_telegram',
                telegram_template: action.message || '{{prev.output}}',
                telegram_parse_mode: 'Markdown',
              }
            } else {
              stepName = `Notify: ${action.channel || 'internal'}`
              stepConfig = {
                utility_type: 'format',
                format_template: action.message || '',
              }
            }
          }

          await supabase.from('workflow_steps').insert({
            workflow_id: workflow.id,
            position: i,
            type: stepType,
            name: stepName,
            config: stepConfig as unknown as Json,
          })
        }

        // 4. Create the skill linked to the workflow
        // Also store trigger_config/actions for backward compat with sidebar display
        const skillTriggerConfig: WorkflowTriggerConfig =
          params.trigger.type === 'webhook'
            ? { type: 'webhook', webhook_token: webhookToken, webhook_secret: webhookSecret }
            : params.trigger.type === 'scheduled'
              ? {
                  type: 'scheduled',
                  cron_expression: params.trigger.cron_expression || '0 9 * * *',
                  timezone: params.trigger.timezone,
                }
              : params.trigger.type === 'chat_command'
                ? { type: 'chat_command', command: params.trigger.command || params.name }
                : params.trigger.type === 'app_event'
                  ? {
                      type: 'app_event' as const,
                      trigger_slug: params.trigger.trigger_slug || '',
                      app_id: params.trigger.trigger_app_id || '',
                      trigger_config: params.trigger.trigger_config,
                    }
                  : { type: 'manual' }

        const actions = buildActions(params.actions)
        const executionMode = params.execution_mode || 'auto'

        const { data: skill, error } = await supabase
          .from('agent_workflows')
          .insert({
            agent_id: agentId,
            name: params.name,
            description: params.description || null,
            source: 'rule',
            workflow_id: workflow.id,
            trigger_config: skillTriggerConfig as unknown as Json,
            conditions: (params.conditions || []) as unknown as Json,
            actions: actions as unknown as Json,
            execution_mode: executionMode,
            is_enabled: true,
          })
          .select('id, name')
          .single()

        if (error) return { success: false, error: error.message }

        // After inserting the agent_workflow (skill), if trigger is app_event, create trigger subscription
        if (
          params.trigger.type === 'app_event' &&
          params.trigger.trigger_slug &&
          params.trigger.trigger_app_id
        ) {
          try {
            // Check subscription limit before creating
            const { count: subCount } = await supabase
              .from('trigger_subscriptions')
              .select('id', { count: 'exact', head: true })
              .eq('agent_id', agentId)
              .eq('is_enabled', true)

            if (subCount !== null && subCount >= 50) {
              return {
                success: false,
                error:
                  'Trigger subscription limit reached (50 per agent). Disable or delete existing subscriptions first.',
              }
            }

            const { createTrigger } = await import('@/lib/composio/triggers')

            // Get connected account for this user+app
            const composio = getComposio()
            const { items: accounts } = await composio.connectedAccounts.list({ userIds: [userId] })
            const appAccount = accounts.find(
              (acc: { toolkit?: { slug?: string }; status: string }) =>
                acc.toolkit?.slug === params.trigger.trigger_app_id && acc.status === 'ACTIVE'
            )

            if (!appAccount) {
              return {
                success: false,
                error: `No active connection found for ${params.trigger.trigger_app_id}. Please connect the app in Settings first.`,
              }
            }

            // Create Composio trigger subscription
            const composioTriggerId = await createTrigger({
              userId,
              triggerSlug: params.trigger.trigger_slug,
              connectedAccountId: appAccount.id,
              triggerConfig: params.trigger.trigger_config || {},
            })

            // Insert trigger_subscriptions row
            await supabase.from('trigger_subscriptions').insert({
              agent_workflow_id: skill.id,
              agent_id: agentId,
              user_id: userId,
              composio_trigger_id: composioTriggerId,
              trigger_slug: params.trigger.trigger_slug,
              app_id: params.trigger.trigger_app_id,
              trigger_config: (params.trigger.trigger_config || {}) as unknown as Json,
              filters: (params.trigger.filters || []) as unknown as Json,
              field_mappings: (params.trigger.field_mappings || {}) as unknown as Json,
            })

            const result: Record<string, unknown> = {
              success: true,
              skill_id: skill.id,
              workflow_id: workflow.id,
              name: skill.name,
              trigger_subscription: {
                composio_trigger_id: composioTriggerId,
                trigger_slug: params.trigger.trigger_slug,
                app_id: params.trigger.trigger_app_id,
                status: 'active',
              },
            }

            revalidatePath(`/agents/${agentId}`)
            return result
          } catch (triggerError) {
            // Trigger subscription failed — rollback the workflow to avoid orphans
            try {
              await supabase.from('agent_workflows').delete().eq('id', skill.id)
              await supabase.from('workflow_triggers').delete().eq('workflow_id', workflow.id)
              await supabase.from('workflows').delete().eq('id', workflow.id)
            } catch {
              // Best-effort cleanup
            }
            revalidatePath(`/agents/${agentId}`)
            const errMsg = triggerError instanceof Error ? triggerError.message : 'Unknown error'
            return {
              success: false,
              error: `Trigger subscription failed: ${errMsg}. The workflow was NOT saved — fix the trigger_config and try again.`,
            }
          }
        }

        revalidatePath(`/agents/${agentId}`)

        const result: Record<string, unknown> = {
          success: true,
          skill_id: skill.id,
          workflow_id: workflow.id,
          name: skill.name,
        }
        if (params.trigger.type === 'webhook') {
          result.webhook_url = `/api/agent-workflows/webhook/${webhookToken}`
          result.webhook_secret = webhookSecret
          result.signature_header = 'X-Webhook-Signature-256'
          result.setup_instructions =
            'Configure this secret in your webhook provider to sign payloads. The endpoint verifies HMAC-SHA256 signatures via the X-Webhook-Signature-256 header (or X-Hub-Signature-256 for GitHub).'
        }
        return result
      },
    },

    SNEW_LIST_WORKFLOWS: {
      description: 'List all workflows for this agent with their current status and configuration.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {},
      }),
      execute: async () => {
        const supabase = await createServerClient()
        const { data: skills } = await supabase
          .from('agent_workflows')
          .select(
            'id, name, description, source, trigger_config, conditions, actions, is_enabled, execution_mode, last_run_at, run_count'
          )
          .eq('agent_id', agentId)
          .order('created_at', { ascending: true })
        return { skills: skills || [] }
      },
    },

    SNEW_UPDATE_WORKFLOW: {
      description:
        'Update an existing workflow configuration. Prefer this over creating a new workflow when a similar one already exists.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          skill_id: { type: 'string', description: 'The workflow ID to update' },
          name: { type: 'string' },
          description: { type: 'string' },
          is_enabled: { type: 'boolean' },
          execution_mode: { type: 'string', enum: ['auto', 'confirm', 'draft'] },
          conditions: { type: 'array', items: conditionJsonSchema },
          actions: { type: 'array', items: actionJsonSchema },
          trigger_config: {
            type: 'object',
            description:
              'Update the trigger configuration. Include type (manual, scheduled, webhook, app_event) and relevant fields (trigger_slug, trigger_app_id, trigger_config for app_event).',
            properties: {
              type: {
                type: 'string',
                enum: ['manual', 'scheduled', 'webhook', 'app_event'],
              },
              trigger_slug: { type: 'string' },
              trigger_app_id: { type: 'string' },
              trigger_config: { type: 'object', additionalProperties: true },
            },
          },
        },
        required: ['skill_id'],
      }),
      execute: async (params: {
        skill_id: string
        name?: string
        description?: string
        is_enabled?: boolean
        execution_mode?: string
        conditions?: ConditionParam[]
        actions?: ActionParam[]
        trigger_config?: {
          type?: string
          trigger_slug?: string
          trigger_app_id?: string
          trigger_config?: Record<string, unknown>
        }
      }) => {
        // Sanitize nested trigger_config: LLMs often pass JSON schema structure
        if (params.trigger_config?.trigger_config) {
          params.trigger_config.trigger_config = flattenTriggerConfig(
            params.trigger_config.trigger_config
          )
        }

        const supabase = await createServerClient()
        const update: Record<string, unknown> = {}
        if (params.name) update.name = params.name
        if (params.description) update.description = params.description
        if (params.is_enabled !== undefined) update.is_enabled = params.is_enabled
        if (params.execution_mode) update.execution_mode = params.execution_mode
        if (params.conditions) update.conditions = params.conditions
        if (params.actions) update.actions = buildActions(params.actions)
        if (params.trigger_config) update.trigger_config = params.trigger_config

        const { error } = await supabase
          .from('agent_workflows')
          .update(update)
          .eq('id', params.skill_id)
          .eq('agent_id', agentId)
        if (error) return { success: false, error: error.message }

        // Fetch the linked workflow_id for syncing to workflow tables
        const { data: agentWorkflow } = await supabase
          .from('agent_workflows')
          .select('workflow_id')
          .eq('id', params.skill_id)
          .single()

        if (agentWorkflow?.workflow_id) {
          // Sync name/description to the workflows table
          if (params.name || params.description) {
            const wfUpdate: Record<string, unknown> = {}
            if (params.name) wfUpdate.name = params.name
            if (params.description) wfUpdate.description = params.description
            await supabase.from('workflows').update(wfUpdate).eq('id', agentWorkflow.workflow_id)
          }

          // Sync actions to workflow_steps table (delete + re-create)
          if (params.actions) {
            await supabase
              .from('workflow_steps')
              .delete()
              .eq('workflow_id', agentWorkflow.workflow_id)

            for (let i = 0; i < params.actions.length; i++) {
              const action = params.actions[i]
              let stepType: StepType
              let stepName: string
              let stepConfig: Record<string, unknown>

              if (action.type === 'composio_action') {
                stepType = 'app'
                stepName = action.action || 'App Action'
                stepConfig = {
                  app_id: action.app_id || '',
                  action: action.action || '',
                  inputs: action.params || {},
                }
              } else if (action.type === 'ai_transform') {
                stepType = 'ai'
                stepName = `AI: ${action.output_key || 'transform'}`
                stepConfig = {
                  ai_action: 'transform',
                  prompt_template: action.prompt || '',
                  output_format: 'text',
                  temperature: 0.3,
                  max_tokens: 500,
                }
              } else if (action.type === 'web_scraping') {
                stepType = 'web_scraping'
                stepName = `Scrape: ${action.url ? new URL(action.url).hostname : 'URL'}`
                stepConfig = {
                  action: action.scraping_action || 'scrape',
                  url: action.url || '',
                  output_format: action.output_format || 'markdown',
                  only_main_content: true,
                  ...(action.query ? { query: action.query } : {}),
                }
              } else {
                // notify → utility step (send_telegram when channel is telegram, format otherwise)
                stepType = 'utility'
                if (action.channel === 'telegram') {
                  stepName = 'Send Telegram Alert'
                  stepConfig = {
                    utility_type: 'send_telegram',
                    telegram_template: action.message || '{{prev.output}}',
                    telegram_parse_mode: 'Markdown',
                  }
                } else {
                  stepName = `Notify: ${action.channel || 'internal'}`
                  stepConfig = {
                    utility_type: 'format',
                    format_template: action.message || '',
                  }
                }
              }

              await supabase.from('workflow_steps').insert({
                workflow_id: agentWorkflow.workflow_id,
                position: i,
                type: stepType,
                name: stepName,
                config: stepConfig as unknown as Json,
              })
            }
          }

          // Sync trigger_config to workflow_triggers table
          if (params.trigger_config) {
            let triggerType: TriggerType = 'manual'
            let triggerConfig: Record<string, unknown> = {}

            if (params.trigger_config.type === 'app_event') {
              triggerType = 'app'
              triggerConfig = {
                app_id: params.trigger_config.trigger_app_id || '',
                event: params.trigger_config.trigger_slug || '',
                filters: {},
                trigger_config: params.trigger_config.trigger_config || {},
              }
            } else if (params.trigger_config.type === 'webhook') {
              triggerType = 'webhook'
            } else if (params.trigger_config.type === 'scheduled') {
              triggerType = 'scheduled'
            }

            await supabase
              .from('workflow_triggers')
              .update({ type: triggerType, config: triggerConfig as unknown as Json })
              .eq('workflow_id', agentWorkflow.workflow_id)
          }
        }

        revalidatePath(`/agents/${agentId}`)
        return { success: true }
      },
    },

    SNEW_DELETE_WORKFLOW: {
      description: 'Delete a workflow permanently.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          skill_id: { type: 'string', description: 'The workflow ID to delete' },
        },
        required: ['skill_id'],
      }),
      execute: async (params: { skill_id: string }) => {
        const supabase = await createServerClient()

        // 1. Load the agent_workflow to get the linked workflow_id
        const { data: skill } = await supabase
          .from('agent_workflows')
          .select('id, workflow_id')
          .eq('id', params.skill_id)
          .eq('agent_id', agentId)
          .single()
        if (!skill) return { success: false, error: 'Workflow not found' }

        // 2. Delete Composio trigger subscription if one exists
        const { data: subscriptions } = await supabase
          .from('trigger_subscriptions')
          .select('id, composio_trigger_id')
          .eq('agent_workflow_id', skill.id)
        if (subscriptions && subscriptions.length > 0) {
          const { deleteTrigger } = await import('@/lib/composio/triggers')
          for (const sub of subscriptions) {
            if (sub.composio_trigger_id) {
              try {
                await deleteTrigger(sub.composio_trigger_id)
              } catch {
                // Best-effort — Composio trigger may already be gone
              }
            }
          }
          await supabase.from('trigger_subscriptions').delete().eq('agent_workflow_id', skill.id)
        }

        // 3. Delete DB records: agent_workflows, workflow_triggers, workflows
        await supabase.from('agent_workflows').delete().eq('id', skill.id)
        if (skill.workflow_id) {
          await supabase.from('workflow_triggers').delete().eq('workflow_id', skill.workflow_id)
          await supabase.from('workflows').delete().eq('id', skill.workflow_id)
        }

        revalidatePath(`/agents/${agentId}`)
        return { success: true }
      },
    },

    SNEW_TEST_WORKFLOW: {
      description: 'Dry-run a workflow with sample trigger data to verify it works correctly.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          skill_id: { type: 'string', description: 'The workflow ID to test' },
          sample_data: {
            type: 'object',
            description: 'Sample trigger data to test with',
            additionalProperties: true,
          },
        },
        required: ['skill_id', 'sample_data'],
      }),
      execute: async (params: { skill_id: string; sample_data: Record<string, unknown> }) => {
        const supabase = await createServerClient()
        const { data: skill } = await supabase
          .from('agent_workflows')
          .select(
            'id, name, description, agent_id, source, actions, trigger_config, conditions, action_template, workflow_id, is_enabled, execution_mode, run_count, last_run_at, created_at, updated_at'
          )
          .eq('id', params.skill_id)
          .eq('agent_id', agentId)
          .single()

        if (!skill) return { success: false, error: 'Skill not found' }

        const { evaluateConditions } = await import('@/lib/workflows/condition-engine')
        const conditions = (skill.conditions || []) as unknown as WorkflowCondition[]
        const result = evaluateConditions(conditions, params.sample_data)

        return {
          success: true,
          dry_run: true,
          conditions_passed: result.passed,
          condition_results: result.results,
          actions_count: ((skill.actions || []) as unknown[]).length,
          note: result.passed
            ? 'Conditions passed! In a real run, actions would execute.'
            : 'Conditions did not pass. Actions would be skipped.',
        }
      },
    },

    SNEW_CHECK_CONNECTIONS: {
      description:
        'Check which apps are connected for this agent, including auth type (OAuth, Bot, API Key). Returns both your own connections and team connections from owners/admins. Use this to verify required integrations are set up and have the right auth type before creating a workflow. Important: some actions/triggers require specific auth types (e.g. Discord channel polling needs a Bot token, not OAuth).',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {},
      }),
      execute: async () => {
        try {
          const supabase = await createServerClient()

          // Get all available connections for this agent (own + team owner/admin)
          const { data: rpcConnections } = await supabase.rpc('get_agent_available_connections', {
            p_agent_id: agentId,
            p_user_id: userId,
          })

          const rpcRows = (rpcConnections ?? []) as Array<{
            app_id: string
            account_label: string | null
            connection_user_id: string
            is_own_connection: boolean
          }>

          // Try to enrich own connections with Composio auth details
          const composioDetails: Record<string, { auth_type: string; scopes: string | null }> = {}
          try {
            const composio = getComposio()
            const { items } = await composio.connectedAccounts.list({ userIds: [userId] })
            for (const acc of items.filter((a: { status: string }) => a.status === 'ACTIVE')) {
              const typed = acc as {
                toolkit?: { slug?: string }
                state?: { authScheme?: string }
                data?: { scope?: string }
              }
              const appId = typed.toolkit?.slug || 'unknown'
              composioDetails[appId] = {
                auth_type: typed.state?.authScheme || 'unknown',
                scopes: typed.data?.scope || null,
              }
            }
          } catch {
            // Composio enrichment is optional
          }

          const connectedApps = rpcRows.map((row) => ({
            app_id: row.app_id,
            account_label: row.account_label,
            is_own_connection: row.is_own_connection,
            auth_type:
              composioDetails[row.app_id]?.auth_type ||
              (row.is_own_connection ? 'unknown' : 'managed_by_team'),
            scopes: composioDetails[row.app_id]?.scopes || null,
          }))

          // Check for Telegram via SnewClaw (messaging_links) — not a Composio connection
          // but available for workflow "notify" steps with channel: "telegram".
          // Search by team_id so we find the team owner's link (not just the current user's).
          const { data: messagingLink } = await supabase
            .from('messaging_links')
            .select('id')
            .eq('team_id', teamId)
            .eq('channel_type', 'telegram')
            .eq('is_verified', true)
            .limit(1)
            .maybeSingle()
          if (messagingLink) {
            connectedApps.push({
              app_id: 'telegram',
              account_label: 'Telegram (via messaging)',
              is_own_connection: true,
              auth_type: 'bot_token',
              scopes: null,
            })
          }

          return {
            connected_apps: connectedApps,
            _hint:
              'Apps with is_own_connection=true are yours. Apps with is_own_connection=false are connected by a team owner/admin and available to this agent. Check auth_type before creating workflows. Telegram via messaging is available for workflow "notify" steps — no Composio connection needed.',
          }
        } catch {
          // Fallback to local DB — own connections only
          const supabase = await createServerClient()
          const { data: connections } = await supabase
            .from('app_connections')
            .select('app_id, account_label')
            .eq('user_id', userId)
          return {
            connected_apps: (connections || []).map((c) => ({ ...c, is_own_connection: true })),
          }
        }
      },
    },

    SNEW_CREATE_SKILL: {
      description:
        'Create a new knowledge or procedure skill for this agent. Skills are embedded instructions/knowledge that influence how the agent behaves in conversations. Use this when the user teaches you something to remember or wants to add a capability.\n\n' +
        'For knowledge skills (type: "knowledge"), use this template:\n' +
        '## Description\n' +
        '[When this skill applies]\n' +
        '## Instructions\n' +
        '[Step-by-step guidance]\n' +
        '## Examples\n' +
        '[Input/output pairs]\n' +
        '## Constraints\n' +
        '[Rules and limitations]\n\n' +
        'For procedure skills (type: "procedure"), use this template:\n' +
        '## Description\n' +
        '[What this procedure does]\n' +
        '## Parameters\n' +
        '[List input parameters]\n' +
        '## Steps\n' +
        '1. [Action step with {{param.name}} variables]\n' +
        '2. [Next step, can reference {{prev.field}}]\n' +
        '## Error Handling\n' +
        '[What to do if steps fail]',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Short name for the skill (e.g. "Portuguese Greeting", "Deploy Process")',
          },
          description: { type: 'string', description: 'Brief description of what this skill does' },
          content: {
            type: 'string',
            description:
              'The full instruction/knowledge text. This will be injected into your system prompt when chatting.',
          },
          type: {
            type: 'string',
            enum: ['knowledge', 'procedure'],
            description: 'Type of skill: knowledge (instructions) or procedure (executable steps)',
          },
          parameters: {
            type: 'array',
            description:
              'Parameter definitions for procedure skills. Each parameter should have: name, type, required, description, and optional default.',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                required: { type: 'boolean' },
                description: { type: 'string' },
                default: { type: 'string' },
              },
              required: ['name', 'type', 'required', 'description'],
            },
          },
        },
        required: ['name', 'content'],
      }),
      execute: async (params: {
        name: string
        description?: string
        content: string
        type?: 'knowledge' | 'procedure'
        parameters?: Array<{
          name: string
          type: string
          required: boolean
          description: string
          default?: string
        }>
      }) => {
        const skillType = params.type || 'knowledge'

        // Validate procedure skills have parameters
        if (skillType === 'procedure' && (!params.parameters || params.parameters.length === 0)) {
          return {
            error:
              'Procedure skills must have at least one parameter defined. Please provide the parameters array with name, type, required, and description for each parameter.',
          }
        }

        // Validate parameter structure for procedure skills
        if (skillType === 'procedure' && params.parameters) {
          for (const param of params.parameters) {
            if (!param.name || !param.type || param.required === undefined || !param.description) {
              return {
                error: `Invalid parameter structure. Each parameter must have: name (string), type (string), required (boolean), description (string), and optional default (string).`,
              }
            }
          }
        }

        const supabase = await createServerClient()
        const { data, error } = await supabase
          .from('agent_skills')
          .insert({
            agent_id: agentId,
            name: params.name,
            description: params.description ?? null,
            content: params.content,
            type: skillType,
            parameters: params.parameters ? (params.parameters as unknown as Json) : null,
            version: 1,
            metadata: {},
            source: 'chat',
          })
          .select('id, name, type, version')
          .single()

        if (error) {
          if (error.code === '23505') return { error: 'A skill with this name already exists' }
          return { error: error.message }
        }

        revalidatePath(`/agents/${agentId}`)
        return {
          success: true,
          skill_id: data.id,
          name: data.name,
          type: data.type,
          version: data.version,
          message: `${data.type === 'procedure' ? 'Procedure' : 'Knowledge'} skill "${data.name}" created (v${data.version}). It will now influence your behavior in future conversations.`,
        }
      },
    },

    SNEW_LIST_SKILLS: {
      description: 'List all knowledge skills for this agent.',
      inputSchema: jsonSchema({ type: 'object', properties: {} }),
      execute: async () => {
        const supabase = await createServerClient()
        const { data } = await supabase
          .from('agent_skills')
          .select('id, name, description, content, is_enabled, source, type, version')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: true })

        return { skills: data ?? [] }
      },
    },

    SNEW_UPDATE_SKILL: {
      description:
        'Update an existing knowledge or procedure skill. Auto-increments version when content or parameters change.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          skill_id: { type: 'string', description: 'The ID of the skill to update' },
          name: { type: 'string', description: 'New name for the skill' },
          description: { type: 'string', description: 'New description' },
          content: { type: 'string', description: 'New content/instructions' },
          parameters: {
            type: 'array',
            description: 'New parameter definitions for procedure skills',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                required: { type: 'boolean' },
                description: { type: 'string' },
                default: { type: 'string' },
              },
              required: ['name', 'type', 'required', 'description'],
            },
          },
        },
        required: ['skill_id'],
      }),
      execute: async (params: {
        skill_id: string
        name?: string
        description?: string
        content?: string
        parameters?: Array<{
          name: string
          type: string
          required: boolean
          description: string
          default?: string
        }>
      }) => {
        const supabase = await createServerClient()

        // First, fetch the current skill to get the version
        const { data: currentSkill, error: fetchError } = await supabase
          .from('agent_skills')
          .select('version, type, content, parameters')
          .eq('id', params.skill_id)
          .eq('agent_id', agentId)
          .single()

        if (fetchError || !currentSkill) {
          return { error: 'Skill not found' }
        }

        const updates: Record<string, unknown> = {}
        if (params.name !== undefined) updates.name = params.name
        if (params.description !== undefined) updates.description = params.description
        if (params.content !== undefined) updates.content = params.content
        if (params.parameters !== undefined)
          updates.parameters = params.parameters as unknown as Json

        // Auto-increment version if content or parameters changed
        const shouldIncrementVersion =
          params.content !== undefined || params.parameters !== undefined
        if (shouldIncrementVersion) {
          updates.version = (currentSkill.version || 1) + 1
        }

        const { data, error } = await supabase
          .from('agent_skills')
          .update(updates)
          .eq('id', params.skill_id)
          .eq('agent_id', agentId)
          .select('id, name, version')
          .single()

        if (error) return { error: error.message }

        revalidatePath(`/agents/${agentId}`)
        return {
          success: true,
          skill_id: data.id,
          name: data.name,
          version: data.version,
          message: `Skill "${data.name}" updated to v${data.version}`,
        }
      },
    },

    SNEW_GET_SKILL_CONTENT: {
      description:
        'Load the full content of a skill by ID or name. Use this when you need detailed instructions from a skill referenced in the conversation. Supports fuzzy name matching.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          skill_id: { type: 'string', description: 'Exact skill ID' },
          name: { type: 'string', description: 'Skill name for fuzzy search (uses ILIKE)' },
        },
      }),
      execute: async (params: { skill_id?: string; name?: string }) => {
        if (!params.skill_id && !params.name) {
          return { error: 'Either skill_id or name is required' }
        }

        const supabase = await createServerClient()
        let query = supabase
          .from('agent_skills')
          .select('id, name, description, content, type, parameters, version, is_enabled')
          .eq('agent_id', agentId)

        if (params.skill_id) {
          query = query.eq('id', params.skill_id)
        } else if (params.name) {
          query = query.ilike('name', `%${params.name}%`)
        }

        const { data, error } = await query.maybeSingle()

        if (error) return { error: error.message }
        if (!data) return { error: 'Skill not found' }

        return {
          success: true,
          skill: {
            id: data.id,
            name: data.name,
            description: data.description,
            content: data.content,
            type: data.type,
            parameters: data.parameters,
            version: data.version,
            is_enabled: data.is_enabled,
          },
        }
      },
    },

    SNEW_EXECUTE_SKILL: {
      description:
        'Execute a procedure skill by resolving its parameters and returning the step-by-step action plan. Only works with procedure-type skills. Returns resolved steps for the agent to follow.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          skill_id: { type: 'string', description: 'The ID of the procedure skill to execute' },
          params: {
            type: 'object',
            description: 'Parameter values to pass to the procedure',
            additionalProperties: true,
          },
        },
        required: ['skill_id'],
      }),
      execute: async (params: { skill_id: string; params?: Record<string, unknown> }) => {
        const supabase = await createServerClient()
        const { data: skill, error } = await supabase
          .from('agent_skills')
          .select('id, name, type, content, parameters, is_enabled')
          .eq('id', params.skill_id)
          .eq('agent_id', agentId)
          .single()

        if (error || !skill) return { error: 'Skill not found' }
        if (!skill.is_enabled) return { error: 'Skill is disabled' }
        if (skill.type !== 'procedure') {
          return { error: 'This skill is not a procedure. Only procedure skills can be executed.' }
        }

        // Parse parameters from skill definition
        const paramDefs = (skill.parameters || []) as Array<{
          name: string
          type: string
          required: boolean
          description: string
          default?: string
        }>
        const providedParams = params.params || {}

        // Resolve parameter values
        const resolvedParams: Record<string, unknown> = {}
        for (const paramDef of paramDefs) {
          if (providedParams[paramDef.name] !== undefined) {
            resolvedParams[paramDef.name] = providedParams[paramDef.name]
          } else if (paramDef.default !== undefined) {
            resolvedParams[paramDef.name] = paramDef.default
          } else if (paramDef.required) {
            return {
              error: `Required parameter "${paramDef.name}" is missing. Description: ${paramDef.description}`,
            }
          }
        }

        // Parse steps from content (look for ## Steps section)
        const stepsMatch = skill.content.match(/## Steps\s*\n([\s\S]*?)(?=\n##|$)/i)
        if (!stepsMatch) {
          return { error: 'No steps found in procedure content. Add a "## Steps" section.' }
        }

        const stepsText = stepsMatch[1].trim()
        const stepLines = stepsText.split('\n').filter((line) => /^\d+\./.test(line.trim()))

        // Resolve {{param.name}} templates in steps
        // Pre-compile regexes once before the map to avoid O(n×m) RegExp construction
        const paramRegexes = Object.entries(resolvedParams).map(([key, value]) => ({
          regex: new RegExp(`\\{\\{param\\.${key}\\}\\}`, 'g'),
          value: String(value),
        }))
        const resolvedSteps = stepLines.map((step) => {
          let resolved = step
          for (const { regex, value } of paramRegexes) {
            regex.lastIndex = 0
            resolved = resolved.replace(regex, value)
          }
          // Keep {{prev.field}} as-is for the agent to fill during execution
          return resolved
        })

        return {
          success: true,
          skill_name: skill.name,
          resolved_params: resolvedParams,
          steps: resolvedSteps,
          note: 'Follow these steps in order. {{prev.field}} placeholders should be filled with values from previous step outputs.',
        }
      },
    },

    SNEW_DELETE_SKILL: {
      description: 'Delete a knowledge skill from this agent.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          skill_id: { type: 'string', description: 'The ID of the skill to delete' },
        },
        required: ['skill_id'],
      }),
      execute: async (params: { skill_id: string }) => {
        const supabase = await createServerClient()
        const { error } = await supabase
          .from('agent_skills')
          .delete()
          .eq('id', params.skill_id)
          .eq('agent_id', agentId)

        if (error) return { error: error.message }

        revalidatePath(`/agents/${agentId}`)
        return { success: true, message: 'Skill deleted successfully' }
      },
    },
  }

  // In 'chat' mode (no Composio apps), exclude Composio-specific tools to reduce
  // token count but keep workflow tools — agents like Price Monitor need them to
  // create automations (e.g. scheduled web scraping) even without Composio apps.
  if (toolMode === 'chat') {
    const excluded = new Set(['SNEW_LIST_APP_CAPABILITIES'])
    return Object.fromEntries(Object.entries(allTools).filter(([name]) => !excluded.has(name)))
  }

  return allTools
}
