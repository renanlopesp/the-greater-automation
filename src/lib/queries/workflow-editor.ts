import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { WorkflowTrigger } from '@/lib/workflow-editor/trigger-defaults'
import type { WorkflowStep } from '@/lib/workflow-editor/step-defaults'
import { getTriggerDefaultConfig } from '@/lib/workflow-editor/trigger-defaults'

type Client = SupabaseClient<Database>

export interface WorkflowEditorData {
  workflowId: string
  workflowName: string
  workflowEmoji: string
  isStarred: boolean
  workflowStatus: 'draft' | 'published'
  trigger: WorkflowTrigger
  steps: WorkflowStep[]
}

export async function fetchWorkflowForEditor(
  supabase: Client,
  workflowId: string
): Promise<WorkflowEditorData | null> {
  // Fetch workflow, trigger, and steps in parallel (independent queries)
  const [{ data: workflow }, { data: triggerRow }, { data: stepRows }] = await Promise.all([
    supabase
      .from('workflows')
      .select('id, name, emoji, is_starred, status')
      .eq('id', workflowId)
      .single(),
    supabase
      .from('workflow_triggers')
      .select('type, config')
      .eq('workflow_id', workflowId)
      .maybeSingle(),
    supabase
      .from('workflow_steps')
      .select('id, type, name, config, position')
      .eq('workflow_id', workflowId)
      .order('position', { ascending: true }),
  ])

  if (!workflow) return null

  const trigger: WorkflowTrigger = triggerRow
    ? { type: triggerRow.type, config: triggerRow.config as unknown as WorkflowTrigger['config'] }
    : { type: 'manual', config: getTriggerDefaultConfig('manual') }

  const steps: WorkflowStep[] = (stepRows ?? []).map((s) => ({
    id: s.id,
    type: s.type,
    name: s.name,
    position: s.position,
    config: s.config as unknown as WorkflowStep['config'],
  }))

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    workflowEmoji: workflow.emoji ?? '',
    isStarred: workflow.is_starred,
    workflowStatus: workflow.status as 'draft' | 'published',
    trigger,
    steps,
  }
}

export async function saveWorkflowConfig(
  supabase: Client,
  workflowId: string,
  data: {
    name: string
    emoji: string
    isStarred: boolean
    trigger: WorkflowTrigger
    steps: WorkflowStep[]
  }
) {
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

  if (workflowError) throw workflowError

  // Handle trigger (delete existing + insert new if provided)
  await supabase.from('workflow_triggers').delete().eq('workflow_id', workflowId)

  if (data.trigger) {
    const { error: triggerError } = await supabase.from('workflow_triggers').insert({
      workflow_id: workflowId,
      type: data.trigger.type,
      config: data.trigger
        .config as unknown as Database['public']['Tables']['workflow_triggers']['Insert']['config'],
    })

    if (triggerError) throw triggerError
  }

  // Handle steps (delete all + insert new)
  await supabase.from('workflow_steps').delete().eq('workflow_id', workflowId)

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

    if (stepsError) throw stepsError
  }

  return { success: true, savedAt: new Date().toISOString() }
}

export async function updateWorkflowStatus(
  supabase: Client,
  workflowId: string,
  status: Database['public']['Tables']['workflows']['Row']['status']
) {
  // If publishing, verify workflow has trigger and at least 1 step
  if (status === 'published') {
    const [{ data: trigger }, { data: steps }] = await Promise.all([
      supabase.from('workflow_triggers').select('id').eq('workflow_id', workflowId).single(),
      supabase.from('workflow_steps').select('id').eq('workflow_id', workflowId),
    ])

    if (!trigger) {
      throw new Error('Cannot publish workflow without a trigger')
    }

    if (!steps || steps.length === 0) {
      throw new Error('Cannot publish workflow without at least one step')
    }
  }

  const updateData: Database['public']['Tables']['workflows']['Update'] = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'published') {
    updateData.published_at = new Date().toISOString()
  } else {
    updateData.published_at = null
  }

  const { error } = await supabase.from('workflows').update(updateData).eq('id', workflowId)

  if (error) throw error

  return { success: true, status }
}

export async function duplicateWorkflow(supabase: Client, workflowId: string, userId: string) {
  // Fetch full workflow
  const { data: workflow, error: workflowError } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single()

  if (workflowError || !workflow) {
    throw new Error('Workflow not found')
  }

  // Create new workflow with "(copy)" suffix
  const { data: newWorkflow, error: createError } = await supabase
    .from('workflows')
    .insert({
      team_id: workflow.team_id,
      folder_id: workflow.folder_id,
      name: `${workflow.name} (copy)`,
      emoji: workflow.emoji,
      description: workflow.description,
      status: 'draft',
      is_starred: false,
      created_by: userId,
    })
    .select('id')
    .single()

  if (createError || !newWorkflow) {
    throw createError
  }

  // Copy trigger if exists
  const { data: trigger } = await supabase
    .from('workflow_triggers')
    .select('type, config')
    .eq('workflow_id', workflowId)
    .single()

  if (trigger) {
    await supabase.from('workflow_triggers').insert({
      workflow_id: newWorkflow.id,
      type: trigger.type,
      config: trigger.config,
    })
  }

  // Copy steps
  const { data: steps } = await supabase
    .from('workflow_steps')
    .select('position, type, name, config')
    .eq('workflow_id', workflowId)
    .order('position', { ascending: true })

  if (steps && steps.length > 0) {
    await supabase.from('workflow_steps').insert(
      steps.map((step) => ({
        workflow_id: newWorkflow.id,
        position: step.position,
        type: step.type,
        name: step.name,
        config: step.config,
      }))
    )
  }

  return { success: true, newWorkflowId: newWorkflow.id }
}
