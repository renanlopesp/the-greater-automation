import { describe, expect, it } from 'vitest'
import { accountSettingsSchema, workspaceSettingsSchema } from '@/lib/schemas/settings'

describe('accountSettingsSchema', () => {
  it('passes with valid fullName', () => {
    const result = accountSettingsSchema.safeParse({ fullName: 'Jane Doe' })
    expect(result.success).toBe(true)
  })

  it('fails with empty fullName', () => {
    const result = accountSettingsSchema.safeParse({ fullName: '' })
    expect(result.success).toBe(false)
  })

  it('fails with whitespace-only fullName', () => {
    const result = accountSettingsSchema.safeParse({ fullName: '   ' })
    expect(result.success).toBe(false)
  })

  it('trims fullName', () => {
    const result = accountSettingsSchema.safeParse({ fullName: '  Jane  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fullName).toBe('Jane')
    }
  })
})

describe('workspaceSettingsSchema', () => {
  it('passes with valid name', () => {
    const result = workspaceSettingsSchema.safeParse({ name: 'My Workspace' })
    expect(result.success).toBe(true)
  })

  it('fails with empty name', () => {
    const result = workspaceSettingsSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})
