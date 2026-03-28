'use server'

import { createServerClient } from '@/lib/supabase/server'
import { safeError, safeDbError } from '@/lib/safe-error'

type ActionResult = { success: boolean; error?: string }

/**
 * Toggles a module's enabled state and pauses/resumes its associated workflows.
 */
export async function toggleModule(moduleId: string, enabled: boolean): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check — verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error: moduleError } = await supabase
    .from('agent_modules' as never)
    .update({ enabled, updated_at: new Date().toISOString() } as never)
    .eq('id', moduleId)

  if (moduleError) {
    return {
      success: false,
      error: safeDbError('modules/toggle-module', moduleError, 'Failed to toggle module'),
    }
  }

  // Update associated workflows: enable if enabling, disable if disabling
  const { error: workflowError } = await supabase
    .from('agent_workflows' as never)
    .update({ is_enabled: enabled } as never)
    .eq('module_id' as never, moduleId)

  if (workflowError) {
    return {
      success: false,
      error: safeDbError(
        'modules/toggle-workflows',
        workflowError,
        'Failed to update module workflows'
      ),
    }
  }

  return { success: true }
}

/**
 * Approves a pending message-approval workflow run output.
 * Updates the output_data status from 'pending_approval' to 'approved'.
 * Actual message sending will be wired in a later phase.
 */
export async function approveMessage(runOutputId: string): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Auth check — verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Fetch current output_data
  const { data: row, error: fetchError } = await supabase
    .from('workflow_run_outputs' as never)
    .select('output_data')
    .eq('id', runOutputId)
    .single()

  if (fetchError || !row) {
    return {
      success: false,
      error: safeError(
        'modules/approve-message',
        fetchError ?? new Error('Run output not found'),
        'Run output not found'
      ),
    }
  }

  const current = (row as { output_data: Record<string, unknown> }).output_data ?? {}
  const updated = { ...current, status: 'approved' }

  const { error: updateError } = await supabase
    .from('workflow_run_outputs' as never)
    .update({ output_data: updated } as never)
    .eq('id', runOutputId)

  if (updateError) {
    return {
      success: false,
      error: safeDbError('modules/approve-message', updateError, 'Failed to approve message'),
    }
  }

  return { success: true }
}
