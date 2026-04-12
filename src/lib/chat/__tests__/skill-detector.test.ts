import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectMode } from '../skill-detector'
import type { HybridChatRequest } from '../types'
import type { UIMessage } from 'ai'

const active = (slug: string) => ({ slug, status: 'active' })
const inactive = (slug: string) => ({ slug, status: 'inactive' })

describe('detectMode', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // Case 1: explicit skill_slug present and active
  it('returns skill mode when skill_slug is present and active', () => {
    const body: HybridChatRequest = { skill_slug: 'seasonal-calendar' }
    const result = detectMode(body, [active('seasonal-calendar')])
    expect(result).toEqual({ mode: 'skill', slug: 'seasonal-calendar' })
  })

  // Case 2: explicit skill_slug NOT in active skills → chat + warn
  it('returns chat mode and warns when skill_slug is not in active skills', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const body: HybridChatRequest = { skill_slug: 'unknown-skill' }
    const result = detectMode(body, [active('seasonal-calendar')])
    expect(result.mode).toBe('chat')
    expect(warn).toHaveBeenCalledOnce()
  })

  // Case 3: explicit skill_slug is inactive
  it('returns chat mode when skill_slug exists but is inactive', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const body: HybridChatRequest = { skill_slug: 'seasonal-calendar' }
    const result = detectMode(body, [inactive('seasonal-calendar')])
    expect(result.mode).toBe('chat')
    expect(warn).toHaveBeenCalledOnce()
  })

  // Case 4: keyword fallback hits and seasonal-calendar is active
  it('returns skill mode via keyword fallback when seasonal-calendar is active', () => {
    const body: HybridChatRequest = { message: 'gere o calendário sazonal' }
    const result = detectMode(body, [active('seasonal-calendar')])
    expect(result).toEqual({ mode: 'skill', slug: 'seasonal-calendar' })
  })

  // Case 5: keyword matches but seasonal-calendar is NOT active
  it('returns chat mode when keyword matches but seasonal-calendar is not active', () => {
    const body: HybridChatRequest = { message: 'gere o calendário sazonal' }
    const result = detectMode(body, [inactive('seasonal-calendar')])
    expect(result.mode).toBe('chat')
  })

  // Case 6: no skill hint and no keyword
  it('returns chat mode with undefined model when no hint and no keyword', () => {
    const body: HybridChatRequest = { message: 'olá, como vai?' }
    const result = detectMode(body, [active('seasonal-calendar')])
    expect(result).toEqual({ mode: 'chat', model: undefined })
  })

  // Case 7: taskId only, no message — should not crash
  it('returns chat mode when only taskId is provided', () => {
    const body: HybridChatRequest = { taskId: 'task-123' }
    expect(() => detectMode(body, [])).not.toThrow()
    const result = detectMode(body, [])
    expect(result.mode).toBe('chat')
  })

  // Case 8: message embedded in messages[] UIMessage array with "calendar" keyword
  it('returns skill mode when keyword found in last user UIMessage parts', () => {
    const messages: UIMessage[] = [
      {
        id: '1',
        role: 'user',
        parts: [{ type: 'text', text: 'show me the seasonal calendar please' }],
        content: 'show me the seasonal calendar please',
      },
    ]
    const body: HybridChatRequest = { messages }
    const result = detectMode(body, [active('seasonal-calendar')])
    expect(result).toEqual({ mode: 'skill', slug: 'seasonal-calendar' })
  })
})
