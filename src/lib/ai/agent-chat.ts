import { streamText, generateText, stepCountIs, type ToolSet } from 'ai'
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
  knowledgeSkills?: Array<{
    name: string
    description: string | null
    type: string | null
    is_enabled: boolean
  }>
): string {
  let prompt = `You are ${agent.name}.`
  if (agent.system_prompt) {
    prompt += `\n\n${agent.system_prompt}`
  }

  // Knowledge skills (progressive disclosure - metadata only)
  if (knowledgeSkills && knowledgeSkills.length > 0) {
    const enabledSkills = knowledgeSkills.filter((s) => s.is_enabled)
    if (enabledSkills.length > 0) {
      prompt += '\n\n## Your Knowledge & Skills\n'
      prompt +=
        'The following skills define your specialized knowledge. Use SNEW_GET_SKILL_CONTENT to load full details when relevant to the conversation:\n'
      for (const skill of enabledSkills) {
        const typeLabel = skill.type === 'procedure' ? '[Procedure]' : '[Knowledge]'
        const desc = skill.description ? ` - ${skill.description}` : ''
        prompt += `\n- ${typeLabel} **${skill.name}**${desc}`
      }
    }
  }

  // Connected apps (authoritative — verified from DB, tools are passed natively)
  if (connectedApps.length > 0) {
    prompt += '\n\n## Connected Apps (Verified)\n'
    prompt +=
      'The following apps are ALREADY connected and verified. You can use their tools directly — do NOT ask the user to connect these apps again or call SNEW_CHECK_CONNECTIONS to re-verify them.\n'
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
  prompt += '### App Event Triggers (Event-Driven Workflows)\n\n'
  prompt +=
    'When a user wants a workflow triggered by an external app event (e.g. "when a PR is opened", "when someone posts in Discord", "when an issue is created"):\n\n'
  prompt += '1. Call SNEW_LIST_APP_CAPABILITIES with the app_id to see available **triggers**\n'
  prompt +=
    '2. Find the matching trigger slug (e.g. GITHUB_PULL_REQUEST_OPENED, DISCORD_NEW_MESSAGE)\n'
  prompt += '3. Call SNEW_CREATE_WORKFLOW with:\n'
  prompt += '   - trigger.type = "app_event"\n'
  prompt += '   - trigger.trigger_slug = the trigger slug from step 2\n'
  prompt += '   - trigger.trigger_app_id = the app ID (e.g. "github")\n'
  prompt +=
    '   - trigger.trigger_config = app-specific config params (check config_details from SNEW_LIST_APP_CAPABILITIES — if the trigger has config_params like channel_id, repo, etc., you MUST include them in trigger_config. Ask the user for values you do not have.)\n\n'
  prompt += 'Example: "When a PR is opened on my repo, post a message in Discord"\n'
  prompt +=
    '→ trigger: { type: "app_event", trigger_slug: "GITHUB_PULL_REQUEST_OPENED", trigger_app_id: "github" }\n'
  prompt +=
    '→ actions: [{ type: "composio_action", action: "DISCORD_SEND_CHANNEL_MESSAGE", app_id: "discord", params: { channel_id: "...", message: "New PR: {{trigger.data.title}}" } }]\n\n'
  prompt +=
    "Note: Composio triggers create subscriptions that automatically listen for events. The workflow runs automatically when events occur — users don't need to set up webhooks manually.\n\n"
  prompt += '### Claude Agent Steps (AI Analysis in Workflows)\n\n'
  prompt +=
    'You can add `claude_agent` steps to workflows for AI-powered analysis within a pipeline. '
  prompt +=
    'Unlike `ai_transform` (simple text generation), `claude_agent` supports tool calling and structured JSON output.\n\n'
  prompt += 'When to use claude_agent:\n'
  prompt += '- Code review analysis (with access to GitHub tools)\n'
  prompt += '- Data transformation requiring reasoning\n'
  prompt += '- Decision-making steps that need structured output\n'
  prompt += '- Multi-step analysis using Composio tools\n\n'
  prompt += 'Example: "Analyze a PR and post a review comment"\n'
  prompt += '→ actions: [\n'
  prompt +=
    '  { type: "claude_agent", prompt: "Review the PR: {{trigger.data.title}}\\n\\nDescription: {{trigger.data.body}}", '
  prompt +=
    'output_key: "review", output_format: "json", tools: ["GITHUB_GET_PULL_REQUEST_DIFF"] },\n'
  prompt += '  { type: "composio_action", action: "GITHUB_CREATE_COMMENT", app_id: "github", '
  prompt +=
    'params: { body: "## AI Review\\n{{prev.review.summary}}", issue_number: "{{trigger.data.number}}", owner: "...", repo: "..." } }\n'
  prompt += ']\n\n'
  prompt +=
    'claude_agent config: prompt (required), output_key (required), output_format ("text" or "json"), '
  prompt +=
    'tools (array of Composio tool names), model (default: gpt-4o), timeout_ms (default: 300000)\n\n'
  prompt += '### How to Build a Workflow\n\n'
  prompt +=
    '1. **UNDERSTAND**: Ask the user WHAT they want automated, WHEN it should trigger, IF there are conditions, and WHAT actions to take\n'
  prompt +=
    '2. **CHECK EXISTING**: ALWAYS call SNEW_LIST_WORKFLOWS first to see if a similar workflow already exists. If one does, ask the user whether they want to UPDATE the existing workflow or CREATE a new one. NEVER create duplicate workflows — prefer updating existing ones with SNEW_UPDATE_WORKFLOW.\n'
  prompt +=
    '3. **VERIFY**: Check the "Connected Apps (Verified)" list above. Apps listed there are already connected — do NOT re-verify them. Only call SNEW_CHECK_CONNECTIONS for apps NOT in that list.\n'
  prompt +=
    '4. **CHECK CAPABILITIES**: ALWAYS call SNEW_LIST_APP_CAPABILITIES for each app you plan to use. This returns both available **actions** (things you can do) and **triggers** (events you can listen for). NEVER invent or guess action names — only use slugs returned by this tool.\n'
  prompt +=
    '5. **MAP PARAMS**: For EVERY composio_action, you MUST map ALL required parameters. Read the `required_params` and `params` from SNEW_LIST_APP_CAPABILITIES output and map each one:\n'
  prompt +=
    '   - For **webhook** triggers: use `{{trigger.field.path}}` to reference incoming payload fields — inspect the trigger schema to know what fields are available\n'
  prompt +=
    '   - For **AI output** from a previous step: use `{{prev.output_key}}` to reference the output key from that step\n'
  prompt += '   - For **static values** the user explicitly provided: use the literal value\n'
  prompt +=
    "   - **NEVER guess or hardcode** context-dependent values (names, IDs, channels, repos, emails, etc.). If you don't know a value, ASK THE USER.\n"
  prompt +=
    '6. **ASK WHEN UNSURE**: If any required parameter cannot be derived from the trigger data or a previous action output, you MUST ask the user before creating the workflow. Never assume names, identifiers, or targets.\n'
  prompt +=
    '7. **SUMMARIZE**: Present a clear summary showing the parameter mapping: "Here\'s what I\'ll set up: WHEN [trigger] → IF [conditions] → THEN [actions with mapped params] in [mode] mode"\n'
  prompt +=
    '8. **BUILD**: Call SNEW_CREATE_WORKFLOW with the full configuration including all mapped params\n'
  prompt += '9. **TEST**: Offer to dry-run with SNEW_TEST_WORKFLOW using sample data\n\n'
  prompt += '### Available Workflow Tools\n\n'
  prompt +=
    '- SNEW_LIST_APP_CAPABILITIES — **MUST call before using composio_action** to get real action names, triggers, required params, and param descriptions\n'
  prompt +=
    '- SNEW_CREATE_WORKFLOW — Create a new automation rule (params must be fully mapped, action slugs are validated). ALWAYS check SNEW_LIST_WORKFLOWS first to avoid duplicates.\n'
  prompt +=
    '- SNEW_LIST_WORKFLOWS — **CALL THIS FIRST** before creating any workflow. Check if a similar workflow already exists and update it instead of creating duplicates.\n'
  prompt +=
    '- SNEW_UPDATE_WORKFLOW — Modify an existing workflow. Prefer this over creating a new one when a similar workflow exists.\n'
  prompt += '- SNEW_DELETE_WORKFLOW — Remove a workflow\n'
  prompt += '- SNEW_TEST_WORKFLOW — Dry-run with sample data\n'
  prompt +=
    '- SNEW_CHECK_CONNECTIONS — Verify app connections and their auth type (OAuth, Bot, API Key)\n\n'
  prompt += '### Authentication Awareness (CRITICAL)\n\n'
  prompt +=
    'Each app connection has an **auth_type** (OAuth, Bot, API Key, etc.) that determines what it can do. Different auth types grant different scopes and permissions — an OAuth user token may NOT support the same actions as a Bot token or API Key.\n\n'
  prompt += '**Before creating any workflow:**\n'
  prompt +=
    '1. Check the "Connected Apps (Verified)" list above FIRST. Apps listed there are confirmed connected — do NOT call SNEW_CHECK_CONNECTIONS for them. Only call SNEW_CHECK_CONNECTIONS for apps that are NOT in the verified list.\n'
  prompt +=
    '2. Call SNEW_LIST_APP_CAPABILITIES to see what actions and triggers are actually available for that app\n'
  prompt +=
    '3. Cross-reference: if a trigger or action requires permissions that the current auth_type/scopes do not cover, **warn the user** and explain what connection type they need. Do NOT create workflows that will fail due to insufficient permissions.\n'
  prompt +=
    '4. If unsure whether the connection supports the intended action, tell the user: "Let me verify your connection supports this" — then check capabilities and scopes.\n'
  prompt +=
    '5. Some apps have separate toolkits for different auth types (e.g. user OAuth vs bot). If the current toolkit lacks the needed action, suggest the alternative toolkit.\n\n'
  prompt += '### Knowledge Skill Tools\n\n'
  prompt += '- SNEW_CREATE_SKILL — Create a new knowledge or procedure skill (supports templates)\n'
  prompt += '- SNEW_LIST_SKILLS — See all current knowledge skills with metadata\n'
  prompt += '- SNEW_UPDATE_SKILL — Update an existing skill (auto-increments version)\n'
  prompt += '- SNEW_GET_SKILL_CONTENT — Load full skill content by ID or name (fuzzy match)\n'
  prompt += '- SNEW_EXECUTE_SKILL — Execute a procedure skill with parameters\n'
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
// runAgentChatSync — non-streaming variant for messaging channels
// ---------------------------------------------------------------------------

/**
 * Run the agent chat synchronously (non-streaming).
 * Uses generateText() instead of streamText() — returns the full response.
 * Designed for messaging channels (Telegram, WhatsApp) that don't support streaming.
 */
export async function runAgentChatSync(
  options: AgentChatOptions
): Promise<{ text: string; usage: { totalTokens: number } }> {
  const { userId, agent, messages, systemPrompt, relayTools } = options

  // Get Composio tools for this user's connected apps
  const session = await getComposioSession(userId)
  const composioTools = await session.tools()

  // Merge Relay virtual tools with Composio tools
  const allTools = relayTools ? { ...composioTools, ...relayTools } : composioTools

  const toolNames = Object.keys(allTools)
  console.log(
    `[agent-chat-sync] Tools: ${toolNames.length} for user ${userId} — ${toolNames.join(', ')}`
  )

  const provider = getOpenAIProvider()
  const modelId = agent.model && agent.model !== 'default' ? agent.model : DEFAULT_MODEL

  console.log(`[agent-chat-sync] Using model: ${modelId}`)

  const hasTools = Object.keys(allTools).length > 0
  const result = await generateText({
    model: provider.chat(modelId),
    system: systemPrompt,
    messages,
    ...(hasTools
      ? { tools: allTools as Parameters<typeof generateText>[0]['tools'], maxSteps: 10 }
      : {}),
    temperature: agent.temperature ?? 0.7,
    maxOutputTokens: agent.max_tokens ?? 4096,
  })

  console.log(
    `[agent-chat-sync] Result: text=${result.text?.length ?? 0} chars, steps=${result.steps?.length ?? 0}, finishReason=${result.finishReason}`
  )

  let text = result.text
  let totalTokens = result.usage?.totalTokens ?? 0

  // If the model executed tools but didn't produce a final text response,
  // make a follow-up call WITHOUT tools to force a natural-language summary.
  if (!text && result.steps && result.steps.length > 0) {
    // Build a summary of what tools did for the follow-up prompt
    const toolSummaries: string[] = []
    for (const step of result.steps) {
      if (step.toolResults) {
        for (const tr of step.toolResults) {
          toolSummaries.push(
            `Tool ${tr.toolName} returned: ${JSON.stringify(tr.output).slice(0, 1000)}`
          )
        }
      }
    }

    if (toolSummaries.length > 0) {
      console.log(
        `[agent-chat-sync] No text after ${result.steps.length} steps — running follow-up for summary`
      )

      const followUp = await generateText({
        model: provider.chat(modelId),
        system: systemPrompt,
        messages: [
          ...messages,
          {
            role: 'user' as const,
            content: [
              'You just executed tools. Here are the results:',
              ...toolSummaries,
              '',
              'Now write a short, friendly response to the user summarizing what happened.',
              'Follow the Response Format rules from your system prompt. Never return raw JSON.',
            ].join('\n'),
          },
        ],
        temperature: agent.temperature ?? 0.7,
        maxOutputTokens: 512,
      })

      text = followUp.text
      totalTokens += followUp.usage?.totalTokens ?? 0
    }
  }

  return {
    text: text || '',
    usage: { totalTokens },
  }
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
