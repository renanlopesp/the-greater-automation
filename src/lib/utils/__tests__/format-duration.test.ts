import { describe, it, expect } from 'vitest'
import { formatDuration } from '@/lib/utils/format-duration'

describe('formatDuration', () => {
  it('returns "--" for null inputs', () => {
    expect(formatDuration(null, null)).toBe('--')
    expect(formatDuration(null, '2026-01-01T00:00:00Z')).toBe('--')
    expect(formatDuration('2026-01-01T00:00:00Z', null)).toBe('--')
  })

  it('formats "< 1s" for very short durations', () => {
    const start = '2026-01-01T00:00:00.000Z'
    const end = '2026-01-01T00:00:00.500Z'
    expect(formatDuration(start, end)).toBe('< 1s')
  })

  it('formats seconds-only durations', () => {
    const start = '2026-01-01T00:00:00Z'
    const end = '2026-01-01T00:00:45Z'
    expect(formatDuration(start, end)).toBe('45s')
  })

  it('formats minutes and seconds', () => {
    const start = '2026-01-01T00:00:00Z'
    const end = '2026-01-01T00:01:23Z'
    expect(formatDuration(start, end)).toBe('1m 23s')
  })
})
