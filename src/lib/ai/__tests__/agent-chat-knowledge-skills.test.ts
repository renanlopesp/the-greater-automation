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
        content: 'Always mention our product name: SuperApp.',
        is_enabled: true,
      },
      {
        name: 'Company Values',
        content: 'We value transparency and honesty.',
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
    expect(prompt).toContain('### Product Guidelines')
    expect(prompt).toContain('Always mention our product name: SuperApp.')
    expect(prompt).toContain('### Company Values')
    expect(prompt).toContain('We value transparency and honesty.')
  })

  it('excludes disabled knowledge skills from the system prompt', () => {
    const knowledgeSkills = [
      {
        name: 'Enabled Skill',
        content: 'This should appear in the prompt.',
        is_enabled: true,
      },
      {
        name: 'Disabled Skill',
        content: 'This should NOT appear in the prompt.',
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
    expect(prompt).toContain('### Enabled Skill')
    expect(prompt).toContain('This should appear in the prompt.')
    expect(prompt).not.toContain('### Disabled Skill')
    expect(prompt).not.toContain('This should NOT appear in the prompt.')
  })

  it('handles empty knowledge skills array', () => {
    const knowledgeSkills: Array<{
      name: string
      content: string
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
        content: 'Content 1',
        is_enabled: false,
      },
      {
        name: 'Disabled Skill 2',
        content: 'Content 2',
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
        content: 'Use formal tone in all communications.',
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
    expect(prompt).toContain(
      'The following skills define your specialized knowledge. Apply them when relevant:'
    )
    expect(prompt).toContain('### Style Guide')
    expect(prompt).toContain('Use formal tone in all communications.')
  })

  it('places knowledge skills section before connected apps section', () => {
    const knowledgeSkills = [
      {
        name: 'Test Skill',
        content: 'Test content',
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

  it('handles skills with multiline content', () => {
    const knowledgeSkills = [
      {
        name: 'Multiline Skill',
        content: 'Line 1: Introduction\nLine 2: Details\nLine 3: Conclusion',
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

    expect(prompt).toContain('### Multiline Skill')
    expect(prompt).toContain('Line 1: Introduction')
    expect(prompt).toContain('Line 2: Details')
    expect(prompt).toContain('Line 3: Conclusion')
  })
})
