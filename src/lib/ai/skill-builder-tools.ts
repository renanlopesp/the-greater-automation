import { jsonSchema } from 'ai'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getComposio } from '@/lib/composio/client'
import type { SkillTriggerConfig, SkillActionConfig, SkillCondition } from '@/lib/skills/types'
import type { Json, Database } from '@/lib/supabase/database.types'

type TriggerType = Database['public']['Enums']['trigger_type']
type StepType = Database['public']['Enums']['step_type']

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
      enum: ['composio_action', 'ai_transform', 'notify'],
    },
    action: { type: 'string', description: 'Composio action ID like SLACK_SEND_MESSAGE' },
    app_id: { type: 'string', description: 'App ID like slack' },
    params: {
      type: 'object',
      additionalProperties: { type: 'string' },
      description:
        'REQUIRED for composio_action. Map ALL required params from SNEW_LIST_APP_CAPABILITIES using {{trigger.field.path}} for webhook data, {{prev.key}} for previous action output, or literal values the user provided. NEVER leave empty for composio_action.',
    },
    prompt: { type: 'string', description: 'AI prompt with {{trigger.field}} templates' },
    output_key: { type: 'string', description: 'Key to store AI output for next action' },
    model: { type: 'string' },
    channel: { type: 'string', enum: ['internal', 'slack', 'email'] },
    message: { type: 'string', description: 'Notification message with templates' },
    target: { type: 'string', description: 'Channel name, email, etc.' },
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
  type: 'composio_action' | 'ai_transform' | 'notify'
  action?: string
  app_id?: string
  params?: Record<string, string>
  prompt?: string
  output_key?: string
  model?: string
  channel?: 'internal' | 'slack' | 'email'
  message?: string
  target?: string
}

// ---------------------------------------------------------------------------
// Helper: build typed SkillActionConfig[] from raw params
// ---------------------------------------------------------------------------

function buildActions(raw: ActionParam[]): SkillActionConfig[] {
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
    } else {
      return {
        type: 'notify' as const,
        channel: (a.channel || 'internal') as 'internal' | 'slack' | 'email',
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

export function buildSkillBuilderTools(agentId: string, userId: string, teamId: string) {
  return {
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
            composio.tools.getRawComposioTools({ toolkits: [params.app_id], limit: 200 }),
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
            (t: { slug: string; name: string; description?: string }) => ({
              trigger_name: t.slug,
              display_name: t.name,
              description: t.description?.slice(0, 120) || '',
            })
          )

          return {
            app_id: params.app_id,
            actions_count: actions.length,
            actions,
            triggers_count: triggers.length,
            triggers,
            _hint:
              'Use action names from "actions" for composio_action steps. Use trigger names from "triggers" for event-driven workflows (Composio polls for events automatically). You MUST populate the params object with ALL required_params. Use {{trigger.field.path}} for webhook data, {{prev.key}} for previous action output, or ask the user for values you cannot derive from the trigger payload.',
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
                enum: ['manual', 'chat_command', 'webhook', 'scheduled'],
              },
              command: { type: 'string', description: 'For chat_command triggers' },
              cron_expression: {
                type: 'string',
                description: 'For scheduled triggers, e.g. "0 9 * * 1-5"',
              },
              timezone: { type: 'string' },
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
        trigger: { type: string; command?: string; cron_expression?: string; timezone?: string }
        conditions?: ConditionParam[]
        actions: ActionParam[]
        execution_mode?: string
      }) => {
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
                limit: 200,
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
          } else {
            // notify → utility with format template
            stepType = 'utility'
            stepName = `Notify: ${action.channel || 'internal'}`
            stepConfig = {
              utility_type: 'format',
              format_template: action.message || '',
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
        const skillTriggerConfig: SkillTriggerConfig =
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
                : { type: 'manual' }

        const actions = buildActions(params.actions)
        const executionMode = params.execution_mode || 'auto'

        const { data: skill, error } = await supabase
          .from('agent_skills')
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

        revalidatePath(`/agents/${agentId}`)

        const result: Record<string, unknown> = {
          success: true,
          skill_id: skill.id,
          workflow_id: workflow.id,
          name: skill.name,
        }
        if (params.trigger.type === 'webhook') {
          result.webhook_url = `/api/skills/webhook/${webhookToken}`
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
          .from('agent_skills')
          .select(
            'id, name, description, source, trigger_config, conditions, actions, is_enabled, execution_mode, last_run_at, run_count'
          )
          .eq('agent_id', agentId)
          .order('created_at', { ascending: true })
        return { skills: skills || [] }
      },
    },

    SNEW_UPDATE_WORKFLOW: {
      description: 'Update an existing workflow configuration.',
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
      }) => {
        const supabase = await createServerClient()
        const update: Record<string, unknown> = {}
        if (params.name) update.name = params.name
        if (params.description) update.description = params.description
        if (params.is_enabled !== undefined) update.is_enabled = params.is_enabled
        if (params.execution_mode) update.execution_mode = params.execution_mode
        if (params.conditions) update.conditions = params.conditions
        if (params.actions) update.actions = buildActions(params.actions)

        const { error } = await supabase
          .from('agent_skills')
          .update(update)
          .eq('id', params.skill_id)
          .eq('agent_id', agentId)
        if (error) return { success: false, error: error.message }
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
        const { error } = await supabase
          .from('agent_skills')
          .delete()
          .eq('id', params.skill_id)
          .eq('agent_id', agentId)
        if (error) return { success: false, error: error.message }
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
          .from('agent_skills')
          .select('*')
          .eq('id', params.skill_id)
          .eq('agent_id', agentId)
          .single()

        if (!skill) return { success: false, error: 'Skill not found' }

        const { evaluateConditions } = await import('@/lib/skills/condition-engine')
        const conditions = (skill.conditions || []) as unknown as SkillCondition[]
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
        'Check which apps the user has connected, including auth type (OAuth, Bot, API Key). Use this to verify required integrations are set up and have the right auth type before creating a workflow. Important: some actions/triggers require specific auth types (e.g. Discord channel polling needs a Bot token, not OAuth).',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {},
      }),
      execute: async () => {
        // Query Composio directly for real connected accounts with auth details
        try {
          const composio = getComposio()
          const { items } = await composio.connectedAccounts.list({ userIds: [userId] })
          const activeAccounts = items
            .filter((acc: { status: string }) => acc.status === 'ACTIVE')
            .map(
              (acc: {
                id: string
                toolkit?: { slug?: string }
                state?: { authScheme?: string }
                data?: { scope?: string }
              }) => ({
                app_id: acc.toolkit?.slug || 'unknown',
                connection_id: acc.id,
                auth_type: acc.state?.authScheme || 'unknown',
                scopes: acc.data?.scope || null,
              })
            )

          return {
            connected_apps: activeAccounts,
            _hint:
              'Check auth_type before creating workflows. OAuth user tokens have limited permissions (e.g. cannot read guild channel messages on Discord — need Bot token). Bot/API Key connections generally have broader access. If the auth type is wrong for your intended action, tell the user they need a different connection type.',
          }
        } catch {
          // Fallback to local DB
          const supabase = await createServerClient()
          const { data: connections } = await supabase
            .from('app_connections')
            .select('app_id, account_label')
            .eq('user_id', userId)
          return { connected_apps: connections || [] }
        }
      },
    },

    SNEW_CREATE_SKILL: {
      description:
        'Create a new knowledge skill for this agent. Skills are embedded instructions/knowledge that influence how the agent behaves in conversations. Use this when the user teaches you something to remember or wants to add a capability.',
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
        },
        required: ['name', 'content'],
      }),
      execute: async (params: { name: string; description?: string; content: string }) => {
        const supabase = await createServerClient()
        const { data, error } = await supabase
          .from('agent_knowledge_skills')
          .insert({
            agent_id: agentId,
            name: params.name,
            description: params.description ?? null,
            content: params.content,
            source: 'chat',
          })
          .select('id, name')
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
          message: `Skill "${data.name}" created. It will now influence your behavior in future conversations.`,
        }
      },
    },

    SNEW_LIST_SKILLS: {
      description: 'List all knowledge skills for this agent.',
      inputSchema: jsonSchema({ type: 'object', properties: {} }),
      execute: async () => {
        const supabase = await createServerClient()
        const { data } = await supabase
          .from('agent_knowledge_skills')
          .select('id, name, description, content, is_enabled, source')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: true })

        return { skills: data ?? [] }
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
          .from('agent_knowledge_skills')
          .delete()
          .eq('id', params.skill_id)
          .eq('agent_id', agentId)

        if (error) return { error: error.message }

        revalidatePath(`/agents/${agentId}`)
        return { success: true, message: 'Skill deleted successfully' }
      },
    },
  }
}
