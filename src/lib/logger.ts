import pino from 'pino'

/**
 * Structured logger for server-side code.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info({ userId, action }, 'User performed action')
 *   logger.error({ err, route }, 'Request failed')
 *
 * In production: JSON output (parseable by log aggregators).
 * In development: human-readable output.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino/file',
      options: { destination: 1 }, // stdout
    },
    formatters: {
      level(label) {
        return { level: label }
      },
    },
  }),
})

/**
 * Create a child logger with a fixed context tag (e.g., route name).
 *
 * Usage:
 *   const log = createLogger('api/chat')
 *   log.info('Processing request')
 *   log.error({ err }, 'Request failed')
 */
export function createLogger(tag: string) {
  return logger.child({ tag })
}
