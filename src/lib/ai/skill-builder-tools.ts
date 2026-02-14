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
      description: 'Parameters with {{trigger.field}} templates',
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
    SNEW_LIST_APP_ACTIONS: {
      description:
        'List available Composio actions for an app (e.g. github, slack, discord). ALWAYS call this before creating a skill with composio_action to get the correct action names and required parameters. Never guess action names.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          app_id: {
            type: 'string',
            description:
              'The app ID to list actions for (e.g. "github", "slack", "discord", "notion")',
          },
        },
        required: ['app_id'],
      }),
      execute: async (params: { app_id: string }) => {
        try {
          const composio = getComposio()
          const tools = await composio.tools.getRawComposioTools({ toolkits: [params.app_id] })

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

          return { app_id: params.app_id, actions_count: actions.length, actions }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list actions',
          }
        }
      },
    },

    SNEW_CREATE_SKILL: {
      description:
        'Create a new executable skill for this agent. Use this when the user wants to set up an automation rule (WHEN trigger, IF conditions, THEN actions). IMPORTANT: Before using composio_action type, ALWAYS call SNEW_LIST_APP_ACTIONS first to get the correct action names. Never guess action names.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Short, descriptive name for the skill' },
          description: { type: 'string', description: 'What this skill does' },
          trigger: {
            type: 'object',
            description: 'When should this skill run?',
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
        let triggerType: TriggerType = params.trigger.type as TriggerType
        let triggerConfig: Record<string, unknown>

        if (params.trigger.type === 'webhook') {
          triggerType = 'webhook'
          triggerConfig = {
            url: '',
            method: 'POST',
            response_status: 200,
            webhook_token: webhookToken,
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
            ? { type: 'webhook', webhook_token: webhookToken }
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
          result.webhook_url = `/api/workflows/webhook/${webhookToken}`
        }
        return result
      },
    },

    SNEW_LIST_SKILLS: {
      description: 'List all skills for this agent with their current status and configuration.',
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

    SNEW_UPDATE_SKILL: {
      description: 'Update an existing skill configuration.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          skill_id: { type: 'string', description: 'The skill ID to update' },
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

    SNEW_DELETE_SKILL: {
      description: 'Delete a skill permanently.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          skill_id: { type: 'string', description: 'The skill ID to delete' },
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

    SNEW_TEST_SKILL: {
      description: 'Dry-run a skill with sample trigger data to verify it works correctly.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          skill_id: { type: 'string', description: 'The skill ID to test' },
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
        'Check which apps the user has connected. Use this to verify required integrations are set up before creating a skill.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {},
      }),
      execute: async () => {
        const supabase = await createServerClient()
        const { data: connections } = await supabase
          .from('app_connections')
          .select('app_id, account_label')
          .eq('user_id', userId)
        return { connected_apps: connections || [] }
      },
    },
  }
}
