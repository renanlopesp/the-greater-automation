/**
 * Safe error response utilities.
 *
 * Prevents leaking internal error details (DB schema, API keys, stack traces)
 * to clients. Logs the full error server-side for debugging.
 */

import { logger } from '@/lib/logger'

/**
 * Extract a safe, generic error message for the client.
 * Logs the real error server-side with the provided context tag.
 */
export function safeError(tag: string, error: unknown, fallback = 'Internal server error'): string {
  const message = error instanceof Error ? error.message : String(error)
  logger.error({ tag }, message)
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
  logger.error({ tag, code: error.code ?? undefined }, `DB error: ${error.message}`)
  return fallback
}
