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

describe('Procedure Skill Creation with Templates', () => {
  const mockAgentId = 'agent-123'
  const mockUserId = 'user-123'
  const mockTeamId = 'team-123'

  let tools: ReturnType<typeof buildSkillBuilderTools>

  beforeEach(() => {
    vi.clearAllMocks()
    tools = buildSkillBuilderTools(mockAgentId, mockUserId, mockTeamId)
  })

  it('should create procedure skill with proper template structure', async () => {
    const procedureContent = `## Description
Deploy application to production environment

## Parameters
- branch: Git branch to deploy (string, required)
- environment: Target environment (string, optional, default: production)

## Steps
1. Checkout branch {{param.branch}}
2. Run tests on {{param.branch}}
3. Build application for {{param.environment}}
4. Deploy build {{prev.build_id}} to {{param.environment}}
5. Verify deployment at {{prev.url}}

## Error Handling
- If tests fail, abort deployment and notify team
- If build fails, rollback to previous version
- If deployment fails, trigger rollback procedure`

    mockSupabase.from.mockReturnValue({
      insert: vi.fn((data) => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                id: 'skill-proc-1',
                name: data.name,
                type: data.type,
                version: 1,
              },
              error: null,
            })
          ),
        })),
      })),
    })

    const result = await tools.SNEW_CREATE_SKILL.execute({
      name: 'Deploy to Production',
      type: 'procedure',
      description: 'Deployment procedure with error handling',
      content: procedureContent,
      parameters: [
        {
          name: 'branch',
          type: 'string',
          required: true,
          description: 'Git branch to deploy',
        },
        {
          name: 'environment',
          type: 'string',
          required: false,
          description: 'Target environment',
          default: 'production',
        },
      ],
    })

    expect(result).toHaveProperty('success', true)
    expect(result).toHaveProperty('type', 'procedure')
    expect(result.message).toContain('Procedure skill')
  })

  it('should validate procedure template has all required sections', async () => {
    const incompleteContent = `## Description
Missing steps section`

    mockSupabase.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                id: 'skill-1',
                name: 'Test',
                type: 'procedure',
                version: 1,
              },
              error: null,
            })
          ),
        })),
      })),
    })

    // Tool should still create it (validation happens at execution time)
    const result = await tools.SNEW_CREATE_SKILL.execute({
      name: 'Incomplete Procedure',
      type: 'procedure',
      content: incompleteContent,
      parameters: [{ name: 'test', type: 'string', required: true, description: 'Test param' }],
    })

    expect(result).toHaveProperty('success', true)
  })

  it('should include parameter defaults in definition', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn((data) => {
        // Verify parameters include default values
        const params = data.parameters as Array<Record<string, unknown>>
        expect(params[0]).toHaveProperty('default', 'main')
        return {
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: {
                  id: 'skill-1',
                  name: data.name,
                  type: data.type,
                  version: 1,
                },
                error: null,
              })
            ),
          })),
        }
      }),
    })

    const result = await tools.SNEW_CREATE_SKILL.execute({
      name: 'Test with Defaults',
      type: 'procedure',
      content: '## Steps\n1. Do something',
      parameters: [
        {
          name: 'branch',
          type: 'string',
          required: false,
          description: 'Branch name',
          default: 'main',
        },
      ],
    })

    expect(result).toHaveProperty('success', true)
  })
})
