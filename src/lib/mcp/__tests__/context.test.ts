import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @supabase/supabase-js before importing context
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}))

describe('MCP Context', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('creates context from environment variables', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.SNEW_TEAM_ID = 'team-123'
    process.env.SNEW_USER_ID = 'user-456'
    process.env.SNEW_STORE_ID = 'store-789'
    process.env.SNEW_TASK_ID = 'task-000'

    const { createToolContext } = await import('../context')
    const ctx = createToolContext()

    expect(ctx.teamId).toBe('team-123')
    expect(ctx.userId).toBe('user-456')
    expect(ctx.storeId).toBe('store-789')
    expect(ctx.taskId).toBe('task-000')
    expect(ctx.supabase).toBeDefined()
  })

  it('sets storeId and taskId to null when not provided', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.SNEW_TEAM_ID = 'team-123'
    process.env.SNEW_USER_ID = 'user-456'
    delete process.env.SNEW_STORE_ID
    delete process.env.SNEW_TASK_ID

    const { createToolContext } = await import('../context')
    const ctx = createToolContext()

    expect(ctx.storeId).toBeNull()
    expect(ctx.taskId).toBeNull()
  })

  it('throws when required env vars are missing', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.SNEW_TEAM_ID
    delete process.env.SNEW_USER_ID

    const { createToolContext } = await import('../context')
    expect(() => createToolContext()).toThrow('Missing SUPABASE_URL')
  })

  it('throws when SNEW_TEAM_ID is missing', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    delete process.env.SNEW_TEAM_ID
    process.env.SNEW_USER_ID = 'user-456'

    const { createToolContext } = await import('../context')
    expect(() => createToolContext()).toThrow('Missing SNEW_TEAM_ID')
  })
})
