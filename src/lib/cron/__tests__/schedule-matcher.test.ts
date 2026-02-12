import { describe, it, expect } from 'vitest'
import { isScheduleDue, getNextRunAt } from '../schedule-matcher'
import type { ScheduledTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'

function makeConfig(overrides: Partial<ScheduledTriggerConfig> = {}): ScheduledTriggerConfig {
  return {
    schedule_type: 'interval',
    interval_value: 1,
    interval_unit: 'hours',
    timezone: 'UTC',
    ...overrides,
  }
}

describe('isScheduleDue', () => {
  describe('never ran (lastRunAt = null)', () => {
    it('returns true for interval schedule', () => {
      const config = makeConfig()
      expect(isScheduleDue(config, null)).toBe(true)
    })

    it('returns true for cron schedule', () => {
      const config = makeConfig({ schedule_type: 'cron', cron_expression: '0 9 * * *' })
      expect(isScheduleDue(config, null)).toBe(true)
    })
  })

  describe('interval schedules', () => {
    it('returns true when elapsed >= interval (minutes)', () => {
      const config = makeConfig({ interval_value: 30, interval_unit: 'minutes' })
      const now = new Date('2026-02-11T12:00:00Z')
      const lastRun = '2026-02-11T11:25:00Z' // 35 min ago
      expect(isScheduleDue(config, lastRun, now)).toBe(true)
    })

    it('returns false when elapsed < interval (minutes)', () => {
      const config = makeConfig({ interval_value: 30, interval_unit: 'minutes' })
      const now = new Date('2026-02-11T12:00:00Z')
      const lastRun = '2026-02-11T11:45:00Z' // 15 min ago
      expect(isScheduleDue(config, lastRun, now)).toBe(false)
    })

    it('returns true when elapsed >= interval (hours)', () => {
      const config = makeConfig({ interval_value: 2, interval_unit: 'hours' })
      const now = new Date('2026-02-11T14:00:00Z')
      const lastRun = '2026-02-11T11:30:00Z' // 2.5 hours ago
      expect(isScheduleDue(config, lastRun, now)).toBe(true)
    })

    it('returns false when elapsed < interval (hours)', () => {
      const config = makeConfig({ interval_value: 2, interval_unit: 'hours' })
      const now = new Date('2026-02-11T13:00:00Z')
      const lastRun = '2026-02-11T11:30:00Z' // 1.5 hours ago
      expect(isScheduleDue(config, lastRun, now)).toBe(false)
    })

    it('returns true when elapsed >= interval (days)', () => {
      const config = makeConfig({ interval_value: 1, interval_unit: 'days' })
      const now = new Date('2026-02-12T12:00:00Z')
      const lastRun = '2026-02-11T10:00:00Z' // 26 hours ago
      expect(isScheduleDue(config, lastRun, now)).toBe(true)
    })

    it('returns true when elapsed >= interval (weeks)', () => {
      const config = makeConfig({ interval_value: 1, interval_unit: 'weeks' })
      const now = new Date('2026-02-18T12:00:00Z')
      const lastRun = '2026-02-11T10:00:00Z' // 7+ days ago
      expect(isScheduleDue(config, lastRun, now)).toBe(true)
    })

    it('returns true when elapsed exactly equals interval', () => {
      const config = makeConfig({ interval_value: 1, interval_unit: 'hours' })
      const now = new Date('2026-02-11T13:00:00Z')
      const lastRun = '2026-02-11T12:00:00Z' // exactly 1 hour ago
      expect(isScheduleDue(config, lastRun, now)).toBe(true)
    })

    it('returns false for zero interval', () => {
      const config = makeConfig({ interval_value: 0, interval_unit: 'hours' })
      const now = new Date('2026-02-11T12:00:00Z')
      const lastRun = '2026-02-11T11:00:00Z'
      expect(isScheduleDue(config, lastRun, now)).toBe(false)
    })
  })

  describe('cron schedules', () => {
    it('returns true when a cron tick passed since last run (daily 9am)', () => {
      const config = makeConfig({ schedule_type: 'cron', cron_expression: '0 9 * * *' })
      const now = new Date('2026-02-11T10:00:00Z') // 10am, past the 9am tick
      const lastRun = '2026-02-11T08:00:00Z' // 8am, before 9am tick
      expect(isScheduleDue(config, lastRun, now)).toBe(true)
    })

    it('returns false when no cron tick since last run (daily 9am)', () => {
      const config = makeConfig({ schedule_type: 'cron', cron_expression: '0 9 * * *' })
      const now = new Date('2026-02-11T10:00:00Z')
      const lastRun = '2026-02-11T09:05:00Z' // ran at 9:05am, after the tick
      expect(isScheduleDue(config, lastRun, now)).toBe(false)
    })

    it('returns true for every-15-min cron when tick passed', () => {
      const config = makeConfig({ schedule_type: 'cron', cron_expression: '*/15 * * * *' })
      const now = new Date('2026-02-11T12:20:00Z') // 12:20, past the 12:15 tick
      const lastRun = '2026-02-11T12:05:00Z' // ran at 12:05, before 12:15
      expect(isScheduleDue(config, lastRun, now)).toBe(true)
    })

    it('returns false for every-15-min cron when no tick passed', () => {
      const config = makeConfig({ schedule_type: 'cron', cron_expression: '*/15 * * * *' })
      const now = new Date('2026-02-11T12:20:00Z')
      const lastRun = '2026-02-11T12:16:00Z' // ran at 12:16, after 12:15 tick
      expect(isScheduleDue(config, lastRun, now)).toBe(false)
    })

    it('returns false when cron_expression is empty', () => {
      const config = makeConfig({ schedule_type: 'cron', cron_expression: '' })
      expect(isScheduleDue(config, null)).toBe(false)
    })

    it('throws for invalid cron expression', () => {
      const config = makeConfig({ schedule_type: 'cron', cron_expression: 'not-a-cron' })
      expect(() => isScheduleDue(config, null)).toThrow()
    })
  })

  describe('time boundaries', () => {
    it('returns false when now is before starts_at', () => {
      const config = makeConfig({
        starts_at: '2026-03-01T00:00:00Z',
      })
      const now = new Date('2026-02-11T12:00:00Z')
      expect(isScheduleDue(config, null, now)).toBe(false)
    })

    it('returns false when now is after ends_at', () => {
      const config = makeConfig({
        ends_at: '2026-02-01T00:00:00Z',
      })
      const now = new Date('2026-02-11T12:00:00Z')
      expect(isScheduleDue(config, null, now)).toBe(false)
    })

    it('returns true when now is within starts_at and ends_at', () => {
      const config = makeConfig({
        starts_at: '2026-02-01T00:00:00Z',
        ends_at: '2026-03-01T00:00:00Z',
      })
      const now = new Date('2026-02-11T12:00:00Z')
      expect(isScheduleDue(config, null, now)).toBe(true)
    })
  })
})

describe('getNextRunAt', () => {
  it('returns next interval time', () => {
    const config = makeConfig({ interval_value: 30, interval_unit: 'minutes' })
    const from = new Date('2026-02-11T12:00:00Z')
    const next = getNextRunAt(config, from)
    expect(next).toEqual(new Date('2026-02-11T12:30:00Z'))
  })

  it('returns next cron time', () => {
    const config = makeConfig({ schedule_type: 'cron', cron_expression: '0 9 * * *' })
    const from = new Date('2026-02-11T10:00:00Z')
    const next = getNextRunAt(config, from)
    expect(next).toEqual(new Date('2026-02-12T09:00:00Z'))
  })

  it('returns null when past ends_at', () => {
    const config = makeConfig({ ends_at: '2026-02-01T00:00:00Z' })
    const from = new Date('2026-02-11T12:00:00Z')
    expect(getNextRunAt(config, from)).toBeNull()
  })

  it('returns null when next run would exceed ends_at', () => {
    const config = makeConfig({
      interval_value: 1,
      interval_unit: 'days',
      ends_at: '2026-02-11T18:00:00Z',
    })
    const from = new Date('2026-02-11T12:00:00Z')
    // next would be Feb 12 12:00, which is past ends_at
    expect(getNextRunAt(config, from)).toBeNull()
  })

  it('returns null for missing cron expression', () => {
    const config = makeConfig({ schedule_type: 'cron', cron_expression: '' })
    expect(getNextRunAt(config)).toBeNull()
  })

  it('returns null for zero interval', () => {
    const config = makeConfig({ interval_value: 0 })
    expect(getNextRunAt(config)).toBeNull()
  })
})
