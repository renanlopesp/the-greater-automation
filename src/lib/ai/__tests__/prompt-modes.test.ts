import { describe, it, expect, vi } from 'vitest'

// Mock server-only and dependencies
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))
vi.mock('@/lib/composio/client', () => ({
  getComposio: vi.fn(),
}))
vi.mock('@/lib/composio/actions/get-available-apps', () => ({
  getAvailableApps: vi.fn(),
}))
vi.mock('@/lib/queries/skills', () => ({
  fetchTeamSkills: vi.fn(),
  fetchSkillBySlug: vi.fn(),
  fetchSkillExecutions: vi.fn(),
}))
vi.mock('@/lib/ai/skill-executor', () => ({
  executeSkill: vi.fn(),
}))
vi.mock('@/data/skills', () => ({
  skills: [],
}))
vi.mock('ai', () => ({
  jsonSchema: vi.fn((schema) => schema),
}))

import { buildOrchestratorSystemPrompt } from '../platform-tools'

describe('buildOrchestratorSystemPrompt — Two Modes', () => {
  const mockSkills = [
    {
      slug: 'seasonal-calendar',
      name: 'Calendário Sazonal',
      description: 'Campaign calendar',
      category: 'marketing',
      status: 'active',
    },
  ]

  const mockRetailContext = {
    storeName: 'Milkes Store',
    segment: 'fashion',
    platform: 'nuvemshop' as string | null,
    hasProducts: true,
  }

  const mockBrandDna = {
    niche: 'moda feminina',
    tone: 'jovem e descolada',
    audience: 'mulheres 25-35',
    positioning: 'fast fashion acessível',
    words_to_use: ['empoderamento', 'estilo'],
    words_to_avoid: ['barato', 'promoção'],
    store_name: 'Milkes',
  }

  describe('Onboarding mode', () => {
    it('includes onboarding guide', () => {
      const prompt = buildOrchestratorSystemPrompt('Test', [], undefined, null, 'onboarding')
      expect(prompt).toContain('Onboarding Guide')
      expect(prompt).toContain('Conectar a loja')
      expect(prompt).toContain('Analisar a marca')
      expect(prompt).toContain('Ativar skills')
    })

    it('includes onboarding identity', () => {
      const prompt = buildOrchestratorSystemPrompt('Test', [], undefined, null, 'onboarding')
      expect(prompt).toContain('Onboarding assistant')
    })

    it('does NOT include Brand DNA section', () => {
      const prompt = buildOrchestratorSystemPrompt('Test', [], undefined, null, 'onboarding')
      expect(prompt).not.toContain('## Brand DNA')
    })

    it('does NOT include Retail Context section', () => {
      const prompt = buildOrchestratorSystemPrompt('Test', [], undefined, null, 'onboarding')
      expect(prompt).not.toContain('## Retail Context')
    })

    it('does NOT include artifact design instructions', () => {
      const prompt = buildOrchestratorSystemPrompt('Test', [], undefined, null, 'onboarding')
      expect(prompt).not.toContain('DESIGN PRINCIPLES')
      expect(prompt).not.toContain('SNEW_MODIFY_ARTIFACT')
    })

    it('is significantly shorter than full mode', () => {
      const onboarding = buildOrchestratorSystemPrompt(
        'Test',
        mockSkills,
        mockRetailContext,
        mockBrandDna,
        'onboarding'
      )
      const full = buildOrchestratorSystemPrompt(
        'Test',
        mockSkills,
        mockRetailContext,
        mockBrandDna,
        'full'
      )
      expect(onboarding.length).toBeLessThan(full.length * 0.5)
    })
  })

  describe('Full mode', () => {
    it('includes Brand DNA when provided', () => {
      const prompt = buildOrchestratorSystemPrompt('Test', [], undefined, mockBrandDna, 'full')
      expect(prompt).toContain('## Brand DNA')
      expect(prompt).toContain('moda feminina')
      expect(prompt).toContain('jovem e descolada')
    })

    it('includes Retail Context when provided', () => {
      const prompt = buildOrchestratorSystemPrompt('Test', [], mockRetailContext, null, 'full')
      expect(prompt).toContain('## Retail Context')
      expect(prompt).toContain('Milkes Store')
      expect(prompt).toContain('STORE_QUERY_SALES')
    })

    it('includes skills when provided', () => {
      const prompt = buildOrchestratorSystemPrompt('Test', mockSkills, undefined, null, 'full')
      expect(prompt).toContain('seasonal-calendar')
      expect(prompt).toContain('Calendário Sazonal')
    })

    it('does NOT include Onboarding Guide', () => {
      const prompt = buildOrchestratorSystemPrompt(
        'Test',
        mockSkills,
        mockRetailContext,
        mockBrandDna,
        'full'
      )
      expect(prompt).not.toContain('Onboarding Guide')
    })

    it('handles no brand DNA gracefully (degradation)', () => {
      const prompt = buildOrchestratorSystemPrompt('Test', [], mockRetailContext, null, 'full')
      expect(prompt).not.toContain('## Brand DNA')
      expect(prompt).toContain('## Retail Context')
      expect(prompt).toContain('## Identity')
    })

    it('handles partial brand DNA', () => {
      const partial = {
        niche: 'tech',
        tone: null,
        audience: null,
        positioning: null,
        words_to_use: null,
        words_to_avoid: null,
        store_name: null,
      }
      const prompt = buildOrchestratorSystemPrompt('Test', [], undefined, partial, 'full')
      expect(prompt).toContain('## Brand DNA')
      expect(prompt).toContain('tech')
      expect(prompt).toContain('Não definido') // fallback for null tone
    })
  })

  describe('Default mode', () => {
    it('defaults to full mode when mode is not specified', () => {
      const withDefault = buildOrchestratorSystemPrompt(
        'Test',
        mockSkills,
        mockRetailContext,
        mockBrandDna
      )
      const explicit = buildOrchestratorSystemPrompt(
        'Test',
        mockSkills,
        mockRetailContext,
        mockBrandDna,
        'full'
      )
      expect(withDefault).toBe(explicit)
    })
  })
})
