import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { WorkflowTrigger } from '@/lib/workflow-editor/trigger-defaults'
import type { WorkflowStep } from '@/lib/workflow-editor/step-defaults'

type Client = SupabaseClient<Database>

export interface WorkflowEditorData {
  workflowId: string
  workflowName: string
  workflowEmoji: string
  isStarred: boolean
  trigger: WorkflowTrigger | null
  steps: WorkflowStep[]
}

export async function fetchWorkflowForEditor(
  supabase: Client,
  workflowId: string
): Promise<WorkflowEditorData | null> {
  const { data: workflow } = await supabase
    .from('workflows')
    .select('id, name, emoji, is_starred, status')
    .eq('id', workflowId)
    .single()

  if (!workflow) return null

  const { data: triggerRow } = await supabase
    .from('workflow_triggers')
    .select('type, config')
    .eq('workflow_id', workflowId)
    .single()

  const { data: stepRows } = await supabase
    .from('workflow_steps')
    .select('id, type, name, config, position')
    .eq('workflow_id', workflowId)
    .order('position', { ascending: true })

  const trigger: WorkflowTrigger | null = triggerRow
    ? { type: triggerRow.type, config: triggerRow.config as unknown as WorkflowTrigger['config'] }
    : null

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
    trigger,
    steps,
  }
}
