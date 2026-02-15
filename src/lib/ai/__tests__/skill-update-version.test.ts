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

describe('SNEW_UPDATE_SKILL - Version Management', () => {
  const mockAgentId = 'agent-123'
  const mockUserId = 'user-123'
  const mockTeamId = 'team-123'

  let tools: ReturnType<typeof buildSkillBuilderTools>

  beforeEach(() => {
    vi.clearAllMocks()
    tools = buildSkillBuilderTools(mockAgentId, mockUserId, mockTeamId)
  })

  it('should increment version when content changes', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { version: 1, type: 'knowledge', content: 'old content', parameters: null },
                error: null,
              })
            ),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { id: 'skill-1', name: 'Test Skill', version: 2 },
                  error: null,
                })
              ),
            })),
          })),
        })),
      })),
    })

    const result = await tools.SNEW_UPDATE_SKILL.execute({
      skill_id: 'skill-1',
      content: 'new content',
    })

    expect(result).toHaveProperty('success', true)
    expect(result).toHaveProperty('version', 2)
  })

  it('should increment version when parameters change', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { version: 2, type: 'procedure', content: 'content', parameters: [] },
                error: null,
              })
            ),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { id: 'skill-1', name: 'Test Skill', version: 3 },
                  error: null,
                })
              ),
            })),
          })),
        })),
      })),
    })

    const result = await tools.SNEW_UPDATE_SKILL.execute({
      skill_id: 'skill-1',
      parameters: [{ name: 'test', type: 'string', required: true, description: 'test param' }],
    })

    expect(result).toHaveProperty('success', true)
    expect(result).toHaveProperty('version', 3)
  })

  it('should not increment version when only name changes', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { version: 1, type: 'knowledge', content: 'content', parameters: null },
                error: null,
              })
            ),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { id: 'skill-1', name: 'New Name', version: 1 },
                  error: null,
                })
              ),
            })),
          })),
        })),
      })),
    })

    const result = await tools.SNEW_UPDATE_SKILL.execute({
      skill_id: 'skill-1',
      name: 'New Name',
    })

    expect(result).toHaveProperty('success', true)
    expect(result).toHaveProperty('version', 1)
  })
})
