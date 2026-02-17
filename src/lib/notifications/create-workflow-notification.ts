import { createServiceRoleClient } from '@/lib/supabase/server'

type WorkflowNotificationType =
  | 'workflow_published'
  | 'workflow_unpublished'
  | 'workflow_run_completed'
  | 'workflow_run_failed'

interface CreateWorkflowNotificationParams {
  userId: string
  teamId: string
  workflowId: string
  workflowName: string
  type: WorkflowNotificationType
  extraMessage?: string
}

const NOTIFICATION_TITLES: Record<WorkflowNotificationType, string> = {
  workflow_published: 'Workflow published',
  workflow_unpublished: 'Workflow unpublished',
  workflow_run_completed: 'Workflow run completed',
  workflow_run_failed: 'Workflow run failed',
}

function buildMessage(params: CreateWorkflowNotificationParams): string {
  switch (params.type) {
    case 'workflow_published':
      return `Your workflow "${params.workflowName}" was published successfully.`
    case 'workflow_unpublished':
      return `Your workflow "${params.workflowName}" was unpublished.`
    case 'workflow_run_completed':
      return `Workflow "${params.workflowName}" completed successfully.${params.extraMessage ? ' ' + params.extraMessage : ''}`
    case 'workflow_run_failed':
      return `Workflow "${params.workflowName}" failed.${params.extraMessage ? ' ' + params.extraMessage : ''}`
  }
}

/**
 * Create a notification for a workflow event.
 * Uses service role client to bypass RLS (called from API routes/server actions).
 * Fire-and-forget — errors are logged but don't throw.
 */
export async function createWorkflowNotification(
  params: CreateWorkflowNotificationParams
): Promise<void> {
  try {
    const supabase = createServiceRoleClient()

    // Check user notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('failures_enabled')
      .eq('user_id', params.userId)
      .single()

    // If failures are disabled and this is a failure notification, skip
    if (params.type === 'workflow_run_failed' && prefs?.failures_enabled === false) {
      return
    }

    await supabase.from('notifications').insert({
      user_id: params.userId,
      team_id: params.teamId,
      workflow_id: params.workflowId,
      type: params.type,
      title: NOTIFICATION_TITLES[params.type],
      message: buildMessage(params),
    })
  } catch (error) {
    console.error('[notifications] Failed to create notification:', error)
  }
}
