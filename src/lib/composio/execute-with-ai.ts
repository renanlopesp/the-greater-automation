'use server'

import { getAppActions } from './actions/get-app-actions'
import { getComposio } from './client'

export interface AppStepAIResult {
  success: boolean
  action_used?: string
  inputs_used?: Record<string, unknown>
  result?: unknown
  error?: string
}

/**
 * Execute an app step using AI to select the action and fill parameters.
 *
 * Flow:
 * 1. Fetch available actions for the app via getAppActions()
 * 2. Format actions + user instructions into a prompt for Kiro Chat
 * 3. Kiro Chat returns JSON with { actionName, inputs }
 * 4. Execute via composio.tools.execute()
 */
export async function executeAppStepWithAI(
  appId: string,
  instructions: string,
  composioConnectionId: string,
  context?: Record<string, unknown>
): Promise<AppStepAIResult> {
  const apiUrl = process.env.KIRO_CHAT_URL
  const authToken = process.env.KIRO_CHAT_AUTH_TOKEN

  if (!apiUrl || !authToken) {
    return {
      success: false,
      error: 'Missing KIRO_CHAT_URL or KIRO_CHAT_AUTH_TOKEN environment variables',
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    // 1. Fetch available actions for this app
    const actions = await getAppActions(appId)
    if (!actions || actions.length === 0) {
      return {
        success: false,
        error: `No actions available for app: ${appId}`,
      }
    }

    // 2. Build action catalog for the prompt
    const actionCatalog = actions.map((action) => ({
      name: action.name,
      description: action.description,
      parameters: action.params.map((p) => ({
        name: p.key,
        type: p.type,
        required: p.required,
        description: p.description,
      })),
    }))

    const systemPrompt = `You are an action selection assistant for a workflow automation platform.
Given a list of available actions and user instructions, select the best action and fill in the required parameters.

IMPORTANT: Respond with ONLY valid JSON in this exact format:
{
  "actionName": "THE_ACTION_NAME",
  "inputs": { "param1": "value1", "param2": "value2" }
}

Do not include any text outside the JSON. Do not use markdown code blocks.`

    let userPrompt = `Available actions for ${appId}:\n${JSON.stringify(actionCatalog, null, 2)}\n\nUser instructions: ${instructions}`

    if (context && Object.keys(context).length > 0) {
      userPrompt += `\n\nWorkflow context from previous steps:\n${JSON.stringify(context, null, 2)}`
    }

    // 3. Call Kiro Chat API
    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), 30000)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        model: 'kiro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `AI request failed with status ${response.status}: ${errorText}`,
      }
    }

    const data = await response.json()

    if (!data.choices?.[0]?.message?.content) {
      return {
        success: false,
        error: 'Invalid response format from AI API',
      }
    }

    // 4. Parse AI decision
    const aiContent = data.choices[0].message.content.trim()
    let decision: { actionName: string; inputs: Record<string, unknown> }

    try {
      decision = JSON.parse(aiContent)
    } catch {
      return {
        success: false,
        error: `AI returned invalid JSON: ${aiContent.slice(0, 200)}`,
      }
    }

    if (!decision.actionName) {
      return {
        success: false,
        error: 'AI response missing actionName field',
      }
    }

    // Verify the action exists in our catalog
    const selectedAction = actions.find((a) => a.name === decision.actionName)
    if (!selectedAction) {
      return {
        success: false,
        error: `AI selected unknown action: ${decision.actionName}`,
      }
    }

    // 5. Execute via Composio with retry loop (up to 2 retries on failure)
    const composio = getComposio()
    const maxAttempts = 3
    let lastError: string | null = null
    let lastDecision = decision

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await composio.tools.execute(lastDecision.actionName, {
        connectedAccountId: composioConnectionId,
        arguments: lastDecision.inputs ?? {},
      })

      const appResult = result as {
        successful?: boolean
        data?: unknown
        error?: string
      }

      if (appResult.successful) {
        return {
          success: true,
          action_used: lastDecision.actionName,
          inputs_used: lastDecision.inputs,
          result: appResult.data,
        }
      }

      lastError = appResult.error || `Action ${lastDecision.actionName} failed`

      // If we have retries left, ask the AI to fix its inputs
      if (attempt < maxAttempts) {
        const retryResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            model: 'kiro',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
              {
                role: 'assistant',
                content: JSON.stringify({
                  actionName: lastDecision.actionName,
                  inputs: lastDecision.inputs,
                }),
              },
              {
                role: 'user',
                content: `The execution failed with this error: "${lastError}"\n\nPlease fix the inputs and try again. Remember to use the correct data types (arrays for list fields, numbers for numeric fields, etc.). Respond with ONLY valid JSON in the same format.`,
              },
            ],
            temperature: 0.1,
            max_tokens: 1000,
          }),
          signal: controller.signal,
        })

        if (retryResponse.ok) {
          const retryData = await retryResponse.json()
          const retryContent = retryData.choices?.[0]?.message?.content?.trim()
          if (retryContent) {
            try {
              const retryDecision = JSON.parse(retryContent)
              if (retryDecision.actionName) {
                lastDecision = retryDecision
                continue
              }
            } catch {
              // AI returned bad JSON on retry — fall through to return error
            }
          }
        }
        // If retry AI call failed, stop retrying
        break
      }
    }

    return {
      success: false,
      action_used: lastDecision.actionName,
      inputs_used: lastDecision.inputs,
      error: lastError || `Action ${lastDecision.actionName} failed after ${maxAttempts} attempts`,
    }
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'AI request timed out after 30 seconds' }
      }
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Unknown error during AI-powered app execution' }
  }
}
