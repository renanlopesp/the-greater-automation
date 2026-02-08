import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SkillsList from '../skills-list'

const mockSkills = [
  {
    id: '1',
    name: 'Email Summarizer',
    last_run_at: null,
    workflow: { name: 'Email Flow', emoji: '📧' },
  },
  {
    id: '2',
    name: 'Data Processor',
    last_run_at: new Date(Date.now() - 3_600_000).toISOString(),
    workflow: { name: 'Data Pipeline', emoji: '🔄' },
  },
]

describe('SkillsList', () => {
  it('renders skill cards with names', () => {
    render(<SkillsList skills={mockSkills} agentId="agent-1" />)
    expect(screen.getByText('Email Summarizer')).toBeInTheDocument()
    expect(screen.getByText('Data Processor')).toBeInTheDocument()
  })

  it('renders workflow emojis', () => {
    render(<SkillsList skills={mockSkills} agentId="agent-1" />)
    expect(screen.getByText('📧')).toBeInTheDocument()
    expect(screen.getByText('🔄')).toBeInTheDocument()
  })

  it('shows "Never ran" for skills with null last_run_at', () => {
    render(<SkillsList skills={mockSkills} agentId="agent-1" />)
    expect(screen.getByText('Never ran')).toBeInTheDocument()
  })

  it('shows relative time for skills with last_run_at', () => {
    render(<SkillsList skills={mockSkills} agentId="agent-1" />)
    expect(screen.getByText(/ago/)).toBeInTheDocument()
  })

  it('renders "New skill" button', () => {
    render(<SkillsList skills={mockSkills} agentId="agent-1" />)
    expect(screen.getByText('New skill')).toBeInTheDocument()
  })

  it('renders default emoji when workflow is null', () => {
    const skills = [{ id: '3', name: 'Orphan Skill', last_run_at: null, workflow: null }]
    render(<SkillsList skills={skills} agentId="agent-1" />)
    expect(screen.getByText('⚡')).toBeInTheDocument()
  })
})
