'use step'

import { FatalError } from 'workflow'
import type { AppStepConfig } from '@/lib/workflow-editor/step-defaults'
import { executeAppAction } from '@/lib/oauth/app-handlers'

export interface AppStepOutput {
  app_id: string
  action: string
  result: unknown
}

export async function appStep(config: AppStepConfig): Promise<AppStepOutput> {
  const { app_id, action, inputs } = config

  if (!app_id) throw new FatalError('App step requires an app_id')
  if (!action) throw new FatalError('App step requires an action')

  // Access token should be injected into inputs by the executor
  const accessToken = (inputs as Record<string, unknown>)?._access_token as string
  if (!accessToken) {
    throw new FatalError(
      `No access token available for ${app_id}. Connect the app in Settings > Integrations.`
    )
  }

  const result = await executeAppAction(config, accessToken)

  if (!result.success) {
    throw new FatalError(result.error || `${app_id} ${action} failed`)
  }

  return { app_id: result.app_id, action: result.action, result: result.result }
}
