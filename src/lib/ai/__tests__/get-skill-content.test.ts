import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildSkillBuilderTools } from '../skill-builder-tools'

const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('SNEW_GET_SKILL_CONTENT - Load Full Skill Details', () => {
  const mockAgentId = 'agent-123'
  const mockUserId = 'user-123'
  const mockTeamId = 'team-123'

  let tools: ReturnType<typeof buildSkillBuilderTools>

  beforeEach(() => {
    vi.clearAllMocks()
    tools = buildSkillBuilderTools(mockAgentId, mockUserId, mockTeamId)
  })

  it('should load skill by exact ID', async () => {
    const mockSkill = {
      id: 'skill-1',
      name: 'Customer Support',
      description: 'Support guidelines',
      content: '## Description\nHow to help customers\n## Instructions\n1. Be polite',
      type: 'knowledge',
      parameters: null,
      version: 1,
      is_enabled: true,
    }

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockSkill, error: null })),
          })),
          ilike: vi.fn(),
        })),
      })),
    })

    const result = await tools.SNEW_GET_SKILL_CONTENT.execute({ skill_id: 'skill-1' })

    expect(result).toHaveProperty('success', true)
    expect(result.skill).toMatchObject({
      id: 'skill-1',
      name: 'Customer Support',
      content: expect.stringContaining('## Description'),
      type: 'knowledge',
      version: 1,
    })
  })

  it('should load skill by fuzzy name match', async () => {
    const mockSkill = {
      id: 'skill-2',
      name: 'Deploy to Production',
      description: 'Deployment procedure',
      content: '## Steps\n1. Run tests\n2. Deploy',
      type: 'procedure',
      parameters: [{ name: 'branch', type: 'string', required: true, description: 'Branch name' }],
      version: 2,
      is_enabled: true,
    }

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          ilike: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockSkill, error: null })),
          })),
        })),
      })),
    })

    const result = await tools.SNEW_GET_SKILL_CONTENT.execute({ name: 'deploy' })

    expect(result).toHaveProperty('success', true)
    expect(result.skill).toHaveProperty('name', 'Deploy to Production')
    expect(result.skill).toHaveProperty('type', 'procedure')
    expect(result.skill?.parameters).toHaveLength(1)
  })

  it('should return error if skill not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    })

    const result = await tools.SNEW_GET_SKILL_CONTENT.execute({ skill_id: 'nonexistent' })

    expect(result).toHaveProperty('error', 'Skill not found')
  })

  it('should require either skill_id or name', async () => {
    const result = await tools.SNEW_GET_SKILL_CONTENT.execute({})

    expect(result).toHaveProperty('error')
    expect(result.error).toContain('Either skill_id or name is required')
  })
})
