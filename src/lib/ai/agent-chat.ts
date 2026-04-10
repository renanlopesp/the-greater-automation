import { streamText, generateText, stepCountIs, type ToolSet } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { getComposioSession } from '@/lib/composio/composio-session'
import { createLogger } from '@/lib/logger'

const log = createLogger('ai/agent-chat')

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
  }>,
  automationMode: 'full' | 'retail' | false = 'full'
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

  if (automationMode === 'retail') {
    // Retail agents: focused on scheduled workflows with web scraping, AI transform, and notifications.
    // No Composio-specific instructions (app events, composio_action, auth types).
    prompt += '\n\n## Automation Capabilities\n'
    prompt +=
      'You can create automated workflows for monitoring, alerts, and reports. Workflows follow a WHEN → IF → THEN pattern:\n\n'
    prompt +=
      '- **WHEN** (Trigger): What starts the workflow — scheduled (cron), manual button, chat command, or webhook\n'
    prompt +=
      '- **IF** (Conditions): Optional rules that must be true for actions to run (e.g. "price changed by more than 5%")\n'
    prompt +=
      '- **THEN** (Actions): What to do — scrape a web page, transform data with AI, or send a notification via Telegram\n'
    prompt +=
      "- **MODE**: auto (run immediately), confirm (ask user first), draft (save but don't run)\n\n"
    prompt += '### Web Scraping Steps\n\n'
    prompt +=
      'Use `web_scraping` action steps to extract data from web pages (competitor prices, product info, etc.).\n\n'
    prompt += 'Parameters:\n'
    prompt += '- `url` (required): The URL to scrape\n'
    prompt +=
      "- `scraping_action`: 'scrape' (extract page content), 'map' (list site URLs), 'search' (search query). Default: 'scrape'\n"
    prompt += "- `output_format`: 'markdown' (default) or 'html'\n"
    prompt += "- `query`: Search query (only for 'search' action)\n\n"
    prompt += '### AI Transform Steps\n\n'
    prompt +=
      'Use `ai_transform` to process scraped data — extract prices, compare values, generate summaries.\n\n'
    prompt += 'Parameters:\n'
    prompt +=
      '- `prompt` (required): The instruction for the AI. Use `{{prev.content}}` to reference the text output of the previous step.\n'
    prompt += '- `output_key` (optional): A label for this step\n\n'
    prompt += '**Variable reference (CRITICAL):**\n'
    prompt +=
      '- `{{prev.content}}` — the text content from the previous step (works for web_scraping and ai_transform)\n'
    prompt +=
      '- `{{prev.metadata.price}}` — structured metadata from web_scraping (e.g. extracted price)\n'
    prompt += '- `{{prev.url}}` — the URL that was scraped\n'
    prompt +=
      '- NEVER use `{{prev.analysis}}` or other invented keys — always use `{{prev.content}}`\n\n'
    prompt += '**AI prompt writing rules (CRITICAL):**\n'
    prompt +=
      '- The AI output will be sent DIRECTLY to the store owner via Telegram — it must be a complete, self-contained notification\n'
    prompt +=
      '- The message MUST include: (1) what this alert is about (e.g. "Monitoramento de Concorrente"), (2) the competitor store name, (3) product name, (4) current price, (5) the URL, and (6) a brief recommendation or comparison if possible\n'
    prompt +=
      "- Format it like a professional alert from a Price Monitor assistant — the user needs to immediately understand what they're looking at without any prior context\n"
    prompt +=
      '- Example of a GOOD message:\\n  📊 Monitoramento de Concorrente\\n  🏪 BB Milk — Kit Páscoa Areia\\n  💰 Preço atual: R$ 369,90\\n  🔗 https://bbmilk.com.br/products/kit-pascoa\\n  📝 Sem alteração desde a última verificação.\\n\n'
    prompt +=
      '- Example of a BAD message: "Preço atual: R$ 369,90" — useless, no context, the user has no idea what product or store this is about\n\n'
    prompt += '### Notification Steps\n\n'
    prompt +=
      'Use `notify` to send alerts. Telegram is the primary channel — it is already connected for this store.\n\n'
    prompt += 'Parameters:\n'
    prompt += '- `channel`: "telegram" (preferred) or "internal" (in-app only)\n'
    prompt +=
      '- `message`: The notification text. Use `{{prev.content}}` to reference the AI output from the previous step.\n\n'
    prompt += '### Example: Monitor competitor price every 4 hours\n\n'
    prompt +=
      'For a product "Kit Páscoa" on competitor store "BB Milk" at https://bbmilk.com.br/products/kit-pascoa:\n'
    prompt += '```\n'
    prompt += 'name: "Monitorar Kit Páscoa (BB Milk)"\n'
    prompt +=
      'trigger: { type: "scheduled", cron_expression: "0 */4 * * *", timezone: "America/Sao_Paulo" }\n'
    prompt += 'actions: [\n'
    prompt +=
      '  { type: "web_scraping", url: "https://bbmilk.com.br/products/kit-pascoa", scraping_action: "scrape", output_format: "markdown" },\n'
    prompt +=
      '  { type: "ai_transform", prompt: "Analise a página do produto do concorrente BB Milk:\\n\\n{{prev.content}}\\n\\nExtraia o preço atual do produto Kit Páscoa. Formate como alerta completo de Monitoramento de Concorrente para Telegram:\\n\\n📊 Monitoramento de Concorrente\\n🏪 BB Milk — Kit Páscoa\\n💰 Preço atual: R$ [preço extraído]\\n🔗 https://bbmilk.com.br/products/kit-pascoa\\n📝 [Observação sobre variação de preço, se houver]", output_key: "analysis" },\n'
    prompt += '  { type: "notify", channel: "telegram", message: "{{prev.content}}" }\n'
    prompt += ']\n'
    prompt += '```\n\n'
    prompt += '### How to Build a Workflow\n\n'
    prompt +=
      '1. **UNDERSTAND**: Ask the user WHAT they want automated, WHEN it should trigger, and WHAT actions to take\n'
    prompt +=
      '2. **CHECK EXISTING**: Call SNEW_LIST_WORKFLOWS first — if a similar workflow exists, ask the user whether to UPDATE it or CREATE a new one. Never create duplicates.\n'
    prompt +=
      '3. **SUMMARIZE**: Present a clear summary: "Here\'s what I\'ll set up: EVERY [schedule] → [scrape URL] → [analyze with AI] → [notify on Telegram]"\n'
    prompt += '4. **BUILD**: Call SNEW_CREATE_WORKFLOW with the full configuration\n'
    prompt += '5. **TEST**: Offer to dry-run with SNEW_TEST_WORKFLOW\n\n'
    prompt += '### Available Workflow Tools\n\n'
    prompt +=
      '- SNEW_CREATE_WORKFLOW — Create a new automation (ALWAYS check SNEW_LIST_WORKFLOWS first to avoid duplicates)\n'
    prompt += '- SNEW_LIST_WORKFLOWS — **CALL THIS FIRST** before creating any workflow\n'
    prompt +=
      '- SNEW_UPDATE_WORKFLOW — Modify an existing workflow (prefer over creating duplicates)\n'
    prompt += '- SNEW_DELETE_WORKFLOW — Remove a workflow\n'
    prompt += '- SNEW_TEST_WORKFLOW — Dry-run with sample data\n'
    prompt += '- SNEW_CHECK_CONNECTIONS — Check which channels (Telegram, etc.) are available\n\n'
    prompt += '### Knowledge Skill Tools\n\n'
    prompt +=
      '- SNEW_CREATE_SKILL — Create a new knowledge or procedure skill (supports templates)\n'
    prompt += '- SNEW_LIST_SKILLS — See all current knowledge skills with metadata\n'
    prompt += '- SNEW_UPDATE_SKILL — Update an existing skill (auto-increments version)\n'
    prompt += '- SNEW_GET_SKILL_CONTENT — Load full skill content by ID or name (fuzzy match)\n'
    prompt += '- SNEW_EXECUTE_SKILL — Execute a procedure skill with parameters\n'
    prompt += '- SNEW_DELETE_SKILL — Remove a knowledge skill\n'
  } else if (automationMode === 'full') {
    prompt += '\n\n## Automation Capabilities\n'
    prompt +=
      'You can create, manage, and test executable workflows (automation rules) for yourself. Workflows follow a WHEN → IF → THEN pattern:\n\n'
    prompt +=
      '- **WHEN** (Trigger): What starts the workflow — manual button, chat command, webhook, schedule, or a **Composio trigger** (event-driven, e.g. "new Discord message", "new GitHub issue")\n'
    prompt +=
      '- **IF** (Conditions): Optional rules that must be true for actions to run (e.g. "sender contains @acme.com")\n'
    prompt +=
      '- **THEN** (Actions): What to do — execute an app action (Composio), transform data with AI, scrape a web page, or send a notification. For notify actions, use channel: "telegram" (preferred, sends to user\'s Telegram) or "internal" (in-app only)\n'
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
    prompt += '### Web Scraping Steps (Competitor Monitoring)\n\n'
    prompt +=
      'You can add `web_scraping` action steps to workflows for extracting data from web pages using Firecrawl.\n\n'
    prompt += 'Parameters:\n'
    prompt += '- `url` (required): The URL to scrape\n'
    prompt +=
      "- `scraping_action`: 'scrape' (extract page content), 'map' (list site URLs), 'search' (search query). Default: 'scrape'\n"
    prompt += "- `output_format`: 'markdown' (default) or 'html'\n"
    prompt += "- `query`: Search query (only for 'search' action)\n\n"
    prompt += 'Use cases: competitor price monitoring, content extraction, market research.\n\n'
    prompt += 'Example: "Monitor competitor price every 4 hours and alert on Telegram"\n'
    prompt += '→ trigger: { type: "scheduled", cron_expression: "0 */4 * * *" }\n'
    prompt += '→ actions: [\n'
    prompt +=
      '  { type: "web_scraping", url: "https://competitor.com/product", scraping_action: "scrape", output_format: "markdown" },\n'
    prompt +=
      '  { type: "ai_transform", prompt: "Extract the current price from this page content: {{prev.content}}. Compare with our price of R$XX. If changed, format a brief alert.", output_key: "analysis" },\n'
    prompt += '  { type: "notify", channel: "telegram", message: "{{prev.content}}" }\n'
    prompt += ']\n\n'
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
    prompt +=
      '- SNEW_CREATE_SKILL — Create a new knowledge or procedure skill (supports templates)\n'
    prompt += '- SNEW_LIST_SKILLS — See all current knowledge skills with metadata\n'
    prompt += '- SNEW_UPDATE_SKILL — Update an existing skill (auto-increments version)\n'
    prompt += '- SNEW_GET_SKILL_CONTENT — Load full skill content by ID or name (fuzzy match)\n'
    prompt += '- SNEW_EXECUTE_SKILL — Execute a procedure skill with parameters\n'
    prompt += '- SNEW_DELETE_SKILL — Remove a knowledge skill\n'
  } else {
    prompt += '\n\n## Your Tools\n'
    prompt += 'You have tools to manage your knowledge and view your workflows:\n'
    prompt +=
      '- SNEW_GET_SKILL_CONTENT — Load detailed knowledge when relevant to the conversation\n'
    prompt += '- SNEW_LIST_SKILLS — See all your knowledge skills\n'
    prompt += '- SNEW_LIST_WORKFLOWS — View your automation rules\n'
    prompt += '- SNEW_CHECK_CONNECTIONS — Verify app connection status\n'
    prompt += '- You can also create, update, and delete knowledge skills to learn new things\n'
    if (connectedApps.length > 0) {
      prompt += `\nYou also have Composio tools to interact with your connected apps (${connectedApps.map((a) => a.appId).join(', ')}). `
      prompt += 'To use app actions (create products, manage inventory, check orders, etc.):\n'
      prompt +=
        '1. Use COMPOSIO_SEARCH_TOOLS to find available actions for the app (e.g. search "shopify create product")\n'
      prompt +=
        '2. Use COMPOSIO_MULTI_EXECUTE_TOOL to execute the action with the right parameters (schemas are included in search results)\n'
      prompt +=
        '\nConnections are managed at the system level. Do NOT call COMPOSIO_MANAGE_CONNECTIONS. Just proceed to execute actions directly.\n'
      prompt +=
        '\nIMPORTANT — Multi-step operations: When performing sequential actions (e.g. create product then add image), '
      prompt +=
        'ALWAYS use the IDs returned in the PREVIOUS step response. Never reuse IDs from earlier in the conversation — they may belong to different resources.\n'
      prompt += '\nIMPORTANT — Product images: You CANNOT browse the internet or generate images. '
      prompt +=
        'When a user asks to add a product image, you MUST ask them for a publicly accessible image URL. '
      prompt +=
        'Do NOT fabricate or hallucinate image URLs — they will be rejected by the platform. '
      prompt +=
        'If the user wants a simple placeholder, suggest they use: https://placehold.co/600x600?text=ProductName (replace ProductName with the actual name, using + for spaces).\n'
    }
  }

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
// Anthropic provider for legacy agent chat
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = 'claude-sonnet-4-6'

/** Reasoning models don't support temperature */
function isReasoningModel(modelId: string): boolean {
  return modelId.includes('opus')
}

/** Check if a model ID belongs to Anthropic (Claude) */
export function isAnthropicModel(modelId: string): boolean {
  return modelId.startsWith('claude-')
}

/**
 * @deprecated Use askAgent from agent-client.ts instead.
 * Legacy provider kept for telegram-processor compatibility.
 */
export function getOpenAIProvider() {
  return getAnthropicProvider()
}

/**
 * Get the Anthropic provider for Claude models.
 */
export function getAnthropicProvider() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required for Claude models')
  }
  return createAnthropic({ apiKey })
}

/**
 * Get the correct model instance for a given model ID.
 * Routes to the appropriate provider based on model prefix.
 */
function getModel(provider: ReturnType<typeof getAnthropicProvider>, modelId: string) {
  return provider(modelId.startsWith('claude-') ? modelId : DEFAULT_MODEL)
}

// ---------------------------------------------------------------------------
// Composio meta-tool filter
// ---------------------------------------------------------------------------

/**
 * Composio tool prefixes to REMOVE from agent chat.
 * We keep: SEARCH_TOOLS, GET_TOOL_SCHEMAS, MULTI_EXECUTE_TOOL (discover & execute actions),
 * and MANAGE_CONNECTIONS, CHECK_ACTIVE_CONNECTIONS, INITIATE_CONNECTION (in-chat connection flow).
 * We only remove remote execution tools (not needed for retail/app integrations).
 */
const COMPOSIO_META_TOOL_PREFIXES = [
  'COMPOSIO_FIND_TOOLS',
  'COMPOSIO_REMOTE_BASH',
  'COMPOSIO_REMOTE_WORKBENCH',
]

/**
 * Filter out Composio tools that aren't needed in agent chat.
 * We keep connection management tools so the AI can prompt users to connect apps inline.
 */
function filterComposioMetaTools(tools: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {}
  for (const [name, tool] of Object.entries(tools)) {
    const upperName = name.toUpperCase()
    const isMeta = COMPOSIO_META_TOOL_PREFIXES.some((prefix) => upperName.startsWith(prefix))
    if (!isMeta) {
      filtered[name] = tool
    }
  }
  return filtered
}

/**
 * Recursively sanitize Composio tool responses to remove misleading connection
 * status warnings. Composio's SEARCH_TOOLS returns `toolkit_connection_statuses`
 * with `has_active_connection: false` and tells the AI to call MANAGE_CONNECTIONS,
 * which we've filtered out. This causes the AI to refuse to execute actions.
 *
 * We fix this by:
 * 1. Setting `has_active_connection: true` in toolkit_connection_statuses
 * 2. Removing `status_message` that tells AI to call MANAGE_CONNECTIONS
 * 3. Removing `next_steps_guidance` entries about MANAGE_CONNECTIONS
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeComposioResponse(data: any): any {
  if (data == null || typeof data !== 'object') return data

  // Handle arrays
  if (Array.isArray(data)) {
    return data
      .map((item) => sanitizeComposioResponse(item))
      .filter((item) => {
        // Remove next_steps_guidance entries mentioning MANAGE_CONNECTIONS
        if (typeof item === 'string' && item.includes('MANAGE_CONNECTIONS')) return false
        return true
      })
  }

  // Handle objects
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    // Fix connection status to always show active (connections are managed externally)
    if (key === 'toolkit_connection_statuses' && Array.isArray(value)) {
      result[key] = (value as Array<Record<string, unknown>>).map((status) => ({
        ...status,
        has_active_connection: true,
        status_message: `Connection for ${status.toolkit ?? 'app'} is managed externally.`,
      }))
      continue
    }
    result[key] = sanitizeComposioResponse(value)
  }
  return result
}

/**
 * Wrap Composio tools to sanitize their responses.
 * Specifically wraps COMPOSIO_SEARCH_TOOLS to remove misleading connection
 * status warnings that cause the AI to refuse executing actions.
 */
function wrapComposioTools(tools: Record<string, unknown>): Record<string, unknown> {
  const wrapped: Record<string, unknown> = {}

  for (const [name, tool] of Object.entries(tools)) {
    if (name === 'COMPOSIO_SEARCH_TOOLS' && tool && typeof tool === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalTool = tool as any
      wrapped[name] = {
        ...originalTool,
        execute: async (...args: unknown[]) => {
          const result = await originalTool.execute(...args)
          return sanitizeComposioResponse(result)
        },
      }
    } else {
      wrapped[name] = tool
    }
  }

  return wrapped
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
  /** Connected app IDs to load as Composio toolkits (e.g. ['shopify', 'github']) */
  connectedAppIds?: string[]
  /** Map of toolkit slug → Composio connected account ID (e.g. { shopify: 'ca_xxx' }).
   *  Required for custom auth configs so the ToolRouter session finds the right connection. */
  connectedAccountMap?: Record<string, string>
  /** Called when the AI produces text before executing tools.
   *  Use for progressive messaging (Telegram, WhatsApp) — sends intermediate
   *  updates like "I'll sync now" immediately while tools execute in the background. */
  onIntermediateMessage?: (text: string) => Promise<void>
  /** Called when stream generation completes (before response closes).
   *  Use for persisting assistant messages — fires earlier than after(). */
  onFinish?: (event: { text: string; usage: { totalTokens: number } }) => Promise<void>
}

/**
 * Run the agent chat with native tool calling.
 * Uses OpenAI (gpt-4o) + Composio session tools via Vercel AI SDK.
 */
export async function runAgentChat(options: AgentChatOptions) {
  const {
    userId,
    agent,
    messages,
    systemPrompt,
    relayTools,
    connectedAppIds,
    connectedAccountMap,
  } = options

  // Load Composio app tools when the agent has connected apps (from workflows or store platform).
  // Composio provides utility tools (SEARCH_TOOLS, GET_TOOL_SCHEMAS, MULTI_EXECUTE_TOOL)
  // that the AI uses to discover and execute app-specific actions (e.g. Shopify).
  let composioTools: Record<string, unknown> = {}
  if (connectedAppIds && connectedAppIds.length > 0) {
    try {
      const session = await getComposioSession(userId, connectedAppIds, connectedAccountMap, true)
      const rawTools = await session.tools()
      composioTools = wrapComposioTools(filterComposioMetaTools(rawTools))
    } catch (err) {
      log.error({ err }, 'Composio tools loading failed')
    }
  }

  // Merge Relay virtual tools with Composio tools
  const allTools = relayTools ? { ...composioTools, ...relayTools } : composioTools

  // Resolve model and provider
  const provider = getOpenAIProvider()
  const modelId = agent.model && agent.model !== 'default' ? agent.model : DEFAULT_MODEL
  const anthropic = isAnthropicModel(modelId)

  // Stream with native tool calling + multi-step loop
  const reasoning = !anthropic && isReasoningModel(modelId)
  const result = streamText({
    model: getModel(provider, modelId),
    system: systemPrompt,
    messages,
    tools: allTools as unknown as ToolSet,
    stopWhen: stepCountIs(10),
    ...(!reasoning && !anthropic ? { temperature: agent.temperature ?? 0.7 } : {}),
    ...(reasoning ? {} : {}),
    ...(anthropic
      ? { providerOptions: { anthropic: { thinking: { type: 'enabled', budgetTokens: 10000 } } } }
      : {}),
    maxOutputTokens: agent.max_tokens ?? (anthropic ? 16384 : 4096),
    ...(options.onFinish
      ? {
          onFinish: async (event: {
            text: string
            totalUsage: { totalTokens: number | undefined }
          }) => {
            await options.onFinish!({
              text: event.text,
              usage: { totalTokens: event.totalUsage.totalTokens ?? 0 },
            })
          },
        }
      : {}),
  })

  return result
}

// ---------------------------------------------------------------------------
// runAgentChatSync — non-streaming variant for messaging channels
// ---------------------------------------------------------------------------

/**
 * Run the agent chat synchronously (non-streaming).
 * Uses generateText() by default, or streamText() when onIntermediateMessage
 * is provided — enabling progressive messaging for channels like Telegram.
 */
export async function runAgentChatSync(
  options: AgentChatOptions
): Promise<{ text: string; usage: { totalTokens: number } }> {
  const {
    userId,
    agent,
    messages,
    systemPrompt,
    relayTools,
    connectedAppIds,
    connectedAccountMap,
    onIntermediateMessage,
  } = options

  // Load Composio app tools when the agent has connected apps (from workflows or store platform).
  let composioTools: Record<string, unknown> = {}
  if (connectedAppIds && connectedAppIds.length > 0) {
    try {
      const session = await getComposioSession(userId, connectedAppIds, connectedAccountMap, true)
      const rawTools = await session.tools()
      composioTools = wrapComposioTools(filterComposioMetaTools(rawTools))
    } catch (err) {
      log.error({ err }, 'Composio tools loading failed (sync)')
    }
  }

  // Merge Relay virtual tools with Composio tools
  const allTools = relayTools ? { ...composioTools, ...relayTools } : composioTools

  const provider = getOpenAIProvider()
  const modelId = agent.model && agent.model !== 'default' ? agent.model : DEFAULT_MODEL
  const hasTools = Object.keys(allTools).length > 0
  const reasoning = isReasoningModel(modelId)

  // When onIntermediateMessage is provided (messaging channels), use streamText
  // so we can send progressive updates as the AI works through tool calls.
  if (onIntermediateMessage && hasTools) {
    const streamResult = streamText({
      model: getModel(provider, modelId),
      system: systemPrompt,
      messages,
      tools: allTools as unknown as ToolSet,
      stopWhen: stepCountIs(10),
      ...(!reasoning ? { temperature: agent.temperature ?? 0.7 } : {}),
      ...(reasoning
        ? {
            providerOptions: {
              // reasoning options removed (OpenAI-specific)
            },
          }
        : {}),
      maxOutputTokens: agent.max_tokens ?? 4096,
      onStepFinish: async ({ text: stepText, toolCalls }) => {
        // When the AI produces text AND calls tools in the same step,
        // send the text immediately — the user gets feedback while tools execute.
        if (stepText && toolCalls && toolCalls.length > 0) {
          await onIntermediateMessage(stepText).catch(() => {})
        }
      },
    })

    let text = await streamResult.text
    const usage = await streamResult.usage
    let totalTokens = usage?.totalTokens ?? 0

    // Fallback: if no final text but tools were executed, generate summary
    if (!text) {
      const steps = await streamResult.steps
      const toolSummaries = extractToolSummaries(steps)
      if (toolSummaries.length > 0) {
        const followUp = await generateFollowUp(
          provider,
          modelId,
          systemPrompt,
          messages,
          agent,
          toolSummaries
        )
        text = followUp.text
        totalTokens += followUp.tokens
      }
    }

    return { text: text || '', usage: { totalTokens } }
  }

  // Default path: generateText (web chat and contexts without intermediate messaging)
  const result = await generateText({
    model: getModel(provider, modelId),
    system: systemPrompt,
    messages,
    ...(hasTools
      ? { tools: allTools as Parameters<typeof generateText>[0]['tools'], maxSteps: 10 }
      : {}),
    ...(!reasoning ? { temperature: agent.temperature ?? 0.7 } : {}),
    ...(reasoning ? {} : {}),
    maxOutputTokens: agent.max_tokens ?? 4096,
  })

  let text = result.text
  let totalTokens = result.usage?.totalTokens ?? 0

  // If the model executed tools but didn't produce a final text response,
  // make a follow-up call WITHOUT tools to force a natural-language summary.
  if (!text && result.steps && result.steps.length > 0) {
    const toolSummaries = extractToolSummaries(result.steps)
    if (toolSummaries.length > 0) {
      const followUp = await generateFollowUp(
        provider,
        modelId,
        systemPrompt,
        messages,
        agent,
        toolSummaries
      )
      text = followUp.text
      totalTokens += followUp.tokens
    }
  }

  return {
    text: text || '',
    usage: { totalTokens },
  }
}

/**
 * Extract tool result summaries from AI SDK steps.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractToolSummaries(steps: any[]): string[] {
  const summaries: string[] = []
  for (const step of steps) {
    if (step.toolResults) {
      for (const tr of step.toolResults) {
        const output = tr.output ?? tr.result
        summaries.push(`Tool ${tr.toolName} returned: ${JSON.stringify(output).slice(0, 1000)}`)
      }
    }
  }
  return summaries
}

/**
 * Generate a follow-up response summarizing tool results when the AI
 * didn't produce a final text response after tool execution.
 */
async function generateFollowUp(
  provider: ReturnType<typeof getAnthropicProvider>,
  modelId: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  agent: AgentConfig,
  toolSummaries: string[]
): Promise<{ text: string; tokens: number }> {
  const followUp = await generateText({
    model: getModel(provider, modelId),
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
    ...(!isReasoningModel(modelId) ? { temperature: agent.temperature ?? 0.7 } : {}),
    maxOutputTokens: 512,
  })

  return {
    text: followUp.text,
    tokens: followUp.usage?.totalTokens ?? 0,
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
