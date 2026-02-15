import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSkill, updateSkill, deleteSkill, toggleSkill } from '../agent-skills'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}))

describe('agent-skills server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSkill', () => {
    it('creates a skill successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'skill-123' },
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      const result = await createSkill(
        'agent-456',
        'Test Skill',
        'This is the skill content',
        'Optional description'
      )

      expect(result).toEqual({ id: 'skill-123' })
      expect(mockSupabase.from).toHaveBeenCalledWith('agent_skills')
      expect(mockInsert).toHaveBeenCalledWith({
        agent_id: 'agent-456',
        name: 'Test Skill',
        content: 'This is the skill content',
        description: 'Optional description',
        source: 'manual',
      })
    })

    it('returns error when user is unauthorized', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await createSkill('agent-456', 'Test Skill', 'Content')

      expect(result).toEqual({ error: 'Unauthorized' })
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('returns error when skill name is duplicate (23505 error code)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key value' },
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      const result = await createSkill('agent-456', 'Duplicate Skill', 'Content')

      expect(result).toEqual({
        error: 'A skill with this name already exists for this agent',
      })
    })

    it('handles null description parameter', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'skill-123' },
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      await createSkill('agent-456', 'Test Skill', 'Content')

      expect(mockInsert).toHaveBeenCalledWith({
        agent_id: 'agent-456',
        name: 'Test Skill',
        content: 'Content',
        description: null,
        source: 'manual',
      })
    })
  })

  describe('updateSkill', () => {
    it('updates a skill successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { version: 1 },
              error: null,
            }),
          }),
        }),
      })

      mockSupabase.from
        .mockReturnValueOnce({
          select: mockSelect,
        })
        .mockReturnValueOnce({
          update: mockUpdate,
        })

      const result = await updateSkill('skill-789', 'agent-456', {
        name: 'Updated Skill',
        content: 'Updated content',
      })

      expect(result).toEqual({})
      expect(mockSupabase.from).toHaveBeenCalledWith('agent_skills')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Skill',
          content: 'Updated content',
          version: 2,
          updated_at: expect.any(String),
        })
      )
    })

    it('returns error when user is unauthorized', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await updateSkill('skill-789', 'agent-456', {
        name: 'Updated Skill',
      })

      expect(result).toEqual({ error: 'Unauthorized' })
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('returns error when update fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Database error' },
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      })

      const result = await updateSkill('skill-789', 'agent-456', {
        is_enabled: false,
      })

      expect(result).toEqual({ error: 'Database error' })
    })
  })

  describe('deleteSkill', () => {
    it('deletes a skill successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      })

      const result = await deleteSkill('skill-789', 'agent-456')

      expect(result).toEqual({})
      expect(mockSupabase.from).toHaveBeenCalledWith('agent_skills')
      expect(mockDelete).toHaveBeenCalled()
    })

    it('returns error when user is unauthorized', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await deleteSkill('skill-789', 'agent-456')

      expect(result).toEqual({ error: 'Unauthorized' })
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('returns error when delete fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Delete failed' },
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      })

      const result = await deleteSkill('skill-789', 'agent-456')

      expect(result).toEqual({ error: 'Delete failed' })
    })
  })

  describe('toggleSkill', () => {
    it('delegates to updateSkill with is_enabled flag', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      })

      const result = await toggleSkill('skill-789', 'agent-456', true)

      expect(result).toEqual({})
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_enabled: true,
        })
      )
    })

    it('can disable a skill', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      })

      await toggleSkill('skill-789', 'agent-456', false)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_enabled: false,
        })
      )
    })
  })
})
