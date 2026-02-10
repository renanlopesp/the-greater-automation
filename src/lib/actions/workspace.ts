'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import type { WorkflowStatus } from '@/lib/supabase/database.types'
import { WORKFLOW_TEMPLATES } from '@/lib/data/workflow-templates'

type ActionResult<T = void> = T extends void ? { error?: string } : { error?: string } & T

// ---------------------------------------------------------------------------
// 1. createWorkflow
// ---------------------------------------------------------------------------

export async function createWorkflow(
  teamId: string,
  userId: string
): Promise<ActionResult<{ id: string }>> {
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

  revalidatePath('/workspace')
  return { id: data.id }
}

// ---------------------------------------------------------------------------
// 2. deleteWorkflow
// ---------------------------------------------------------------------------

export async function deleteWorkflow(workflowId: string): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Check for active runs before deleting
  const { data: activeRuns, error: runsError } = await supabase
    .from('workflow_runs')
    .select('id')
    .eq('workflow_id', workflowId)
    .in('status', ['pending', 'running'])
    .limit(1)

  if (runsError) {
    return { error: 'Failed to check workflow runs' }
  }

  if (activeRuns && activeRuns.length > 0) {
    return {
      error: 'Cannot delete workflow with active runs. Cancel or wait for runs to complete.',
    }
  }

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
  const supabase = await createServerClient()

  const { error } = await supabase.from('agents').delete().eq('id', agentId)

  if (error) {
    return { error: error.message ?? 'Failed to delete agent' }
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
function generateCopyName(name: string): string {
  const numberedCopyRegex = /^(.+)\s\(copy\s(\d+)\)$/
  const simpleCopyRegex = /^(.+)\s\(copy\)$/

  const numberedMatch = name.match(numberedCopyRegex)
  if (numberedMatch) {
    const baseName = numberedMatch[1]
    const currentNumber = parseInt(numberedMatch[2], 10)
    return `${baseName} (copy ${currentNumber + 1})`
  }

  const simpleMatch = name.match(simpleCopyRegex)
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
    const { error: triggerInsertError } = await supabase.from('workflow_triggers').insert({
      workflow_id: newWorkflow.id,
      type: triggerResult.data.type,
      config: triggerResult.data.config,
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

  const workflowIds = items.filter((i) => i.type === 'workflow').map((i) => i.id)
  const agentIds = items.filter((i) => i.type === 'agent').map((i) => i.id)

  const supabase = await createServerClient()

  // Check for active runs on all workflows being deleted
  if (workflowIds.length > 0) {
    const { data: activeRuns, error: runsError } = await supabase
      .from('workflow_runs')
      .select('id')
      .in('workflow_id', workflowIds)
      .in('status', ['pending', 'running'])
      .limit(1)

    if (runsError) {
      return { error: 'Failed to check workflow runs' }
    }

    if (activeRuns && activeRuns.length > 0) {
      return {
        error: 'Cannot delete workflows with active runs. Cancel or wait for runs to complete.',
      }
    }
  }

  const errors: string[] = []

  // Delete workflows
  if (workflowIds.length > 0) {
    const { error } = await supabase.from('workflows').delete().in('id', workflowIds)

    if (error) {
      errors.push(`Failed to delete workflows: ${error.message}`)
    }
  }

  // Delete agents
  if (agentIds.length > 0) {
    const { error } = await supabase.from('agents').delete().in('id', agentIds)

    if (error) {
      errors.push(`Failed to delete agents: ${error.message}`)
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

    // Delete workflows in all descendant folders
    const allFolderIds = [folderId, ...descendantIds]
    if (allFolderIds.length > 0) {
      const { error: deleteWorkflowsError } = await supabase
        .from('workflows')
        .delete()
        .in('folder_id', allFolderIds)

      if (deleteWorkflowsError) {
        return { error: 'Failed to delete workflows in folder' }
      }
    }

    // Delete descendant folders (deepest first)
    for (const id of descendantIds.reverse()) {
      await supabase.from('folders').delete().eq('id', id)
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
