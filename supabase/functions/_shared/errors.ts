import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

/** Structured log line picked up by Supabase function logs. */
export function log(tag: string, fields: Record<string, unknown>): void {
  const msg = Object.entries(fields)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? JSON.stringify(v) : String(v)}`)
    .join(' ')
  console.log(`[${tag}] ${msg}`)
}

/**
 * Mark a task as failed with an error reason. Always safe (fire-and-forget,
 * logs but never rethrows).
 */
export async function failTask(
  supabase: SupabaseClient,
  taskId: string,
  stage: string,
  message: string
): Promise<void> {
  const errorPayload = { stage, message: message.slice(0, 500), at: new Date().toISOString() }
  try {
    await supabase
      .from('tasks')
      .update({
        skill_status: 'failed',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: { error: errorPayload } as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
    console.error(`[failTask] taskId=${taskId} stage=${stage} message=${message.slice(0, 200)}`)
  } catch (err) {
    console.error('[failTask] update itself threw', err)
  }
}
