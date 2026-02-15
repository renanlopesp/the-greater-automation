import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildSkillBuilderTools } from '../skill-builder-tools'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('SNEW_CREATE_SKILL - Structured Skill Creation', () => {
  const mockAgentId = 'agent-123'
  const mockUserId = 'user-123'
  const mockTeamId = 'team-123'

  let tools: ReturnType<typeof buildSkillBuilderTools>

  beforeEach(() => {
    vi.clearAllMocks()
    tools = buildSkillBuilderTools(mockAgentId, mockUserId, mockTeamId)
  })

  it('should create a knowledge skill with type=knowledge by default', async () => {
    const mockInsert = vi.fn((data) => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              id: 'skill-1',
              name: data.name,
              type: data.type || 'knowledge',
              version: 1,
            },
            error: null,
          })
        ),
      })),
    }))

    mockSupabase.from.mockReturnValue({
      insert: mockInsert,
    })

    const result = await tools.SNEW_CREATE_SKILL.execute({
      name: 'Customer Support Guidelines',
      content: '## Description\nHow to handle support tickets\n## Instructions\n1. Read the ticket',
    })

    expect(result).toHaveProperty('success', true)
    expect(result).toHaveProperty('type', 'knowledge')
    expect(result).toHaveProperty('version', 1)
  })

  it('should create a procedure skill with parameters', async () => {
    const mockInsert = vi.fn((data) => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              id: 'skill-2',
              name: data.name,
              type: data.type,
              version: 1,
            },
            error: null,
          })
        ),
      })),
    }))

    mockSupabase.from.mockReturnValue({
      insert: mockInsert,
    })

    const result = await tools.SNEW_CREATE_SKILL.execute({
      name: 'Deploy to Production',
      type: 'procedure',
      content:
        '## Steps\n1. Run tests for {{param.branch}}\n2. Deploy {{prev.build_id}} to production',
      parameters: [
        {
          name: 'branch',
          type: 'string',
          required: true,
          description: 'Git branch to deploy',
        },
      ],
    })

    expect(result).toHaveProperty('success', true)
    expect(result).toHaveProperty('type', 'procedure')
  })

  it('should reject procedure skills without parameters', async () => {
    const result = await tools.SNEW_CREATE_SKILL.execute({
      name: 'Invalid Procedure',
      type: 'procedure',
      content: '## Steps\n1. Do something',
    })

    expect(result).toHaveProperty('error')
    expect(result.error).toContain('must have at least one parameter')
  })

  it('should validate parameter structure', async () => {
    const result = await tools.SNEW_CREATE_SKILL.execute({
      name: 'Invalid Procedure',
      type: 'procedure',
      content: '## Steps\n1. Do something',
      parameters: [
        {
          name: 'test',
          type: 'string',
          // missing required field
        } as { name: string; type: string; required?: boolean },
      ],
    })

    expect(result).toHaveProperty('error')
    expect(result.error).toContain('Invalid parameter structure')
  })
})
