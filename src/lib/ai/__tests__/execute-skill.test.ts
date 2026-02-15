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

describe('SNEW_EXECUTE_SKILL - Procedure Execution', () => {
  const mockAgentId = 'agent-123'
  const mockUserId = 'user-123'
  const mockTeamId = 'team-123'

  let tools: ReturnType<typeof buildSkillBuilderTools>

  beforeEach(() => {
    vi.clearAllMocks()
    tools = buildSkillBuilderTools(mockAgentId, mockUserId, mockTeamId)
  })

  it('should execute procedure skill and resolve parameters', async () => {
    const mockSkill = {
      id: 'skill-1',
      name: 'Deploy to Production',
      type: 'procedure',
      content: `## Steps
1. Checkout branch {{param.branch}}
2. Run tests on {{param.branch}}
3. Deploy to {{param.environment}}
4. Verify at {{prev.url}}`,
      parameters: [
        { name: 'branch', type: 'string', required: true, description: 'Git branch' },
        {
          name: 'environment',
          type: 'string',
          required: false,
          description: 'Target env',
          default: 'production',
        },
      ],
      is_enabled: true,
    }

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockSkill, error: null })),
          })),
        })),
      })),
    })

    const result = await tools.SNEW_EXECUTE_SKILL.execute({
      skill_id: 'skill-1',
      params: { branch: 'feature/new-ui' },
    })

    expect(result).toHaveProperty('success', true)
    expect(result).toHaveProperty('steps')
    expect(result.steps).toHaveLength(4)
    expect(result.steps[0]).toContain('feature/new-ui')
    expect(result.steps[2]).toContain('production') // default value
    expect(result.steps[3]).toContain('{{prev.url}}') // not resolved
  })

  it('should reject non-procedure skills', async () => {
    const mockSkill = {
      id: 'skill-2',
      name: 'Knowledge Skill',
      type: 'knowledge',
      content: 'Some knowledge',
      parameters: null,
      is_enabled: true,
    }

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockSkill, error: null })),
          })),
        })),
      })),
    })

    const result = await tools.SNEW_EXECUTE_SKILL.execute({ skill_id: 'skill-2' })

    expect(result).toHaveProperty('error')
    expect(result.error).toContain('not a procedure')
  })

  it('should reject disabled skills', async () => {
    const mockSkill = {
      id: 'skill-3',
      name: 'Disabled Procedure',
      type: 'procedure',
      content: '## Steps\n1. Do something',
      parameters: [],
      is_enabled: false,
    }

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockSkill, error: null })),
          })),
        })),
      })),
    })

    const result = await tools.SNEW_EXECUTE_SKILL.execute({ skill_id: 'skill-3' })

    expect(result).toHaveProperty('error', 'Skill is disabled')
  })

  it('should require all required parameters', async () => {
    const mockSkill = {
      id: 'skill-4',
      name: 'Test Procedure',
      type: 'procedure',
      content: '## Steps\n1. Do {{param.required_param}}',
      parameters: [
        { name: 'required_param', type: 'string', required: true, description: 'Must provide' },
      ],
      is_enabled: true,
    }

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockSkill, error: null })),
          })),
        })),
      })),
    })

    const result = await tools.SNEW_EXECUTE_SKILL.execute({
      skill_id: 'skill-4',
      params: {},
    })

    expect(result).toHaveProperty('error')
    expect(result.error).toContain('Required parameter "required_param" is missing')
  })

  it('should return error if no steps section found', async () => {
    const mockSkill = {
      id: 'skill-5',
      name: 'No Steps',
      type: 'procedure',
      content: '## Description\nMissing steps',
      parameters: [],
      is_enabled: true,
    }

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockSkill, error: null })),
          })),
        })),
      })),
    })

    const result = await tools.SNEW_EXECUTE_SKILL.execute({ skill_id: 'skill-5' })

    expect(result).toHaveProperty('error')
    expect(result.error).toContain('No steps found')
  })
})
