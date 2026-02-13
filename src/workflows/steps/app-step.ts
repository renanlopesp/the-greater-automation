'use step'

import { FatalError } from 'workflow'
import type { AppStepConfig } from '@/lib/workflow-editor/step-defaults'
import { getComposio } from '@/lib/composio/client'
import { getComposioActionName } from '@/lib/composio/action-map'

export interface AppStepOutput {
  app_id: string
  action: string
  result: unknown
}

export async function appStep(config: AppStepConfig): Promise<AppStepOutput> {
  const { app_id, action, inputs } = config

  if (!app_id) throw new FatalError('App step requires an app_id')
  if (!action) throw new FatalError('App step requires an action')

  // The composio_connection_id should be injected into inputs by the executor
  const connectedAccountId = (inputs as Record<string, unknown>)?._composio_connection_id as string
  if (!connectedAccountId) {
    throw new FatalError(
      `No Composio connection found for ${app_id}. Connect the app in Settings > Integrations.`
    )
  }

  const composio = getComposio()
  const actionName = getComposioActionName(app_id, action)

  // Strip internal fields from inputs before sending to Composio
  const actionInputs = { ...inputs } as Record<string, unknown>
  delete actionInputs._composio_connection_id

  const result = await composio.actions.execute({
    actionName,
    requestBody: {
      connectedAccountId,
      input: actionInputs,
    },
  })

  const response = result as { successful?: boolean; data?: unknown; error?: string }

  if (!response.successful) {
    throw new FatalError(response.error || `${app_id} ${action} failed`)
  }

  return { app_id, action, result: response.data }
}
