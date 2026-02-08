import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatRelativeTime } from '@/lib/utils/format-relative-time'

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Never" for null input', () => {
    expect(formatRelativeTime(null)).toBe('Never')
  })

  it('returns relative time for recent dates', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-07T12:00:00Z'))
    const threeMinutesAgo = '2026-02-07T11:57:00Z'
    const result = formatRelativeTime(threeMinutesAgo)
    expect(result).toContain('minutes ago')
  })

  it('returns formatted date for older dates', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-07T12:00:00Z'))
    const oldDate = '2025-12-15T00:00:00Z'
    const result = formatRelativeTime(oldDate)
    expect(result).toContain('Dec')
    expect(result).toContain('2025')
  })
})
