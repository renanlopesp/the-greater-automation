import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildSkillBuilderTools } from '../skill-builder-tools'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
          order: vi.fn(),
        })),
        order: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
    })),
  })),
}))

vi.mock('@/lib/composio/client', () => ({
  getComposio: vi.fn(() => ({
    tools: {
      getRawComposioTools: vi.fn(() => Promise.resolve([])),
    },
    triggers: {
      listTypes: vi.fn(() => Promise.resolve({ items: [] })),
    },
  })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('skill-builder-tools rename verification', () => {
  const mockAgentId = 'agent-123'
  const mockUserId = 'user-456'
  const mockTeamId = 'team-789'

  let tools: ReturnType<typeof buildSkillBuilderTools>

  beforeEach(() => {
    tools = buildSkillBuilderTools(mockAgentId, mockUserId, mockTeamId)
  })

  describe('Workflow tools exist with new names', () => {
    it('should have SNEW_CREATE_WORKFLOW tool', () => {
      expect(tools).toHaveProperty('SNEW_CREATE_WORKFLOW')
      expect(tools.SNEW_CREATE_WORKFLOW).toHaveProperty('description')
      expect(tools.SNEW_CREATE_WORKFLOW).toHaveProperty('inputSchema')
      expect(tools.SNEW_CREATE_WORKFLOW).toHaveProperty('execute')
      expect(typeof tools.SNEW_CREATE_WORKFLOW.execute).toBe('function')
    })

    it('should have SNEW_LIST_WORKFLOWS tool', () => {
      expect(tools).toHaveProperty('SNEW_LIST_WORKFLOWS')
      expect(tools.SNEW_LIST_WORKFLOWS).toHaveProperty('description')
      expect(tools.SNEW_LIST_WORKFLOWS).toHaveProperty('inputSchema')
      expect(tools.SNEW_LIST_WORKFLOWS).toHaveProperty('execute')
      expect(typeof tools.SNEW_LIST_WORKFLOWS.execute).toBe('function')
    })

    it('should have SNEW_DELETE_WORKFLOW tool', () => {
      expect(tools).toHaveProperty('SNEW_DELETE_WORKFLOW')
      expect(tools.SNEW_DELETE_WORKFLOW).toHaveProperty('description')
      expect(tools.SNEW_DELETE_WORKFLOW).toHaveProperty('inputSchema')
      expect(tools.SNEW_DELETE_WORKFLOW).toHaveProperty('execute')
      expect(typeof tools.SNEW_DELETE_WORKFLOW.execute).toBe('function')
    })

    it('should have SNEW_UPDATE_WORKFLOW tool', () => {
      expect(tools).toHaveProperty('SNEW_UPDATE_WORKFLOW')
      expect(tools.SNEW_UPDATE_WORKFLOW).toHaveProperty('description')
      expect(tools.SNEW_UPDATE_WORKFLOW).toHaveProperty('inputSchema')
      expect(tools.SNEW_UPDATE_WORKFLOW).toHaveProperty('execute')
      expect(typeof tools.SNEW_UPDATE_WORKFLOW.execute).toBe('function')
    })

    it('should have SNEW_TEST_WORKFLOW tool', () => {
      expect(tools).toHaveProperty('SNEW_TEST_WORKFLOW')
      expect(tools.SNEW_TEST_WORKFLOW).toHaveProperty('description')
      expect(tools.SNEW_TEST_WORKFLOW).toHaveProperty('inputSchema')
      expect(tools.SNEW_TEST_WORKFLOW).toHaveProperty('execute')
      expect(typeof tools.SNEW_TEST_WORKFLOW.execute).toBe('function')
    })
  })

  describe('Knowledge skill tools exist with correct semantics', () => {
    it('should have SNEW_CREATE_SKILL tool for knowledge skills', () => {
      expect(tools).toHaveProperty('SNEW_CREATE_SKILL')
      expect(tools.SNEW_CREATE_SKILL).toHaveProperty('description')
      expect(tools.SNEW_CREATE_SKILL).toHaveProperty('inputSchema')
      expect(tools.SNEW_CREATE_SKILL).toHaveProperty('execute')
      expect(typeof tools.SNEW_CREATE_SKILL.execute).toBe('function')

      // Verify description indicates knowledge skills, not workflows
      expect(tools.SNEW_CREATE_SKILL.description).toContain('knowledge skill')
      expect(tools.SNEW_CREATE_SKILL.description).not.toContain('automation')
      expect(tools.SNEW_CREATE_SKILL.description).not.toContain('workflow')
    })

    it('should have SNEW_LIST_SKILLS tool for knowledge skills', () => {
      expect(tools).toHaveProperty('SNEW_LIST_SKILLS')
      expect(tools.SNEW_LIST_SKILLS).toHaveProperty('description')
      expect(tools.SNEW_LIST_SKILLS).toHaveProperty('inputSchema')
      expect(tools.SNEW_LIST_SKILLS).toHaveProperty('execute')
      expect(typeof tools.SNEW_LIST_SKILLS.execute).toBe('function')

      // Verify description indicates knowledge skills
      expect(tools.SNEW_LIST_SKILLS.description).toContain('knowledge skill')
    })

    it('should have SNEW_DELETE_SKILL tool for knowledge skills', () => {
      expect(tools).toHaveProperty('SNEW_DELETE_SKILL')
      expect(tools.SNEW_DELETE_SKILL).toHaveProperty('description')
      expect(tools.SNEW_DELETE_SKILL).toHaveProperty('inputSchema')
      expect(tools.SNEW_DELETE_SKILL).toHaveProperty('execute')
      expect(typeof tools.SNEW_DELETE_SKILL.execute).toBe('function')

      // Verify description indicates knowledge skills
      expect(tools.SNEW_DELETE_SKILL.description).toContain('knowledge skill')
    })
  })

  describe('Neutral tools preserved', () => {
    it('should have SNEW_LIST_APP_CAPABILITIES tool', () => {
      expect(tools).toHaveProperty('SNEW_LIST_APP_CAPABILITIES')
      expect(tools.SNEW_LIST_APP_CAPABILITIES).toHaveProperty('description')
      expect(tools.SNEW_LIST_APP_CAPABILITIES).toHaveProperty('inputSchema')
      expect(tools.SNEW_LIST_APP_CAPABILITIES).toHaveProperty('execute')
      expect(typeof tools.SNEW_LIST_APP_CAPABILITIES.execute).toBe('function')
    })

    it('should have SNEW_CHECK_CONNECTIONS tool', () => {
      expect(tools).toHaveProperty('SNEW_CHECK_CONNECTIONS')
      expect(tools.SNEW_CHECK_CONNECTIONS).toHaveProperty('description')
      expect(tools.SNEW_CHECK_CONNECTIONS).toHaveProperty('inputSchema')
      expect(tools.SNEW_CHECK_CONNECTIONS).toHaveProperty('execute')
      expect(typeof tools.SNEW_CHECK_CONNECTIONS.execute).toBe('function')
    })
  })

  describe('Tool count and completeness', () => {
    it('should return exactly 13 tools', () => {
      const toolNames = Object.keys(tools)
      expect(toolNames).toHaveLength(13)
    })

    it('should have all expected tool names', () => {
      const expectedTools = [
        'SNEW_LIST_APP_CAPABILITIES',
        'SNEW_CREATE_WORKFLOW',
        'SNEW_LIST_WORKFLOWS',
        'SNEW_UPDATE_WORKFLOW',
        'SNEW_DELETE_WORKFLOW',
        'SNEW_TEST_WORKFLOW',
        'SNEW_CHECK_CONNECTIONS',
        'SNEW_CREATE_SKILL',
        'SNEW_LIST_SKILLS',
        'SNEW_UPDATE_SKILL',
        'SNEW_GET_SKILL_CONTENT',
        'SNEW_EXECUTE_SKILL',
        'SNEW_DELETE_SKILL',
      ]

      const toolNames = Object.keys(tools)
      expectedTools.forEach((expectedTool) => {
        expect(toolNames).toContain(expectedTool)
      })
    })
  })

  describe('Workflow tool descriptions reference workflows', () => {
    it('SNEW_CREATE_WORKFLOW should reference workflow/automation', () => {
      const desc = tools.SNEW_CREATE_WORKFLOW.description
      expect(desc.toLowerCase()).toMatch(/workflow|automation/)
    })

    it('SNEW_LIST_WORKFLOWS should reference workflows', () => {
      const desc = tools.SNEW_LIST_WORKFLOWS.description
      expect(desc.toLowerCase()).toContain('workflow')
    })

    it('SNEW_UPDATE_WORKFLOW should reference workflow', () => {
      const desc = tools.SNEW_UPDATE_WORKFLOW.description
      expect(desc.toLowerCase()).toContain('workflow')
    })

    it('SNEW_DELETE_WORKFLOW should reference workflow', () => {
      const desc = tools.SNEW_DELETE_WORKFLOW.description
      expect(desc.toLowerCase()).toContain('workflow')
    })

    it('SNEW_TEST_WORKFLOW should reference workflow', () => {
      const desc = tools.SNEW_TEST_WORKFLOW.description
      expect(desc.toLowerCase()).toContain('workflow')
    })
  })
})
