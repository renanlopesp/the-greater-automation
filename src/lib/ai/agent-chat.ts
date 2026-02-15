import { streamText, stepCountIs, type ToolSet } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getComposioSession } from '@/lib/composio/composio-session'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentConfig {
  id: string
  name: string
  system_prompt: string | null
  model: string | null
  temperature: number | null
  max_tokens: number | null
}

export interface AgentSkill {
  name: string
  description: string | null
  source: string | null
  action_template: Record<string, unknown> | null
  workflow_name: string | null
  workflow_description: string | null
}

export interface ConnectedApp {
  appId: string
  actions: string[]
}

// Re-export for route.ts compatibility
export type { ToolSet }

// ---------------------------------------------------------------------------
// buildAgentSystemPrompt
// ---------------------------------------------------------------------------

/**
 * Build a system prompt for the agent.
 * Tools are provided natively via Composio — the prompt only adds context.
 */
export function buildAgentSystemPrompt(
  agent: AgentConfig,
  skills: AgentSkill[],
  connectedApps: ConnectedApp[],
  dynamicSkills?: AgentSkill[],
  knowledgeSkills?: Array<{ name: string; content: string; is_enabled: boolean }>
): string {
  let prompt = `You are ${agent.name}.`
  if (agent.system_prompt) {
    prompt += `\n\n${agent.system_prompt}`
  }

  // Knowledge skills
  if (knowledgeSkills && knowledgeSkills.length > 0) {
    const enabledSkills = knowledgeSkills.filter((s) => s.is_enabled)
    if (enabledSkills.length > 0) {
      prompt += '\n\n## Your Knowledge & Skills\n'
      prompt +=
        'The following skills define your specialized knowledge. Apply them when relevant:\n'
      for (const skill of enabledSkills) {
        prompt += `\n### ${skill.name}\n${skill.content}\n`
      }
    }
  }

  // Connected apps (informational — tools are passed natively)
  if (connectedApps.length > 0) {
    prompt += '\n\n## Connected Apps\n'
    prompt +=
      'You have access to tools from the following connected apps. Use them when the user asks you to perform actions.\n'
    for (const app of connectedApps) {
      prompt += `\n- **${app.appId}**`
    }
  }

  // Static skills
  if (skills.length > 0) {
    prompt += '\n\n## Workflows\n'
    prompt += 'You have the following workflows (automations you can trigger):\n'
    for (const skill of skills) {
      prompt += `\n- **${skill.name}**`
      if (skill.description) prompt += `: ${skill.description}`
    }
  }

  // Dynamic skills
  if (dynamicSkills && dynamicSkills.length > 0) {
    prompt += '\n\n## Dynamic Workflows\n'
    for (const skill of dynamicSkills) {
      prompt += `\n- **${skill.name}**`
      if (skill.description) prompt += `: ${skill.description}`
    }
  }

  prompt += '\n\n## Automation Capabilities\n'
  prompt +=
    'You can create, manage, and test executable workflows (automation rules) for yourself. Workflows follow a WHEN → IF → THEN pattern:\n\n'
  prompt +=
    '- **WHEN** (Trigger): What starts the workflow — manual button, chat command, webhook, schedule, or a **Composio trigger** (event-driven, e.g. "new Discord message", "new GitHub issue")\n'
  prompt +=
    '- **IF** (Conditions): Optional rules that must be true for actions to run (e.g. "sender contains @acme.com")\n'
  prompt +=
    '- **THEN** (Actions): What to do — execute an app action (Composio), transform data with AI, or send a notification\n'
  prompt +=
    "- **MODE**: auto (run immediately), confirm (ask user first), draft (save but don't run)\n\n"
  prompt += '### How to Build a Workflow\n\n'
  prompt +=
    '1. **UNDERSTAND**: Ask the user WHAT they want automated, WHEN it should trigger, IF there are conditions, and WHAT actions to take\n'
  prompt += '2. **VERIFY**: Use SNEW_CHECK_CONNECTIONS to ensure required apps are connected\n'
  prompt +=
    '3. **CHECK CAPABILITIES**: ALWAYS call SNEW_LIST_APP_CAPABILITIES for each app you plan to use. This returns both available **actions** (things you can do) and **triggers** (events you can listen for). NEVER invent or guess action names — only use slugs returned by this tool.\n'
  prompt +=
    '4. **MAP PARAMS**: For EVERY composio_action, you MUST map ALL required parameters. Read the `required_params` and `params` from SNEW_LIST_APP_CAPABILITIES output and map each one:\n'
  prompt +=
    '   - For **webhook** triggers: use `{{trigger.field.path}}` to reference incoming payload fields — inspect the trigger schema to know what fields are available\n'
  prompt +=
    '   - For **AI output** from a previous step: use `{{prev.output_key}}` to reference the output key from that step\n'
  prompt += '   - For **static values** the user explicitly provided: use the literal value\n'
  prompt +=
    "   - **NEVER guess or hardcode** context-dependent values (names, IDs, channels, repos, emails, etc.). If you don't know a value, ASK THE USER.\n"
  prompt +=
    '5. **ASK WHEN UNSURE**: If any required parameter cannot be derived from the trigger data or a previous action output, you MUST ask the user before creating the workflow. Never assume names, identifiers, or targets.\n'
  prompt +=
    '6. **SUMMARIZE**: Present a clear summary showing the parameter mapping: "Here\'s what I\'ll set up: WHEN [trigger] → IF [conditions] → THEN [actions with mapped params] in [mode] mode"\n'
  prompt +=
    '7. **BUILD**: Call SNEW_CREATE_WORKFLOW with the full configuration including all mapped params\n'
  prompt += '8. **TEST**: Offer to dry-run with SNEW_TEST_WORKFLOW using sample data\n\n'
  prompt += '### Available Workflow Tools\n\n'
  prompt +=
    '- SNEW_LIST_APP_CAPABILITIES — **MUST call before using composio_action** to get real action names, triggers, required params, and param descriptions\n'
  prompt +=
    '- SNEW_CREATE_WORKFLOW — Create a new automation rule (params must be fully mapped, action slugs are validated)\n'
  prompt += '- SNEW_LIST_WORKFLOWS — See all current workflows\n'
  prompt += '- SNEW_UPDATE_WORKFLOW — Modify an existing workflow\n'
  prompt += '- SNEW_DELETE_WORKFLOW — Remove a workflow\n'
  prompt += '- SNEW_TEST_WORKFLOW — Dry-run with sample data\n'
  prompt +=
    '- SNEW_CHECK_CONNECTIONS — Verify app connections and their auth type (OAuth, Bot, API Key)\n\n'
  prompt += '### Authentication Awareness (CRITICAL)\n\n'
  prompt +=
    'Each app connection has an **auth_type** (OAuth, Bot, API Key, etc.) that determines what it can do. Different auth types grant different scopes and permissions — an OAuth user token may NOT support the same actions as a Bot token or API Key.\n\n'
  prompt += '**Before creating any workflow, ALWAYS:**\n'
  prompt += '1. Call SNEW_CHECK_CONNECTIONS to see the auth_type and scopes of each connection\n'
  prompt +=
    '2. Call SNEW_LIST_APP_CAPABILITIES to see what actions and triggers are actually available for that app\n'
  prompt +=
    '3. Cross-reference: if a trigger or action requires permissions that the current auth_type/scopes do not cover, **warn the user** and explain what connection type they need. Do NOT create workflows that will fail due to insufficient permissions.\n'
  prompt +=
    '4. If unsure whether the connection supports the intended action, tell the user: "Let me verify your connection supports this" — then check capabilities and scopes.\n'
  prompt +=
    '5. Some apps have separate toolkits for different auth types (e.g. user OAuth vs bot). If the current toolkit lacks the needed action, suggest the alternative toolkit.\n\n'
  prompt += '### Knowledge Skill Tools\n\n'
  prompt += '- SNEW_CREATE_SKILL — Create a new knowledge skill (embedded instruction/knowledge)\n'
  prompt += '- SNEW_LIST_SKILLS — See all current knowledge skills\n'
  prompt += '- SNEW_DELETE_SKILL — Remove a knowledge skill\n'

  prompt += '\n\n## Instructions\n'
  prompt +=
    '- ALWAYS use your tools to fulfill requests. You have real tools that execute real actions — use them.\n'
  prompt += '- When a tool call fails, DO NOT give up. Think step by step:\n'
  prompt += '  1. What went wrong? (auth error, wrong parameters, wrong tool?)\n'
  prompt += '  2. Is there another tool that could accomplish the same thing?\n'
  prompt += '  3. Can you retry with different parameters?\n'
  prompt += '  4. Only after exhausting all options, explain the issue to the user.\n'
  prompt +=
    '- NEVER say "I cannot do this" if you have tools available. Try first, then report results.\n'
  prompt +=
    '- If a tool returns an error about authentication or connection, tell the user to check their app connection in Settings and offer to retry.\n'
  prompt += '- Provide clear, concise summaries of tool execution results.\n'
  prompt +=
    '- Before executing destructive actions (delete, close, remove), ask for confirmation.\n'
  prompt += '- If the required app is not connected, guide the user to connect it in Settings.\n'
  prompt += '- Respond in the same language the user writes in.\n'

  return prompt
}

// ---------------------------------------------------------------------------
// OpenAI provider for agent chat (supports function calling)
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = 'gpt-4o'

/**
 * Get the OpenAI provider for agent chat.
 * Uses OPEN_AI_API_KEY for function calling support.
 * Kiro is kept for other features but doesn't support tool use.
 */
function getOpenAIProvider() {
  const apiKey = process.env.OPEN_AI_API_KEY
  if (!apiKey) {
    throw new Error('OPEN_AI_API_KEY environment variable is required for agent chat')
  }
  return createOpenAI({ apiKey })
}

// ---------------------------------------------------------------------------
// runAgentChat — Vercel AI SDK + Composio
// ---------------------------------------------------------------------------

export interface AgentChatOptions {
  userId: string
  agent: AgentConfig
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  systemPrompt: string
  relayTools?: Record<string, unknown>
}

/**
 * Run the agent chat with native tool calling.
 * Uses OpenAI (gpt-4o) + Composio session tools via Vercel AI SDK.
 */
export async function runAgentChat(options: AgentChatOptions) {
  const { userId, agent, messages, systemPrompt, relayTools } = options

  // Get Composio tools for this user's connected apps
  const session = await getComposioSession(userId)
  const composioTools = await session.tools()

  // Merge Relay virtual tools with Composio tools
  const allTools = relayTools ? { ...composioTools, ...relayTools } : composioTools

  const toolNames = Object.keys(allTools)
  console.log(
    `[agent-chat] Tools: ${toolNames.length} for user ${userId} — ${toolNames.join(', ')}`
  )

  // Use OpenAI for agent chat (supports function calling)
  const provider = getOpenAIProvider()
  const modelId = agent.model && agent.model !== 'default' ? agent.model : DEFAULT_MODEL

  console.log(`[agent-chat] Using model: ${modelId}`)

  // Stream with native tool calling + multi-step loop
  const result = streamText({
    model: provider.chat(modelId),
    system: systemPrompt,
    messages,
    tools: allTools as unknown as ToolSet,
    stopWhen: stepCountIs(10),
    temperature: agent.temperature ?? 0.7,
    maxOutputTokens: agent.max_tokens ?? 4096,
  })

  return result
}

// ---------------------------------------------------------------------------
// resolveSkillTemplate (kept for skill execution)
// ---------------------------------------------------------------------------

/**
 * Resolve placeholders in a skill template from conversation context.
 */
export function resolveSkillTemplate(
  template: Record<string, unknown>,
  context: Record<string, string>
): Record<string, unknown> {
  const resolved = JSON.parse(JSON.stringify(template)) as Record<string, unknown>

  function resolveValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.replace(/\{\{(\w+)\}\}/g, (match, key: string) => context[key] ?? match)
    }
    if (Array.isArray(value)) return value.map(resolveValue)
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>
      const result: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(obj)) {
        result[k] = resolveValue(v)
      }
      return result
    }
    return value
  }

  return resolveValue(resolved) as Record<string, unknown>
}
