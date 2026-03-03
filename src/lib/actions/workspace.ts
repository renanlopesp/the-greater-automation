'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Database } from '@/lib/supabase/database.types'
import { getUserTeamRole, canMutate } from '@/lib/auth/require-role'

type WorkflowStatus = Database['public']['Enums']['workflow_status']
type TriggerType = Database['public']['Enums']['trigger_type']
type StepType = Database['public']['Enums']['step_type']
import { WORKFLOW_TEMPLATES } from '@/lib/data/workflow-templates'
import { encryptSecret, decryptSecret, generateWebhookSecret } from '@/lib/crypto'
import { fetchWorkflowForEditor } from '@/lib/queries/workflow-editor'
import type { WebhookTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'
import {
  createTrigger,
  enableTrigger,
  deleteTrigger as deleteComposioTrigger,
} from '@/lib/composio/triggers'
import { createWorkflowNotification } from '@/lib/notifications/create-workflow-notification'

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
// 1. createWorkflow
// ---------------------------------------------------------------------------

export async function createWorkflow(
  teamId: string,
  userId: string
): Promise<ActionResult<{ id: string }>> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated', id: '' }
  if (!canMutate(info.role))
    return { error: 'You do not have permission to create workflows', id: '' }

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('workflows')
    .insert({
      team_id: teamId,
      created_by: userId,
      name: 'Untitled Workflow',
      emoji: '\uD83D\uDCCB',
      status: 'draft',
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Failed to create workflow', id: '' }
  }

  // Insert default manual trigger so publish works immediately
  await supabase.from('workflow_triggers').insert({
    workflow_id: data.id,
    type: 'manual',
    config: { run_inputs: [] },
  })

  revalidatePath('/workspace')
  return { id: data.id }
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
    return { error: error.message ?? 'Failed to delete workflow' }
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
    return { error: error.message ?? 'Failed to delete agent' }
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
    .select('*')
    .eq('id', workflowId)
    .single()

  if (sourceError || !source) {
    return { error: 'Workflow not found', id: '' }
  }

  // Fetch steps and trigger in parallel
  const [stepsResult, triggerResult] = await Promise.all([
    supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('position', { ascending: true }),
    supabase.from('workflow_triggers').select('*').eq('workflow_id', workflowId).limit(1).single(),
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
    return { error: error.message ?? 'Failed to rename workflow' }
  }

  revalidatePath('/workspace')
  return {}
}

// ---------------------------------------------------------------------------
// 6. createWorkflowFromTemplate
// ---------------------------------------------------------------------------

export async function createWorkflowFromTemplate(
  teamId: string,
  userId: string,
  templateId: string
): Promise<ActionResult<{ id: string }>> {
  const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId)
  if (!template) {
    return { error: 'Template not found', id: '' }
  }

  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated', id: '' }
  if (!canMutate(info.role))
    return { error: 'You do not have permission to create workflows', id: '' }

  const supabase = await createServerClient()

  // Create the workflow from the template
  const { data: newWorkflow, error: workflowError } = await supabase
    .from('workflows')
    .insert({
      team_id: teamId,
      created_by: userId,
      name: template.name,
      emoji: template.emoji,
      description: template.description,
      status: 'draft',
    })
    .select('id')
    .single()

  if (workflowError || !newWorkflow) {
    return { error: workflowError?.message ?? 'Failed to create workflow from template', id: '' }
  }

  // Insert template steps
  if (template.steps.length > 0) {
    const steps = template.steps.map((step) => ({
      workflow_id: newWorkflow.id,
      position: step.position,
      type: step.type,
      name: step.name,
      config: step.config,
    }))

    const { error: stepsError } = await supabase.from('workflow_steps').insert(steps)

    if (stepsError) {
      await supabase.from('workflows').delete().eq('id', newWorkflow.id)
      return { error: 'Failed to create workflow steps from template', id: '' }
    }
  }

  // Insert template trigger
  const { error: triggerError } = await supabase.from('workflow_triggers').insert({
    workflow_id: newWorkflow.id,
    type: template.trigger.type,
    config: template.trigger.config,
  })

  if (triggerError) {
    await supabase.from('workflows').delete().eq('id', newWorkflow.id)
    return { error: 'Failed to create workflow trigger from template', id: '' }
  }

  revalidatePath('/workspace')
  return { id: newWorkflow.id }
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
    return { error: error.message ?? 'Failed to update workflow status' }
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
    return { error: error.message ?? 'Failed to rename folder' }
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
    return { error: error.message ?? 'Failed to delete folder' }
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
    return { error: error.message ?? 'Failed to move items' }
  }

  revalidatePath('/workspace')
  return {}
}

// ---------------------------------------------------------------------------
// 13a. getWorkflowForEditor (server-side fetch with decryption)
// ---------------------------------------------------------------------------

export async function getWorkflowForEditor(workflowId: string) {
  const supabase = await createServerClient()
  const data = await fetchWorkflowForEditor(supabase, workflowId)
  if (!data) return null

  // Decrypt webhook secret server-side (Node.js crypto available here)
  if (data.trigger.type === 'webhook') {
    const whConfig = data.trigger.config as WebhookTriggerConfig
    if (whConfig.encrypted_secret) {
      const plaintext = decryptSecret(whConfig.encrypted_secret)
      data.trigger = {
        ...data.trigger,
        config: { ...whConfig, secret: plaintext, encrypted_secret: undefined },
      }
    }
  }

  return data
}

// ---------------------------------------------------------------------------
// 13b. saveWorkflow
// ---------------------------------------------------------------------------

export async function saveWorkflow(
  workflowId: string,
  data: {
    name: string
    emoji: string
    isStarred: boolean
    trigger: {
      type: TriggerType
      config: Record<string, unknown>
    } | null
    steps: Array<{
      type: StepType
      name: string
      position: number
      config: Record<string, unknown>
    }>
  }
): Promise<ActionResult<{ savedAt: string }>> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated', savedAt: '' }
  if (!canMutate(info.role))
    return { error: 'You do not have permission to edit workflows', savedAt: '' }

  const supabase = await createServerClient()

  // Update workflow metadata
  const { error: workflowError } = await supabase
    .from('workflows')
    .update({
      name: data.name,
      emoji: data.emoji,
      is_starred: data.isStarred,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workflowId)

  if (workflowError) {
    return { error: workflowError.message, savedAt: '' }
  }

  // Clean up old Composio trigger if the previous trigger was an app trigger
  {
    const { data: oldTrigger } = await supabase
      .from('workflow_triggers')
      .select('type, config')
      .eq('workflow_id', workflowId)
      .eq('type', 'app')
      .single()

    if (oldTrigger) {
      const oldConfig = oldTrigger.config as Record<string, unknown> | null
      const oldComposioId = oldConfig?.composio_trigger_id as string | undefined
      if (oldComposioId) {
        try {
          await deleteComposioTrigger(oldComposioId)
        } catch {
          // Ignore cleanup errors — trigger may already be deleted in Composio
        }
      }
    }
  }

  // Handle trigger (delete existing + insert new if provided)
  const { error: triggerDeleteError } = await supabase
    .from('workflow_triggers')
    .delete()
    .eq('workflow_id', workflowId)

  if (triggerDeleteError) {
    return { error: triggerDeleteError.message, savedAt: '' }
  }

  if (data.trigger) {
    let triggerConfig = data.trigger.config

    // For webhook triggers: encrypt plaintext secret if sent from client (regenerate)
    if (data.trigger.type === 'webhook') {
      const webhookConfig = triggerConfig as unknown as {
        secret?: string
        encrypted_secret?: string
      }
      if (webhookConfig.secret) {
        triggerConfig = {
          ...triggerConfig,
          encrypted_secret: encryptSecret(webhookConfig.secret),
          secret: undefined,
        }
      }
    }

    // For app triggers: create a Composio trigger subscription so events are delivered
    if (data.trigger.type === 'app') {
      const appConfig = triggerConfig as unknown as {
        app_id?: string
        event?: string
        trigger_config?: Record<string, string>
      }
      if (appConfig.app_id && appConfig.event) {
        try {
          // Look up the user's connected account for this app
          const { data: connection } = await supabase
            .from('app_connections')
            .select('composio_connection_id')
            .eq('user_id', info.userId)
            .eq('app_id', appConfig.app_id)
            .single()

          if (connection?.composio_connection_id) {
            const composioTriggerId = await createTrigger({
              userId: info.userId,
              triggerSlug: appConfig.event,
              connectedAccountId: connection.composio_connection_id,
              triggerConfig: (appConfig.trigger_config as Record<string, unknown>) ?? {},
            })
            await enableTrigger(composioTriggerId)
            triggerConfig = { ...triggerConfig, composio_trigger_id: composioTriggerId }
          }
        } catch (error) {
          console.error('Failed to create Composio trigger:', error)
          // Don't fail the save — the trigger config is still saved for retry
        }
      }
    }

    const { error: triggerError } = await supabase.from('workflow_triggers').insert({
      workflow_id: workflowId,
      type: data.trigger.type,
      config:
        triggerConfig as unknown as Database['public']['Tables']['workflow_triggers']['Insert']['config'],
    })

    if (triggerError) {
      return { error: triggerError.message, savedAt: '' }
    }
  }

  // Handle steps (delete all + insert new)
  const { error: stepsDeleteError } = await supabase
    .from('workflow_steps')
    .delete()
    .eq('workflow_id', workflowId)

  if (stepsDeleteError) {
    return { error: stepsDeleteError.message, savedAt: '' }
  }

  if (data.steps.length > 0) {
    const { error: stepsError } = await supabase.from('workflow_steps').insert(
      data.steps.map((step) => ({
        workflow_id: workflowId,
        position: step.position,
        type: step.type,
        name: step.name,
        config:
          step.config as unknown as Database['public']['Tables']['workflow_steps']['Insert']['config'],
      }))
    )

    if (stepsError) {
      return { error: stepsError.message, savedAt: '' }
    }
  }

  return { savedAt: new Date().toISOString() }
}

// ---------------------------------------------------------------------------
// 14. publishWorkflow
// ---------------------------------------------------------------------------

export async function publishWorkflow(
  workflowId: string,
  status: WorkflowStatus
): Promise<ActionResult<{ webhookToken?: string; webhookSecret?: string }>> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role)) return { error: 'You do not have permission to publish workflows' }

  const supabase = await createServerClient()

  let generatedWebhookToken: string | undefined
  let generatedWebhookSecret: string | undefined

  // If publishing, verify workflow has trigger and at least 1 step
  if (status === 'published') {
    const { data: trigger } = await supabase
      .from('workflow_triggers')
      .select('id, type, config')
      .eq('workflow_id', workflowId)
      .single()

    const { data: steps } = await supabase
      .from('workflow_steps')
      .select('id')
      .eq('workflow_id', workflowId)

    if (!trigger) {
      return { error: 'Cannot publish workflow without a trigger' }
    }

    if (!steps || steps.length === 0) {
      return { error: 'Cannot publish workflow without at least one step' }
    }

    // Generate webhook token and secret for webhook triggers on publish
    if (trigger.type === 'webhook') {
      const config = trigger.config as Record<string, unknown>
      let needsUpdate = false
      const updatedConfig = { ...config }

      if (!config.webhook_token) {
        generatedWebhookToken = crypto.randomUUID()
        updatedConfig.webhook_token = generatedWebhookToken
        needsUpdate = true
      }

      if (!config.encrypted_secret) {
        const plaintextSecret = generateWebhookSecret()
        generatedWebhookSecret = plaintextSecret
        updatedConfig.encrypted_secret = encryptSecret(plaintextSecret)
        updatedConfig.secret = undefined
        needsUpdate = true
      }

      if (needsUpdate) {
        await supabase
          .from('workflow_triggers')
          .update({
            config:
              updatedConfig as Database['public']['Tables']['workflow_triggers']['Update']['config'],
          })
          .eq('id', trigger.id)
      }
    }

    // Create Composio trigger subscription for app triggers on publish
    if (trigger.type === 'app') {
      const config = trigger.config as Record<string, unknown>
      const appId = config.app_id as string
      const event = config.event as string

      if (!appId || !event) {
        return { error: 'App trigger requires both an app and an event' }
      }

      // Only create if not already subscribed
      if (!config.composio_trigger_id) {
        // Look up the connected account for this app
        const { data: connection } = await supabase
          .from('app_connections')
          .select('composio_connection_id')
          .eq('app_id', appId)
          .single()

        if (!connection?.composio_connection_id) {
          return {
            error: `App "${appId}" is not connected. Connect it in Settings first.`,
          }
        }

        try {
          const triggerConfig = (config.trigger_config ?? {}) as Record<string, unknown>
          const composioTriggerId = await createTrigger({
            userId: info.userId,
            triggerSlug: event,
            connectedAccountId: connection.composio_connection_id,
            triggerConfig,
          })
          await enableTrigger(composioTriggerId)

          // Store composio_trigger_id in trigger config
          await supabase
            .from('workflow_triggers')
            .update({
              config: {
                ...config,
                composio_trigger_id: composioTriggerId,
              } as Database['public']['Tables']['workflow_triggers']['Update']['config'],
            })
            .eq('id', trigger.id)
        } catch (triggerError) {
          return {
            error: `Failed to create app trigger: ${triggerError instanceof Error ? triggerError.message : 'Unknown error'}`,
          }
        }
      }
    }
  }

  const updateData: {
    status: WorkflowStatus
    updated_at: string
    published_at?: string | null
  } = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'published') {
    updateData.published_at = new Date().toISOString()
  } else {
    updateData.published_at = null

    // Clean up trigger subscriptions when unpublishing
    const { data: trigger } = await supabase
      .from('workflow_triggers')
      .select('id, type, config')
      .eq('workflow_id', workflowId)
      .single()

    if (trigger?.type === 'scheduled') {
      const serviceClient = createServiceClient()
      await serviceClient.rpc('unschedule_cron_job', {
        job_name: `scheduled_wf_${workflowId}`,
      })
    }

    // Delete Composio trigger subscription for app triggers
    if (trigger?.type === 'app') {
      const config = trigger.config as Record<string, unknown>
      const composioTriggerId = config?.composio_trigger_id as string | undefined
      if (composioTriggerId) {
        await deleteComposioTrigger(composioTriggerId).catch(() => {
          // Best-effort cleanup
        })
        // Remove composio_trigger_id from config
        const cleanedConfig = { ...config }
        delete (cleanedConfig as Record<string, unknown>).composio_trigger_id
        await supabase
          .from('workflow_triggers')
          .update({
            config:
              cleanedConfig as Database['public']['Tables']['workflow_triggers']['Update']['config'],
          })
          .eq('id', trigger.id)
      }
    }
  }

  const { error: updateError } = await supabase
    .from('workflows')
    .update(updateData)
    .eq('id', workflowId)

  if (updateError) {
    return { error: updateError.message }
  }

  // Fire-and-forget notification for publish/unpublish
  const { data: workflow } = await supabase
    .from('workflows')
    .select('name, team_id')
    .eq('id', workflowId)
    .single()

  if (workflow) {
    createWorkflowNotification({
      userId: info.userId,
      teamId: workflow.team_id,
      workflowId,
      workflowName: workflow.name,
      type: status === 'published' ? 'workflow_published' : 'workflow_unpublished',
    }).catch(() => {})
  }

  revalidatePath('/workspace')
  return { webhookToken: generatedWebhookToken, webhookSecret: generatedWebhookSecret }
}

// ---------------------------------------------------------------------------
// 15. startWorkflowRun
// ---------------------------------------------------------------------------

export async function startWorkflowRun(
  workflowId: string
): Promise<ActionResult<{ runId: string }>> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized', runId: '' }
  }

  // Load workflow
  const { data: workflow, error: workflowError } = await supabase
    .from('workflows')
    .select('id, team_id, name, status')
    .eq('id', workflowId)
    .single()

  if (workflowError || !workflow) {
    return { error: 'Workflow not found', runId: '' }
  }

  if (workflow.status !== 'published') {
    return { error: 'Workflow must be published to run', runId: '' }
  }

  // Load trigger
  const { data: trigger, error: triggerError } = await supabase
    .from('workflow_triggers')
    .select('type, config')
    .eq('workflow_id', workflowId)
    .single()

  if (triggerError || !trigger) {
    return { error: 'Workflow trigger not configured', runId: '' }
  }

  // Load steps
  const { data: steps, error: stepsError } = await supabase
    .from('workflow_steps')
    .select('id, position, type, name, config')
    .eq('workflow_id', workflowId)
    .order('position', { ascending: true })

  if (stepsError || !steps || steps.length === 0) {
    return { error: 'Workflow has no steps configured', runId: '' }
  }

  // Create workflow run record
  const { data: run, error: runError } = await supabase
    .from('workflow_runs')
    .insert({
      workflow_id: workflowId,
      status: 'pending',
      trigger_type: trigger.type,
      trigger_data: {},
      steps_used: 0,
      ai_credits_used: 0,
    })
    .select()
    .single()

  if (runError || !run) {
    return { error: 'Failed to create workflow run', runId: '' }
  }

  // Create workflow_run_steps records
  const runSteps = steps.map((step) => ({
    run_id: run.id,
    step_id: step.id,
    step_position: step.position,
    step_type: step.type,
    status: 'pending' as const,
    input: {},
    output: {},
  }))

  const { error: runStepsError } = await supabase.from('workflow_run_steps').insert(runSteps)

  if (runStepsError) {
    return { error: 'Failed to initialize run steps', runId: '' }
  }

  // Return immediately — execution happens via POST /api/workflows/[id]/runs/[runId]/execute
  return { runId: run.id }
}
