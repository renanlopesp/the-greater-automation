import { describe, it, expect, vi, afterEach } from 'vitest'
import { isHybridChatEnabled } from '../feature-flags'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isHybridChatEnabled', () => {
  it('returns true for any teamId when global flag is true', () => {
    vi.stubEnv('FEATURE_HYBRID_CHAT', 'true')
    expect(isHybridChatEnabled('any-team-id')).toBe(true)
  })

  it('returns true when team is in FEATURE_HYBRID_CHAT_TEAM_IDS and global flag is false', () => {
    vi.stubEnv('FEATURE_HYBRID_CHAT', 'false')
    vi.stubEnv('FEATURE_HYBRID_CHAT_TEAM_IDS', 'team-a,team-b,team-c')
    expect(isHybridChatEnabled('team-b')).toBe(true)
  })

  it('returns false when global flag is false and team is not in list', () => {
    vi.stubEnv('FEATURE_HYBRID_CHAT', 'false')
    vi.stubEnv('FEATURE_HYBRID_CHAT_TEAM_IDS', 'team-a,team-b')
    expect(isHybridChatEnabled('team-x')).toBe(false)
  })

  it('returns false when neither env var is set', () => {
    // ensure both are absent
    vi.stubEnv('FEATURE_HYBRID_CHAT', '')
    vi.stubEnv('FEATURE_HYBRID_CHAT_TEAM_IDS', '')
    expect(isHybridChatEnabled('any-team-id')).toBe(false)
  })

  it('handles whitespace around team IDs in the list', () => {
    vi.stubEnv('FEATURE_HYBRID_CHAT', 'false')
    vi.stubEnv('FEATURE_HYBRID_CHAT_TEAM_IDS', ' team-a , team-b , team-c ')
    expect(isHybridChatEnabled('team-b')).toBe(true)
  })
})
