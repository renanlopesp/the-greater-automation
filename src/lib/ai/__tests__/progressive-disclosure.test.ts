import { describe, it, expect } from 'vitest'
import { buildAgentSystemPrompt } from '../agent-chat'
import type { AgentConfig, AgentSkill, ConnectedApp } from '../agent-chat'

describe('Progressive Disclosure - System Prompt', () => {
  const mockAgent: AgentConfig = {
    id: 'agent-1',
    name: 'Test Agent',
    system_prompt: 'You are a helpful assistant',
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 4096,
  }

  const mockSkills: AgentSkill[] = []
  const mockApps: ConnectedApp[] = []

  it('should include only skill metadata (name, type, description) in system prompt', () => {
    const knowledgeSkills = [
      {
        name: 'Customer Support',
        type: 'knowledge',
        description: 'Guidelines for handling customers',
        is_enabled: true,
      },
      {
        name: 'Deploy Process',
        type: 'procedure',
        description: 'Steps to deploy to production',
        is_enabled: true,
      },
    ]

    const prompt = buildAgentSystemPrompt(mockAgent, mockSkills, mockApps, [], knowledgeSkills)

    // Should include skill names and types
    expect(prompt).toContain('Customer Support')
    expect(prompt).toContain('[Knowledge]')
    expect(prompt).toContain('Deploy Process')
    expect(prompt).toContain('[Procedure]')
    expect(prompt).toContain('Guidelines for handling customers')
    expect(prompt).toContain('Steps to deploy to production')

    // Should use progressive disclosure (metadata only, content loaded on-demand)
    expect(prompt).toContain('SNEW_GET_SKILL_CONTENT')
    expect(prompt).toContain('load full details when relevant')
  })

  it('should instruct agent to use SNEW_GET_SKILL_CONTENT', () => {
    const knowledgeSkills = [
      {
        name: 'Test Skill',
        type: 'knowledge',
        description: 'Test',
        is_enabled: true,
      },
    ]

    const prompt = buildAgentSystemPrompt(mockAgent, mockSkills, mockApps, [], knowledgeSkills)

    expect(prompt).toContain('SNEW_GET_SKILL_CONTENT')
    expect(prompt).toContain('load full details when relevant')
  })

  it('should filter disabled skills', () => {
    const knowledgeSkills = [
      {
        name: 'Enabled Skill',
        type: 'knowledge',
        description: 'Active',
        is_enabled: true,
      },
      {
        name: 'Disabled Skill',
        type: 'knowledge',
        description: 'Inactive',
        is_enabled: false,
      },
    ]

    const prompt = buildAgentSystemPrompt(mockAgent, mockSkills, mockApps, [], knowledgeSkills)

    expect(prompt).toContain('Enabled Skill')
    expect(prompt).not.toContain('Disabled Skill')
  })

  it('should handle skills without descriptions', () => {
    const knowledgeSkills = [
      {
        name: 'No Description Skill',
        type: 'knowledge',
        description: null,
        is_enabled: true,
      },
    ]

    const prompt = buildAgentSystemPrompt(mockAgent, mockSkills, mockApps, [], knowledgeSkills)

    expect(prompt).toContain('No Description Skill')
    expect(prompt).toContain('[Knowledge]')
  })
})
