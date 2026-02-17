/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  inviteMemberAction,
  acceptInvitationAction,
  declineInvitationAction,
  updateMemberRoleAction,
  removeMemberAction,
  cancelInvitationAction,
} from '../members'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'team-1' }),
  }),
}))

vi.mock('@/lib/get-active-team', () => ({
  getActiveTeamId: vi.fn().mockResolvedValue('team-1'),
}))

// Helper to create mock Supabase client with chainable query builder
function createMockSupabase(overrides: Record<string, any> = {}) {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue(mockChain),
    _chain: mockChain,
  }
}

describe('inviteMemberAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject invalid email', async () => {
    const formData = new FormData()
    formData.append('email', 'invalid-email')
    formData.append('role', 'admin')

    const result = await inviteMemberAction(formData)
    expect(result.error).toBe('Invalid email address')
  })

  it('should reject invalid role', async () => {
    const formData = new FormData()
    formData.append('email', 'test@example.com')
    formData.append('role', 'superuser')

    const result = await inviteMemberAction(formData)
    expect(result.error).toBe('Invalid role')
  })

  it('should reject if user not authenticated', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const formData = new FormData()
    formData.append('email', 'test@example.com')
    formData.append('role', 'admin')

    const result = await inviteMemberAction(formData)
    expect(result.error).toBe('Not authenticated')
  })

  it('should reject if user is not owner or admin', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.select.mockReturnThis()
    mockSupabase._chain.eq.mockReturnThis()
    mockSupabase._chain.single.mockResolvedValue({
      data: { role: 'member' },
      error: null,
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const formData = new FormData()
    formData.append('email', 'test@example.com')
    formData.append('role', 'admin')

    const result = await inviteMemberAction(formData)
    expect(result.error).toBe('Not authorized')
  })

  it('should reject if user is already a member', async () => {
    const mockSupabase = createMockSupabase()
    let callCount = 0

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        callCount++
        if (callCount === 1) {
          // First call: getCurrentUserTeamInfo
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
          }
        } else {
          // Second call: existing members check
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ user_id: 'user-2', profiles: { email: 'test@example.com' } }],
              error: null,
            }),
          }
        }
      }
      if (table === 'team_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const formData = new FormData()
    formData.append('email', 'test@example.com')
    formData.append('role', 'admin')

    const result = await inviteMemberAction(formData)
    expect(result.error).toBe('This user is already a member')
  })

  it('should reject if pending invitation already exists', async () => {
    const mockSupabase = createMockSupabase()
    let callCount = 0

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        callCount++
        if (callCount === 1) {
          // First call: getCurrentUserTeamInfo
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
          }
        } else {
          // Second call: existing members check
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }
        }
      }
      if (table === 'team_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockResolvedValue({
            data: [{ id: 'invite-1' }],
            error: null,
          }),
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const formData = new FormData()
    formData.append('email', 'test@example.com')
    formData.append('role', 'admin')

    const result = await inviteMemberAction(formData)
    expect(result.error).toBe('An invitation is already pending for this email')
  })

  it('should create pending invitation and notification for existing user', async () => {
    const mockSupabase = createMockSupabase()
    let callCount = 0
    const notificationInsert = vi.fn().mockResolvedValue({ data: null, error: null })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        callCount++
        if (callCount === 1) {
          // getCurrentUserTeamInfo
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
          }
        } else {
          // existing members check
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }
        }
      }
      if (table === 'team_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'existing-user-id' },
            error: null,
          }),
        }
      }
      if (table === 'teams') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { name: 'Test Team' },
            error: null,
          }),
        }
      }
      if (table === 'notifications') {
        return {
          insert: notificationInsert,
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const formData = new FormData()
    formData.append('email', 'test@example.com')
    formData.append('role', 'admin')

    const result = await inviteMemberAction(formData)
    expect(result.success).toBe(true)
    expect(notificationInsert).toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('should create pending invitation for new user without notification', async () => {
    const mockSupabase = createMockSupabase()
    let callCount = 0

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
          }
        } else {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }
        }
      }
      if (table === 'team_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const formData = new FormData()
    formData.append('email', 'newuser@example.com')
    formData.append('role', 'member')

    const result = await inviteMemberAction(formData)
    expect(result.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})

describe('acceptInvitationAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject if user not authenticated', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await acceptInvitationAction('invite-1')
    expect(result.error).toBe('Not authenticated')
  })

  it('should reject if invitation not found', async () => {
    const mockSupabase = createMockSupabase()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { email: 'user@example.com' },
            error: null,
          }),
        }
      }
      if (table === 'team_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await acceptInvitationAction('invite-1')
    expect(result.error).toBe('Invitation not found')
  })

  it('should reject if invitation has expired', async () => {
    const mockSupabase = createMockSupabase()
    const pastDate = new Date(Date.now() - 86400000).toISOString()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { email: 'user@example.com' },
            error: null,
          }),
        }
      }
      if (table === 'team_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-1',
              email: 'user@example.com',
              status: 'pending',
              expires_at: pastDate,
              team_id: 'team-1',
              role: 'member',
            },
            error: null,
          }),
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await acceptInvitationAction('invite-1')
    expect(result.error).toBe('This invitation has expired')
  })

  it('should reject if invitation is for different email', async () => {
    const mockSupabase = createMockSupabase()
    const futureDate = new Date(Date.now() + 86400000).toISOString()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { email: 'user@example.com' },
            error: null,
          }),
        }
      }
      if (table === 'team_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-1',
              email: 'other@example.com',
              status: 'pending',
              expires_at: futureDate,
              team_id: 'team-1',
              role: 'member',
            },
            error: null,
          }),
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await acceptInvitationAction('invite-1')
    expect(result.error).toBe('This invitation is not for you')
  })

  it('should accept valid invitation successfully', async () => {
    const mockSupabase = createMockSupabase()
    const futureDate = new Date(Date.now() + 86400000).toISOString()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { email: 'user@example.com' },
            error: null,
          }),
        }
      }
      if (table === 'team_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-1',
              email: 'user@example.com',
              status: 'pending',
              expires_at: futureDate,
              team_id: 'team-1',
              role: 'member',
            },
            error: null,
          }),
          update: vi.fn().mockReturnThis(),
        }
      }
      if (table === 'team_members') {
        return {
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await acceptInvitationAction('invite-1')
    expect(result.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})

describe('declineInvitationAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject if user not authenticated', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await declineInvitationAction('invite-1')
    expect(result.error).toBe('Not authenticated')
  })

  it('should reject if invitation status is not pending', async () => {
    const mockSupabase = createMockSupabase()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { email: 'user@example.com' },
            error: null,
          }),
        }
      }
      if (table === 'team_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-1',
              email: 'user@example.com',
              status: 'accepted',
            },
            error: null,
          }),
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await declineInvitationAction('invite-1')
    expect(result.error).toBe('This invitation is no longer valid')
  })

  it('should reject if invitation is for different user', async () => {
    const mockSupabase = createMockSupabase()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { email: 'user@example.com' },
            error: null,
          }),
        }
      }
      if (table === 'team_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-1',
              email: 'other@example.com',
              status: 'pending',
            },
            error: null,
          }),
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await declineInvitationAction('invite-1')
    expect(result.error).toBe('This invitation is not for you')
  })

  it('should decline invitation successfully', async () => {
    const mockSupabase = createMockSupabase()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { email: 'user@example.com' },
            error: null,
          }),
        }
      }
      if (table === 'team_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-1',
              email: 'user@example.com',
              status: 'pending',
            },
            error: null,
          }),
          update: vi.fn().mockReturnThis(),
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await declineInvitationAction('invite-1')
    expect(result.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})

describe('updateMemberRoleAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject invalid parameters', async () => {
    const formData = new FormData()
    formData.append('userId', '')
    formData.append('role', 'admin')

    const result = await updateMemberRoleAction(formData)
    expect(result.error).toBe('Invalid parameters')
  })

  it('should reject invalid role', async () => {
    const formData = new FormData()
    formData.append('userId', 'user-2')
    formData.append('role', 'superuser')

    const result = await updateMemberRoleAction(formData)
    expect(result.error).toBe('Invalid parameters')
  })

  it('should reject if user is not owner', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const formData = new FormData()
    formData.append('userId', 'user-2')
    formData.append('role', 'admin')

    const result = await updateMemberRoleAction(formData)
    expect(result.error).toBe('Only team owners can change roles')
  })

  it('should reject if trying to change own role', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: { role: 'owner' },
      error: null,
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const formData = new FormData()
    formData.append('userId', 'user-1')
    formData.append('role', 'admin')

    const result = await updateMemberRoleAction(formData)
    expect(result.error).toBe('Cannot change your own role')
  })

  it('should update member role successfully', async () => {
    const mockSupabase = createMockSupabase()
    let callCount = 0

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        callCount++
        if (callCount === 1) {
          // First call: getCurrentUserTeamInfo
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
          }
        } else {
          // Second call: update
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
          }
        }
      }
      return mockSupabase._chain
    })

    mockSupabase._chain.eq.mockResolvedValue({
      data: null,
      error: null,
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const formData = new FormData()
    formData.append('userId', 'user-2')
    formData.append('role', 'member')

    const result = await updateMemberRoleAction(formData)
    expect(result.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})

describe('removeMemberAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject if user not authenticated', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await removeMemberAction('user-2')
    expect(result.error).toBe('Not authenticated')
  })

  it('should reject if user is not owner or admin', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: { role: 'member' },
      error: null,
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await removeMemberAction('user-2')
    expect(result.error).toBe('Not authorized')
  })

  it('should reject if trying to remove self', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: { role: 'owner' },
      error: null,
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await removeMemberAction('user-1')
    expect(result.error).toBe('Cannot remove yourself')
  })

  it('should reject if trying to remove owner', async () => {
    const mockSupabase = createMockSupabase()
    let callCount = 0

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }
        } else {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
          }
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await removeMemberAction('user-2')
    expect(result.error).toBe('Cannot remove the team owner')
  })

  it('should reject if admin tries to remove another admin', async () => {
    const mockSupabase = createMockSupabase()
    let callCount = 0

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }
        } else {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await removeMemberAction('user-2')
    expect(result.error).toBe('Admins cannot remove other admins')
  })

  it('should allow owner to remove member', async () => {
    const mockSupabase = createMockSupabase()
    let callCount = 0

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'owner' },
              error: null,
            }),
          }
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'member' },
              error: null,
            }),
          }
        } else {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
          }
        }
      }
      return mockSupabase._chain
    })

    mockSupabase._chain.eq.mockResolvedValue({
      data: null,
      error: null,
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await removeMemberAction('user-2')
    expect(result.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('should allow admin to remove member', async () => {
    const mockSupabase = createMockSupabase()
    let callCount = 0

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'member' },
              error: null,
            }),
          }
        } else {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
          }
        }
      }
      return mockSupabase._chain
    })

    mockSupabase._chain.eq.mockResolvedValue({
      data: null,
      error: null,
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await removeMemberAction('user-2')
    expect(result.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})

describe('cancelInvitationAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject if user not authenticated', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await cancelInvitationAction('invite-1')
    expect(result.error).toBe('Not authenticated')
  })

  it('should reject if user is not owner or admin', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: { role: 'member' },
      error: null,
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await cancelInvitationAction('invite-1')
    expect(result.error).toBe('Not authorized')
  })

  it('should reject if invitation not found', async () => {
    const mockSupabase = createMockSupabase()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: 'owner' },
            error: null,
          }),
        }
      }
      if (table === 'team_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await cancelInvitationAction('invite-1')
    expect(result.error).toBe('Invitation not found')
  })

  it('should reject if invitation is not pending', async () => {
    const mockSupabase = createMockSupabase()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: 'owner' },
            error: null,
          }),
        }
      }
      if (table === 'team_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { status: 'accepted' },
            error: null,
          }),
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await cancelInvitationAction('invite-1')
    expect(result.error).toBe('This invitation is no longer pending')
  })

  it('should cancel pending invitation successfully', async () => {
    const mockSupabase = createMockSupabase()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'team_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: 'owner' },
            error: null,
          }),
        }
      }
      if (table === 'team_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { status: 'pending' },
            error: null,
          }),
          update: vi.fn().mockReturnThis(),
        }
      }
      return mockSupabase._chain
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await cancelInvitationAction('invite-1')
    expect(result.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})
