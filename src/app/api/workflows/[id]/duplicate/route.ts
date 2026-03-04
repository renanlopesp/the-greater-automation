import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: workflowId } = await params

  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch full workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
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
        created_by: user.id,
      })
      .select('id')
      .single()

    if (createError || !newWorkflow) {
      throw createError
    }

    // Parallel reads: trigger and steps
    const [{ data: trigger }, { data: steps }] = await Promise.all([
      supabase
        .from('workflow_triggers')
        .select('type, config')
        .eq('workflow_id', workflowId)
        .single(),
      supabase
        .from('workflow_steps')
        .select('position, type, name, config')
        .eq('workflow_id', workflowId)
        .order('position', { ascending: true }),
    ])

    // Parallel writes (conditional)
    await Promise.all([
      trigger
        ? supabase.from('workflow_triggers').insert({
            workflow_id: newWorkflow.id,
            type: trigger.type,
            config: trigger.config,
          })
        : Promise.resolve(),
      steps && steps.length > 0
        ? supabase.from('workflow_steps').insert(
            steps.map((step) => ({
              workflow_id: newWorkflow.id,
              position: step.position,
              type: step.type,
              name: step.name,
              config: step.config,
            }))
          )
        : Promise.resolve(),
    ])

    return NextResponse.json({
      success: true,
      newWorkflowId: newWorkflow.id,
    })
  } catch (error) {
    console.error('Error duplicating workflow:', error)
    return NextResponse.json({ error: 'Failed to duplicate workflow' }, { status: 500 })
  }
}
