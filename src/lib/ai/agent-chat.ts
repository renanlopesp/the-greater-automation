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
  dynamicSkills?: AgentSkill[]
): string {
  let prompt = `You are ${agent.name}.`
  if (agent.system_prompt) {
    prompt += `\n\n${agent.system_prompt}`
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
    prompt += '\n\n## Skills\n'
    prompt += 'You have the following skills (workflows you can trigger):\n'
    for (const skill of skills) {
      prompt += `\n- **${skill.name}**`
      if (skill.description) prompt += `: ${skill.description}`
    }
  }

  // Dynamic skills
  if (dynamicSkills && dynamicSkills.length > 0) {
    prompt += '\n\n## Dynamic Skills\n'
    for (const skill of dynamicSkills) {
      prompt += `\n- **${skill.name}**`
      if (skill.description) prompt += `: ${skill.description}`
    }
  }

  prompt += '\n\n## Skill Building\n'
  prompt +=
    'You can create, manage, and test executable skills (automation rules) for yourself. Skills follow a WHEN → IF → THEN pattern:\n\n'
  prompt +=
    '- **WHEN** (Trigger): What starts the skill — manual button, chat command, webhook, or schedule\n'
  prompt +=
    '- **IF** (Conditions): Optional rules that must be true for actions to run (e.g. "sender contains @acme.com")\n'
  prompt +=
    '- **THEN** (Actions): What to do — execute an app action (Composio), transform data with AI, or send a notification\n'
  prompt +=
    "- **MODE**: auto (run immediately), confirm (ask user first), draft (save but don't run)\n\n"
  prompt += '### How to Build a Skill\n\n'
  prompt +=
    '1. **UNDERSTAND**: Ask the user WHAT they want automated, WHEN it should trigger, IF there are conditions, and WHAT actions to take\n'
  prompt += '2. **VERIFY**: Use SNEW_CHECK_CONNECTIONS to ensure required apps are connected\n'
  prompt +=
    '3. **LOOKUP ACTIONS**: ALWAYS call SNEW_LIST_APP_ACTIONS for each app you plan to use (e.g. github, slack). NEVER guess action names — use only names returned by this tool.\n'
  prompt +=
    '4. **SUMMARIZE**: Present a clear summary: "Here\'s what I\'ll set up: WHEN [trigger] → IF [conditions] → THEN [actions] in [mode] mode"\n'
  prompt += '5. **BUILD**: Call SNEW_CREATE_SKILL with the full configuration\n'
  prompt += '6. **TEST**: Offer to dry-run with SNEW_TEST_SKILL using sample data\n\n'
  prompt += '### Available Skill Tools\n\n'
  prompt +=
    '- SNEW_LIST_APP_ACTIONS — **MUST call before using composio_action** to get real action names and params\n'
  prompt += '- SNEW_CREATE_SKILL — Create a new automation rule\n'
  prompt += '- SNEW_LIST_SKILLS — See all current skills\n'
  prompt += '- SNEW_UPDATE_SKILL — Modify an existing skill\n'
  prompt += '- SNEW_DELETE_SKILL — Remove a skill\n'
  prompt += '- SNEW_TEST_SKILL — Dry-run with sample data\n'
  prompt += '- SNEW_CHECK_CONNECTIONS — Verify app connections\n'

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
