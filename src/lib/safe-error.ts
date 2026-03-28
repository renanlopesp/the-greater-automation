/**
 * Safe error response utilities.
 *
 * Prevents leaking internal error details (DB schema, API keys, stack traces)
 * to clients. Logs the full error server-side for debugging.
 */

/**
 * Extract a safe, generic error message for the client.
 * Logs the real error server-side with the provided context tag.
 */
export function safeError(tag: string, error: unknown, fallback = 'Internal server error'): string {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[${tag}]`, message)
  return fallback
}

/**
 * Extract a safe message from a Supabase PostgrestError.
 * Logs the real error (table names, constraint names) server-side only.
 */
export function safeDbError(
  tag: string,
  error: { message: string; code?: string; details?: string } | null,
  fallback = 'Database operation failed'
): string {
  if (!error) return fallback
  console.error(`[${tag}] DB error:`, error.message, error.code ?? '')
  return fallback
}
