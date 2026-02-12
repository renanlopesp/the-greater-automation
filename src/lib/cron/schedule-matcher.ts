import { CronExpressionParser } from 'cron-parser'
import type { ScheduledTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'

const INTERVAL_MS: Record<NonNullable<ScheduledTriggerConfig['interval_unit']>, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
  weeks: 604_800_000,
}

/**
 * Determines if a scheduled workflow is due for execution.
 *
 * @param config - The scheduled trigger configuration
 * @param lastRunAt - ISO timestamp of the last run, or null if never ran
 * @param now - Current time (defaults to Date.now)
 * @returns true if the workflow should be triggered
 */
export function isScheduleDue(
  config: ScheduledTriggerConfig,
  lastRunAt: string | null,
  now: Date = new Date()
): boolean {
  // Respect time boundaries
  if (config.starts_at && now < new Date(config.starts_at)) {
    return false
  }
  if (config.ends_at && now > new Date(config.ends_at)) {
    return false
  }

  if (config.schedule_type === 'cron') {
    if (!config.cron_expression) {
      return false
    }

    const expr = CronExpressionParser.parse(config.cron_expression, {
      currentDate: now,
      tz: config.timezone || undefined,
    })

    // Never ran before — due
    if (!lastRunAt) {
      return true
    }

    // Get the most recent cron tick before `now`
    const prev = expr.prev().toDate()

    // Due if the previous tick is after the last run
    return prev > new Date(lastRunAt)
  }

  if (config.schedule_type === 'interval') {
    const unit = config.interval_unit ?? 'hours'
    const value = config.interval_value ?? 1
    const intervalMs = value * INTERVAL_MS[unit]

    if (intervalMs <= 0) {
      return false
    }

    // Never ran before — due
    if (!lastRunAt) {
      return true
    }

    return now.getTime() - new Date(lastRunAt).getTime() >= intervalMs
  }

  return false
}

/**
 * Calculates the next run time for a scheduled trigger.
 *
 * @param config - The scheduled trigger configuration
 * @param fromDate - Starting point (defaults to now)
 * @returns The next run Date, or null if the schedule is invalid or ended
 */
export function getNextRunAt(
  config: ScheduledTriggerConfig,
  fromDate: Date = new Date()
): Date | null {
  if (config.ends_at && fromDate > new Date(config.ends_at)) {
    return null
  }

  if (config.schedule_type === 'cron') {
    if (!config.cron_expression) {
      return null
    }

    const expr = CronExpressionParser.parse(config.cron_expression, {
      currentDate: fromDate,
      tz: config.timezone || undefined,
    })

    const next = expr.next().toDate()

    if (config.ends_at && next > new Date(config.ends_at)) {
      return null
    }

    return next
  }

  if (config.schedule_type === 'interval') {
    const unit = config.interval_unit ?? 'hours'
    const value = config.interval_value ?? 1
    const intervalMs = value * INTERVAL_MS[unit]

    if (intervalMs <= 0) {
      return null
    }

    const next = new Date(fromDate.getTime() + intervalMs)

    if (config.ends_at && next > new Date(config.ends_at)) {
      return null
    }

    return next
  }

  return null
}
