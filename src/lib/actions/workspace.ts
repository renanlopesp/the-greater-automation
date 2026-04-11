'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Database } from '@/lib/supabase/database.types'
import { getUserTeamRole, canMutate } from '@/lib/auth/require-role'
import { safeDbError } from '@/lib/safe-error'

type WorkflowStatus = Database['public']['Enums']['workflow_status']

type ActionResult<T = void> = T extends void ? { error?: string } : { error?: string } & T

// ---------------------------------------------------------------------------
// 0. switchWorkspaceAction
// ---------------------------------------------------------------------------

export async function switchWorkspaceAction(teamId: string) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: member } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .eq('team_id', teamId)
    .limit(1)
    .single()
  if (!member) return

  const cookieStore = await cookies()
  cookieStore.set('selected_team_id', teamId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: true,
    sameSite: 'lax',
  })
  revalidatePath('/', 'layout')
}

// ---------------------------------------------------------------------------
// 2. deleteWorkflow
// ---------------------------------------------------------------------------

export async function deleteWorkflow(workflowId: string): Promise<ActionResult> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role)) return { error: 'You do not have permission to delete workflows' }

  const supabase = await createServerClient()

  // Verify user has access to this workflow (RLS enforces ownership)
  const { data: workflow, error: accessError } = await supabase
    .from('workflows')
    .select('id')
    .eq('id', workflowId)
    .maybeSingle()

  if (accessError || !workflow) {
    return { error: 'Workflow not found' }
  }

  // Clean up scheduled trigger pg_cron job if applicable
  const { data: trigger } = await supabase
    .from('workflow_triggers')
    .select('type')
    .eq('workflow_id', workflowId)
    .maybeSingle()

  if (trigger?.type === 'scheduled') {
    const serviceClient = createServiceClient()
    const jobName = `scheduled_wf_${workflowId}`
    await serviceClient.rpc('unschedule_cron_job', { job_name: jobName })
  }

  // Delete children explicitly BEFORE the parent to avoid RLS + CASCADE
  // conflict. Child table RLS policies join back to `workflows` for auth,
  // so CASCADE fails if the parent row is already gone. Deleting children
  // first while the parent still exists lets RLS checks pass normally.

  // 1. Get run IDs so we can delete grandchildren (workflow_run_steps)
  const { data: runs } = await supabase
    .from('workflow_runs')
    .select('id')
    .eq('workflow_id', workflowId)

  if (runs && runs.length > 0) {
    const runIds = runs.map((r) => r.id)
    // Delete grandchildren first (parallel — independent tables)
    await Promise.all([
      supabase.from('workflow_run_steps').delete().in('run_id', runIds),
      supabase.from('human_approvals').delete().in('run_id', runIds),
    ])
  }

  // 2. Delete direct children (parallel — independent tables, grandchildren already gone)
  await Promise.all([
    supabase.from('step_test_results').delete().eq('workflow_id', workflowId),
    supabase.from('agent_workflows').delete().eq('workflow_id', workflowId),
    supabase.from('workflow_runs').delete().eq('workflow_id', workflowId),
    supabase.from('workflow_steps').delete().eq('workflow_id', workflowId),
    supabase.from('workflow_triggers').delete().eq('workflow_id', workflowId),
  ])

  // 3. Delete the workflow (no children left, CASCADE is a no-op)
  const { error } = await supabase.from('workflows').delete().eq('id', workflowId)

  if (error) {
    return { error: safeDbError('workspace/delete-workflow', error, 'Failed to delete workflow') }
  }

  revalidatePath('/workspace')
  return {}
}

// ---------------------------------------------------------------------------
// 3. deleteAgent
// ---------------------------------------------------------------------------

export async function deleteAgent(agentId: string): Promise<ActionResult> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role)) return { error: 'You do not have permission to delete agents' }

  const supabase = await createServerClient()

  // Block deletion of orchestrator agents
  const { data: target } = await supabase
    .from('agents')
    .select('is_orchestrator')
    .eq('id', agentId)
    .single()
  if (target?.is_orchestrator) return { error: 'The orchestrator agent cannot be deleted' }

  // Collect workflow IDs created by agent workflows before cascade deletes them
  const { data: workflows } = await supabase
    .from('agent_workflows')
    .select('workflow_id')
    .eq('agent_id', agentId)
    .not('workflow_id', 'is', null)

  const workflowIds = workflows?.map((w) => w.workflow_id).filter(Boolean) as string[] | undefined

  // Delete agent (cascades to workflows, conversations, messages, workflow_runs)
  const { error } = await supabase.from('agents').delete().eq('id', agentId)

  if (error) {
    return { error: safeDbError('workspace/delete-agent', error, 'Failed to delete agent') }
  }

  // Clean up orphaned workflows that were created by the agent's workflows
  if (workflowIds && workflowIds.length > 0) {
    await supabase.from('workflows').delete().in('id', workflowIds)
  }

  revalidatePath('/workspace')
  return {}
}

// ---------------------------------------------------------------------------
// 4. duplicateWorkflow
// ---------------------------------------------------------------------------

/**
 * Generates a copy name from the original workflow name.
 *
 * - "My Workflow"           -> "My Workflow (copy)"
 * - "My Workflow (copy)"    -> "My Workflow (copy 2)"
 * - "My Workflow (copy 2)"  -> "My Workflow (copy 3)"
 * - "My Workflow (copy 42)" -> "My Workflow (copy 43)"
 */
const NUMBERED_COPY_REGEX = /^(.+)\s\(copy\s(\d+)\)$/
const SIMPLE_COPY_REGEX = /^(.+)\s\(copy\)$/

function generateCopyName(name: string): string {
  const numberedMatch = name.match(NUMBERED_COPY_REGEX)
  if (numberedMatch) {
    const baseName = numberedMatch[1]
    const currentNumber = parseInt(numberedMatch[2], 10)
    return `${baseName} (copy ${currentNumber + 1})`
  }

  const simpleMatch = name.match(SIMPLE_COPY_REGEX)
  if (simpleMatch) {
    return `${simpleMatch[1]} (copy 2)`
  }

  return `${name} (copy)`
}

export async function duplicateWorkflow(
  workflowId: string,
  teamId: string,
  userId: string
): Promise<ActionResult<{ id: string }>> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated', id: '' }
  if (!canMutate(info.role))
    return { error: 'You do not have permission to duplicate workflows', id: '' }

  const supabase = await createServerClient()

  // Fetch the source workflow
  const { data: source, error: sourceError } = await supabase
    .from('workflows')
    .select(
      'id, team_id, name, emoji, description, folder_id, status, is_starred, created_by, published_at, created_at, updated_at'
    )
    .eq('id', workflowId)
    .single()

  if (sourceError || !source) {
    return { error: 'Workflow not found', id: '' }
  }

  // Fetch steps and trigger in parallel
  const [stepsResult, triggerResult] = await Promise.all([
    supabase
      .from('workflow_steps')
      .select('id, workflow_id, position, type, name, config, created_at, updated_at')
      .eq('workflow_id', workflowId)
      .order('position', { ascending: true }),
    supabase
      .from('workflow_triggers')
      .select('id, workflow_id, type, config, created_at, updated_at')
      .eq('workflow_id', workflowId)
      .limit(1)
      .single(),
  ])

  // Insert the new workflow as a draft
  const { data: newWorkflow, error: insertError } = await supabase
    .from('workflows')
    .insert({
      team_id: teamId,
      created_by: userId,
      name: generateCopyName(source.name),
      emoji: source.emoji,
      description: source.description,
      folder_id: source.folder_id,
      status: 'draft',
      is_starred: false,
      published_at: null,
    })
    .select('id')
    .single()

  if (insertError || !newWorkflow) {
    return { error: insertError?.message ?? 'Failed to duplicate workflow', id: '' }
  }

  // Copy steps if they exist
  if (stepsResult.data && stepsResult.data.length > 0) {
    const copiedSteps = stepsResult.data.map((step) => ({
      workflow_id: newWorkflow.id,
      position: step.position,
      type: step.type,
      name: step.name,
      config: step.config,
    }))

    const { error: stepsInsertError } = await supabase.from('workflow_steps').insert(copiedSteps)

    if (stepsInsertError) {
      // Clean up the partially created workflow
      await supabase.from('workflows').delete().eq('id', newWorkflow.id)
      return { error: 'Failed to duplicate workflow steps', id: '' }
    }
  }

  // Copy trigger if it exists
  if (triggerResult.data) {
    // Clear webhook_token for webhook triggers so duplicates get their own unique URL
    let triggerConfig = triggerResult.data.config
    if (
      triggerResult.data.type === 'webhook' &&
      triggerConfig &&
      typeof triggerConfig === 'object'
    ) {
      const cleaned = { ...(triggerConfig as Record<string, unknown>) }
      delete cleaned.webhook_token
      delete cleaned.secret
      delete cleaned.encrypted_secret
      triggerConfig = cleaned as typeof triggerConfig
    }

    const { error: triggerInsertError } = await supabase.from('workflow_triggers').insert({
      workflow_id: newWorkflow.id,
      type: triggerResult.data.type,
      config: triggerConfig,
    })

    if (triggerInsertError) {
      // Clean up the partially created workflow (cascade will handle steps)
      await supabase.from('workflows').delete().eq('id', newWorkflow.id)
      return { error: 'Failed to duplicate workflow trigger', id: '' }
    }
  }

  revalidatePath('/workspace')
  return { id: newWorkflow.id }
}

// ---------------------------------------------------------------------------
// 5. renameWorkflow
// ---------------------------------------------------------------------------

export async function renameWorkflow(workflowId: string, name: string): Promise<ActionResult> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { error: 'Workflow name cannot be empty' }
  }

  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role)) return { error: 'You do not have permission to edit workflows' }

  const supabase = await createServerClient()

  const { error } = await supabase
    .from('workflows')
    .update({ name: trimmedName })
    .eq('id', workflowId)

  if (error) {
    return { error: safeDbError('workspace/rename-workflow', error, 'Failed to rename workflow') }
  }

  revalidatePath('/workspace')
  return {}
}

// ---------------------------------------------------------------------------
// 7. bulkDeleteItems
// ---------------------------------------------------------------------------

export async function bulkDeleteItems(
  items: { id: string; type: 'workflow' | 'agent' }[]
): Promise<ActionResult> {
  if (items.length === 0) {
    return {}
  }

  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role)) return { error: 'You do not have permission to delete items' }

  const workflowIds: string[] = []
  const agentIds: string[] = []
  for (const item of items) {
    if (item.type === 'workflow') workflowIds.push(item.id)
    else agentIds.push(item.id)
  }

  const supabase = await createServerClient()
  const errors: string[] = []

  // Delete workflows — must delete children first to avoid RLS + CASCADE conflict
  if (workflowIds.length > 0) {
    // Get run IDs for grandchild deletion
    const { data: runs } = await supabase
      .from('workflow_runs')
      .select('id')
      .in('workflow_id', workflowIds)

    if (runs && runs.length > 0) {
      const runIds = runs.map((r) => r.id)
      await Promise.all([
        supabase.from('workflow_run_steps').delete().in('run_id', runIds),
        supabase.from('human_approvals').delete().in('run_id', runIds),
      ])
    }

    await Promise.all([
      supabase.from('step_test_results').delete().in('workflow_id', workflowIds),
      supabase.from('agent_workflows').delete().in('workflow_id', workflowIds),
      supabase.from('workflow_runs').delete().in('workflow_id', workflowIds),
      supabase.from('workflow_steps').delete().in('workflow_id', workflowIds),
      supabase.from('workflow_triggers').delete().in('workflow_id', workflowIds),
    ])

    const { error } = await supabase.from('workflows').delete().in('id', workflowIds)

    if (error) {
      errors.push(`Failed to delete workflows: ${error.message}`)
    }
  }

  // Delete agents and their workflow-created workflows
  if (agentIds.length > 0) {
    // Filter out orchestrator agents — they cannot be deleted
    const { data: orchestrators } = await supabase
      .from('agents')
      .select('id')
      .in('id', agentIds)
      .eq('is_orchestrator', true)
    const orchestratorIds = new Set((orchestrators ?? []).map((o) => o.id))
    const safeAgentIds = agentIds.filter((id) => !orchestratorIds.has(id))

    if (orchestratorIds.size > 0 && safeAgentIds.length === 0 && workflowIds.length === 0) {
      return { error: 'The orchestrator agent cannot be deleted' }
    }

    // Collect workflow IDs created by agent workflows before cascade deletes them
    const { data: agentWorkflows } =
      safeAgentIds.length > 0
        ? await supabase
            .from('agent_workflows')
            .select('workflow_id')
            .in('agent_id', safeAgentIds)
            .not('workflow_id', 'is', null)
        : { data: null }

    const deletedSet = new Set(workflowIds)
    const agentWorkflowIds: string[] = []
    if (agentWorkflows) {
      for (const w of agentWorkflows) {
        if (w.workflow_id && !deletedSet.has(w.workflow_id)) agentWorkflowIds.push(w.workflow_id)
      }
    }

    if (safeAgentIds.length > 0) {
      const { error } = await supabase.from('agents').delete().in('id', safeAgentIds)

      if (error) {
        errors.push(`Failed to delete agents: ${error.message}`)
      }

      // Clean up orphaned workflows that were created by agent workflows
      if (agentWorkflowIds.length > 0) {
        await supabase.from('workflows').delete().in('id', agentWorkflowIds)
      }
    }
  }

  if (errors.length > 0) {
    return { error: errors.join('; ') }
  }

  revalidatePath('/workspace')
  return {}
}

// ---------------------------------------------------------------------------
// 8. bulkToggleStatus
// ---------------------------------------------------------------------------

export async function bulkToggleStatus(
  workflowIds: string[],
  newStatus: WorkflowStatus
): Promise<ActionResult> {
  if (workflowIds.length === 0) {
    return {}
  }

  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role))
    return { error: 'You do not have permission to change workflow status' }

  const supabase = await createServerClient()

  const updatePayload: { status: WorkflowStatus; published_at: string | null } = {
    status: newStatus,
    published_at: newStatus === 'published' ? new Date().toISOString() : null,
  }

  const { error } = await supabase.from('workflows').update(updatePayload).in('id', workflowIds)

  if (error) {
    return {
      error: safeDbError(
        'workspace/update-workflow-status',
        error,
        'Failed to update workflow status'
      ),
    }
  }

  revalidatePath('/workspace')
  return {}
}

// ---------------------------------------------------------------------------
// 9. createFolder
// ---------------------------------------------------------------------------

export async function createFolder(
  teamId: string,
  name: string,
  parentId?: string | null
): Promise<ActionResult<{ id: string }>> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { error: 'Folder name is required', id: '' }
  }
  if (trimmedName.length > 100) {
    return { error: 'Folder name must be 100 characters or less', id: '' }
  }

  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated', id: '' }
  if (!canMutate(info.role))
    return { error: 'You do not have permission to create folders', id: '' }

  const supabase = await createServerClient()

  // Validate depth if parentId is provided (max 3 levels)
  if (parentId) {
    // Fetch all team folders and walk up in memory
    const { data: allFolders } = await supabase
      .from('folders')
      .select('id, parent_id')
      .eq('team_id', teamId)
    const folderMap = new Map((allFolders ?? []).map((f) => [f.id, f.parent_id]))
    let depth = 0
    let cur: string | null = parentId
    while (cur) {
      depth++
      if (depth >= 3) {
        return { error: 'Maximum folder depth reached (3 levels)', id: '' }
      }
      cur = folderMap.get(cur) ?? null
    }
  }

  const { data, error } = await supabase
    .from('folders')
    .insert({
      team_id: teamId,
      name: trimmedName,
      parent_id: parentId ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Failed to create folder', id: '' }
  }

  revalidatePath('/workspace')
  return { id: data.id }
}

// ---------------------------------------------------------------------------
// 10. renameFolder
// ---------------------------------------------------------------------------

export async function renameFolder(folderId: string, name: string): Promise<ActionResult> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { error: 'Folder name is required' }
  }

  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role)) return { error: 'You do not have permission to edit folders' }

  const supabase = await createServerClient()

  const { error } = await supabase.from('folders').update({ name: trimmedName }).eq('id', folderId)

  if (error) {
    return { error: safeDbError('workspace/rename-folder', error, 'Failed to rename folder') }
  }

  revalidatePath('/workspace')
  return {}
}

// ---------------------------------------------------------------------------
// 11. deleteFolder
// ---------------------------------------------------------------------------

export async function deleteFolder(
  folderId: string,
  mode: 'move-to-root' | 'delete-all'
): Promise<ActionResult> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role)) return { error: 'You do not have permission to delete folders' }

  const supabase = await createServerClient()

  if (mode === 'move-to-root') {
    // Move workflows to root
    const { error: moveWorkflowsError } = await supabase
      .from('workflows')
      .update({ folder_id: null })
      .eq('folder_id', folderId)

    if (moveWorkflowsError) {
      return { error: 'Failed to move workflows to root' }
    }

    // Move subfolders to root
    const { error: moveSubfoldersError } = await supabase
      .from('folders')
      .update({ parent_id: null })
      .eq('parent_id', folderId)

    if (moveSubfoldersError) {
      return { error: 'Failed to move subfolders to root' }
    }
  } else {
    // delete-all mode: recursively delete all descendants
    // First collect all descendant folder IDs
    const descendantIds: string[] = []
    const queue = [folderId]
    while (queue.length > 0) {
      const currentId = queue.shift()!
      const { data: children } = await supabase
        .from('folders')
        .select('id')
        .eq('parent_id', currentId)

      if (children) {
        for (const child of children) {
          descendantIds.push(child.id)
          queue.push(child.id)
        }
      }
    }

    // Delete workflows in all descendant folders (children first to avoid RLS + CASCADE)
    const allFolderIds = [folderId, ...descendantIds]
    if (allFolderIds.length > 0) {
      const { data: folderWorkflows } = await supabase
        .from('workflows')
        .select('id')
        .in('folder_id', allFolderIds)

      if (folderWorkflows && folderWorkflows.length > 0) {
        const wfIds = folderWorkflows.map((w) => w.id)

        const { data: runs } = await supabase
          .from('workflow_runs')
          .select('id')
          .in('workflow_id', wfIds)

        if (runs && runs.length > 0) {
          const runIds = runs.map((r) => r.id)
          await Promise.all([
            supabase.from('workflow_run_steps').delete().in('run_id', runIds),
            supabase.from('human_approvals').delete().in('run_id', runIds),
          ])
        }

        await Promise.all([
          supabase.from('step_test_results').delete().in('workflow_id', wfIds),
          supabase.from('agent_workflows').delete().in('workflow_id', wfIds),
          supabase.from('workflow_runs').delete().in('workflow_id', wfIds),
          supabase.from('workflow_steps').delete().in('workflow_id', wfIds),
          supabase.from('workflow_triggers').delete().in('workflow_id', wfIds),
        ])

        const { error: deleteWorkflowsError } = await supabase
          .from('workflows')
          .delete()
          .in('id', wfIds)

        if (deleteWorkflowsError) {
          return { error: 'Failed to delete workflows in folder' }
        }
      }
    }

    // Delete descendant folders (single atomic query — Postgres handles FK order)
    if (descendantIds.length > 0) {
      await supabase.from('folders').delete().in('id', descendantIds)
    }
  }

  // Delete the folder itself
  const { error } = await supabase.from('folders').delete().eq('id', folderId)

  if (error) {
    return { error: safeDbError('workspace/delete-folder', error, 'Failed to delete folder') }
  }

  revalidatePath('/workspace')
  return {}
}

// ---------------------------------------------------------------------------
// 12. moveToFolder
// ---------------------------------------------------------------------------

export async function moveToFolder(
  itemIds: string[],
  folderId: string | null
): Promise<ActionResult> {
  if (itemIds.length === 0) {
    return { error: 'At least one item must be selected' }
  }

  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role)) return { error: 'You do not have permission to move items' }

  const supabase = await createServerClient()

  // Validate target folder exists (if not moving to root)
  if (folderId) {
    const { data: folder } = await supabase.from('folders').select('id').eq('id', folderId).single()

    if (!folder) {
      return { error: 'Target folder not found' }
    }
  }

  const { error } = await supabase
    .from('workflows')
    .update({ folder_id: folderId })
    .in('id', itemIds)

  if (error) {
    return { error: safeDbError('workspace/move-items', error, 'Failed to move items') }
  }

  revalidatePath('/workspace')
  return {}
}
