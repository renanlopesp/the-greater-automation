import { describe, it, expect } from 'vitest'
import { buildAgentSystemPrompt } from '../agent-chat'
import type { AgentConfig, AgentSkill, ConnectedApp } from '../agent-chat'

describe('buildAgentSystemPrompt - knowledge skills', () => {
  const mockAgent: AgentConfig = {
    id: 'agent-123',
    name: 'Test Agent',
    system_prompt: 'You are a helpful assistant.',
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 4096,
  }

  const mockSkills: AgentSkill[] = []
  const mockConnectedApps: ConnectedApp[] = []

  it('includes enabled knowledge skills in the system prompt', () => {
    const knowledgeSkills = [
      {
        name: 'Product Guidelines',
        description: 'Company product naming',
        type: 'knowledge',
        is_enabled: true,
      },
      {
        name: 'Company Values',
        description: null,
        type: 'knowledge',
        is_enabled: true,
      },
    ]

    const prompt = buildAgentSystemPrompt(
      mockAgent,
      mockSkills,
      mockConnectedApps,
      undefined,
      knowledgeSkills
    )

    expect(prompt).toContain('## Your Knowledge & Skills')
    expect(prompt).toContain('**Product Guidelines**')
    expect(prompt).toContain('Company product naming')
    expect(prompt).toContain('**Company Values**')
    expect(prompt).toContain('SNEW_GET_SKILL_CONTENT')
  })

  it('excludes disabled knowledge skills from the system prompt', () => {
    const knowledgeSkills = [
      {
        name: 'Enabled Skill',
        description: 'This is enabled',
        type: 'knowledge',
        is_enabled: true,
      },
      {
        name: 'Disabled Skill',
        description: 'This is disabled',
        type: 'knowledge',
        is_enabled: false,
      },
    ]

    const prompt = buildAgentSystemPrompt(
      mockAgent,
      mockSkills,
      mockConnectedApps,
      undefined,
      knowledgeSkills
    )

    expect(prompt).toContain('## Your Knowledge & Skills')
    expect(prompt).toContain('**Enabled Skill**')
    expect(prompt).not.toContain('**Disabled Skill**')
    expect(prompt).not.toContain('This is disabled')
  })

  it('handles empty knowledge skills array', () => {
    const knowledgeSkills: Array<{
      name: string
      description: string | null
      type: string | null
      is_enabled: boolean
    }> = []

    const prompt = buildAgentSystemPrompt(
      mockAgent,
      mockSkills,
      mockConnectedApps,
      undefined,
      knowledgeSkills
    )

    expect(prompt).not.toContain('## Your Knowledge & Skills')
    expect(prompt).toContain('You are Test Agent')
    expect(prompt).toContain('You are a helpful assistant.')
  })

  it('handles undefined knowledge skills parameter', () => {
    const prompt = buildAgentSystemPrompt(
      mockAgent,
      mockSkills,
      mockConnectedApps,
      undefined,
      undefined
    )

    expect(prompt).not.toContain('## Your Knowledge & Skills')
    expect(prompt).toContain('You are Test Agent')
    expect(prompt).toContain('You are a helpful assistant.')
  })

  it('does not include knowledge skills section when all skills are disabled', () => {
    const knowledgeSkills = [
      {
        name: 'Disabled Skill 1',
        description: 'Content 1',
        type: 'knowledge',
        is_enabled: false,
      },
      {
        name: 'Disabled Skill 2',
        description: 'Content 2',
        type: 'knowledge',
        is_enabled: false,
      },
    ]

    const prompt = buildAgentSystemPrompt(
      mockAgent,
      mockSkills,
      mockConnectedApps,
      undefined,
      knowledgeSkills
    )

    expect(prompt).not.toContain('## Your Knowledge & Skills')
    expect(prompt).not.toContain('Disabled Skill 1')
    expect(prompt).not.toContain('Disabled Skill 2')
  })

  it('includes knowledge skills section with introductory text when enabled skills exist', () => {
    const knowledgeSkills = [
      {
        name: 'Style Guide',
        description: 'Use formal tone in all communications.',
        type: 'knowledge',
        is_enabled: true,
      },
    ]

    const prompt = buildAgentSystemPrompt(
      mockAgent,
      mockSkills,
      mockConnectedApps,
      undefined,
      knowledgeSkills
    )

    expect(prompt).toContain('## Your Knowledge & Skills')
    expect(prompt).toContain('SNEW_GET_SKILL_CONTENT')
    expect(prompt).toContain('**Style Guide**')
    expect(prompt).toContain('Use formal tone in all communications.')
  })

  it('places knowledge skills section before connected apps section', () => {
    const knowledgeSkills = [
      {
        name: 'Test Skill',
        description: 'Test content',
        type: 'knowledge',
        is_enabled: true,
      },
    ]

    const connectedApps: ConnectedApp[] = [
      {
        appId: 'github',
        actions: ['create_issue'],
      },
    ]

    const prompt = buildAgentSystemPrompt(
      mockAgent,
      mockSkills,
      connectedApps,
      undefined,
      knowledgeSkills
    )

    const knowledgeIndex = prompt.indexOf('## Your Knowledge & Skills')
    const appsIndex = prompt.indexOf('## Connected Apps')

    expect(knowledgeIndex).toBeGreaterThan(-1)
    expect(appsIndex).toBeGreaterThan(-1)
    expect(knowledgeIndex).toBeLessThan(appsIndex)
  })

  it('shows type labels for knowledge and procedure skills', () => {
    const knowledgeSkills = [
      {
        name: 'Knowledge Skill',
        description: 'Knowledge content',
        type: 'knowledge',
        is_enabled: true,
      },
      {
        name: 'Procedure Skill',
        description: 'Procedure content',
        type: 'procedure',
        is_enabled: true,
      },
    ]

    const prompt = buildAgentSystemPrompt(
      mockAgent,
      mockSkills,
      mockConnectedApps,
      undefined,
      knowledgeSkills
    )

    expect(prompt).toContain('[Knowledge]')
    expect(prompt).toContain('[Procedure]')
    expect(prompt).toContain('**Knowledge Skill**')
    expect(prompt).toContain('**Procedure Skill**')
  })
})
