// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SkillsList from '../skills-list'
import type { Skill } from '../skills-list'

// Import the parser function for unit testing
// We'll need to export it from the component or test it through the UI
import { parseSkillSections } from '../skills-list'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

// Mock server actions
vi.mock('@/lib/actions/agent-skills', () => ({
  createSkill: vi.fn(),
  deleteSkill: vi.fn(),
  toggleSkill: vi.fn(),
}))

const mockContextSkills: Skill[] = [
  {
    id: '1',
    name: 'Product Guidelines',
    description: 'Company product naming',
    content: 'Always mention our product name: SuperApp.',
    source: 'manual',
    is_enabled: true,
    type: 'context',
    parameters: null,
    version: 1,
  },
  {
    id: '2',
    name: 'Support Protocol',
    description: null,
    content: '## Steps\n1. Greet the customer\n2. Identify the issue\n3. Provide solution',
    source: 'manual',
    is_enabled: true,
    type: 'context',
    parameters: null,
    version: 1,
  },
]

describe('SkillsList', () => {
  it('renders context skills with names and badges', () => {
    render(<SkillsList skills={mockContextSkills} agentId="agent-1" />)
    expect(screen.getByText('Product Guidelines')).toBeInTheDocument()
    expect(screen.getByText('Support Protocol')).toBeInTheDocument()
    expect(screen.getAllByText('Contexto').length).toBeGreaterThan(0)
  })

  it('shows description when available', () => {
    render(<SkillsList skills={mockContextSkills} agentId="agent-1" />)
    expect(screen.getByText('Company product naming')).toBeInTheDocument()
  })

  it('shows enable/disable toggle for skills', () => {
    render(<SkillsList skills={mockContextSkills} agentId="agent-1" />)
    const toggles = screen.getAllByRole('switch', { name: 'Toggle skill' })
    expect(toggles.length).toBe(2)
  })

  it('shows "Adicionar contexto" button', () => {
    render(<SkillsList skills={mockContextSkills} agentId="agent-1" />)
    expect(screen.getByText('Adicionar contexto')).toBeInTheDocument()
  })

  it('shows empty state when no skills', () => {
    render(<SkillsList skills={[]} agentId="agent-1" />)
    expect(screen.getByText('Nenhum contexto ainda')).toBeInTheDocument()
  })

  it('renders brain icon for all skills', () => {
    const { container } = render(<SkillsList skills={mockContextSkills} agentId="agent-1" />)
    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('shows delete button on hover (opacity controlled by group-hover)', () => {
    const { container } = render(<SkillsList skills={mockContextSkills} agentId="agent-1" />)
    const deleteButtons = container.querySelectorAll('button[type="button"]')
    expect(deleteButtons.length).toBeGreaterThan(0)
  })

  it('renders enabled skills with checked toggle', () => {
    render(<SkillsList skills={mockContextSkills} agentId="agent-1" />)
    const toggles = screen.getAllByRole('switch', { name: 'Toggle skill' })
    toggles.forEach((toggle) => {
      expect(toggle).toHaveAttribute('data-state', 'checked')
    })
  })

  it('renders disabled skills with unchecked toggle', () => {
    const disabledSkills: Skill[] = [
      {
        id: '3',
        name: 'Disabled Skill',
        description: null,
        content: 'This is disabled',
        source: 'manual',
        is_enabled: false,
        type: 'context',
        parameters: null,
        version: 1,
      },
    ]
    render(<SkillsList skills={disabledSkills} agentId="agent-1" />)
    const toggle = screen.getByRole('switch', { name: 'Toggle skill' })
    expect(toggle).toHaveAttribute('data-state', 'unchecked')
  })

  it('filters out non-context skills', () => {
    const mixedSkills: Skill[] = [
      ...mockContextSkills,
      {
        id: '99',
        name: 'Legacy Knowledge',
        description: null,
        content: 'Old skill',
        source: 'manual',
        is_enabled: true,
        type: 'knowledge',
        parameters: null,
        version: 1,
      },
    ]
    render(<SkillsList skills={mixedSkills} agentId="agent-1" />)
    expect(screen.getByText('Product Guidelines')).toBeInTheDocument()
    expect(screen.queryByText('Legacy Knowledge')).not.toBeInTheDocument()
  })
})

describe('parseSkillSections', () => {
  it('splits structured content into sections correctly', () => {
    const content = `## Purpose
This is the purpose section.

## Steps
1. First step
2. Second step

## Notes
Some additional notes here.`

    const sections = parseSkillSections(content)

    expect(sections).toHaveLength(3)
    expect(sections[0].heading).toBe('Purpose')
    expect(sections[0].content).toContain('This is the purpose section.')
    expect(sections[1].heading).toBe('Steps')
    expect(sections[1].content).toContain('1. First step')
    expect(sections[2].heading).toBe('Notes')
    expect(sections[2].content).toContain('Some additional notes here.')
  })

  it('handles unstructured content as single block', () => {
    const content = 'This is just plain text without any headers.'

    const sections = parseSkillSections(content)

    expect(sections).toHaveLength(1)
    expect(sections[0].heading).toBe('Content')
    expect(sections[0].content).toBe(content)
  })

  it('handles empty content gracefully', () => {
    expect(parseSkillSections('')).toEqual([])
    expect(parseSkillSections('   ')).toEqual([])
  })

  it('handles null content gracefully', () => {
    // @ts-expect-error Testing null handling
    expect(parseSkillSections(null)).toEqual([])
  })

  it('handles content with heading but no body', () => {
    const content = '## Title Only'

    const sections = parseSkillSections(content)

    expect(sections).toHaveLength(1)
    expect(sections[0].heading).toBe('Title Only')
    expect(sections[0].content).toBe('')
  })

  it('handles content before first header', () => {
    const content = `Intro text before headers.

## First Section
Section content here.`

    const sections = parseSkillSections(content)

    expect(sections).toHaveLength(2)
    expect(sections[0].heading).toBe('Content')
    expect(sections[0].content).toContain('Intro text before headers.')
    expect(sections[1].heading).toBe('First Section')
    expect(sections[1].content).toContain('Section content here.')
  })
})
