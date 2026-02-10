'use step'

import { FatalError } from 'workflow'
import type { AppStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface AppStepOutput {
  app_id: string
  action: string
  result: unknown
}

export async function appStep(config: AppStepConfig): Promise<AppStepOutput> {
  const { app_id, action, inputs } = config

  if (!app_id) {
    throw new FatalError('App step requires an app_id')
  }

  if (!action) {
    throw new FatalError('App step requires an action')
  }

  try {
    // Route to the appropriate app integration
    const result = await executeAppAction(app_id, action, inputs)

    return {
      app_id,
      action,
      result,
    }
  } catch (error) {
    if (error instanceof FatalError) {
      throw error
    }

    if (error instanceof Error) {
      // Check for non-retryable errors
      if (
        error.message.includes('not found') ||
        error.message.includes('unauthorized') ||
        error.message.includes('invalid')
      ) {
        throw new FatalError(`App action failed: ${error.message}`)
      }
      throw error
    }

    throw new Error('App step failed')
  }
}

// Execute an action for a specific app integration
async function executeAppAction(
  appId: string,
  action: string,
  inputs: Record<string, unknown>
): Promise<unknown> {
  // In a real implementation, this would:
  // 1. Look up the app connection/credentials from the database
  // 2. Route to the appropriate app integration handler
  // 3. Execute the action using the app's API
  // 4. Return the result

  // App integration handlers would be in separate modules like:
  // - src/integrations/slack/actions.ts
  // - src/integrations/github/actions.ts
  // - src/integrations/google-sheets/actions.ts
  // etc.

  // For now, return a placeholder
  // TODO: Implement app integration routing

  const appHandlers: Record<
    string,
    (action: string, inputs: Record<string, unknown>) => Promise<unknown>
  > = {
    slack: handleSlackAction,
    github: handleGithubAction,
    // Add more app handlers here
  }

  const handler = appHandlers[appId]
  if (!handler) {
    throw new FatalError(`Unsupported app: ${appId}`)
  }

  return handler(action, inputs)
}

// Placeholder app handlers - replace with actual integrations
async function handleSlackAction(
  action: string,
  inputs: Record<string, unknown>
): Promise<unknown> {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 100))

  return {
    app: 'slack',
    action,
    success: true,
    message: `Slack ${action} completed`,
    inputs,
  }
}

async function handleGithubAction(
  action: string,
  inputs: Record<string, unknown>
): Promise<unknown> {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 100))

  return {
    app: 'github',
    action,
    success: true,
    message: `GitHub ${action} completed`,
    inputs,
  }
}
