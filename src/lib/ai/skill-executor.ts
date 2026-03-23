import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { loadSkill, validateSkillExecution } from '@/lib/ai/skill-loader'
import { fetchSkillBySlug } from '@/lib/queries/skills'

type Client = SupabaseClient<Database>

export interface SkillExecutionResult {
  executionId: string
  status: 'completed' | 'failed'
  output: unknown
  durationMs: number
  error?: string
}

/**
 * Execute a skill: validate, create execution record, run, track result.
 *
 * For Fase 0, execution means loading the skill context and returning it
 * so the orchestrator can inject it into the chat. Full skill execution
 * (with structured input/output) comes in Fase 1+.
 */
export async function executeSkill(
  supabase: Client,
  teamId: string,
  skillSlug: string,
  input?: Record<string, unknown>,
  conversationId?: string,
  connectedApps: string[] = []
): Promise<SkillExecutionResult> {
  const startTime = Date.now()

  // 1. Validate
  const validation = await validateSkillExecution(supabase, teamId, skillSlug, connectedApps)
  if (!validation.valid) {
    return {
      executionId: '',
      status: 'failed',
      output: null,
      durationMs: Date.now() - startTime,
      error: validation.error,
    }
  }

  // 2. Get skill DB record for the ID
  const dbSkill = await fetchSkillBySlug(supabase, teamId, skillSlug)
  if (!dbSkill) {
    return {
      executionId: '',
      status: 'failed',
      output: null,
      durationMs: Date.now() - startTime,
      error: `Skill '${skillSlug}' not found`,
    }
  }

  // 3. Create execution record (status = running)
  const { data: execution, error: insertError } = await (
    supabase as unknown as {
      from: (t: string) => {
        insert: (d: unknown) => {
          select: (s: string) => {
            single: () => Promise<{ data: { id: string } | null; error: unknown }>
          }
        }
      }
    }
  )
    .from('skill_executions')
    .insert({
      skill_id: dbSkill.id,
      team_id: teamId,
      conversation_id: conversationId ?? null,
      input: input ?? null,
      status: 'running',
      triggered_by: 'user',
    })
    .select('id')
    .single()

  if (insertError || !execution) {
    return {
      executionId: '',
      status: 'failed',
      output: null,
      durationMs: Date.now() - startTime,
      error: 'Failed to create execution record',
    }
  }

  const executionId = execution.id

  try {
    // 4. Load skill context
    const skillContext = await loadSkill(supabase, teamId, skillSlug)

    // 5. For Fase 0, the "output" is the skill context itself
    // The orchestrator will use this to inject into the chat
    const output = {
      skillSlug,
      skillName: skillContext?.name,
      systemPrompt: skillContext?.systemPrompt,
      tools: skillContext?.tools,
      knowledge: skillContext?.knowledge,
    }

    const durationMs = Date.now() - startTime

    // 6. Update execution record (status = completed)
    await (
      supabase as unknown as {
        from: (t: string) => {
          update: (d: unknown) => {
            eq: (k: string, v: string) => Promise<{ error: unknown }>
          }
        }
      }
    )
      .from('skill_executions')
      .update({
        output,
        status: 'completed',
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId)

    return { executionId, status: 'completed', output, durationMs }
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'

    // Update execution record (status = failed)
    await (
      supabase as unknown as {
        from: (t: string) => {
          update: (d: unknown) => {
            eq: (k: string, v: string) => Promise<{ error: unknown }>
          }
        }
      }
    )
      .from('skill_executions')
      .update({
        status: 'failed',
        error_message: errorMessage,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId)

    return { executionId, status: 'failed', output: null, durationMs, error: errorMessage }
  }
}
