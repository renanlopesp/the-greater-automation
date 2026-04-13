import { describe, it, expect } from 'vitest'
import { resolveModel, DEFAULT_MODEL, ALLOWED_MODELS } from '../model-whitelist'

describe('model-whitelist', () => {
  it('returns passed value if whitelisted', () => {
    expect(resolveModel('claude-opus-4-6')).toBe('claude-opus-4-6')
    expect(resolveModel('claude-sonnet-4-6')).toBe('claude-sonnet-4-6')
    expect(resolveModel('claude-haiku-4-5')).toBe('claude-haiku-4-5')
  })

  it('returns DEFAULT_MODEL for unknown value', () => {
    expect(resolveModel('gpt-4')).toBe(DEFAULT_MODEL)
    expect(resolveModel('claude-unknown')).toBe(DEFAULT_MODEL)
  })

  it('returns DEFAULT_MODEL for undefined', () => {
    expect(resolveModel(undefined)).toBe(DEFAULT_MODEL)
  })

  it('returns DEFAULT_MODEL for empty string', () => {
    expect(resolveModel('')).toBe(DEFAULT_MODEL)
  })
})
